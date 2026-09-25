// The sound kit both arrangers share (synth.mjs for the pop band, ballad.mjs for the piano
// ballad): oscillators, filters, buses, the cue sounds, reverb, delay, the limiter, WAV output.
// Call init(lengthInSeconds) before making a Bus.

import { writeFileSync } from 'node:fs';

export const SR = 44100;
export const TAU = Math.PI * 2;
export let N = 0;
export function init(length) { N = Math.ceil(length * SR); }

// ---- small DSP kit ------------------------------------------------------------------------------

let seed = 0x5eed;
export function rnd() {                       // mulberry32, so every render is the same render
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const noise = () => rnd() * 2 - 1;
export const hz = m => 440 * Math.pow(2, (m - 69) / 12);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

/** Topology-preserving state variable filter. `k` is 1/Q; `bp * k` peaks at unity. */
export class SVF {
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

export class Bus {
  constructor() { this.L = new Float32Array(N); this.R = new Float32Array(N); }
  add(i, v, pan = 0) {
    if (i < 0 || i >= N) return;
    this.L[i] += v * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2;
    this.R[i] += v * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
  }
}

export const idx = t => Math.round(t * SR);

// ---- sound effects ------------------------------------------------------------------------------

export function tone(bus, t, f, len, gain, decay, pan = 0, shape = Math.sin) {
  const i0 = idx(t);
  for (let n = 0; n < len * SR; n++) {
    const s = n / SR;
    bus.add(i0 + n, shape(TAU * f * s) * Math.exp(-s * decay) * Math.min(1, s / 0.002) * gain, pan);
  }
}

export function bell(bus, t, midi, gain) {
  const f = hz(midi);
  for (const [r, g, d] of [[1, 1, 1.4], [2.0, 0.5, 2.2], [2.76, 0.35, 3], [5.4, 0.2, 5], [0.5, 0.25, 1]]) tone(bus, t, f * r, 2.4, gain * g, d);
}

/** The one-off sounds a score asks for in CUES, and a rising wash into every chorus. */
export function cueSounds(S, fx, crash) {
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
        [76, 72, 74, 67].forEach((m, q) => bell(fx, t + q * S.BEAT, m, 0.05));
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

export function freeverb(inL, inR, room = 0.84, damp = 0.28) {
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

export function pingpong(inL, inR, time, fb, mix) {
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

export function duck(bus, depth, kicks) {
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

export function widen(bus) {
  const a = Math.floor(0.013 * SR), b = Math.floor(0.019 * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const m = (bus.L[n] + bus.R[n]) * 0.5;
    L[n] = m + 0.3 * (n >= a ? (bus.L[n - a] + bus.R[n - a]) * 0.5 : 0);
    R[n] = m + 0.3 * (n >= b ? (bus.L[n - b] + bus.R[n - b]) * 0.5 : 0);
  }
  bus.L = L; bus.R = R;
}

export function peak(bus) { let p = 0; for (let n = 0; n < N; n++) p = Math.max(p, Math.abs(bus.L[n]), Math.abs(bus.R[n])); return p; }
export function scale(bus, g) { for (let n = 0; n < N; n++) { bus.L[n] *= g; bus.R[n] *= g; } }

/** Sum the parts, gate `silence` ([t0, t1] seconds, or null), limit, and fade the tail. */
export function master(parts, silence = null) {
  const L = new Float32Array(N), R = new Float32Array(N);
  for (const [bus, g] of parts) for (let n = 0; n < N; n++) { L[n] += bus.L[n] * g; R[n] += bus.R[n] * g; }
  if (silence) {
    const s0 = idx(silence[0]), s1 = idx(silence[1]) - 40;
    for (let n = s0; n < s1; n++) { const k = Math.min(1, (n - s0) / 400); L[n] *= 1 - k; R[n] *= 1 - k; }
  }
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

export function wav(path, L, R) {
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

// ---- instruments the arrangers share ----------------------------------------------------------

/**
 * An FM electric piano: a 1:1 pair for the body and a 1:14 pair for the bell of the tine, which
 * fades in a few tens of milliseconds. High notes die away faster, as they do on the real thing.
 */
export function epiano(bus, t, midi, dur, vel, pan = 0, bright = 1) {
  const f = hz(midi), i0 = idx(t), rel = 0.4;
  const len = Math.floor((dur + rel + 0.05) * SR);
  const decay = 0.45 + f / 900;
  const det = 1 + (rnd() - 0.5) * 0.001;
  let pc = rnd(), pm = rnd(), pt = rnd();
  // A 1:1 FM pair puts a sideband at 0 Hz; a DC blocker takes it back out.
  let xPrev = 0, yPrev = 0;
  const dcR = 1 - TAU * 25 / SR;
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const env = Math.min(1, s / 0.003) * Math.exp(-s * decay) * (s > dur ? Math.exp(-(s - dur) / rel * 4) : 1);
    const I1 = (0.35 + 1.3 * vel * bright) * Math.exp(-s * 3.5) + 0.18;
    const I2 = 1.8 * vel * bright * Math.exp(-s * 26);
    pc += f / SR; pm += f * det / SR; pt += f * 14 / SR;
    if (pc > 1) pc -= 1; if (pm > 1) pm -= 1; if (pt > 1) pt -= 1;
    const body = Math.sin(TAU * pc + I1 * Math.sin(TAU * pm));
    const tine = Math.sin(TAU * pc + I2 * Math.sin(TAU * pt)) - Math.sin(TAU * pc);
    const x = (body + 0.55 * tine) * env * vel * 0.3;
    const y = x - xPrev + dcR * yPrev; xPrev = x; yPrev = y;
    bus.add(i0 + n, y, clamp(pan + 0.12 * Math.sin(TAU * 3.2 * (t + s)), -1, 1));
  }
}

/** A small glockenspiel: bright inharmonic FM, for sparkle over the last chorus. */
export function glock(bus, t, midi, vel) {
  const f = hz(midi), i0 = idx(t);
  let pc = 0, pm = 0;
  for (let n = 0; n < SR * 1.4; n++) {
    const s = n / SR;
    pc += f / SR; pm += f * 3.5 / SR;
    const y = Math.sin(TAU * pc + 1.2 * Math.exp(-s * 8) * Math.sin(TAU * pm));
    bus.add(i0 + n, y * Math.exp(-s * 3.2) * Math.min(1, s / 0.002) * vel * 0.12, 0.3);
  }
}

/** A string section: three detuned saws with vibrato, a slow bow and a soft filter. */
export function bowed(bus, t, midi, dur, gain, cutoff = 1900, attack = 0.45, pan = 0) {
  const i0 = idx(t), rel = 0.8, len = Math.floor((dur + rel) * SR);
  for (const [det, p] of [[-0.08, -0.6], [0, 0], [0.08, 0.6]]) {
    const f = new SVF();
    let ph = rnd();
    for (let n = 0; n < len; n++) {
      const s = n / SR;
      const vib = s > 0.3 ? 0.06 * Math.sin(TAU * 5.2 * s + det * 40) * Math.min(1, (s - 0.3) / 0.4) : 0;
      const dt = hz(midi + det + vib) / SR;
      const saw = 2 * ph - 1 - blep(ph, dt);
      ph += dt; if (ph >= 1) ph -= 1;
      f.run(saw, cutoff, 1.2);
      const env = Math.min(1, s / attack) * (s > dur ? Math.exp(-(s - dur) / rel * 4) : 1);
      bus.add(i0 + n, f.lp * env * gain * 0.33, clamp(pan + p * 0.7, -1, 1));
    }
  }
}

