// The rap voice: a Korean text-to-speech model reads each phrase, and each reading is trimmed,
// stretched (keeping its pitch) to the span its syllables take in the score, and dropped onto
// the beat. Rapped lines are up front and dry-ish; chorus lines are chanted, doubled and wider.
//
// The speech comes from MeloTTS (MIT licence, https://github.com/myshell-ai/MeloTTS) through
// tools/tts_melo.py, and every reading is cached in <project>/out/tts/, so only new or changed
// phrases are spoken again. TTS=dummy swaps the model for tones, to test the timing without it.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpegPath } from '../tools/ffmpeg.mjs';
import { SR, TAU, N, Bus, idx } from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const isSyl = ch => ch >= '가' && ch <= '힣';

/** Split a laid-out line into phrases at its commas: [{ text, t, end }]. */
export function phrases(line) {
  const out = [];
  let text = '', first = null, last = null, k = 0;
  const flush = () => { if (first !== null) out.push({ text: text.trim(), t: first.t, end: last.t + last.dur }); text = ''; first = null; };
  for (const c of line.words) {
    if (isSyl(c)) { const n = line.notes[k++]; if (first === null) first = n; last = n; text += c; }
    else if (/[,]/.test(c)) flush();
    else text += c;
  }
  flush();
  return out.filter(p => p.text.length);
}

const keyOf = (text, speed) => createHash('sha1').update(`${process.env.TTS || 'melo'}|${speed}|${text}`).digest('hex').slice(0, 16);

/** Speak everything that is not cached yet, in one go (the model loads once). */
function speakAll(jobs, cacheDir) {
  const todo = [];
  for (const [text, speed] of jobs) {
    const wav = join(cacheDir, `${keyOf(text, speed)}.wav`);
    if (existsSync(wav) || todo.some(j => j[1] === wav)) continue;
    todo.push([text, wav, speed]);
  }
  if (!todo.length) return;
  console.log(`speaking ${todo.length} new phrases`);
  if (process.env.TTS === 'dummy') {
    // a blip per syllable, so the timing can be heard without the model
    for (const [text, wav] of todo) {
      const syl = [...text].filter(isSyl).length, per = 0.16, len = Math.ceil((syl * per + 0.1) * SR);
      const buf = new Float32Array(len);
      for (let s = 0; s < syl; s++) for (let n = 0; n < per * SR * 0.8; n++) buf[Math.floor(s * per * SR) + n] = Math.sin(TAU * 220 * n / SR) * 0.5;
      execFileSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', 'pipe:0', wav], { input: Buffer.from(buf.buffer) });
    }
    return;
  }
  const jobFile = join(cacheDir, 'jobs.json');
  writeFileSync(jobFile, JSON.stringify(todo));
  execFileSync('python3', [join(HERE, '..', 'tools', 'tts_melo.py'), jobFile], { stdio: ['ignore', 'inherit', 'inherit'] });
}
const cached = (text, speed, cacheDir) => join(cacheDir, `${keyOf(text, speed)}.wav`);

/** Read a WAV as mono float at SR, silence trimmed at both ends, stretched to `target` seconds. */
function fit(wav, target) {
  const trim = 'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse';
  const raw = execFileSync(ffmpegPath(), ['-loglevel', 'error', '-i', wav, '-af', trim, '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'pipe:1'], { maxBuffer: 1 << 28 });
  const src = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const have = src.length / SR;
  let tempo = have / target;
  tempo = Math.max(0.6, Math.min(1.9, tempo));        // past this a stretch starts to sound broken
  const chain = [];
  for (let r = tempo; ; ) { if (r > 2) { chain.push('atempo=2'); r /= 2; } else if (r < 0.5) { chain.push('atempo=0.5'); r /= 0.5; } else { chain.push(`atempo=${r.toFixed(4)}`); break; } }
  const out = execFileSync(ffmpegPath(), ['-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', 'pipe:0',
    '-af', chain.join(','), '-f', 'f32le', 'pipe:1'], { input: Buffer.from(src.buffer, src.byteOffset, src.byteLength), maxBuffer: 1 << 28 });
  return new Float32Array(out.buffer, out.byteOffset, out.length / 4);
}

/** A light vocal chain: highpass, a gentle compressor and a touch of saturation. */
function chain(x) {
  let hp = 0, prev = 0, env = 0;
  const a = Math.exp(-TAU * 90 / SR), att = Math.exp(-1 / (0.004 * SR)), rel = Math.exp(-1 / (0.12 * SR));
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    hp = a * (hp + x[n] - prev); prev = x[n];
    const lvl = Math.abs(hp);
    env = lvl > env ? att * env + (1 - att) * lvl : rel * env + (1 - rel) * lvl;
    const over = Math.max(1, env / 0.12);
    const g = Math.pow(over, -0.6);                       // about 2.5:1 above the knee
    y[n] = Math.tanh(hp * g * 2.2) / 2.2;
  }
  return y;
}

/**
 * Speak every line of the score onto a new Bus and return it.
 * S.RAPPED says which lines are rapped; the rest are chanted.
 */
export function rapVocals(S, root) {
  const cacheDir = join(root, 'out', 'tts');
  mkdirSync(cacheDir, { recursive: true });
  const bus = new Bus();
  const lines = S.LINES.map(S.layLine);
  const tailOf = line => {
    const ps = phrases(line), last = ps[ps.length - 1];
    const words = last.text.split(/\s+/), tail = words[words.length - 1];
    const syl = [...tail].filter(isSyl).length;
    return { tail, t: line.notes[line.notes.length - syl].t, end: last.end };
  };
  const jobs = [];
  for (const line of lines) {
    const rapped = S.RAPPED.has(line.bar);
    for (const p of phrases(line)) jobs.push([p.text, rapped ? 1.15 : 1.0]);
    if (rapped) jobs.push([tailOf(line).tail, 1.15]);
  }
  speakAll(jobs, cacheDir);
  let spoken = 0;
  for (const line of lines) {
    const rapped = S.RAPPED.has(line.bar);
    for (const p of phrases(line)) {
      const target = Math.max(0.25, p.end - p.t);
      const wav = cached(p.text, rapped ? 1.15 : 1.0, cacheDir);
      const v = chain(fit(wav, target));
      spoken++;
      const i0 = idx(p.t - 0.02);
      if (rapped) {
        for (let n = 0; n < v.length; n++) bus.add(i0 + n, v[n] * 0.9, 0);
      } else {
        // chanted: two takes a hair apart, spread left and right, under the lead
        const d = Math.floor(0.012 * SR);
        for (let n = 0; n < v.length; n++) { bus.add(i0 + n, v[n] * 0.55, -0.45); bus.add(i0 + d + n, v[n] * 0.55, 0.45); }
      }
    }
    // the hype double: the last phrase of a rapped line, echoed quietly out wide
    if (rapped) {
      const { tail, t: tailStart, end } = tailOf(line);
      const v = chain(fit(cached(tail, 1.15, cacheDir), Math.max(0.2, end - tailStart)));
      const i0 = idx(tailStart), d = Math.floor(0.02 * SR);
      for (let n = 0; n < v.length; n++) { bus.add(i0 + d + n, v[n] * 0.3, 0.7); bus.add(i0 + d * 2 + n, v[n] * 0.3, -0.7); }
    }
  }
  console.log(`rap voice: ${spoken} phrases`);
  void N;
  return bus;
}
