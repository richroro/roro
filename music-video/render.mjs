// Paints the video in headless Chromium and encodes it.
//
//   node render.mjs --frames[=0:130.9] [--workers=4] [--w=1920] [--fps=30] [--force]
//                                      every frame into out/frames (skips ones already there)
//   node render.mjs --encode [--out=out/goding-life.mp4] [--fps=30] [--crf=20]
//   node render.mjs --sheet=12,12.5,13 [--cols=3] [--cw=640] [--out=out/check/sheet.jpg]
//   node render.mjs --stills=12,40.2 [--out=out/check/still]      full-size JPEGs
//
// Chromium: $CHROME, else the Playwright build in $PLAYWRIGHT_BROWSERS_PATH, else Playwright's
// own lookup.

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { ffmpegPath } from './tools/ffmpeg.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const num = (k, d) => (args[k] === undefined || args[k] === true ? d : Number(args[k]));

function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(base)) {
    for (const d of readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const p = join(base, d, 'chrome-linux', 'chrome');
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

async function openPage(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: Math.round(width * 9 / 16) } });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(pathToFileURL(join(ROOT, 'studio.html')).href + `?render&w=${width}`);
  await page.evaluate(() => window.ready);
  return page;
}

const toBuffer = url => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
const launch = () => chromium.launch({ executablePath: chromePath(), args: ['--disable-web-security', '--allow-file-access-from-files'] });

async function frames() {
  const fps = num('fps', 30), width = num('w', 1920), workers = num('workers', 4);
  const length = await (async () => {
    const b = await launch(); const p = await openPage(b, 320);
    const l = await p.evaluate(() => SONG.length); await b.close(); return l;
  })();
  const [a, b] = (typeof args.frames === 'string' ? args.frames : `0:${length}`).split(':').map(Number);
  const dir = join(ROOT, 'out', 'frames');
  mkdirSync(dir, { recursive: true });
  const todo = [];
  for (let f = Math.round(a * fps); f < Math.min(Math.round(b * fps), Math.ceil(length * fps)); f++) {
    const path = join(dir, `${String(f).padStart(5, '0')}.jpg`);
    if (args.force || !existsSync(path)) todo.push([f, path]);
  }
  console.log(`${todo.length} frames to paint at ${width}px, ${workers} workers`);
  const browser = await launch();
  let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = await openPage(browser, width);
    for (let i = w; i < todo.length; i += workers) {
      const [f, path] = todo[i];
      writeFileSync(path, toBuffer(await page.evaluate(([t]) => window.frameJpeg(t, 0.93), [f / fps])));
      if (++done % 60 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${todo.length}  ${(el / done * workers * 1000).toFixed(0)} ms/frame/worker  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
      }
    }
  }));
  await browser.close();
  console.log(`painted ${done} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

function encode() {
  const fps = num('fps', 30), crf = num('crf', 20);
  const out = resolve(ROOT, typeof args.out === 'string' ? args.out : 'out/goding-life.mp4');
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-stats', '-framerate', String(fps),
    '-i', join(ROOT, 'out', 'frames', '%05d.jpg'), '-i', join(ROOT, 'assets', 'song.m4a'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'copy', '-shortest', out], { stdio: 'inherit' });
  console.log('wrote', out);
}

async function sheet() {
  const times = String(args.sheet).split(',').map(Number);
  const cols = num('cols', 3), cw = num('cw', 640);
  const out = resolve(ROOT, typeof args.out === 'string' ? args.out : 'out/check/sheet.jpg');
  mkdirSync(dirname(out), { recursive: true });
  const browser = await launch();
  const page = await openPage(browser, 1280);
  const { url, ms } = await page.evaluate(([t, c, w]) => window.sheet(t, c, w), [times, cols, cw]);
  writeFileSync(out, toBuffer(url));
  await browser.close();
  console.log(`wrote ${out}  (${ms.map(m => m.toFixed(0)).join(', ')} ms)`);
}

async function stills() {
  const times = String(args.stills).split(',').map(Number);
  const base = resolve(ROOT, typeof args.out === 'string' ? args.out : 'out/check/still');
  mkdirSync(dirname(base), { recursive: true });
  const browser = await launch();
  const page = await openPage(browser, num('w', 1920));
  for (const t of times) {
    const path = `${base}_${t.toFixed(2)}.jpg`;
    writeFileSync(path, toBuffer(await page.evaluate(([x]) => window.frameJpeg(x, 0.92), [t])));
    console.log('wrote', path);
  }
  await browser.close();
}

if (args.frames) await frames();
else if (args.encode) encode();
else if (args.sheet) await sheet();
else if (args.stills) await stills();
else console.log('usage: node render.mjs --frames | --encode | --sheet=t,t,t | --stills=t,t');
