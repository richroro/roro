// Arranges a score as a piano ballad: no voice. An electric piano plays the tune (the words run
// underneath as subtitles), a second piano comps, strings swell under the choruses, a round bass
// and a soft kit hold it together.
//
//   node song/ballad.mjs gajang/song/score.mjs   -> gajang/out/song.wav, assets/song.m4a, src/song.js
//
// Same outputs, same score format and same cue sounds as synth.mjs; only the band differs.

import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ffmpegPath } from '../tools/ffmpeg.mjs';
import {
  SR, TAU, N, init, rnd, noise, hz, clamp, blep, SVF, Bus, idx, cueSounds,
  freeverb, pingpong, peak, scale, master, wav, epiano, glock, bowed,
} from './dsp.mjs';

if (!process.argv[2]) { console.error('usage: node song/ballad.mjs <project>/song/score.mjs'); process.exit(1); }
const scorePath = resolve(process.argv[2]);
const S = await import(pathToFileURL(scorePath).href);
const ROOT = join(dirname(scorePath), '..');
init(S.LENGTH);

const sectionAt = bar => [...S.SECTIONS].reverse().find(s => bar >= s.bar)?.id ?? 'intro';
const chordAt = bar => S.chordTones(S.CHORDS[Math.min(bar, S.CHORDS.length - 1)], S.keyAt(bar));
const T = (bar, beat = 0) => (bar * 4 + beat) * S.BEAT;
const isChorus = sec => sec.startsWith('chorus');

const drums = new Bus(), bass = new Bus(), keys = new Bus(), tune = new Bus(), strings = new Bus(), fx = new Bus();

// ---- instruments --------------------------------------------------------------------------------

function bassNote(t, dur, midi, gain = 1) {
  const i0 = idx(t), f = new SVF(), dt = hz(midi) / SR, len = Math.floor((dur + 0.08) * SR);
  let ph = rnd();
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const saw = 2 * ph - 1 - blep(ph, dt);
    const sine = Math.sin(TAU * ph), oct = Math.sin(TAU * 2 * ph);
    ph += dt; if (ph >= 1) ph -= 1;
    f.run(saw, 380 + 500 * Math.exp(-s * 10), 0.9);
    const env = Math.min(1, s / 0.01) * Math.exp(-s * 0.9) * (s > dur ? Math.exp(-(s - dur) * 50) : 1);
    bass.add(i0 + n, (sine * 0.8 + oct * 0.12 + f.lp * 0.35) * env * 0.5 * gain);
  }
}

// a soft kit
function kick(t, gain = 1) {
  const i0 = idx(t);
  let ph = 0;
  for (let n = 0; n < SR * 0.5; n++) {
    const s = n / SR;
    ph += (48 + 70 * Math.exp(-s * 28)) / SR;
    drums.add(i0 + n, Math.sin(TAU * ph) * Math.exp(-s * 7.5) * 0.75 * gain);
  }
}
function snare(t, gain = 1) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * 0.4; n++) {
    const s = n / SR;
    f.run(noise(), 2600, 0.7);
    const body = Math.sin(TAU * 185 * s) * Math.exp(-s * 26) * 0.4;
    drums.add(i0 + n, (body + f.bp * 0.7 * Math.exp(-s * 10)) * 0.42 * gain);
  }
}
function rim(t, gain = 1) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * 0.06; n++) {
    const s = n / SR;
    f.run(noise(), 1800, 0.5);
    drums.add(i0 + n, (f.bp * 0.6 + Math.sin(TAU * 820 * s) * 0.5) * Math.exp(-s * 70) * 0.28 * gain, -0.15);
  }
}
function hat(t, gain = 1) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * 0.05; n++) {
    f.run(noise(), 9000, 0.8);
    drums.add(i0 + n, f.hp * Math.exp(-(n / SR) * 70) * 0.1 * gain, 0.3);
  }
}
function tom(t, midi, gain = 1) {
  const i0 = idx(t), f0 = hz(midi);
  let ph = 0;
  for (let n = 0; n < SR * 0.45; n++) {
    const s = n / SR;
    ph += f0 * (1 + 0.4 * Math.exp(-s * 20)) / SR;
    drums.add(i0 + n, Math.sin(TAU * ph) * Math.exp(-s * 8) * 0.45 * gain, (midi - 45) / 30);
  }
}
function crash(t, gain = 1) {
  const i0 = idx(t), fl = new SVF(), fr = new SVF();
  for (let n = 0; n < SR * 2.8; n++) {
    const s = n / SR, e = Math.exp(-s * 1.4) * Math.min(1, s / 0.01) * 0.15 * gain;
    fl.run(noise(), 7000, 0.7); fr.run(noise(), 7000, 0.7);
    drums.L[i0 + n] += fl.hp * e; drums.R[i0 + n] += fr.hp * e;
  }
}

// ---- the arrangement ----------------------------------------------------------------------------

function voicing(pcs, lo, hi) {
  const out = [];
  for (const pc of pcs) { let m = lo; while (m % 12 !== pc) m++; out.push(m); }
  return out.sort((a, b) => a - b).map(m => (m > hi ? m - 12 : m));
}

function keysBar(bar) {
  const sec = sectionAt(bar);
  const pcs = chordAt(bar);
  const root = 36 + pcs[0];
  const rh = voicing(pcs, 60, 74);
  const lh = [root + 12, root + 19];
  const b = beat => T(bar, beat);
  if (sec === 'end') {
    // the last chord, rolled up from the bottom
    [root, root + 7, root + 12, ...rh, rh[0] + 12].forEach((m, i) => epiano(keys, b(0) + i * 0.045, m, S.BAR * 1.4, 0.55, (i - 3) * 0.12));
    return;
  }
  if (sec === 'intro' && bar < 4) {
    // alone at the piano: slow broken chords with the ninth added
    const notes = [lh[0], rh[0], rh[1], rh[2], rh[0] + 12, rh[2], rh[1], rh[0]];
    notes.forEach((m, i) => epiano(keys, b(i * 0.5), m, S.BEAT * 1.6, 0.3 + (bar * 0.02), (i % 3 - 1) * 0.3));
    return;
  }
  const chorus = isChorus(sec) || sec === 'outro';
  if (chorus) {
    // pop-ballad comping: block chords that push the "and" of two
    for (const [bt, v] of [[0, 0.46], [1.5, 0.36], [2, 0.4], [3, 0.34]]) rh.forEach((m, i) => epiano(keys, b(bt) + i * 0.008, m, S.BEAT * (bt === 1.5 ? 0.5 : 0.9), v, (i - 1) * 0.3));
    epiano(keys, b(0), lh[0] - 12, S.BEAT * 1.8, 0.5, -0.2); epiano(keys, b(2), lh[0] - 12, S.BEAT * 1.8, 0.45, -0.2);
    return;
  }
  if (sec === 'bridge' && bar < 52) {
    rh.forEach((m, i) => epiano(keys, b(0) + i * 0.03, m, S.BAR * 0.95, 0.3, (i - 1) * 0.3));
    epiano(keys, b(0), lh[0], S.BAR * 0.95, 0.35, -0.2);
    return;
  }
  if (sec === 'build' || sec.startsWith('pre')) {
    const steps = sec === 'build' ? 8 : 4;
    for (let q = 0; q < steps; q++) {
      if (bar === 57 && q >= 6) break;
      const v = 0.3 + 0.2 * q / steps + (sec === 'build' ? (bar - 56) * 0.1 : 0);
      rh.forEach((m, i) => epiano(keys, b(q * 4 / steps) + i * 0.006, m, S.BEAT * 4 / steps * 0.9, v, (i - 1) * 0.3));
    }
    epiano(keys, b(0), lh[0], S.BAR * 0.9, 0.4, -0.2);
    return;
  }
  // verses, the intro melody bars, the second half of the bridge: flowing eighths
  const flow = [lh[0], lh[1], rh[0] + (rh[0] < lh[1] ? 12 : 0), rh[1], rh[2], rh[1], rh[0], lh[1]];
  const v = sec === 'verse2' || sec === 'bridge' ? 0.34 : 0.3;
  flow.forEach((m, i) => epiano(keys, b(i * 0.5), m, S.BEAT * 1.2, v * (i === 0 ? 1.15 : 1), (i % 4 - 1.5) * 0.25));
}

function bassBar(bar) {
  const sec = sectionAt(bar);
  if (sec === 'intro' && bar < 4) return;
  if (sec === 'verse1' && bar < 12) return;
  if (sec === 'bridge' && bar < 52) return;
  const pcs = chordAt(bar);
  let root = 36 + pcs[0];
  if (root > 45) root -= 12;
  const b = beat => T(bar, beat);
  if (sec === 'end') { bassNote(b(0), S.BAR * 1.4, root); return; }
  if (isChorus(sec) || sec === 'outro') {
    bassNote(b(0), S.BEAT * 1.4, root); bassNote(b(1.5), S.BEAT * 0.45, root);
    bassNote(b(2), S.BEAT * 1.4, root + (bar % 2 ? 7 : 0)); bassNote(b(3.5), S.BEAT * 0.45, root + 12, 0.7);
    return;
  }
  if (sec === 'build') { for (let e = 0; e < 8; e++) if (!(bar === 57 && e >= 6)) bassNote(b(e / 2), S.BEAT * 0.4, root); return; }
  bassNote(b(0), S.BEAT * 1.9, root); bassNote(b(2), S.BEAT * 1.4, root + 7, 0.8);
  if (sec !== 'intro') bassNote(b(3.5), S.BEAT * 0.45, root + (bar % 2 ? 12 : 4), 0.6);
}

function drumBar(bar) {
  const sec = sectionAt(bar);
  const b = beat => T(bar, beat);
  if (sec === 'end') { kick(b(0), 1.1); crash(b(0), 1.4); return; }
  if (sec === 'intro') { if (bar === 4) crash(b(0), 0.7); return; }
  if (sec === 'verse1' && bar < 12) return;
  if (sec === 'bridge') {
    if (bar < 52) return;
    if (bar < 54) { kick(b(0), 0.8); rim(b(3), 0.8); return; }
    kick(b(0)); kick(b(2)); snare(b(1), 0.7); snare(b(3), 0.7);
    for (let e = 0; e < 8; e++) hat(b(e / 2), e % 2 ? 0.6 : 1);
    if (bar === 55) [0, 1, 2, 3].forEach(i => tom(b(2 + i * 0.5), 50 - i * 4, 0.7 + i * 0.1));
    return;
  }
  if (sec === 'build') {
    for (let q = 0; q < 4; q++) if (!(bar === 57 && q === 3)) kick(b(q), 0.9);
    const steps = bar === 56 ? 8 : 12;
    for (let s = 0; s < steps; s++) (bar === 56 ? tom(b(s / 2), 43 + s, 0.6 + s * 0.04) : snare(b(s / 4), 0.35 + s * 0.05));
    return;
  }
  const chorus = isChorus(sec) || sec === 'outro';
  const pre = sec.startsWith('pre');
  if (sec === 'verse1') { kick(b(0), 0.7); kick(b(2.5), 0.5); rim(b(1)); rim(b(3)); for (let e = 0; e < 8; e++) hat(b(e / 2), 0.5); return; }
  if (chorus) { kick(b(0)); kick(b(1.5), 0.7); kick(b(2), 0.9); }
  else { kick(b(0), 0.9); kick(b(2.5), 0.7); }
  snare(b(1), pre ? 0.6 : 0.85); snare(b(3), pre ? 0.6 : 0.85);
  for (let e = 0; e < 8; e++) hat(b(e / 2), e % 2 ? 0.6 : 1);
  const preEnd = pre && S.SECTIONS.find(s => s.id === sec).bar + 3 === bar;
  if (preEnd) [0, 1, 2, 3].forEach(i => tom(b(2 + i * 0.5), 52 - i * 4, 0.7));
  if (chorus && S.LINES.some(l => l[0] === bar)) crash(b(0), 0.9);
}

function stringsBar(bar) {
  const sec = sectionAt(bar);
  const want = { chorus1: 0.8, verse2: 0.45, pre2: 0.6, chorus2: 1, bridge: bar < 52 ? 0.7 : 0.9, build: 1, chorus3: 1.15, outro: 0.9, end: 1, intro: bar >= 4 ? 0.4 : 0, pre1: 0.4 }[sec] ?? 0;
  if (!want) return;
  const notes = voicing(chordAt(bar), 50, 66);
  const cut = isChorus(sec) ? 2300 : sec === 'end' ? 2600 : 1500;
  const dur = sec === 'end' ? S.BAR * 1.3 : S.BAR * 1.02;
  notes.forEach((m, i) => bowed(strings, T(bar), m, dur, want * 0.55, cut, 0.35, (i - 1) * 0.5));
}

function tuneLines() {
  for (const l of S.LINES.map(S.layLine)) {
    const sec = sectionAt(l.bar);
    const chorus = isChorus(sec) || sec === 'outro';
    for (const n of l.notes) {
      epiano(tune, n.t, n.midi, n.dur * 0.95, chorus ? 0.8 : 0.7, 0, 1.25);
      if (chorus && sec !== 'chorus1') bowed(tune, n.t, n.midi - 12, n.dur, 0.35, 2400, 0.08, 0);
      if (sec === 'chorus3' || sec === 'outro') glock(tune, n.t, n.midi + 12, 0.8);
    }
  }
  for (const r of S.RIFF.map(S.layRiff)) for (const n of r.notes) epiano(tune, n.t, n.midi, n.dur * 0.95, 0.62, 0, 1.2);
}

// ---- go -----------------------------------------------------------------------------------------

const problems = S.validate();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const clock = Date.now();
const step = what => console.log(`${((Date.now() - clock) / 1000).toFixed(1)}s  ${what}`);
for (let bar = 0; bar <= S.END_BAR; bar++) { keysBar(bar); bassBar(bar); drumBar(bar); stringsBar(bar); }
step('band');
tuneLines(); step('tune');
cueSounds(S, fx, crash); step('effects');

const GAIN = { drums: 0.9, bass: 0.7, keys: 0.85, tune: 1.4, strings: 0.4, fx: 0.55 };
const parts = { drums, bass, keys, tune, strings, fx };
const sendL = new Float32Array(N), sendR = new Float32Array(N);
for (const [name, amt] of [['tune', 0.3], ['keys', 0.22], ['strings', 0.45], ['drums', 0.12], ['fx', 0.3]]) {
  const bus = parts[name];
  for (let n = 0; n < N; n++) { sendL[n] += bus.L[n] * amt; sendR[n] += bus.R[n] * amt; }
}
const [vL, vR] = freeverb(sendL, sendR, 0.88, 0.35); step('reverb');
const dl = new Float32Array(N), dr = new Float32Array(N);
for (let n = 0; n < N; n++) { dl[n] = tune.L[n] * 0.25; dr[n] = tune.R[n] * 0.25; }
const [eL, eR] = pingpong(dl, dr, S.BEAT * 0.75, 0.3, 0.45);
const verb = { L: vL, R: vR }, echo = { L: eL, R: eR };
const mixParts = [...Object.entries(parts).map(([k, b]) => [b, GAIN[k]]), [verb, 0.75], [echo, 0.7]];

if (process.env.LEVELS) {
  const a = idx(S.barTime(20)), z = idx(S.barTime(28));
  for (const [name, bus, g] of [...Object.entries(parts).map(([k, b]) => [k, b, GAIN[k]]), ['verb', verb, 0.75], ['echo', echo, 0.7]]) {
    let e = 0;
    for (let n = a; n < z; n++) e += (bus.L[n] * g) ** 2 + (bus.R[n] * g) ** 2;
    console.log(name.padEnd(8), (10 * Math.log10(e / (2 * (z - a)) + 1e-12)).toFixed(1), 'dB');
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
void scale;

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
  `// Generated by song/ballad.mjs from song/score.mjs. Do not edit by hand.\nwindow.SONG = ${JSON.stringify(S.forPage())};\n`);
step('wrote out/song.wav, assets/song.m4a, src/song.js');
