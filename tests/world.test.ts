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
/** 바닥에 떨어진 동전이 생길 때까지 (최대 2분) */
const waitCoin = (w: World) => { const ok = (x: { z: number; picked: boolean }) => x.z === 0 && !x.picked; for (let i = 0; i < 3600 && !w.coins.some(ok); i++) w.update(1 / 30, null); return w.coins.find(ok)!; };

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
    expect(w.coins.length + w.missed).toBeGreaterThan(0);
  });
  it('수거 보너스는 동전 하나에 한 번만, 오래 방치하면 사라진다', () => {
    const { s, w } = setup();
    const c = waitCoin(w);
    const before = s.coins;
    w.pick(c, 'hand'); w.pick(c, 'staff');
    expect(s.coins - before).toBe(c.value);
    const t = defaultSave(); const tc = freeDraw(t)!; placeAnimal(t, tc.uid);
    const w2 = new World(t); w2.relayout(1.6); w2.sync();
    waitCoin(w2);
    const ids = w2.coins.map((x) => x.id);
    run(w2, COIN.lifeSec + 1);
    expect(w2.coins.some((x) => ids.includes(x.id))).toBe(false);
    expect(w2.missed).toBeGreaterThan(0);
  });
  it('기본은 눌러야 줍고, 쓸어 담기 업그레이드 후에는 커서를 대면 줍는다', () => {
    const { s, w } = setup();
    const c0 = waitCoin(w);
    const b0 = s.stats.coinsPicked;
    w.update(1 / 30, { x: c0.x, y: c0.y - 1 });
    expect(s.stats.coinsPicked).toBe(b0);
    expect(w.clickAt(c0.x, c0.y - 1)).toBeGreaterThan(0);
    expect(s.stats.coinsPicked).toBeGreaterThan(b0);
    s.upgrades.pickup = 1;
    const c = waitCoin(w);
    const before = s.stats.coinsPicked;
    w.update(1 / 30, { x: c.x, y: c.y - 1 });
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

describe('손 수거', () => {
  it('떨어지는 중인 동전도 바로 줍는다 (쓸어 담기)', () => {
    const { s, w } = setup();
    s.upgrades.pickup = 1;
    for (let i = 0; i < 3600 && !w.coins.length; i++) w.update(1 / 30, null);
    const c = w.coins[0];
    const before = s.stats.coinsPicked;
    w.update(1 / 60, { x: c.x, y: c.y - 1 - c.z });
    expect(s.stats.coinsPicked).toBeGreaterThan(before);
  });
});

describe('낮과 밤', () => {
  it('낮이 끝나면 밤이 되고 정산, 밤에는 관람객이 없고 개장하면 다음 날', async () => {
    const { DAY } = await import('../src/data/balance');
    const { s, w } = setup();
    let report = null as null | { day: number; visitors: number };
    for (let i = 0; i < 30 * (DAY.dayLen + 1) && !report; i++) { w.update(1 / 30, null); for (const e of w.events) if (e.type === 'night') report = e.report; w.events.length = 0; }
    expect(report).not.toBeNull();
    expect(report!.day).toBe(1);
    expect(report!.visitors).toBeGreaterThan(0);
    expect(w.isNight).toBe(true);
    expect(w.coins).toHaveLength(0);
    run(w, 10);
    expect(w.visitors).toHaveLength(0);
    w.openPark();
    expect(w.isNight).toBe(false);
    expect(s.day).toBe(2);
  });
  it('밤은 1분이 지나면 저절로 아침', async () => {
    const { DAY } = await import('../src/data/balance');
    const { w } = setup();
    run(w, DAY.dayLen + DAY.nightMax + 1);
    expect(w.isNight).toBe(false);
  });
});
