// The Threads Short's music: bars 16-48 of the high-school song (../../song/score.mjs) — the first
// pre-chorus, the first chorus, the second verse and pre-chorus, the second chorus — arranged as
// trap-style bedroom pop by song/darkpop.mjs (808, snaps, hats), no voice. song/cut.mjs (shared
// with the RESCENE Short) trims those bars out of the render.
//
//   node song/darkpop.mjs threads/song/score.mjs && node rescene/song/cut.mjs threads/song/score.mjs

import * as base from '../../song/score.mjs';

export const {
  BPM, BEAT, BAR, SECTIONS, END_BAR, LENGTH, CHORDS, RIFF, CUES,
  midiOf, chordTones, keyAt, barTime, layLine, layRiff,
} = base;

export const LINES = [];
export const MELODY = base.LINES;
export const FROM_BAR = 16, TO_BAR = 48, TAIL = 1.6;

export function validate() { return base.validate(); }
export function forPage() { return { ...base.forPage(), lines: [] }; }
