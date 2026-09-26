// Background music for the Billie Eilish career video: an original instrumental, no voice and
// nothing from her records. It is the father song's dark-pop score (../../gajang/song/score.mjs)
// with the tune kept only in the choruses and outro, so the verses leave room for the captions,
// and no lyrics on screen.
//
//   node song/darkpop.mjs bio/song/score.mjs   -> bio/assets/song.m4a, bio/src/song.js

import * as base from '../../gajang/song/score.mjs';

export const {
  BPM, BEAT, BAR, SECTIONS, END_BAR, LENGTH, CHORDS, RIFF, CUES,
  midiOf, chordTones, keyAt, barTime, layLine, layRiff,
} = base;

const TUNE_BARS = new Set([20, 22, 24, 26, 40, 42, 44, 46, 58, 60, 62, 64, 66, 68]);
/** What the lead plays. */
export const MELODY = base.LINES.filter(l => TUNE_BARS.has(l[0]));
/** Nothing to sing along to: the page shows the video's own captions instead. */
export const LINES = [];

export function validate() { return base.validate(); }

export function forPage() {
  return { ...base.forPage(), lines: [] };
}
