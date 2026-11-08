import { describe, expect, it } from 'vitest';
import { defaultSave } from '../src/game/state';
import { gainGod, gainHero, godVal, activeGods, carrySlots, carryCost, closeZoo, zooScale, rollRivalCond, rivalAt, templeDone, gateCapOf, placeAnimal, assignStaff, hasHero } from '../src/game/rules';
import { GODS, HEROES, NAMED } from '../src/data/olympus';
import { RIVAL_COND } from '../src/data/rivals';

describe('올림푸스 네임드', () => {
  it('12지신은 계절마다 3신, 영웅 6명', () => {
    expect(GODS).toHaveLength(12);
    for (const k of ['spring', 'summer', 'autumn', 'winter']) expect(GODS.filter((g) => g.season === k)).toHaveLength(3);
    expect(HEROES).toHaveLength(6);
  });
  it('신을 얻으면 신전에 기록, 전시하면 능력 (각성 ×1.5), 중복은 코인 · 각성은 업그레이드', () => {
    const s = defaultSave(); s.tokens = 0;
    const c = gainGod(s, 4, false);
    expect(s.godDex![4]).toBe(1);
    expect(placeAnimal(s, c.uid, 0)).toBe(true);
    expect(activeGods(s)).toHaveLength(1);
    const cap = gateCapOf(s);
    expect(godVal(s, 'gateCap')).toBeCloseTo(0.08, 5);
    const d = gainGod(s, 4, false);
    expect(d.dup).toBeGreaterThan(0); expect(s.tokens).toBe(d.dup);
    const u = gainGod(s, 4, true);
    expect(u.upgraded).toBe(true); expect(s.godDex![4]).toBe(2);
    expect(godVal(s, 'gateCap')).toBeCloseTo(0.08 * NAMED.awakeMul, 5);
    expect(gateCapOf(s)).toBeGreaterThan(cap);
    expect(s.cards.filter((x) => x.kind === 'animal' && x.god === 4)).toHaveLength(1);
  });
  it('신은 규모가 전설보다 크다', () => {
    const s = defaultSave();
    const c = gainGod(s, 0, false); placeAnimal(s, c.uid, 0);
    expect(zooScale(s)).toBeGreaterThan(50);
  });
  it('영웅: 배치하면 능력', () => {
    const s = defaultSave();
    const h = gainHero(s, 0, false);
    expect(assignStaff(s, h.uid)).toBe(true);
    expect(hasHero(s, 'guardAll')).toBe(true);
  });
  it('12신을 다 모으면 올림푸스 완성', () => {
    const s = defaultSave();
    expect(templeDone(s)).toBe(false);
    s.godDex = Array(12).fill(1);
    expect(templeDone(s)).toBe(true);
  });
});

describe('라이벌 운 · 데려가기', () => {
  it('1시즌은 부진, 아테나가가 있으면 절호조가 줄어든다', () => {
    const s = defaultSave();
    expect(rollRivalCond(s, 1)).toBe(0);
    const hot = (r: number) => rollRivalCond(s, 2, () => r);
    expect(hot(0.99)).toBe(2);
    const c = gainGod(s, 3, false); placeAnimal(s, c.uid, 0);
    expect(hot(0.84)).toBe(1); expect(hot(0.86)).toBe(2);
    s.season.cond = 2; s.season.rmul = 1.1;
    expect(rivalAt(s, 7)).toBe(Math.round(350 * RIVAL_COND[2].mul * 1.1));
  });
  it('폐원: 칸 안의 동물과 직원 1명, 신전은 남는다', () => {
    const s = defaultSave();
    s.season.n = 9; // 3 + 4 = 7칸
    expect(carrySlots(s)).toBe(7);
    const g = gainGod(s, 1, true); // 3 + 1 = 4칸
    s.cards.push({ uid: 501, kind: 'animal', animal: 95 }); // 전설 4칸 → 안 들어감
    s.cards.push({ uid: 502, kind: 'animal', animal: 0 }, { uid: 503, kind: 'animal', animal: 0, shiny: true });
    const h = gainHero(s, 2, false);
    expect(carryCost(s.cards.find((c) => c.uid === g.uid) as never)).toBe(4);
    const n = closeZoo(s, { animals: [g.uid, 501, 502, 503], staff: h.uid });
    const an = n.cards.filter((c) => c.kind === 'animal');
    expect(an.map((c) => (c as { animal: number }).animal).sort()).toEqual([0, 0, GODS[1].base].sort());
    expect(n.cards.some((c) => c.kind === 'staff' && c.hero === 2)).toBe(true);
    expect(n.staffSlots[0]).not.toBeNull();
    expect(n.godDex![1]).toBe(2);
  });
});
