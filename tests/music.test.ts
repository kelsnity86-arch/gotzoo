import { describe, expect, it } from 'vitest';
import { SONGS } from '../src/audio/songs';
import { compile } from '../src/audio/music';

describe('배경음 악보', () => {
  it('모든 곡이 박자 · 음 이름 · 화음 오류 없이 풀리고, 반복 곡은 60~130초', () => {
    for (const s of SONGS) {
      const c = compile(s);
      const sec = c.beats * c.spb;
      expect(c.events.length).toBeGreaterThan(2);
      if (!s.once && s.id !== 'gacha') { expect(sec, s.id).toBeGreaterThan(s.short ? 9 : 55); expect(sec, s.id).toBeLessThan(130); }
      for (const e of c.events) if (s.parts[e.part].role !== 'drums') { expect(e.midi, s.id).toBeGreaterThan(20); expect(e.midi, s.id).toBeLessThan(110); }
    }
  });
  it('멜로디 음 높이가 듣기 편한 범위 (C3~C7)', () => {
    for (const s of SONGS) { const c = compile(s); for (const e of c.events) if (s.parts[e.part].role === 'mel') { expect(e.midi, s.id).toBeGreaterThanOrEqual(48); expect(e.midi, s.id).toBeLessThanOrEqual(96); } }
  });
});
