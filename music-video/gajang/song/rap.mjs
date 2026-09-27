// 오늘도 수고했어 (K-pop rap version) — the same song, rapped.
//
// Verses, pre-choruses and the bridge are rapped on a sixteenth-note grid; the choruses keep the
// tune (a synth plays it) with the words chanted over it. Same bars, chords and cues as
// score.mjs, so the video lines up with either.
//
//   node song/darkpop.mjs gajang/song/rap.mjs     (darkpop.mjs sees RAP and adds the rap voice)

import * as base from './score.mjs';

export const {
  BPM, BEAT, BAR, SECTIONS, END_BAR, LENGTH, CHORDS, RIFF, CUES,
  midiOf, chordTones, keyAt, barTime, layLine, layRiff,
} = base;

export const RAP = true;

const isSyl = ch => (ch >= '가' && ch <= '힣');

/**
 * A rap line as a tune: syllables on an even pulse from `start` (beats), a quarter-beat breath at
 * each comma, and the last syllable of each phrase held a little longer. The pulse is chosen so
 * the line fills about seven beats of its two bars (sixteenths for a long line, triplet eighths
 * for a short one). Pitch is a placeholder.
 */
function flow(words, start = 0.5) {
  const chars = [...words];
  const syl = chars.filter(isSyl).length;
  const pauses = chars.filter(c => /[,!?]/.test(c)).length;
  const phraseEnd = i => {
    const rest = chars.slice(i + 1);
    const next = rest.find(x => isSyl(x) || /[,!?]/.test(x));
    return next === undefined || /[,!?]/.test(next);
  };
  const phrases = chars.filter((c, i) => isSyl(c) && phraseEnd(i)).length;
  const room = 7.25 - start - pauses * 0.25 - phrases * 0.25;
  const step = Math.min(0.5, Math.max(0.25, Math.floor((room / syl) * 12) / 12));
  const toks = start > 0 ? [`_:${start}`] : [];
  chars.forEach((c, i) => {
    if (isSyl(c)) toks.push(`D4:${(phraseEnd(i) ? step + 0.25 : step).toFixed(4)}`);
    else if (/[,!?]/.test(c)) toks.push('_:.25');
  });
  return toks.join(' ');
}

const melodic = new Map(base.LINES.map(l => [l[0], l]));
const chorusBars = new Set([20, 22, 24, 26, 40, 42, 44, 46, 58, 60, 62, 64, 66, 68]);

const RAPS = [
  [8, '새벽 다섯 시 반, 알람보다 먼저 떠진 눈'],
  [10, '잠든 애들 이마에 쪽, 조용히 닫는 현관문'],
  [12, '이호선 속 샌드위치, 숨 참고 버텨 가'],
  [14, '그래도 오늘을 산다, 이게 바로 가장의 플로우'],
  [16, '넥타이 꽉 조이고, 숨 한 번 크게 쉬고'],
  [18, '웃으며 문을 열어, 자 가자'],
  [28, '회의실 부장님 한숨, 태풍처럼 불어와'],
  [30, '결재 도장 쾅 찍히면, 하루가 또 증발해'],
  [32, '대출 이자 학원비, 계산기는 쉬질 않아'],
  [34, '창밖엔 별이 떴네, 야근도 이젠 내 친구'],
  [36, '허리 두드리며, 기지개 한 번 쭉'],
  [38, '막차에 몸을 실어, 집으로 가'],
  [48, '기타 치던 스무 살, 그 꿈은 어디 갔나'],
  [50, '거울 속엔 낯선 아저씨가 날 봐'],
  [52, '그런데 문 열면, 달려오는 작은 발소리'],
  [54, '아빠! 그 한마디면, 난 다시 충전 완료'],
];

export const LINES = [
  ...RAPS.map(([bar, words]) => [bar, words, flow(words)]),
  ...[...chorusBars].map(bar => melodic.get(bar)),
].sort((a, b) => a[0] - b[0]);

/** Which lines are rapped (the rest are chanted over the tune). */
export const RAPPED = new Set(RAPS.map(r => r[0]));

/** What the lead synth plays: only the choruses and outro keep a tune. */
export const MELODY = [...chorusBars].map(bar => melodic.get(bar));

export function validate() {
  const problems = [];
  const lines = LINES.map(layLine);
  for (let i = 0; i < lines.length; i++) {
    const next = LINES[i + 1]?.[0] ?? END_BAR;
    const room = (next - lines[i].bar) * 4;
    if (lines[i].beats > room) problems.push(`bar ${lines[i].bar}: ${lines[i].beats} beats in ${room}`);
  }
  return problems;
}

export function forPage() {
  return {
    bpm: BPM, beat: BEAT, bar: BAR, length: LENGTH, endBar: END_BAR,
    sections: SECTIONS.map(s => ({ ...s, t: barTime(s.bar), end: barTime(s.bar + s.bars) })),
    chords: CHORDS.map((c, i) => ({ bar: i, t: barTime(i), name: c, lift: keyAt(i) })),
    lines: LINES.map(layLine).map(l => ({
      bar: l.bar, words: l.words, t: l.t, end: l.end,
      notes: l.notes.map(n => ({ syl: n.syl, t: +n.t.toFixed(4), dur: +n.dur.toFixed(4), midi: n.midi })),
    })),
    cues: CUES.map(c => ({ ...c, t: +barTime(c.bar).toFixed(4) })),
  };
}
