// 고딩 라이프 (Goding Life) — the song, as data.
//
// Everything that has a time in the video comes from here: the synth renders the audio from it
// and writes src/song.js for the page, so the karaoke, the cuts and the hits can never drift
// from the music.
//
// Notes are written as "syllable:pitch:beats" ("_" is a rest). A line is laid out from the bar
// it starts on; `validate()` checks that every line fits in the bars it was given.

export const BPM = 132;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;

// Sections, in bars. The last chorus and the outro are a whole step up (`key: 2`).
export const SECTIONS = [
  { id: 'intro', name: '인트로', bar: 0, bars: 8 },
  { id: 'verse1', name: '1절', bar: 8, bars: 8 },
  { id: 'pre1', name: '프리코러스', bar: 16, bars: 4 },
  { id: 'chorus1', name: '후렴', bar: 20, bars: 8 },
  { id: 'verse2', name: '2절', bar: 28, bars: 8 },
  { id: 'pre2', name: '프리코러스', bar: 36, bars: 4 },
  { id: 'chorus2', name: '후렴', bar: 40, bars: 8 },
  { id: 'bridge', name: '브리지', bar: 48, bars: 8 },
  { id: 'build', name: '빌드업', bar: 56, bars: 2 },
  { id: 'chorus3', name: '마지막 후렴', bar: 58, bars: 8, key: 2 },
  { id: 'outro', name: '아웃트로', bar: 66, bars: 4, key: 2 },
  { id: 'end', name: '엔딩', bar: 70, bars: 2, key: 2 },
];

export const END_BAR = 70;              // the final hit
export const LENGTH = END_BAR * BAR + 3.6;  // the hit rings out, then silence

const VERSE = ['Em', 'C', 'G', 'D'];
const PRE = ['Am', 'C', 'D', 'D'];
const CHORUS = ['G', 'D', 'Em', 'C'];

// One chord per bar, written in E minor. `keyAt()` lifts the last chorus.
export const CHORDS = [
  'Em', 'Em', 'Em', 'Em', ...VERSE,           // intro 0-7
  ...VERSE, ...VERSE,                          // verse 1   8-15
  ...PRE,                                      // pre 1     16-19
  ...CHORUS, ...CHORUS,                        // chorus 1  20-27
  ...VERSE, ...VERSE,                          // verse 2   28-35
  ...PRE,                                      // pre 2     36-39
  ...CHORUS, ...CHORUS,                        // chorus 2  40-47
  'Em', 'Em', 'C', 'C', 'Am', 'Am', 'B', 'B',  // bridge    48-55
  'D', 'E',                                    // build     56-57 (V of the new key)
  ...CHORUS, ...CHORUS,                        // chorus 3  58-65 (+2)
  'C', 'D', 'G', 'D',                          // outro     66-69 (+2)
  'G',                                         // the hit   70    (+2)
];

// The tunes. Verse 2, pre 2 and chorus 2 reuse the rhythms and pitches of the first time
// through with new words, so they are written once and re-texted.
const V1 = [
  'B4:.5 B4:.5 A4:.5 G4:.5 B4:1 B4:.5 G4:.5 E4:.5 E4:.5 G4:.5 A4:.5 G4:.5 E4:1',
  'G4:.5 G4:.5 A4:.5 B4:.5 D5:1 B4:.5 A4:.5 A4:1 A4:.5 B4:.5 A4:.5 F#4:1',
  'B4:.5 B4:.5 B4:1 E5:.5 D5:1 B4:.5 G4:.5 E4:.5 G4:.5 A4:.5 C5:.5 G4:1',
  'D5:1 B4:.5 A4:.5 G4:.5 B4:1 A4:.5 A4:.5 G4:.5 F#4:1 F#4:.5 A4:1',
];
const PRE_TUNE = [
  'A4:.5 A4:.5 C5:.5 E5:1.5 _:1 G4:.5 G4:.5 C5:1 E5:1',
  'A4:.5 A4:.5 B4:.5 A4:1.5 F#4:.5 A4:.5 D5:1 D5:.5 E5:.5 F#5:2',
];
const HOOK = 'B4:.5 B4:.5 D5:1 B4:.5 A4:.5 G4:.5 A4:.5 D5:1';
const CH = [
  `${HOOK} A4:.5 A4:.5 B4:.5 A4:1`,
  'G4:.5 A4:.5 B4:1 B4:.5 A4:.5 G4:1 G4:.5 B4:.5 D5:.5 E5:2',
  `${HOOK} A4:.5 A4:.5 B4:.5 D5:1`,
  'E5:.5 D5:.5 B4:1 B4:.5 A4:1 G4:.5 G4:.5 A4:.5 C5:1 G4:1.5',
];
const CH_LAST = 'B4:.5 B4:.5 E5:1 B4:.5 A4:.5 G4:1 G4:.5 A4:.5 B4:.5 D5:.5 E5:2';

// [bar, words, tune]. Words are split into syllables; spaces and punctuation are kept for
// the karaoke but take no note.
export const LINES = [
  [8, '일곱 시 알람 소리에 겨우 눈을 떠', V1[0]],
  [10, '빵 한 조각 물고 교문까지 달려', V1[1]],
  [12, '종이 울리기 전 턱걸이 세이프', V1[2]],
  [14, '일교시부터 꾸벅꾸벅 졸아', V1[3]],
  [16, '종 울린다 하나, 둘, 셋', PRE_TUNE[0]],
  [18, '급식실까지 전력 질주다', PRE_TUNE[1]],
  [20, '우리는 고딩 라이프! 열여덟 살', CH[0]],
  [22, '교과서 구석에 그린 내 꿈', CH[1]],
  [24, '우리는 고딩 라이프! 멈추지 마', CH[2]],
  [26, '친구랑 함께면 다 괜찮아', CH[3]],

  [28, '밤 열 시 야자실 형광등 불빛 아래', V1[0]],
  [30, '문제집 사이로 몰래 건넨 쪽지', V1[1]],
  [32, '모의고사 성적표는 또 제자리', V1[2]],
  [34, '그래도 우린 웃으며 집에 가', V1[3]],
  [36, '다시 아침 하나, 둘, 셋', PRE_TUNE[0]],
  [38, '오늘도 교문까지 달려가', PRE_TUNE[1]],
  [40, '우리는 고딩 라이프! 열여덟 살', CH[0]],
  [42, '교과서 구석에 그린 내 꿈', CH[1]],
  [44, '우리는 고딩 라이프! 멈추지 마', CH[2]],
  [46, '친구랑 함께면 다 괜찮아', CH[3]],

  [48, '칠판 옆 디데이 숫자가 줄어', 'E4:.5 G4:.5 B4:1 B4:.5 A4:.5 G4:1 B4:.5 A4:.5 G4:.5 A4:.5 B4:2'],
  [50, '어른들은 자꾸 꿈이 뭐냐 물어', 'E4:.5 E4:.5 G4:1 G4:.5 A4:.5 C5:1 C5:.5 B4:.5 A4:.5 G4:.5 E4:.5 G4:1.5'],
  [52, '아직 몰라도 괜찮은 걸까', 'A4:1 C5:1 E5:.5 D5:.5 C5:1 B4:.5 A4:.5 C5:1 E5:.5 A4:1.5'],
  [54, '힘들어도 난 내일을 믿어 봐', 'F#4:.5 F#4:.5 A4:.5 A4:.5 B4:2 B4:.5 B4:.5 D#5:.5 D#5:.5 E5:.5 F#5:1.5'],

  [58, '우리는 고딩 라이프! 열여덟 살', CH[0]],
  [60, '교과서 구석에 그린 내 꿈', CH[1]],
  [62, '우리는 고딩 라이프! 멈추지 마', CH[2]],
  [64, '스무 살을 향해 끝까지 달려', CH_LAST],
  [66, '이 순간은 우리 거야', 'D5:.5 D5:.5 E5:1 C5:1 B4:.5 A4:.5 F#4:1.5 G4:2.5'],
  [68, '우리는 고딩 라이프!', `${HOOK.replace(/D5:1$/, 'D5:4')}`],
];

// The synth lead that is not a voice: the riff over the intro and the build.
export const RIFF = [
  [4, 'E5:.5 B4:.5 E5:.5 G5:1 F#5:.5 E5:.5 D5:.5'],
  [5, 'E5:1.5 G5:.5 E5:.5 C5:1 _:.5'],
  [6, 'D5:.5 B4:.5 D5:.5 G5:1 A5:.5 G5:.5 F#5:.5'],
  [7, 'F#5:2 A5:1 _:1'],
  [56, 'D5:.5 A4:.5 D5:.5 F#5:1 A5:.5 F#5:.5 E5:.5'],
  [57, 'E5:.5 B4:.5 E5:.5 G#5:1 B5:.5 _:1'],
];

// One-off hits the picture and the sound both land on. Times are in bars (fractions allowed).
export const CUES = [
  { bar: 0, kind: 'clock' },         // a bedside clock ticks over the first four bars
  { bar: 3.5, kind: 'alarm' },       // and goes off just before the band comes in
  { bar: 12, kind: 'bell' },         // the school bell as the gate shuts
  { bar: 16, kind: 'bell' },         // lunch
  { bar: 21, kind: 'boom' }, { bar: 25, kind: 'boom' },
  { bar: 36, kind: 'alarm' },        // morning again
  { bar: 41, kind: 'boom' }, { bar: 45, kind: 'boom' },
  { bar: 52, kind: 'heartbeat' },
  { bar: 56, kind: 'ticks' },        // the build: a clock on every sixteenth
  { bar: 57.75, kind: 'silence' },   // one beat of nothing before the drop
  { bar: 58, kind: 'megaboom' },     // the exam is over and the key goes up
  { bar: 59, kind: 'boom' }, { bar: 63, kind: 'boom' },
  { bar: 65, kind: 'stamp' },
  { bar: 70, kind: 'final' },
];

// ---------------------------------------------------------------------------------------------

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiOf(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad pitch ${name}`);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

const ROOT = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** A chord name as pitch classes, root first: 'Em' -> [4, 7, 11]. */
export function chordTones(name, lift = 0) {
  const m = /^([A-G]#?)(m?)$/.exec(name);
  const r = (ROOT[m[1]] + lift + 12) % 12;
  return [r, (r + (m[2] ? 3 : 4)) % 12, (r + 7) % 12];
}

export function keyAt(bar) {
  let k = 0;
  for (const s of SECTIONS) if (bar >= s.bar) k = s.key || 0;
  return k;
}

export const barTime = bar => bar * BAR;

const isHangul = ch => ch >= '가' && ch <= '힣';
const isSyllable = ch => isHangul(ch) || /[A-Za-z0-9]/.test(ch);

function parseTune(tune) {
  return tune.trim().split(/\s+/).map(tok => {
    const [p, d] = tok.split(':');
    return { rest: p === '_', midi: p === '_' ? null : midiOf(p), beats: Number(d) };
  });
}

/**
 * Lays a line out in time. Returns the syllables with their notes, plus the display text split
 * into pieces that each belong to one syllable (so the karaoke can colour them one by one).
 */
export function layLine([bar, words, tune]) {
  const notes = parseTune(tune);
  const syllables = [...words].filter(isSyllable);
  const sung = notes.filter(n => !n.rest);
  if (sung.length !== syllables.length) {
    throw new Error(`bar ${bar} "${words}": ${syllables.length} syllables, ${sung.length} notes`);
  }
  const lift = keyAt(bar);
  let beat = 0, k = 0;
  const out = [];
  for (const n of notes) {
    if (!n.rest) {
      out.push({
        syl: syllables[k++],
        t: barTime(bar) + beat * BEAT,
        dur: n.beats * BEAT,
        beat: bar * 4 + beat,
        midi: n.midi + lift,
      });
    }
    beat += n.beats;
  }
  return { bar, words, beats: beat, notes: out, t: barTime(bar), end: barTime(bar) + beat * BEAT };
}

export function layRiff([bar, tune]) {
  const lift = keyAt(bar);
  let beat = 0;
  const out = [];
  for (const n of parseTune(tune)) {
    if (!n.rest) out.push({ t: barTime(bar) + beat * BEAT, dur: n.beats * BEAT, midi: n.midi + lift });
    beat += n.beats;
  }
  return { bar, beats: beat, notes: out };
}

export function validate() {
  const problems = [];
  const lines = LINES.map(layLine);
  for (let i = 0; i < lines.length; i++) {
    const next = LINES[i + 1]?.[0] ?? END_BAR;
    const room = (next - lines[i].bar) * 4;
    if (lines[i].beats > room) problems.push(`bar ${lines[i].bar}: ${lines[i].beats} beats in ${room}`);
  }
  for (const r of RIFF.map(layRiff)) if (r.beats > 4) problems.push(`riff bar ${r.bar}: ${r.beats} beats`);
  if (CHORDS.length !== END_BAR + 1) problems.push(`${CHORDS.length} chords for ${END_BAR + 1} bars`);
  // Notes that land on a beat should belong to the chord under them, or be a step from it.
  for (const l of lines) {
    for (const n of l.notes) {
      const b = n.beat;
      if (Math.abs(b - Math.round(b)) > 1e-6 || n.dur < BEAT * 0.99) continue;
      const bar = Math.floor(b / 4);
      const tones = chordTones(CHORDS[bar], keyAt(bar));
      if (!tones.includes(n.midi % 12)) problems.push(`bar ${bar} "${n.syl}" is not in ${CHORDS[bar]}`);
    }
  }
  return problems;
}

/** What the page needs, as plain data. */
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
