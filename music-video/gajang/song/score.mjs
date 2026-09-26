// 오늘도 수고했어 — the song, as data.
//
// A forty-something father's day, from the 5:30 alarm to the last train home, and the one word
// at the door that makes it worth it. Same machinery as the high-school song (../../song/score.mjs):
// notes are "syllable:pitch:beats", "_" is a rest, and validate() checks every line. It is
// arranged as dark, minimal pop by ../../song/darkpop.mjs (../../song/ballad.mjs also plays it,
// as a piano ballad).

export const BPM = 100;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;

// The same shape as the first song, so the band plays it the same way; the last chorus and the
// outro go up a whole step.
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

export const END_BAR = 70;
export const LENGTH = END_BAR * BAR + 3.6;

// D minor: the old D-major walk-down moved into minor, with A kept major where it pulls home.
const VERSE = ['Dm', 'Am', 'A#', 'F', 'Gm', 'Dm', 'Gm', 'A'];
const PRE = ['Gm', 'F', 'Gm', 'A'];
const CHORUS = ['Dm', 'Am', 'A#', 'F', 'Gm', 'Dm', 'Gm', 'A'];

export const CHORDS = [
  'Dm', 'Dm', 'Dm', 'Dm', 'Dm', 'Am', 'A#', 'Gm', // intro 0-7
  ...VERSE,                                    // verse 1   8-15
  ...PRE,                                      // pre 1     16-19
  ...CHORUS,                                   // chorus 1  20-27
  ...VERSE,                                    // verse 2   28-35
  ...PRE,                                      // pre 2     36-39
  ...CHORUS,                                   // chorus 2  40-47
  'A#', 'A#', 'Gm', 'Gm', 'Gm', 'Gm', 'A', 'A', // bridge 48-55
  'Gm', 'B',                                   // build     56-57 (B is V of the new key)
  ...CHORUS,                                   // chorus 3  58-65 (+2)
  'Gm', 'A', 'Dm', 'A',                        // outro     66-69 (+2)
  'Dm',                                        // the hit   70    (+2)
];

// The tune is played, not sung, and the words run underneath as subtitles. Verses sit low and
// talk; the chorus leaps up a sixth on "오늘도" and settles back down. D minor, with C# where
// the A-major chord pulls home.
const V = [
  '_:.5 A4:.5 A4:.5 A4:.5 Bb4:.5 A4:.5 F4:.5 E4:.5 E4:1 F4:.5 A4:.5 D5:.5 C5:.5 A4:1',
  '_:.5 Bb4:.5 Bb4:.5 A4:.5 Bb4:.5 D5:.5 C5:.5 Bb4:.5 A4:1 F4:.5 A4:.5 A4:.5 E4:.5 F4:1',
  '_:.5 Bb4:.5 Bb4:.5 Bb4:.5 C5:.5 D5:.5 Bb4:.5 G4:.5 A4:1 F4:.5 A4:.5 D5:1 A4:1',
  '_:.5 G4:.5 G4:.5 A4:.5 Bb4:1 A4:.5 G4:.5 E4:.5 E4:.5 A4:1 G4:.5 E4:1.5',
];
const PRE_TUNE = [
  'G4:.5 G4:.5 G4:.5 A4:.5 Bb4:1 A4:.5 G4:.5 A4:1.5 A4:.5 Bb4:.5 C5:.5 A4:1',
  'Bb4:1 A4:.5 Bb4:1.5 D5:1 A4:1 C#5:1 E5:2',
];
const HOOK = 'A4:.5 D5:.5 F5:1 E5:.5 D5:.5 D5:1';          // 오늘도 수고했 — the 어 lands on the bar
const CH = [
  `${HOOK} E5:1 C5:.5 C5:.5 Bb4:.5 A4:.5 Bb4:.5 A4:.5`,
  'Bb4:.5 Bb4:.5 D5:1 D5:.5 C5:.5 Bb4:.5 C5:.5 C5:1 A4:.5 Bb4:.5 C5:.5 A4:1.5',
  'Bb4:.5 D5:.5 G5:1 F5:.5 E5:.5 D5:1 F5:1 E5:.5 D5:.5 A4:1 Bb4:.5 A4:.5',
  'Bb4:.5 Bb4:.5 D5:1 D5:.5 E5:.5 D5:1 E5:1 C#5:1 A4:2',
];
const CH_LAST = 'Bb4:.5 Bb4:.5 D5:1 D5:.5 E5:.5 F5:.5 G5:.5 E5:1 C#5:1 A4:2';

export const LINES = [
  [8, '알람보다 먼저 깨는 새벽 다섯 시', V[0]],
  [10, '잠든 아이 이마에 입 맞추고 나와', V[1]],
  [12, '만원 지하철 속 낀 채로 흔들려', V[2]],
  [14, '그래도 오늘을 버텨 볼 거야', V[3]],
  [16, '넥타이를 조이며 숨 한 번 쉬고', PRE_TUNE[0]],
  [18, '웃으며 문을 열어', PRE_TUNE[1]],
  [20, '오늘도 수고했어, 마흔의 나에게', CH[0]],
  [22, '어깨 위 무게만큼 사랑하니까', CH[1]],
  [24, '오늘도 수고했어, 소주 한 잔에', CH[2]],
  [26, '내일도 다시 웃어 볼게', CH[3]],

  [28, '회의실 부장님 한숨 소리 속에서', V[0]],
  [30, '결재 도장 하나 받으면 하루가 가', V[1]],
  [32, '대출 이자 학원비 계산해 봐도', V[2]],
  [34, '창밖엔 어느새 별이 떠 있네', V[3]],
  [36, '허리를 두드리며 숨 한 번 쉬고', PRE_TUNE[0]],
  [38, '막차에 몸을 실어', PRE_TUNE[1]],
  [40, '오늘도 수고했어, 마흔의 나에게', CH[0]],
  [42, '어깨 위 무게만큼 사랑하니까', CH[1]],
  [44, '오늘도 수고했어, 소주 한 잔에', CH[2]],
  [46, '내일도 다시 웃어 볼게', CH[3]],

  [48, '기타 치던 스무 살은 어디 갔을까', '_:.5 F4:.5 F4:.5 F4:.5 A4:.5 Bb4:.5 A4:.5 F4:.5 D4:1 F4:.5 A4:.5 Bb4:.5 A4:.5 F4:1'],
  [50, '거울 속엔 낯선 아저씨 하나', '_:.5 D4:.5 G4:.5 G4:.5 A4:.5 Bb4:1 A4:.5 G4:.5 G4:.5 Bb4:1 A4:.5 G4:1.5'],
  [52, '그런데 문 열면 달려오는 아이', 'E4:.5 G4:.5 Bb4:1 Bb4:.5 A4:.5 Bb4:1 Bb4:.5 D5:.5 E5:.5 D5:.5 Bb4:.5 G4:1.5'],
  [54, '아빠! 그 한마디면 충분해', 'E5:1 C#5:1 A4:.5 B4:.5 C#5:.5 D5:.5 E5:1 E5:.5 D5:.5 C#5:2'],

  [58, '오늘도 수고했어, 마흔의 나에게', CH[0]],
  [60, '어깨 위 무게만큼 사랑하니까', CH[1]],
  [62, '오늘도 수고했어, 소주 한 잔에', CH[2]],
  [64, '내일도 너를 위해 달릴게', CH_LAST],
  [66, '고마워 오늘의 나', 'D5:1 Bb4:.5 A4:1.5 Bb4:1 C#5:.5 Bb4:.5 A4:3'],
  [68, '오늘도 수고했어', `${HOOK} E5:4`],
];

// The lead's own tune: the chorus hook, previewed over the intro, and the climb in the build.
export const RIFF = [
  [4, 'A4:.5 D5:.5 F5:1 E5:.5 D5:.5 D5:1'],
  [5, 'E5:2 C5:1 A4:1'],
  [6, 'Bb4:.5 D5:.5 F5:1 E5:.5 D5:.5 C5:1'],
  [7, 'D5:2 Bb4:1 A4:1'],
  [56, 'G4:.5 Bb4:.5 D5:.5 G5:1 F5:.5 D5:.5 Bb4:.5'],
  [57, 'B4:.5 D#5:.5 F#5:.5 B5:1 A5:.5 _:1'],
];

export const CUES = [
  { bar: 0, kind: 'clock' },          // the flat, still dark, ticking
  { bar: 3.5, kind: 'alarm' },        // 5:30
  { bar: 12, kind: 'bell' },          // the subway doors
  { bar: 21, kind: 'boom' }, { bar: 25, kind: 'boom' },
  { bar: 25.75, kind: 'clink' },      // 짠
  { bar: 30.75, kind: 'stamp' },      // the approval stamp
  { bar: 41, kind: 'boom' }, { bar: 45, kind: 'boom' },
  { bar: 45.75, kind: 'clink' },
  { bar: 52, kind: 'heartbeat' },     // the door, the running feet
  { bar: 56, kind: 'ticks' },
  { bar: 57.75, kind: 'silence' },
  { bar: 58, kind: 'megaboom' },
  { bar: 59, kind: 'boom' }, { bar: 63, kind: 'boom' },
  { bar: 63.75, kind: 'clink' },
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
