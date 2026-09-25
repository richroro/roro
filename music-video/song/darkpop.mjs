// Arranges a score as dark, minimal bedroom pop: a sub-heavy 808 that slides between notes and
// growls in the choruses, finger snaps and claps on a half-time backbeat, tight hats with trap
// rolls, a felt piano with the top taken off, a breathy synth singing the tune an octave pair
// apart, and small close-up sounds (breaths before each line, mouth-click ticks) in a lot of
// space. No voice: the words run underneath as subtitles.
//
//   node song/darkpop.mjs gajang/song/score.mjs   -> gajang/out/song.wav, assets/song.m4a, src/song.js

import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ffmpegPath } from '../tools/ffmpeg.mjs';
import {
  SR, TAU, N, init, rnd, noise, hz, clamp, SVF, Bus, idx, cueSounds,
  freeverb, pingpong, duck, peak, master, wav, epiano, bowed,
} from './dsp.mjs';

if (!process.argv[2]) { console.error('usage: node song/darkpop.mjs <project>/song/score.mjs'); process.exit(1); }
const scorePath = resolve(process.argv[2]);
const S = await import(pathToFileURL(scorePath).href);
const ROOT = join(dirname(scorePath), '..');
init(S.LENGTH);

const sectionAt = bar => [...S.SECTIONS].reverse().find(s => bar >= s.bar)?.id ?? 'intro';
const chordAt = bar => S.chordTones(S.CHORDS[Math.min(bar, S.CHORDS.length - 1)], S.keyAt(bar));
const T = (bar, beat = 0) => (bar * 4 + beat) * S.BEAT;
const isChorus = sec => sec.startsWith('chorus');
const h = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

const sub = new Bus(), beat = new Bus(), keys = new Bus(), lead = new Bus(), pad = new Bus(), air = new Bus(), fx = new Bus();
const kicks = [];

// ---- instruments --------------------------------------------------------------------------------

/** The 808: a sine that starts with a thump, slides from the last note, and growls when driven. */
function eight08(t, dur, midi, from = null, drive = 1.2, gain = 1) {
  kicks.push(t);
  const i0 = idx(t), len = Math.floor((dur + 0.06) * SR);
  let ph = 0;
  const norm = Math.tanh(drive);
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const slide = from === null ? 0 : (from - midi) * Math.exp(-s / 0.05);
    const punch = 12 * Math.exp(-s / 0.012);
    ph += hz(midi + slide + punch) / SR;
    const env = Math.min(1, s / 0.002) * Math.exp(-s * 0.55) * (s > dur ? Math.exp(-(s - dur) * 60) : 1);
    const y = Math.tanh(Math.sin(TAU * ph) * drive) / norm;
    sub.add(i0 + n, y * env * 0.7 * gain);
  }
}

function kick(t, gain = 1) {
  kicks.push(t);
  const i0 = idx(t);
  let ph = 0;
  for (let n = 0; n < SR * 0.3; n++) {
    const s = n / SR;
    ph += (50 + 140 * Math.exp(-s * 40)) / SR;
    const click = n < 60 ? noise() * (1 - n / 60) * 0.3 : 0;
    beat.add(i0 + n, (Math.sin(TAU * ph) * Math.exp(-s * 14) + click) * 0.8 * gain);
  }
}

/** A finger snap: a crack of band-limited noise and a hint of skin. */
function snap(t, gain = 1, pan = 0) {
  const i0 = idx(t), a = new SVF(), b = new SVF();
  for (let n = 0; n < SR * 0.12; n++) {
    const s = n / SR, x = noise();
    a.run(x, 2300, 0.5); b.run(x, 5200, 0.8);
    const y = (a.bp * 0.5 + b.bp * 0.35) * Math.exp(-s * 55) + Math.sin(TAU * 1250 * s) * Math.exp(-s * 90) * 0.15;
    beat.add(i0 + n, y * 0.9 * gain, pan);
  }
}
/** A clap: three quick bursts and a tail. */
function clap(t, gain = 1) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * 0.25; n++) {
    const s = n / SR;
    f.run(noise(), 1400, 0.6);
    const bursts = s < 0.03 ? Math.exp(-((s % 0.01) * 400)) : Math.exp(-(s - 0.03) * 16);
    beat.add(i0 + n, f.bp * bursts * 0.55 * gain);
  }
}
function hat(t, gain = 1, pan = 0.25) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * 0.04; n++) {
    f.run(noise(), 10000, 0.9);
    beat.add(i0 + n, f.hp * Math.exp(-(n / SR) * 95) * 0.11 * gain, pan);
  }
}
/** A tiny mouth-click tick, very close to the ear. */
function tick(t, gain, pan) {
  const i0 = idx(t), f = 3200 + h(t, 3) * 2400;
  for (let n = 0; n < SR * 0.006; n++) {
    const s = n / SR;
    air.add(i0 + n, Math.sin(TAU * f * s) * Math.exp(-s * 900) * 0.18 * gain, pan);
  }
}
/** A breath in, just before a line. */
function breath(t, len = 0.45, gain = 1) {
  const i0 = idx(t), a = new SVF(), b = new SVF();
  for (let n = 0; n < len * SR; n++) {
    const x = n / (len * SR);
    const env = Math.sin(Math.PI * Math.min(1, x * 1.2)) ** 2;
    const nz = noise();
    a.run(nz, 1300 + 900 * x, 1.1); b.run(nz, 3200, 1.4);
    air.add(i0 + n, (a.bp * 1.1 + b.bp * 0.5) * env * 0.11 * gain, 0);
  }
}

/** The lead: a soft, breathy synth voice that slides between notes, with a little vibrato. */
function breathy(t, dur, midi, from, gain = 1, pan = 0) {
  const i0 = idx(t), rel = 0.14, len = Math.floor((dur + rel) * SR);
  const f = new SVF(), air1 = new SVF();
  let ph = rnd();
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const slide = from === null ? 0 : (from - midi) * Math.exp(-s / 0.045);
    const vib = s > 0.25 ? 0.12 * Math.sin(TAU * 5.3 * s) * Math.min(1, (s - 0.25) / 0.3) : 0;
    const fr = hz(midi + slide + vib);
    ph += fr / SR; if (ph > 1) ph -= 1;
    const tone = Math.sin(TAU * ph) + 0.28 * Math.sin(TAU * 2 * ph) + 0.1 * Math.sin(TAU * 3 * ph);
    f.run(tone, 2200, 0.8);
    air1.run(noise(), fr * 2.2, 0.6);
    const env = Math.min(1, s / 0.025) * (s > dur ? Math.exp(-(s - dur) / rel * 4) : 1) * (1 - 0.18 * Math.min(1, s / 1.5));
    lead.add(i0 + n, (f.lp * 0.85 + air1.bp * 0.5) * env * 0.3 * gain, pan);
  }
}

// ---- the arrangement ----------------------------------------------------------------------------

function voicing(pcs, lo, hi) {
  const out = [];
  for (const pc of pcs) { let m = lo; while (m % 12 !== pc) m++; out.push(m); }
  return out.sort((a, b) => a - b).map(m => (m > hi ? m - 12 : m));
}
const rootOf = bar => { let r = 24 + chordAt(bar)[0]; if (r < 26) r += 12; return r; };   // D1..C#2
let last808 = null;
const play808 = (t, dur, midi, drive, gain) => { eight08(t, dur, midi, last808, drive, gain); last808 = midi; };

function bar808(bar) {
  const sec = sectionAt(bar);
  if ((sec === 'intro' && bar < 4) || (sec === 'verse1' && bar < 10) || (sec === 'bridge' && bar < 54)) { last808 = null; return; }
  const r = rootOf(bar), b = beat => T(bar, beat);
  if (sec === 'end') { play808(b(0), S.BAR * 1.4, r, 1.6, 1.1); return; }
  if (sec === 'intro') { play808(b(0), S.BAR * 0.95, r, 1.1, 0.8); return; }
  if (isChorus(sec) || sec === 'outro') {
    const d = sec === 'chorus3' ? 2.8 : 2.2;
    play808(b(0), S.BEAT * 1.4, r, d); play808(b(1.5), S.BEAT * 0.8, r, d, 0.85);
    play808(b(2.5), S.BEAT * 0.9, r + (bar % 2 ? 7 : 0), d, 0.9);
    play808(b(3.5), S.BEAT * 0.45, r + 12, d, 0.7);
    return;
  }
  if (sec === 'build') {
    for (let q = 0; q < 4; q++) if (!(bar === 57 && q === 3)) play808(b(q), S.BEAT * 0.9, r + q * (bar === 57 ? 2 : 0), 1.8, 0.9);
    return;
  }
  if (sec.startsWith('pre')) {
    const lastBar = S.SECTIONS.find(s => s.id === sec).bar + 3 === bar;
    play808(b(0), S.BEAT * (lastBar ? 3.4 : 3.8), r, 1.4);
    return;
  }
  // verses and the end of the bridge: a root, then a pickup that slides into the next bar
  play808(b(0), S.BEAT * 2.2, r, 1.3);
  play808(b(2.75), S.BEAT * 1.1, bar % 2 ? r + 7 : r + 12, 1.3, 0.75);
}

function beatBar(bar) {
  const sec = sectionAt(bar), b = beat => T(bar, beat);
  // ticks everywhere except the very top, like somebody close to the mic
  if (!(sec === 'intro' && bar < 2) && sec !== 'end') {
    for (let s = 0; s < 16; s++) if (h(bar, s) > 0.8) tick(b(s / 4 + 0.03), 0.6 + h(s, bar), h(bar * 16 + s, 9) * 1.6 - 0.8);
  }
  if (sec === 'end') { kick(b(0), 1.1); clap(b(0), 0.8); return; }
  if (sec === 'intro') { if (bar >= 6) { snap(b(1), 0.7, -0.2); snap(b(3), 0.7, 0.2); } return; }
  if (sec === 'bridge' && bar < 54) return;
  if (sec === 'build') {
    kick(b(0));
    const steps = bar === 56 ? 8 : 12;
    for (let s = 0; s < steps; s++) hat(b(s * (bar === 56 ? 0.5 : 0.25)), 0.6 + s * 0.05);
    for (let s = 0; s < (bar === 56 ? 4 : 6); s++) snap(b(s * (bar === 56 ? 1 : 0.5)), 0.6 + s * 0.08, s % 2 ? 0.3 : -0.3);
    return;
  }
  const chorus = isChorus(sec) || sec === 'outro';
  const pre = sec.startsWith('pre');
  const preEnd = pre && S.SECTIONS.find(s => s.id === sec).bar + 3 === bar;
  if (chorus) { kick(b(0)); kick(b(2.5), 0.85); }
  else if (sec !== 'verse1' || bar >= 10) kick(b(0), 0.8);
  snap(b(1), 1, -0.15); snap(b(3), 1, 0.15);
  if (chorus || sec === 'verse2') { clap(b(1), chorus ? 0.9 : 0.5); clap(b(3), chorus ? 0.9 : 0.5); }
  const hats = chorus || pre || sec === 'verse2' || (sec === 'verse1' && bar >= 12) || sec === 'bridge';
  if (hats) {
    for (let e = 0; e < 8; e++) {
      if (preEnd && e >= 7) break;            // the half beat of nothing before the drop
      hat(b(e / 2), e % 2 ? 0.55 : 0.9, e % 2 ? 0.35 : -0.1);
    }
    // a trap roll on the last beat of every other bar
    if (bar % 2 === 1 && !preEnd) for (let r = 0; r < 6; r++) hat(b(3 + r / 6), 0.4 + r * 0.08, 0.5 - r * 0.15);
  }
}

function keysBar(bar) {
  const sec = sectionAt(bar), b = beat => T(bar, beat);
  const rh = voicing(chordAt(bar), 57, 70);
  if (sec === 'end') { [rootOf(bar) + 24, ...rh].forEach((m, i) => epiano(keys, b(0) + i * 0.06, m, S.BAR * 1.4, 0.45, (i - 1.5) * 0.3, 0.35)); return; }
  if (sec === 'build') { for (let q = 0; q < 8; q++) if (!(bar === 57 && q >= 6)) rh.forEach(m => epiano(keys, b(q / 2), m, S.BEAT * 0.3, 0.3 + q * 0.03, 0, 0.4)); return; }
  if (isChorus(sec) || sec === 'outro') {
    // short, low stabs that leave the 808 room
    for (const bt of [0, 2.5]) rh.forEach((m, i) => epiano(keys, b(bt) + i * 0.01, m, S.BEAT * 0.6, 0.38, (i - 1) * 0.35, 0.4));
    return;
  }
  // a chord held across the bar, and a two-note figure answering it
  rh.forEach((m, i) => epiano(keys, b(0) + i * 0.02, m, S.BAR * 0.95, 0.36, (i - 1) * 0.35, 0.35));
  if (!(sec === 'intro' && bar < 2)) {
    epiano(keys, b(2.5), rh[2] + 12, S.BEAT * 0.9, 0.22, 0.4, 0.35);
    epiano(keys, b(3), rh[1] + 12, S.BEAT * 0.9, 0.2, -0.4, 0.35);
  }
}

function padBar(bar) {
  const sec = sectionAt(bar);
  const want = { chorus1: 0.7, chorus2: 0.9, chorus3: 1.1, bridge: 1, build: 1, outro: 0.8, end: 1, pre1: 0.5, pre2: 0.6, verse2: 0.35 }[sec] ?? 0;
  if (!want) return;
  const notes = voicing(chordAt(bar), 50, 64);
  notes.forEach((m, i) => bowed(pad, T(bar), m, S.BAR * (sec === 'end' ? 1.4 : 1.02), want * 0.5, 850, 0.9, (i - 1) * 0.6));
}

function leadLines() {
  const lines = S.LINES.map(S.layLine);
  for (const l of lines) {
    const sec = sectionAt(l.bar);
    const chorus = isChorus(sec) || sec === 'outro';
    breath(l.t - 0.5, 0.42, chorus ? 1 : 0.8);
    l.notes.forEach((n, i) => {
      const prev = l.notes[i - 1];
      const from = prev && Math.abs(prev.t + prev.dur - n.t) < 0.02 ? prev.midi : null;
      breathy(n.t, n.dur * 0.97, n.midi, from, chorus ? 1 : 0.85, 0);
      // the octave below, softer, like a double tracked an octave down
      breathy(n.t, n.dur * 0.97, n.midi - 12, from === null ? null : from - 12, chorus ? 0.55 : 0.35, 0);
      if (sec === 'chorus3' || sec === 'outro') breathy(n.t + 0.012, n.dur * 0.95, n.midi + 12, from === null ? null : from + 12, 0.16, 0.5);
    });
  }
  for (const r of S.RIFF.map(S.layRiff)) {
    r.notes.forEach((n, i) => {
      const prev = r.notes[i - 1];
      breathy(n.t, n.dur * 0.97, n.midi, prev ? prev.midi : null, 0.75, 0);
    });
  }
}

/** One-pole lowpass over a whole bus: the felt over the piano. */
function darken(bus, cutoff) {
  const a = Math.exp(-TAU * cutoff / SR);
  let l = 0, r = 0;
  for (let n = 0; n < N; n++) { l = bus.L[n] + (l - bus.L[n]) * a; r = bus.R[n] + (r - bus.R[n]) * a; bus.L[n] = l; bus.R[n] = r; }
}

// ---- go -----------------------------------------------------------------------------------------

const problems = S.validate();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const clock = Date.now();
const step = what => console.log(`${((Date.now() - clock) / 1000).toFixed(1)}s  ${what}`);
for (let bar = 0; bar <= S.END_BAR; bar++) { bar808(bar); beatBar(bar); keysBar(bar); padBar(bar); }
step('band');
leadLines(); step('lead');
cueSounds(S, fx, () => {}); step('effects');

darken(keys, 1500);
duck(pad, 0.4, kicks); duck(keys, 0.2, kicks);
const parts = { sub, beat, keys, lead, pad, air, fx };
const GAIN = { sub: 0.46, beat: 1.5, keys: 1.4, lead: 0.92, pad: 0.56, air: 4.0, fx: 0.45 };
const sendL = new Float32Array(N), sendR = new Float32Array(N);
for (const [name, amt] of [['lead', 0.3], ['keys', 0.35], ['pad', 0.5], ['beat', 0.16], ['air', 0.25], ['fx', 0.3]]) {
  const bus = parts[name];
  for (let n = 0; n < N; n++) { sendL[n] += bus.L[n] * amt; sendR[n] += bus.R[n] * amt; }
}
const [vL, vR] = freeverb(sendL, sendR, 0.9, 0.5); step('reverb');
const dl = new Float32Array(N), dr = new Float32Array(N);
for (let n = 0; n < N; n++) { dl[n] = lead.L[n] * 0.3; dr[n] = lead.R[n] * 0.3; }
const [eL, eR] = pingpong(dl, dr, S.BEAT * 0.75, 0.35, 0.5);
const verb = { L: vL, R: vR }, echo = { L: eL, R: eR };
const mixParts = [...Object.entries(parts).map(([k, b]) => [b, GAIN[k]]), [verb, 0.7], [echo, 0.6]];

if (process.env.LEVELS) {
  const a = idx(S.barTime(20)), z = idx(S.barTime(28));
  for (const [name, bus, g] of [...Object.entries(parts).map(([k, b]) => [k, b, GAIN[k]]), ['verb', verb, 0.7], ['echo', echo, 0.6]]) {
    let e = 0;
    for (let n = a; n < z; n++) e += (bus.L[n] * g) ** 2 + (bus.R[n] * g) ** 2;
    console.log(name.padEnd(6), (10 * Math.log10(e / (2 * (z - a)) + 1e-12)).toFixed(1), 'dB');
  }
}
if (process.env.STEM) {
  const bus = parts[process.env.STEM];
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  const g = 0.9 / peak(bus);
  wav(join(ROOT, 'out', `stem_${process.env.STEM}.wav`), bus.L.map(x => x * g), bus.R.map(x => x * g));
  console.log('wrote stem', process.env.STEM);
  process.exit(0);
}

const silence = S.CUES.find(c => c.kind === 'silence');
const [L, R] = master(mixParts, silence ? [S.barTime(silence.bar), S.barTime(silence.bar + 0.25)] : null);
step('mix');

mkdirSync(join(ROOT, 'out'), { recursive: true });
mkdirSync(join(ROOT, 'assets'), { recursive: true });
mkdirSync(join(ROOT, 'src'), { recursive: true });
const wavPath = join(ROOT, 'out', 'song.wav');
wav(wavPath, L, R);
let sum = 0;
for (let n = 0; n < N; n++) sum += L[n] * L[n] + R[n] * R[n];
console.log(`length ${S.LENGTH.toFixed(2)}s, rms ${(10 * Math.log10(sum / (2 * N))).toFixed(1)} dBFS`);
execFileSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'aac', '-b:a', '192k', join(ROOT, 'assets', 'song.m4a')]);
writeFileSync(join(ROOT, 'src', 'song.js'),
  `// Generated by song/darkpop.mjs from song/score.mjs. Do not edit by hand.\nwindow.SONG = ${JSON.stringify(S.forPage())};\n`);
step('wrote out/song.wav, assets/song.m4a, src/song.js');
