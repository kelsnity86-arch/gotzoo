// 관람객 수입 · 동전 보너스 · 직원
import { describe, expect, it } from 'vitest';
import { defaultSave } from '../src/game/state';
import { World, computeLayout } from '../src/game/world';
import { freeDraw, placeAnimal, assignStaff } from '../src/game/rules';
import { COIN, VISITOR } from '../src/data/balance';

function setup() {
  const s = defaultSave();
  const c = freeDraw(s)!;
  placeAnimal(s, c.uid);
  const w = new World(s, Math.random);
  w.relayout(1.6); w.sync();
  return { s, w };
}
const run = (w: World, sec: number, pointer: { x: number; y: number } | null = null) => { for (let i = 0; i < sec * 30; i++) w.update(1 / 30, pointer); };

describe('필드', () => {
  it('우리 배치는 화면 비율을 따른다', () => {
    const wide = computeLayout(6, 4, 2.5), tall = computeLayout(6, 4, 0.6);
    expect(wide.cols).toBeGreaterThan(tall.cols);
    expect(wide.pens).toHaveLength(6);
  });
  it('첫 동물을 배치하면 30초 안에 투척이 시작되고, 기본 수입은 바로 들어온다', () => {
    const { s, w } = setup();
    run(w, 30);
    expect(s.coins).toBeGreaterThan(0);
    expect(w.coins.length).toBeGreaterThan(0);
  });
  it('수거 보너스는 동전 하나에 한 번만, 20초 뒤 사라진다', () => {
    const { s, w } = setup();
    run(w, 25);
    const c = w.coins.find((x) => x.z === 0)!;
    const before = s.coins;
    w.pick(c, 'hand'); w.pick(c, 'staff');
    expect(s.coins - before).toBe(c.value);
    const t = defaultSave(); const tc = freeDraw(t)!; placeAnimal(t, tc.uid);
    const w2 = new World(t); w2.relayout(1.6); w2.sync();
    run(w2, 20);
    const ids = w2.coins.map((x) => x.id);
    run(w2, COIN.lifeSec + 1);
    expect(w2.coins.some((x) => ids.includes(x.id))).toBe(false);
  });
  it('커서를 대면 줍는다', () => {
    const { s, w } = setup();
    run(w, 25);
    const c = w.coins.find((x) => x.z === 0)!;
    const before = s.stats.coinsPicked;
    w.update(1 / 30, { x: c.x, y: c.y });
    expect(s.stats.coinsPicked).toBeGreaterThan(before);
  });
  it('수거 직원은 동전을 자동으로 줍는다, 직원이 없어도 수입은 생긴다', () => {
    const { s, w } = setup();
    s.cards.push({ uid: 999, kind: 'staff', staff: 'collector' }); s.nextUid = 1000;
    assignStaff(s, 999); w.sync();
    run(w, 90);
    expect(s.stats.coinsPicked).toBeGreaterThan(0);
  });
  it('사육사는 먹이로 매력도를 올린다', () => {
    const { s, w } = setup();
    const a0 = w.attract;
    s.cards.push({ uid: 998, kind: 'staff', staff: 'keeper' }); s.nextUid = 1000;
    assignStaff(s, 998); w.sync();
    run(w, 20);
    expect(w.fedLeft[0]).toBeGreaterThan(0);
    expect(w.attract).toBeGreaterThan(a0);
  });
  it('관람객 수: 분당 3 + 매력도 × 0.2, 게이트 한도', () => {
    const { w } = setup();
    expect(w.visitorRate).toBeCloseTo(VISITOR.basePerMin + 0.2 * 20, 5);
  });
});
