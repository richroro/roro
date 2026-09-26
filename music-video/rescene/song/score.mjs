// The RESCENE Short's music: the first 28 bars of the high-school song (../../song/score.mjs) — the
// ticking-clock intro with its alarm, the first verse, the pre-chorus and the first chorus — with
// no voice; the synth lead plays the tune instead. song/cut.mjs trims those bars out of the render.
//
//   node song/synth.mjs rescene/song/score.mjs && node rescene/song/cut.mjs

import * as base from '../../song/score.mjs';

export const {
  BPM, BEAT, BAR, SECTIONS, END_BAR, LENGTH, CHORDS, RIFF, CUES,
  midiOf, chordTones, keyAt, barTime, layLine, layRiff,
} = base;

export const LINES = [];
export const MELODY = base.LINES;
/** The bars the Short uses, from the full song; TAIL seconds more fade out after TO_BAR. */
export const FROM_BAR = 0, TO_BAR = 28, TAIL = 1.6;

export function validate() { return base.validate(); }
export function forPage() { return { ...base.forPage(), lines: [] }; }
