// The Shorts' music: the last minute of the high-school song (../../song/score.mjs) — its second
// chorus, the bridge, the build, the key change and the ending — with no voice; the synth lead
// plays the tune instead. song/cut.mjs trims that minute out of the full render.
//
//   node song/synth.mjs shorts/song/score.mjs && node shorts/song/cut.mjs

import * as base from '../../song/score.mjs';

export const {
  BPM, BEAT, BAR, SECTIONS, END_BAR, LENGTH, CHORDS, RIFF, CUES,
  midiOf, chordTones, keyAt, barTime, layLine, layRiff,
} = base;

export const LINES = [];
export const MELODY = base.LINES;
/** The minute the Shorts use, in bars of the full song. */
export const FROM_BAR = 40;

export function validate() { return base.validate(); }
export function forPage() { return { ...base.forPage(), lines: [] }; }
