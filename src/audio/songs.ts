// 뽑ZOO 배경음 1차: 타이틀 · 계절 낮/밤 8곡 · 뽑기 기계 · 결과 징글 4종. 전부 직접 작곡 (외부 음원 없음).
// 멜로디는 C장조/A단조로 적고 key로 옮긴다. 토큰 = 8분음표 ('-' 이어짐 · '.' 쉼 · 'c5/e5' 16분음표 둘), 마디 = '|'.
// 타이틀 동기 "솔 도 미 솔 — 미" (g4 c5 e5 g5 - e5)를 여러 곡의 B · C 구간에 숨겨 두었다.
// layer: 동물원 규모 단계 (0 작은~동네 · 1 시립~도시 · 2 테마~국립 · 3 대륙~세계) — 커질수록 악기가 늘어난다.
import type { Song } from './music';

const TITLE: Song = {
  id: 'title', title: '뽑ZOO 테마', bpm: 120, beats: 4, form: ['A', 'B', 'A2', 'C'],
  sections: {
    A: { chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F G', 'C'],
      mel: 'g4 . c5 e5 g5 - e5 . | a5 - g5 e5 c5 - . . | f5 . a5 f5 e5 c5 d5 . | d5 - - . b4 c5 d5 . | g4 . c5 e5 g5 - c6 . | a5 - g5 e5 a5 - c6 . | a5 g5 f5 a5 g5 f5 d5 b4 | c5 - - - . . . .' },
    B: { chords: ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'G7'],
      mel: 'a5 - c6 - a5 g5 f5 . | g5 - b5 - g5 f5 e5 . | e5 - g5 b5 - a5 g5 . | a5 - - - e5 . . . | f5 . e5 d5 f5 . a5 . | g5 - f5 e5 d5 - b4 . | c5 e5 g5 c6 - b5 a5 . | g5 - - - f5 e5 d5 b4',
      counter: 'f4 - - - - - - - | d4 - - - - - - - | e4 - - - - - - - | c4 - - - - - - - | a4 - - - - - - - | b4 - - - - - - - | e4 - - - - - - - | b4 - - - - - - -' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['Am', 'Em', 'F', 'C', 'Dm', 'Em', 'F', 'G'],
      mel: 'e5 - - . c5 d5 e5 . | b4 - - . g4 a4 b4 . | c5 - a4 - f5 - e5 . | e5 - - - . . . . | f5 - - . d5 e5 f5 . | g5 - - . e5 f5 g5 . | a5 - g5 - f5 - e5 - | d5 - - - g4 . . .' },
  },
  parts: [
    { inst: 'lead', role: 'mel' }, { inst: 'flute', role: 'counter', vol: 0.7, shift: 12 },
    { inst: 'bass', role: 'bass' }, { inst: 'marimba', role: 'arp', vol: 0.7 }, { inst: 'pad', role: 'pad' },
    { inst: 'kick', role: 'drums', style: 'pop', vol: 0.8 }, { inst: 'bell', role: 'chime', vol: 0.6 },
  ],
};

// ── 봄 ──
const SPRING_DAY: Song = {
  id: 'spring_day', title: '벚꽃 산책', bpm: 108, beats: 4, key: -5, form: ['A', 'B', 'A2', 'C'],
  sections: {
    A: { chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'G'],
      mel: 'e5 . g5 . c6 - b5 a5 | g5 - d5 - - . e5 f5 | e5 . a5 . c6 - b5 a5 | g5 - - - . . e5 g5 | a5 . f5 . a5 - g5 f5 | e5 - c5 - - . e5 g5 | f5 - e5 - d5 - c5 d5 | d5 - - - . . . .' },
    B: { chords: ['Am', 'F', 'C', 'G', 'F', 'G', 'C', 'G'],
      mel: 'c5 . e5 . a5 - g5 e5 | f5 - - . a5 - c6 . | g5 . c5 e5 g5 - e5 . | d5 - - - . b4 c5 d5 | a5 - g5 - f5 - a5 - | g5 - f5 - d5 - b4 - | c5 . e5 g5 c6 - - . | b5 - - - g5 . . .' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['F', 'Em', 'Dm', 'C', 'F', 'Em', 'Dm', 'G'],
      mel: 'a5 - - - g5 - f5 - | g5 - - - e5 - - . | f5 - - - e5 - d5 - | e5 - - - - - . . | c6 - - - b5 - a5 - | b5 - - - g5 - - . | a5 - g5 - f5 - e5 - | d5 - - - - . . .' },
  },
  parts: [
    { inst: 'flute', role: 'mel' }, { inst: 'bass', role: 'bass', vol: 0.85 },
    { inst: 'marimba', role: 'arp', layer: 1, vol: 0.65 }, { inst: 'pad', role: 'pad', layer: 1, vol: 0.8 },
    { inst: 'shaker', role: 'drums', style: 'shaker', layer: 2, vol: 0.8 }, { inst: 'bell', role: 'chime', layer: 3, vol: 0.5 },
  ],
};
const SPRING_NIGHT: Song = {
  id: 'spring_night', title: '꽃잎 자장가', bpm: 76, beats: 3, key: 5, form: ['A', 'B', 'A2', 'C'], gain: 1.1,
  sections: {
    A: { chords: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'],
      mel: 'e5 - - - g5 - | c5 - - - e5 - | a4 - c5 - f5 - | d5 - - - - . | e5 - - - g5 - | b4 - - - e5 - | a4 - c5 - f5 - | g4 - - - - .' },
    B: { chords: ['F', 'C', 'Dm', 'G', 'Em', 'Am', 'Dm', 'G'],
      mel: 'a4 - - - c5 - | g4 - - - e5 - | f5 - e5 - d5 - | b4 - - - - . | g4 - b4 - e5 - | c5 - - - a4 - | d5 - c5 - a4 - | b4 - - - - .' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['Am', 'F', 'C', 'G', 'F', 'G', 'C', 'C'],
      mel: 'c5 - e5 - a5 - | a5 - g5 - f5 - | e5 - - - c5 - | d5 - - - - . | f5 - e5 - d5 - | d5 - e5 - f5 - | e5 - - - - - | c5 - - - - .' },
  },
  parts: [
    { inst: 'musicbox', role: 'mel' }, { inst: 'pad', role: 'pad', vol: 0.9 },
    { inst: 'bass', role: 'bass', style: 'waltz', layer: 1, vol: 0.6 }, { inst: 'musicbox', role: 'arp', style: 'waltz', layer: 2, vol: 0.35 },
    { inst: 'bell', role: 'chime', layer: 3, vol: 0.35 },
  ],
};

// ── 여름 ──
const SUMMER_DAY: Song = {
  id: 'summer_day', title: '햇살 퍼레이드', bpm: 128, beats: 4, key: 2, form: ['A', 'B', 'A2', 'C'], gain: 1.35,
  sections: {
    A: { chords: ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'G'],
      mel: 'c5 . e5 g5 . e5 g5 c6 | a5 . f5 a5 . c6 - . | b5 a5 g5 . d5 . g5 . | e5 - c5 . g5 - - . | a5 . c6 a5 . e5 g5 a5 | f5 . a5 c6 . a5 f5 . | g5 - b5 - d6 - b5 g5 | g5 - - - . . . .' },
    B: { chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
      mel: 'a5 . a5 g5 f5 . c5 . | d5 . d5 e5 f5 . g5 . | g5 . c5 e5 g5 - e5 . | a5 - - . e5 . c5 . | f5 . f5 e5 f5 . a5 . | g5 . g5 f5 g5 . b5 . | c6 - b5 a5 g5 - e5 . | c5 - - - . . . .' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['Am', 'Em', 'F', 'C', 'Dm', 'G', 'Em', 'G'],
      mel: 'e5 - - . a5 - - . | g5 - - . e5 - - . | f5 - a5 - c6 - a5 . | g5 - - - - . . . | f5 - - . a5 - - . | g5 - - . b5 - - . | e5 - g5 - b5 - g5 . | d5 - - - - . . .' },
  },
  parts: [
    { inst: 'steel', role: 'mel' }, { inst: 'bass', role: 'bass', style: 'pulse', vol: 0.8 },
    { inst: 'shaker', role: 'drums', style: 'shaker', vol: 0.7 },
    { inst: 'pluck', role: 'arp', layer: 1, vol: 0.7 }, { inst: 'kick', role: 'drums', style: 'pop', layer: 2, vol: 0.75 },
    { inst: 'pad', role: 'pad', layer: 2, vol: 0.6 }, { inst: 'bell', role: 'chime', layer: 3, vol: 0.5 },
  ],
};
const SUMMER_NIGHT: Song = {
  id: 'summer_night', title: '반딧불 연못', bpm: 76, beats: 4, form: ['A', 'B', 'A2', 'C'], gain: 1.1,
  sections: {
    A: { chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'],
      mel: 'e5 - - - - - c5 - | a4 - - - - - . . | g4 - c5 - e5 - g5 - | d5 - - - - - . . | e5 - - - - - a5 - | c5 - - - - - . . | d5 - f5 - a5 - g5 - | e5 - - - - - . .' },
    B: { chords: ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'E'],
      mel: 'a5 - - - g5 - f5 - | g5 - - - - - d5 - | e5 - - - g5 - b5 - | a5 - - - - - . . | f5 - - - e5 - d5 - | d5 - - - b4 - g4 - | c5 - e5 - g5 - c6 - | b5 - - - g#5 - - .' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['Am', 'Am', 'F', 'F', 'C', 'G', 'Am', 'Am'],
      mel: '. . . . e5 - d5 - | c5 - - - a4 - - . | . . . . f5 - e5 - | c5 - - - - - . . | e5 - - - g5 - - . | d5 - - - b4 - - . | c5 - - - b4 - - . | a4 - - - - - . .' },
  },
  parts: [
    { inst: 'bell', role: 'mel', vol: 1.3 }, { inst: 'pad', role: 'pad' }, { inst: 'cricket', role: 'fx', vol: 0.9 },
    { inst: 'bass', role: 'bass', style: 'soft', layer: 1, vol: 0.6 }, { inst: 'musicbox', role: 'arp', style: 'slow', layer: 2, vol: 0.4 },
    { inst: 'soft', role: 'chime', layer: 3, vol: 0.5 },
  ],
};

// ── 가을 ──
const AUTUMN_DAY: Song = {
  id: 'autumn_day', title: '단풍 소풍', bpm: 96, beats: 4, key: -2, swing: 0.15, form: ['A', 'B', 'A2', 'C'],
  sections: {
    A: { chords: ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'F', 'G'],
      mel: 'g4 . c5 . e5 . g5 a5 | g5 - e5 - c5 - . . | d5 . f5 . a5 . c6 a5 | g5 - - - . . f5 e5 | d5 . e5 f5 g5 . e5 c5 | a4 - c5 - e5 - . . | f5 . e5 d5 c5 . a4 . | b4 - - - - . . .' },
    B: { chords: ['F', 'C', 'Dm', 'Am', 'F', 'C', 'Dm', 'G'],
      mel: 'a5 - - . g5 a5 g5 f5 | e5 - - . g5 - c5 . | d5 . e5 f5 a5 - g5 f5 | e5 - - - . . . . | a5 - - . g5 a5 c6 a5 | g5 - - . e5 - c5 . | f5 . e5 d5 g5 . f5 d5 | g5 - - - . . . .' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['Am', 'Em', 'F', 'C', 'F', 'G', 'C', 'G'],
      mel: 'c5 - e5 - a5 - g5 . | g5 - - - e5 - . . | g4 . c5 e5 g5 - e5 . | e5 - - - - . . . | f5 - a5 - c6 - b5 a5 | g5 - - - d5 - . . | e5 . f5 g5 c6 - g5 e5 | d5 - - - - . . .' },
  },
  parts: [
    { inst: 'flute', role: 'mel' }, { inst: 'pluck', role: 'arp', style: 'alberti', vol: 0.75 },
    { inst: 'bass', role: 'bass', style: 'walk', layer: 1, vol: 0.8 }, { inst: 'kick', role: 'drums', style: 'soft', layer: 2, vol: 0.8 },
    { inst: 'pad', role: 'pad', layer: 2, vol: 0.6 }, { inst: 'bell', role: 'chime', layer: 3, vol: 0.45 },
  ],
};
const AUTUMN_NIGHT: Song = {
  id: 'autumn_night', title: '달빛 정원', bpm: 70, beats: 4, key: 5, form: ['A', 'B', 'A2', 'C'], gain: 1.1,
  sections: {
    A: { chords: ['Am', 'Dm', 'G', 'C', 'F', 'Dm', 'E', 'Am'],
      mel: 'a4 - - - c5 - e5 - | f5 - - - e5 - d5 - | d5 - - - b4 - g4 - | c5 - - - - - . . | c5 - - - d5 - e5 - | f5 - - - a5 - f5 - | e5 - - - g#4 - b4 - | a4 - - - - - . .' },
    B: { chords: ['F', 'G', 'C', 'Am', 'Dm', 'G', 'C', 'E'],
      mel: 'a5 - - - g5 - f5 - | g5 - - - f5 - e5 - | e5 - - - c5 - e5 - | a5 - - - - - . . | f5 - - - e5 - d5 - | d5 - - - c5 - b4 - | c5 - - - e5 - g5 - | g#5 - - - - - . .' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'E', 'Am'],
      mel: 'e5 - - - - - . . | c5 - - - - - . . | d5 - - - f5 - - . | e5 - - - - - . . | a5 - - - g5 - e5 - | f5 - - - c5 - a4 - | b4 - - - g#4 - - . | a4 - - - - - . .' },
  },
  parts: [
    { inst: 'soft', role: 'mel', shift: -12 }, { inst: 'pad', role: 'pad' }, { inst: 'musicbox', role: 'arp', style: 'slow', vol: 0.4 },
    { inst: 'bass', role: 'bass', style: 'soft', layer: 1, vol: 0.6 }, { inst: 'flute', role: 'chime', layer: 2, vol: 0.4 },
    { inst: 'bell', role: 'chime', layer: 3, vol: 0.3 },
  ],
};

// ── 겨울 ──
const WINTER_DAY: Song = {
  id: 'winter_day', title: '눈송이 왈츠', bpm: 138, beats: 3, form: ['A', 'B', 'A2', 'C', 'B2', 'A3'],
  sections: {
    A: { chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'G'],
      mel: 'e5 - g5 - c6 - | b5 - - - g5 - | a5 - c6 - e6 - | b5 - - - - . | a5 - g5 - f5 - | e5 - g5 - c6 - | f5 - e5 - d5 - | d5 - - - - .' },
    B: { chords: ['Am', 'Em', 'F', 'C', 'Dm', 'G', 'C', 'G'],
      mel: 'c6 - b5 - a5 - | g5 - - - e5 - | a5 - g5 - f5 - | e5 - - - c5 - | d5 - e5 - f5 - | g5 - a5 - b5 - | c6 - - - g5 - | d6 - - - - .' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'C'],
      mel: 'g4 - c5 - e5 - | g5 - - - e5 - | g5 - e5 - b4 - | c5 - - - a4 - | f5 - e5 - d5 - | b4 - c5 - d5 - | c5 - - - - - | c5 - - - - .' },
    B2: { from: 'B', chords: [], vary: true },
    A3: { from: 'A', chords: [] },
  },
  parts: [
    { inst: 'bell', role: 'mel', vol: 1.4 }, { inst: 'bass', role: 'bass', style: 'waltz', vol: 0.75 },
    { inst: 'musicbox', role: 'arp', style: 'waltz', vol: 0.45 }, { inst: 'sleigh', role: 'drums', style: 'sleigh', layer: 1, vol: 0.7 },
    { inst: 'pad', role: 'pad', layer: 2, vol: 0.6 }, { inst: 'flute', role: 'chime', layer: 3, vol: 0.4 },
  ],
};
const WINTER_NIGHT: Song = {
  id: 'winter_night', title: '난롯가', bpm: 64, beats: 4, key: 3, form: ['A', 'B', 'A2', 'C'], gain: 1.15,
  sections: {
    A: { chords: ['C', 'Em', 'F', 'C', 'Am', 'F', 'Dm', 'G'],
      mel: 'e4 - - - g4 - c5 - | b4 - - - - - g4 - | a4 - - - c5 - f5 - | e5 - - - - - . . | c5 - - - e5 - a5 - | g5 - - - f5 - c5 - | d5 - - - e5 - f5 - | d5 - - - - - . .' },
    B: { chords: ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'G'],
      mel: 'a4 - - - c5 - f5 - | g5 - - - d5 - b4 - | b4 - - - e5 - g5 - | c5 - - - - - . . | d5 - - - f5 - a5 - | g5 - - - - - d5 - | e5 - - - g5 - c6 - | b5 - - - - - . .' },
    A2: { from: 'A', chords: [], vary: true },
    C: { chords: ['Am', 'F', 'C', 'G', 'F', 'G', 'C', 'C'],
      mel: 'c5 - - - - - e5 - | f5 - - - - - . . | g5 - - - e5 - c5 - | d5 - - - - - . . | a4 - - - c5 - f5 - | g5 - - - f5 - d5 - | e5 - - - - - . . | . . . . . . . .' },
  },
  parts: [
    { inst: 'soft', role: 'mel' }, { inst: 'pad', role: 'pad' }, { inst: 'bass', role: 'bass', style: 'soft', vol: 0.55 },
    { inst: 'musicbox', role: 'chime', layer: 1, vol: 0.5 }, { inst: 'marimba', role: 'arp', style: 'slow', layer: 2, vol: 0.35 },
    { inst: 'organ', role: 'counter', layer: 3, vol: 0.5 },
  ],
};

// ── 뽑기 ──
/** 손잡이를 돌리는 동안 반복. 기계 등급(은 · 금 · 무지개)마다 반음 2 · 4 · 7 올려서 더 두근거리게 (Player.shift) */
const GACHA: Song = {
  id: 'gacha', title: '기계 돌리기', bpm: 140, beats: 4, key: 3, form: ['A'],
  sections: {
    A: { chords: ['Am', 'F', 'G', 'E'],
      mel: 'e5 . e5 . a5 . e5 . | f5 . f5 . a5 . c6 . | g5 . g5 . b5 . d6 . | g#5 . b5 . e6 . g#5 .' },
  },
  parts: [
    { inst: 'lead', role: 'mel', vol: 0.8 }, { inst: 'pluck', role: 'arp', style: 'broken16', vol: 0.7 },
    { inst: 'bass', role: 'bass', style: 'pulse', vol: 0.8 }, { inst: 'hat', role: 'drums', style: 'tick', vol: 0.9 },
  ],
};
const J_COMMON: Song = {
  id: 'jingle_common', title: '결과: 일반', bpm: 168, beats: 4, once: true, form: ['A'],
  sections: { A: { chords: ['C'], mel: 'c5 e5 g5 c6 - - . .' } },
  parts: [{ inst: 'lead', role: 'mel' }, { inst: 'marimba', role: 'arp', vol: 0.6 }, { inst: 'bass', role: 'bass', style: 'soft', vol: 0.6 }],
};
const J_RARE: Song = {
  id: 'jingle_rare', title: '결과: 희귀 · 영웅', bpm: 150, beats: 4, once: true, form: ['A'],
  sections: { A: { chords: ['C', 'C'], mel: 'c5 e5 g5 c6 e6 - g6 - | e6 - - - . . . .', counter: 'g4 - - - - - - - | c5 - - - - - - -' } },
  parts: [{ inst: 'lead', role: 'mel' }, { inst: 'bell', role: 'counter', vol: 0.8, shift: 12 }, { inst: 'pad', role: 'pad' }, { inst: 'bass', role: 'bass', style: 'soft', vol: 0.7 }, { inst: 'steel', role: 'chime', vol: 0.6 }],
};
const J_LEGEND: Song = {
  id: 'jingle_legend', title: '결과: 전설', bpm: 120, beats: 4, once: true, form: ['A'],
  sections: { A: { chords: ['C', 'F G', 'C'], mel: 'g4 . c5 e5 g5 - - . | a5 - b5 - c6 - d6 - | e6 - - - - - - .', counter: 'e4 - - - - - - - | f4 - - - g4 - - - | g4 - - - - - - -' } },
  parts: [{ inst: 'brass', role: 'mel' }, { inst: 'brass', role: 'counter', vol: 0.6 }, { inst: 'pad', role: 'pad' }, { inst: 'bass', role: 'bass' },
    { inst: 'snare', role: 'drums', style: 'march', vol: 0.8 }, { inst: 'bell', role: 'chime', vol: 0.7 }],
};
/** 신화(올림푸스): 타이틀 동기를 웅장하게 — 금관 · 종 · 팀파니 */
const J_MYTHIC: Song = {
  id: 'jingle_mythic', title: '결과: 신화', bpm: 92, beats: 4, once: true, form: ['A'],
  sections: { A: { chords: ['C', 'Am', 'F G', 'C'],
    mel: 'g4 . c5 e5 g5 - e5 g5 | c6 - - - b5 - a5 - | a5 - g5 - f5 - d5 - | c6 - - - - - - -',
    counter: 'e5 - - - - - - - | e5 - - - - - - - | c5 - - - b4 - - - | g5 - - - - - - -' } },
  parts: [{ inst: 'brass', role: 'mel' }, { inst: 'bell', role: 'counter', vol: 0.9, shift: 12 }, { inst: 'pad', role: 'pad', vol: 1.2 },
    { inst: 'tom', role: 'bass', vol: 0.9 }, { inst: 'bass', role: 'bass', style: 'soft', vol: 0.7 }, { inst: 'organ', role: 'arp', style: 'slow', vol: 0.6 }],
};

export const SONGS: Song[] = [TITLE, SPRING_DAY, SPRING_NIGHT, SUMMER_DAY, SUMMER_NIGHT, AUTUMN_DAY, AUTUMN_NIGHT, WINTER_DAY, WINTER_NIGHT, GACHA, J_COMMON, J_RARE, J_LEGEND, J_MYTHIC];
export const songById = (id: string) => SONGS.find((s) => s.id === id);
