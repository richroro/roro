// Beats that know about the slow ending. core.js's beatOf() assumes one tempo for the whole
// song; these switch to SONG.slow.beat after SONG.slow.t, so a pulse keeps landing on the beat.

/* eslint-disable no-unused-vars */
function bgBeat(t) {
  const s = SONG.slow;
  if (t < s.t) return (t - SONG.offset) / SONG.beat;
  // the slow ending starts on a beat of its own, so count from a whole beat there
  return Math.ceil((s.t - SONG.offset) / SONG.beat - 1e-6) + (t - s.t) / s.beat;
}
const bgBeatN = t => Math.floor(bgBeat(t) + 1e-6);
/** 1 on every beat, falling away after it. */
const bgPulse = (t, k = 7) => Math.exp(-frac(bgBeat(t) + 1e-6) * k);
/** The same on eighths. */
const bgPulse2 = (t, k = 7) => Math.exp(-frac(bgBeat(t) * 2 + 1e-6) * k);
/** A bounce between beats: 0 on the beat, 1 halfway. */
const bgHop = t => Math.sin(Math.PI * frac(bgBeat(t) + 1e-6));
/** Seconds of bar `bar` (and beat) in the 135 BPM part. */
const bgT = (bar, beat = 0) => SONG.offset + (bar * 4 + beat) * SONG.beat;
