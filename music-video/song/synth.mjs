// Renders the song from score.mjs: no samples, no libraries, every sound is made here.
//
//   node song/synth.mjs                          -> out/song.wav, assets/song.m4a, src/song.js
//   node song/synth.mjs gajang/song/score.mjs    -> the same files under gajang/
//
// The outputs land in the project that owns the score (the folder above its song/).
//
// The voice is a small formant synthesiser that reads Hangul: each syllable is split into its
// initial, vowel and final, the vowel picks the formants a sawtooth is filtered through, and the
// consonants are noise bursts, hisses, nasal hums and glides around it. It will not pass for a
// person, and it is not meant to; it sings the words in time with the karaoke.

import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ffmpegPath } from '../tools/ffmpeg.mjs';

const scorePath = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), 'score.mjs');
const S = await import(pathToFileURL(scorePath).href);
const ROOT = join(dirname(scorePath), '..');
// A score may colour the band: every field is optional.
const SOUND = { voice: 1, pad: 1, arp: 1, lead: { gain: 0.16, duty: 0.5, cutoff: 4200 }, ...(S.SOUND || {}) };
const SR = 44100;
const N = Math.ceil(S.LENGTH * SR);
const TAU = Math.PI * 2;

// ---- small DSP kit ------------------------------------------------------------------------------

let seed = 0x5eed;
function rnd() {                       // mulberry32, so every render is the same render
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const noise = () => rnd() * 2 - 1;
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

/** Topology-preserving state variable filter. `k` is 1/Q; `bp * k` peaks at unity. */
class SVF {
  constructor() { this.a = 0; this.b = 0; this.lp = 0; this.bp = 0; this.hp = 0; }
  run(x, fc, k) {
    const g = Math.tan(Math.PI * clamp(fc, 20, SR * 0.45) / SR);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - this.b;
    const v1 = a1 * this.a + a2 * v3;
    const v2 = this.b + a2 * this.a + a3 * v3;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b;
    this.lp = v2; this.bp = v1; this.hp = x - k * v1 - v2;
    return v2;
  }
}

class Bus {
  constructor() { this.L = new Float32Array(N); this.R = new Float32Array(N); }
  add(i, v, pan = 0) {
    if (i < 0 || i >= N) return;
    this.L[i] += v * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2;
    this.R[i] += v * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
  }
}

const idx = t => Math.round(t * SR);

// ---- the arrangement ----------------------------------------------------------------------------

const sectionAt = bar => [...S.SECTIONS].reverse().find(s => bar >= s.bar)?.id ?? 'intro';
const chordAt = bar => S.chordTones(S.CHORDS[Math.min(bar, S.CHORDS.length - 1)], S.keyAt(bar));
const cueBars = kind => S.CUES.filter(c => c.kind === kind).map(c => c.bar);
const T = (bar, beat = 0) => (bar * 4 + beat) * S.BEAT;

const drums = new Bus(), bass = new Bus(), pad = new Bus(), arp = new Bus(), lead = new Bus();
const vox = new Bus(), fx = new Bus();
const kicks = [];

// ---- drums --------------------------------------------------------------------------------------

function kick(t, gain = 1) {
  kicks.push(t);
  const i0 = idx(t);
  let ph = 0;
  for (let n = 0; n < SR * 0.45; n++) {
    const s = n / SR;
    const f = 44 + 120 * Math.exp(-s * 32);
    ph += f / SR;
    const body = Math.sin(TAU * ph) * Math.exp(-s * 6.5);
    const click = n < 90 ? noise() * (1 - n / 90) * 0.35 : 0;
    drums.add(i0 + n, (body + click) * 0.95 * gain);
  }
}

function snare(t, gain = 1) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * 0.32; n++) {
    const s = n / SR;
    const tone = Math.sin(TAU * 190 * s) * Math.exp(-s * 24) * 0.45;
    f.run(noise(), 5200, 0.9);
    const sn = (f.bp + f.hp * 0.3) * Math.exp(-s * 13) * 0.9;
    drums.add(i0 + n, (tone + sn) * 0.62 * gain);
  }
}

function hat(t, open = false, gain = 1) {
  const i0 = idx(t), f = new SVF(), len = open ? 0.34 : 0.06;
  for (let n = 0; n < SR * len; n++) {
    const s = n / SR;
    f.run(noise(), 8500, 0.8);
    drums.add(i0 + n, f.hp * Math.exp(-s * (open ? 9 : 62)) * 0.2 * gain, 0.25);
  }
}

function crash(t, gain = 1) {
  const i0 = idx(t), fl = new SVF(), fr = new SVF();
  for (let n = 0; n < SR * 2.6; n++) {
    const s = n / SR, e = Math.exp(-s * 1.7) * 0.26 * gain;
    fl.run(noise(), 6000, 0.7); fr.run(noise(), 6000, 0.7);
    drums.L[i0 + n] += fl.hp * e; drums.R[i0 + n] += fr.hp * e;
  }
}

function drumBar(bar) {
  const sec = sectionAt(bar);
  const b = beat => T(bar, beat);
  if (sec === 'intro' && bar < 4) return;
  if (sec === 'end') { kick(b(0), 1.1); snare(b(0), 1.2); crash(b(0), 1.4); return; }
  const chorus = sec.startsWith('chorus') || sec === 'outro';
  if (sec === 'bridge') {
    if (bar < 52) { kick(b(0), 0.6); return; }
    if (bar < 54) { kick(b(0)); kick(b(2.5), 0.7); snare(b(2)); for (let e = 0; e < 8; e++) hat(b(e / 2), false, 0.6); return; }
    for (let q = 0; q < 4; q++) kick(b(q));
    snare(b(1)); snare(b(3));
    if (bar === 55) for (let e = 0; e < 8; e++) snare(b(e / 2), 0.35 + e * 0.06);
    for (let e = 0; e < 8; e++) hat(b(e / 2));
    return;
  }
  if (sec === 'build') {
    for (let q = 0; q < 4; q++) if (!(bar === 57 && q === 3)) kick(b(q));
    const steps = bar === 56 ? 16 : 12;           // the last beat of the build is silence
    for (let s = 0; s < steps; s++) snare(b(s / 4), 0.3 + 0.5 * ((bar - 56) * 16 + s) / 28);
    return;
  }
  const pre = sec.startsWith('pre');
  if (chorus || pre) for (let q = 0; q < 4; q++) kick(b(q));
  else { kick(b(0)); kick(b(2)); kick(b(2.5), 0.8); }
  snare(b(1)); snare(b(3));
  const lastPre = pre && S.SECTIONS.find(s => s.id === sec).bar + 3 === bar;
  if (lastPre) { for (let s = 0; s < 8; s++) snare(b(2 + s / 4), 0.3 + s * 0.08); }
  if (chorus) { for (let e = 0; e < 8; e++) hat(b(e / 2), e % 2 === 1, e % 2 ? 0.8 : 0.6); }
  else if (pre) { for (let s = 0; s < 16; s++) hat(b(s / 4), false, s % 2 ? 0.5 : 0.8); }
  else for (let e = 0; e < 8; e++) hat(b(e / 2), false, e % 2 ? 0.55 : 0.9);
  const lineStart = S.LINES.some(l => l[0] === bar);
  if (bar === 4 || (chorus && lineStart) || S.SECTIONS.some(s => s.bar === bar && s.id !== 'bridge')) crash(b(0));
}

// ---- bass, pad, arp, lead -----------------------------------------------------------------------

function bassNote(t, dur, midi, gain = 1) {
  const i0 = idx(t), f = new SVF(), dt = hz(midi) / SR;
  let ph = rnd();
  const len = Math.floor((dur + 0.05) * SR);
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const saw = 2 * ph - 1 - blep(ph, dt);
    const sub = Math.sin(TAU * ph);
    ph += dt; if (ph >= 1) ph -= 1;
    const cut = 260 + 1500 * Math.exp(-s * 14);
    f.run(saw * 0.7 + sub * 0.6, cut, 0.9);
    const env = Math.min(1, s / 0.004) * (s > dur ? Math.exp(-(s - dur) * 60) : 1);
    bass.add(i0 + n, f.lp * env * 0.55 * gain);
  }
}

function bassBar(bar) {
  const sec = sectionAt(bar);
  if (sec === 'intro' && bar < 4) return;
  let root = 36 + chordAt(bar)[0];
  if (root < 38) root += 12;
  if (sec === 'end') { bassNote(T(bar), S.BAR * 1.6, root); return; }
  if (sec === 'bridge' && bar < 52) { bassNote(T(bar), S.BAR * 0.98, root, 0.9); return; }
  if (sec === 'bridge' && bar < 54) { bassNote(T(bar), S.BEAT * 2.4, root); bassNote(T(bar, 2.5), S.BEAT * 1.4, root); return; }
  const chorus = sec.startsWith('chorus') || sec === 'outro';
  for (let e = 0; e < 8; e++) {
    if (bar === 57 && e >= 6) break;
    const up = chorus && e % 2 === 1 ? 12 : 0;
    bassNote(T(bar, e / 2), S.BEAT * 0.42, root + up, e % 2 ? 0.8 : 1);
  }
}

function voicing(pcs, lo, hi) {
  const mid = (lo + hi) / 2;
  return pcs.map(pc => {
    let best = null;
    for (let m = lo; m <= hi; m++) if (m % 12 === pc && (best === null || Math.abs(m - mid) < Math.abs(best - mid))) best = m;
    return best;
  });
}

function padChord(t, dur, notes, cutoff, gain = 1) {
  const i0 = idx(t), len = Math.floor((dur + 0.6) * SR);
  notes.forEach((midi, v) => {
    for (const det of [-0.09, 0.09]) {
      const f = new SVF(), dt = hz(midi + det) / SR, pan = det > 0 ? 0.55 : -0.55;
      let ph = rnd();
      for (let n = 0; n < len; n++) {
        const s = n / SR;
        const saw = 2 * ph - 1 - blep(ph, dt);
        ph += dt; if (ph >= 1) ph -= 1;
        f.run(saw, cutoff * (1 + 0.15 * Math.sin(TAU * 0.3 * (t + s) + v)), 1.1);
        const env = Math.min(1, s / 0.09) * (s > dur ? Math.exp(-(s - dur) * 7) : 1);
        pad.add(i0 + n, f.lp * env * 0.075 * gain, pan);
      }
    }
  });
}

function padBar(bar) {
  const sec = sectionAt(bar);
  const notes = voicing(chordAt(bar), 52, 69);
  const cut = SOUND.pad * ({ intro: 900, verse1: 1300, verse2: 1300, bridge: 800 + (bar - 48) * 180, build: 2600, end: 3200 }[sec]
    ?? (sec.startsWith('pre') ? 1800 : 2700));
  const gain = sec === 'intro' && bar < 4 ? 0.35 + bar * 0.15 : sec === 'bridge' ? 1.25 : 1;
  padChord(T(bar), sec === 'end' ? S.BAR * 1.5 : S.BAR, notes, cut, gain);
}

function pluck(bus, t, midi, dur, gain, duty = 0.25, cutoff = 3600, pan = 0) {
  const i0 = idx(t), f = new SVF(), dt = hz(midi) / SR, len = Math.floor((dur + 0.12) * SR);
  let ph = 0;
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    let sq = (ph < duty ? 1 : -1) + blep(ph, dt) - blep((ph + 1 - duty) % 1, dt);
    ph += dt; if (ph >= 1) ph -= 1;
    f.run(sq, cutoff, 1.0);
    const env = Math.min(1, s / 0.003) * Math.exp(-s * 9) * (s > dur ? Math.exp(-(s - dur) * 40) : 1);
    bus.add(i0 + n, f.lp * env * gain, pan);
  }
}

function arpBar(bar) {
  const sec = sectionAt(bar);
  if ((sec === 'intro' && bar < 2) || sec === 'end' || (sec === 'bridge' && bar < 52)) return;
  const tones = voicing(chordAt(bar), 64, 76).sort((a, b) => a - b);
  const seq = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1]];
  const loud = SOUND.arp * (sec.startsWith('chorus') || sec === 'outro' ? 0.13 : sec === 'intro' ? 0.05 + bar * 0.012 : 0.085);
  for (let s = 0; s < 16; s++) {
    if (bar === 57 && s >= 12) break;
    pluck(arp, T(bar, s / 4), seq[(bar * 16 + s) % seq.length], S.BEAT * 0.2, loud, 0.25, 3200, s % 2 ? 0.35 : -0.35);
  }
}

function leadLines() {
  for (const r of S.RIFF.map(S.layRiff)) for (const n of r.notes) pluck(lead, n.t, n.midi, n.dur * 0.92, SOUND.lead.gain, SOUND.lead.duty, SOUND.lead.cutoff);
  // In the choruses the tune is doubled an octave up, quietly, so the hook carries.
  for (const l of S.LINES.map(S.layLine)) {
    const sec = sectionAt(l.bar);
    if (!(sec.startsWith('chorus') || sec === 'outro')) continue;
    for (const n of l.notes) pluck(lead, n.t, n.midi + 12, n.dur * 0.9, 0.055, 0.5, 5000);
  }
}

// ---- the voice ----------------------------------------------------------------------------------

const VOWEL = {
  a: [850, 1300, 2800], e: [560, 2000, 2800], eo: [650, 1050, 2700], o: [480, 820, 2700],
  u: [380, 880, 2600], eu: [400, 1450, 2700], i: [330, 2500, 3200],
};
// jungseong 0..20 -> [glide from, vowel]
const MEDIAL = [
  [null, 'a'], [null, 'e'], ['i', 'a'], ['i', 'e'], [null, 'eo'], [null, 'e'], ['i', 'eo'], ['i', 'e'],
  [null, 'o'], ['u', 'a'], ['u', 'e'], ['u', 'e'], ['i', 'o'], [null, 'u'], ['u', 'eo'], ['u', 'e'],
  ['u', 'i'], ['i', 'u'], [null, 'eu'], ['eu', 'i'], [null, 'i'],
];
// choseong 0..18
const INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
// jongseong 0..27 -> how the syllable closes
const FINAL = [
  '', 'stop', 'stop', 'stop', 'n', 'n', 'n', 'stop', 'l', 'stop', 'm', 'l', 'l', 'l', 'stop', 'l',
  'm', 'stop', 'stop', 'stop', 'stop', 'ng', 'stop', 'stop', 'stop', 'stop', 'stop', '',
];
const CODA = { n: [300, 1600, 2600], m: [300, 1000, 2500], ng: [300, 1250, 2600], l: [360, 1350, 2600] };

function hangul(ch) {
  const c = ch.codePointAt(0) - 0xAC00;
  if (c < 0 || c > 11171) return { ini: '', glide: null, vowel: 'a', fin: '' };
  const m = MEDIAL[Math.floor((c % 588) / 28)];
  return { ini: INITIAL[Math.floor(c / 588)], glide: m[0], vowel: m[1], fin: FINAL[c % 28] };
}

/** Sung Korean links a closing consonant onto a following syllable that has none: 눈을 -> 누늘. */
function link(notes) {
  const out = notes.map(n => ({ ...n, ...hangul(n.syl) }));
  for (let i = 0; i + 1 < out.length; i++) {
    const a = out[i], b = out[i + 1];
    const touching = Math.abs(a.t + a.dur - b.t) < 0.02;
    if (touching && b.ini === '' && ['n', 'm', 'l'].includes(a.fin)) {
      b.ini = a.fin === 'l' ? 'r' : a.fin; a.fin = '';
    }
  }
  return out;
}

function consonantNoise(t, ini, vowelF) {
  // [start offset, length, centre, k, gain, highpass?]
  const bursts = {
    g: [[-0.012, 0.012, 1800, 0.8, 0.5]], kk: [[-0.01, 0.01, 1900, 0.8, 0.6]], k: [[-0.05, 0.012, 1800, 0.8, 0.6], [-0.038, 0.045, vowelF[1], 1.2, 0.35]],
    d: [[-0.012, 0.01, 3600, 0.8, 0.45]], tt: [[-0.01, 0.01, 3800, 0.8, 0.55]], t: [[-0.05, 0.01, 3600, 0.8, 0.55], [-0.04, 0.045, vowelF[1], 1.2, 0.35]],
    b: [[-0.012, 0.01, 900, 0.9, 0.45]], pp: [[-0.01, 0.01, 1000, 0.9, 0.5]], p: [[-0.05, 0.01, 900, 0.9, 0.5], [-0.04, 0.045, vowelF[1], 1.2, 0.35]],
    s: [[-0.075, 0.075, 6200, 0.6, 0.55, true]], ss: [[-0.09, 0.09, 6500, 0.6, 0.6, true]],
    j: [[-0.045, 0.012, 3000, 0.8, 0.45], [-0.035, 0.035, 3800, 0.7, 0.4, true]],
    jj: [[-0.04, 0.012, 3200, 0.8, 0.5], [-0.03, 0.03, 4000, 0.7, 0.4, true]],
    ch: [[-0.07, 0.012, 3000, 0.8, 0.5], [-0.06, 0.06, 3800, 0.7, 0.45, true]],
    h: [[-0.055, 0.055, vowelF[1], 1.0, 0.3]],
  }[ini];
  if (!bursts) return;
  for (const [off, len, fc, k, g, high] of bursts) {
    const i0 = idx(t + off), f = new SVF(), L = Math.floor(len * SR);
    for (let n = 0; n < L; n++) {
      const x = n / L, env = Math.sin(Math.PI * Math.min(1, x * 1.6 + 0.05)) ** 1.5;
      f.run(noise(), fc, k);
      vox.add(i0 + n, (high ? f.hp : f.bp * k) * env * g * 0.5);
    }
  }
}

function lerp3(a, b, k) { return [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * k); }

function sing(note, prev, next) {
  const V = VOWEL[note.vowel].map(f => f * SOUND.voice);
  const start = note.t, end = note.t + note.dur;
  const legato = next && Math.abs(next.t - end) < 0.02;
  const vStart = start - (['n', 'm'].includes(note.ini) ? 0.045 : note.ini === 'r' ? 0.02 : 0);
  let vEnd = legato ? end - 0.012 : end - 0.03;
  if (note.fin === 'stop') vEnd = start + Math.max(0.08, note.dur * 0.78);
  // formant keyframes: [time, formants, amplitude]
  const keys = [];
  if (note.ini === 'n' || note.ini === 'm') keys.push([vStart, CODA[note.ini], 0.45], [start + 0.01, CODA[note.ini], 0.5]);
  else if (note.ini === 'r') keys.push([vStart, CODA.l, 0.6]);
  if (note.glide) keys.push([start, VOWEL[note.glide].map(f => f * SOUND.voice), 1], [start + Math.min(0.07, note.dur * 0.35), V, 1]);
  else keys.push([start + (note.ini === 'r' ? 0.03 : 0), V, 1]);
  if (['n', 'm', 'ng', 'l'].includes(note.fin)) {
    const coda = Math.min(0.14, note.dur * 0.35);
    keys.push([vEnd - coda, V, 1], [vEnd - coda + 0.04, CODA[note.fin], note.fin === 'l' ? 0.7 : 0.5], [vEnd, CODA[note.fin], 0.45]);
  } else keys.push([vEnd, V, 1]);
  keys.sort((a, b) => a[0] - b[0]);

  consonantNoise(start, note.ini, V);

  const i0 = idx(vStart), len = Math.floor((vEnd - vStart + 0.04) * SR);
  const bank = [new SVF(), new SVF(), new SVF(), new SVF()], tilt = new SVF();
  const glideFrom = prev && Math.abs(prev.t + prev.dur - start) < 0.03 ? prev.midi : note.midi;
  const soft = ['g', 'd', 'b', 'j', ''].includes(note.ini) ? 0.012 : 0.006;
  let ph = rnd(), k = 0;
  for (let n = 0; n < len; n++) {
    const s = n / SR, tt = vStart + s;
    while (k + 1 < keys.length && keys[k + 1][0] <= tt) k++;
    const a = keys[k], b = keys[Math.min(k + 1, keys.length - 1)];
    const w = b[0] > a[0] ? clamp((tt - a[0]) / (b[0] - a[0]), 0, 1) : 0;
    const F = lerp3(a[1], b[1], w), amp = a[2] + (b[2] - a[2]) * w;
    const since = tt - start;
    const vib = since > 0.22 ? Math.sin(TAU * 5.6 * since) * 0.22 * Math.min(1, (since - 0.22) / 0.25) : 0;
    const glide = (glideFrom - note.midi) * Math.exp(-Math.max(0, since) / 0.028);
    const f0 = hz(note.midi + glide + vib);
    const dt = f0 / SR;
    const saw = 2 * ph - 1 - blep(ph, dt);
    ph += dt; if (ph >= 1) ph -= 1;
    const src = tilt.run(saw + noise() * 0.04, 5200, 0.9);
    const F1 = Math.max(F[0], f0 * 1.08);
    bank[0].run(src, F1, 90 / F1); bank[1].run(src, F[1], 110 / F[1]);
    bank[2].run(src, F[2], 170 / F[2]); bank[3].run(src, 3700, 0.08);
    const out = bank[0].bp * (90 / F1) * 1.0 + bank[1].bp * (110 / F[1]) * 0.7
      + bank[2].bp * (170 / F[2]) * 0.4 + bank[3].bp * 0.08 * 0.15 + src * 0.05;
    const env = Math.min(1, s / soft) * (tt > vEnd ? Math.exp(-(tt - vEnd) * 90) : 1);
    vox.add(i0 + n, out * env * amp * 1.6);
  }
}

function voice() {
  for (const line of S.LINES.map(S.layLine)) {
    const notes = link(line.notes);
    notes.forEach((n, i) => sing(n, notes[i - 1], notes[i + 1]));
  }
}

// ---- sound effects ------------------------------------------------------------------------------

function tone(bus, t, f, len, gain, decay, pan = 0, shape = Math.sin) {
  const i0 = idx(t);
  for (let n = 0; n < len * SR; n++) {
    const s = n / SR;
    bus.add(i0 + n, shape(TAU * f * s) * Math.exp(-s * decay) * Math.min(1, s / 0.002) * gain, pan);
  }
}

function bell(t, midi, gain) {
  const f = hz(midi);
  for (const [r, g, d] of [[1, 1, 1.4], [2.0, 0.5, 2.2], [2.76, 0.35, 3], [5.4, 0.2, 5], [0.5, 0.25, 1]]) tone(fx, t, f * r, 2.4, gain * g, d);
}

function sfx() {
  for (const c of S.CUES) {
    const t = S.barTime(c.bar);
    switch (c.kind) {
      case 'clock':
        for (let q = 0; q < 14; q++) tone(fx, t + q * S.BEAT, q % 2 ? 1500 : 2000, 0.05, 0.12, 90, q % 2 ? 0.3 : -0.3);
        break;
      case 'alarm':
        for (let q = 0; q < 8; q++) if (q % 4 !== 3) tone(fx, t + q * S.BEAT / 4, 2093, S.BEAT / 5, 0.07, 3, 0,
          x => Math.sign(Math.sin(x)));
        break;
      case 'bell':
        [76, 72, 74, 67].forEach((m, q) => bell(t + q * S.BEAT, m, 0.05));
        break;
      case 'boom': case 'megaboom': {
        const big = c.kind === 'megaboom';
        tone(fx, t, 48, 1.4, big ? 0.55 : 0.3, big ? 2.5 : 4.5);
        const i0 = idx(t), f = new SVF();
        for (let n = 0; n < SR * (big ? 2.4 : 1.1); n++) {
          const s = n / SR; f.run(noise(), 900 + 3000 * Math.exp(-s * 3), 0.9);
          fx.add(i0 + n, f.lp * Math.exp(-s * (big ? 1.6 : 3.8)) * (big ? 0.5 : 0.22));
        }
        if (big) crash(t, 1.3);
        break;
      }
      case 'heartbeat':
        for (let b = 0; b < 2; b++) for (const off of [0, 0.3]) tone(fx, S.barTime(c.bar + b) + off * S.BEAT * 2, 55, 0.3, 0.35, 11);
        break;
      case 'ticks':
        for (let s = 0; s < 28; s++) tone(fx, t + s * S.BEAT / 4, s % 2 ? 1700 : 2300, 0.03, 0.05 + s * 0.002, 120, s % 2 ? 0.4 : -0.4);
        break;
      case 'clink':
        // two glasses: a bright, inharmonic ping, twice
        for (const off of [0, 0.05]) for (const [r, g] of [[1, 1], [2.32, 0.6], [4.1, 0.35]]) tone(fx, t + off, 2350 * r, 0.9, 0.05 * g, 6);
        break;
      case 'stamp':
        tone(fx, t, 90, 0.4, 0.45, 14);
        tone(fx, t, 160, 0.2, 0.2, 25);
        break;
      default:
    }
  }
  // a rising wash into every chorus
  for (const s of S.SECTIONS.filter(s => s.id.startsWith('chorus'))) {
    const t0 = S.barTime(s.bar - 1), len = S.BAR, i0 = idx(t0), f = new SVF();
    for (let n = 0; n < len * SR; n++) {
      const x = n / (len * SR);
      f.run(noise(), 400 + 7000 * x * x, 0.7);
      const cut = s.id === 'chorus3' && x > 0.75 ? 0 : 1;
      fx.add(idx(t0) + n, f.bp * 0.7 * x * x * 0.2 * cut, Math.sin(x * 9) * 0.4);
    }
    void i0;
  }
}

// ---- effects and the mix ------------------------------------------------------------------------

function freeverb(inL, inR, room = 0.84, damp = 0.28) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], alls = [556, 441, 341, 225];
  const outL = new Float32Array(N), outR = new Float32Array(N);
  const chan = (inp, out, spread) => {
    const cb = combs.map(c => ({ buf: new Float32Array(c + spread), i: 0, store: 0 }));
    const ab = alls.map(a => ({ buf: new Float32Array(a + spread), i: 0 }));
    for (let n = 0; n < N; n++) {
      const x = inp[n] * 0.015;
      let acc = 0;
      for (const c of cb) {
        const y = c.buf[c.i];
        c.store = y * (1 - damp) + c.store * damp;
        c.buf[c.i] = x + c.store * room;
        if (++c.i >= c.buf.length) c.i = 0;
        acc += y;
      }
      for (const a of ab) {
        const y = a.buf[a.i];
        a.buf[a.i] = acc + y * 0.5;
        if (++a.i >= a.buf.length) a.i = 0;
        acc = y - acc;
      }
      out[n] = acc;
    }
  };
  chan(inL, outL, 0); chan(inR, outR, 23);
  return [outL, outR];
}

function pingpong(inL, inR, time, fb, mix) {
  const d = Math.floor(time * SR), bl = new Float32Array(d), br = new Float32Array(d);
  const outL = new Float32Array(N), outR = new Float32Array(N);
  let i = 0, lpL = 0, lpR = 0;
  for (let n = 0; n < N; n++) {
    const yl = bl[i], yr = br[i];
    lpL += (yl - lpL) * 0.35; lpR += (yr - lpR) * 0.35;
    bl[i] = (inL[n] + inR[n]) * 0.5 + lpR * fb;
    br[i] = lpL * fb;
    if (++i >= d) i = 0;
    outL[n] = yl * mix; outR[n] = yr * mix;
  }
  return [outL, outR];
}

function duck(bus, depth) {
  const ks = [...kicks].sort((a, b) => a - b);
  let k = 0;
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    while (k + 1 < ks.length && ks[k + 1] <= t) k++;
    const since = ks.length && ks[k] <= t ? t - ks[k] : 9;
    const g = 1 - depth * Math.exp(-since / 0.11);
    bus.L[n] *= g; bus.R[n] *= g;
  }
}

function widen(bus) {
  const a = Math.floor(0.013 * SR), b = Math.floor(0.019 * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const m = (bus.L[n] + bus.R[n]) * 0.5;
    L[n] = m + 0.3 * (n >= a ? (bus.L[n - a] + bus.R[n - a]) * 0.5 : 0);
    R[n] = m + 0.3 * (n >= b ? (bus.L[n - b] + bus.R[n - b]) * 0.5 : 0);
  }
  bus.L = L; bus.R = R;
}

function peak(bus) { let p = 0; for (let n = 0; n < N; n++) p = Math.max(p, Math.abs(bus.L[n]), Math.abs(bus.R[n])); return p; }
function scale(bus, g) { for (let n = 0; n < N; n++) { bus.L[n] *= g; bus.R[n] *= g; } }

function master(parts) {
  const L = new Float32Array(N), R = new Float32Array(N);
  for (const [bus, g] of parts) for (let n = 0; n < N; n++) { L[n] += bus.L[n] * g; R[n] += bus.R[n] * g; }
  // the beat of silence before the last chorus
  const s0 = idx(S.barTime(57.75)), s1 = idx(S.barTime(58)) - 40;
  for (let n = s0; n < s1; n++) { const k = Math.min(1, (n - s0) / 400); L[n] *= 1 - k; R[n] *= 1 - k; }
  // a look-ahead peak limiter, then a gentle clip
  const look = Math.floor(0.004 * SR), ceil = 0.9, rel = Math.exp(-1 / (0.12 * SR));
  const need = new Float32Array(N);
  for (let n = 0; n < N; n++) need[n] = Math.max(Math.abs(L[n]), Math.abs(R[n]));
  let g = 1;
  const outL = new Float32Array(N), outR = new Float32Array(N);
  const win = [];
  for (let n = 0; n < N; n++) {
    const j = n + look < N ? n + look : N - 1;
    while (win.length && need[win[win.length - 1]] <= need[j]) win.pop();
    win.push(j);
    while (win[0] < n) win.shift();
    const want = Math.min(1, ceil / Math.max(1e-9, need[win[0]]));
    g = want < g ? want : want + (g - want) * rel;
    outL[n] = Math.tanh(L[n] * g * 1.05) / Math.tanh(1.05);
    outR[n] = Math.tanh(R[n] * g * 1.05) / Math.tanh(1.05);
  }
  // fade the very end
  const f0 = N - SR;
  for (let n = f0; n < N; n++) { const k = (N - n) / SR; outL[n] *= k; outR[n] *= k; }
  return [outL, outR];
}

function wav(path, L, R) {
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let n = 0; n < N; n++) {
    buf.writeInt16LE(Math.round(clamp(L[n], -1, 1) * 32767), 44 + n * 4);
    buf.writeInt16LE(Math.round(clamp(R[n], -1, 1) * 32767), 46 + n * 4);
  }
  writeFileSync(path, buf);
}

// ---- go -----------------------------------------------------------------------------------------

const problems = S.validate();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const clock = Date.now();
const step = what => console.log(`${((Date.now() - clock) / 1000).toFixed(1)}s  ${what}`);
for (let bar = 0; bar <= S.END_BAR; bar++) { drumBar(bar); bassBar(bar); padBar(bar); arpBar(bar); }
step('band');
leadLines(); step('lead');
voice(); step('voice');
sfx(); step('effects');

duck(pad, 0.45); duck(arp, 0.35); duck(bass, 0.3);
scale(vox, 0.42 / peak(vox));
widen(vox);
const sendL = new Float32Array(N), sendR = new Float32Array(N);
for (const [bus, amt] of [[vox, 0.35], [pad, 0.5], [lead, 0.4], [drums, 0.07], [fx, 0.35], [arp, 0.25]]) {
  for (let n = 0; n < N; n++) { sendL[n] += bus.L[n] * amt; sendR[n] += bus.R[n] * amt; }
}
const [vL, vR] = freeverb(sendL, sendR); step('reverb');
const dl = new Float32Array(N), dr = new Float32Array(N);
for (const [bus, amt] of [[vox, 0.3], [lead, 0.45], [arp, 0.3]]) for (let n = 0; n < N; n++) { dl[n] += bus.L[n] * amt; dr[n] += bus.R[n] * amt; }
const [eL, eR] = pingpong(dl, dr, S.BEAT * 0.75, 0.38, 0.5);
const verb = { L: vL, R: vR }, echo = { L: eL, R: eR };
if (process.env.LEVELS) {
  // how loud each part is through the first chorus, as mixed
  const a = idx(S.barTime(20)), b = idx(S.barTime(28));
  for (const [name, bus, g] of [['drums', drums, 0.5], ['bass', bass, 0.75], ['pad', pad, 0.9], ['arp', arp, 0.9],
    ['lead', lead, 1.8], ['vox', vox, 2.0], ['fx', fx, 0.9], ['verb', verb, 0.6], ['echo', echo, 0.8]]) {
    let e = 0;
    for (let n = a; n < b; n++) e += (bus.L[n] * g) ** 2 + (bus.R[n] * g) ** 2;
    console.log(name.padEnd(6), (10 * Math.log10(e / (2 * (b - a)) + 1e-12)).toFixed(1), 'dB');
  }
}
if (process.env.STEM) {
  // one part on its own, for checking: STEM=vox node song/synth.mjs
  const bus = { drums, bass, pad, arp, lead, vox, fx }[process.env.STEM];
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  const g = 0.9 / peak(bus);
  wav(join(ROOT, 'out', `stem_${process.env.STEM}.wav`), bus.L.map(x => x * g), bus.R.map(x => x * g));
  console.log('wrote stem', process.env.STEM);
  process.exit(0);
}
const [L, R] = master([[drums, 0.5], [bass, 0.75], [pad, 0.9], [arp, 0.9], [lead, 1.8], [vox, 2.0], [fx, 0.9], [verb, 0.6], [echo, 0.8]]);
step('mix');

mkdirSync(join(ROOT, 'out'), { recursive: true });
mkdirSync(join(ROOT, 'assets'), { recursive: true });
const wavPath = join(ROOT, 'out', 'song.wav');
wav(wavPath, L, R);
let sum = 0;
for (let n = 0; n < N; n++) sum += L[n] * L[n] + R[n] * R[n];
console.log(`length ${S.LENGTH.toFixed(2)}s, rms ${(10 * Math.log10(sum / (2 * N))).toFixed(1)} dBFS`);
execFileSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'aac', '-b:a', '192k',
  join(ROOT, 'assets', 'song.m4a')]);
writeFileSync(join(ROOT, 'src', 'song.js'),
  `// Generated by song/synth.mjs from song/score.mjs. Do not edit by hand.\nwindow.SONG = ${JSON.stringify(S.forPage())};\n`);
step('wrote out/song.wav, assets/song.m4a, src/song.js');
