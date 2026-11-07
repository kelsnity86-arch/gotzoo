// 기획서 8장 '프로토타입 완료 조건' 중 규칙 부분
import { describe, expect, it } from 'vitest';
import { defaultSave, normalize } from '../src/game/state';
import { ANIMALS } from '../src/data/animals';
import { GRADES } from '../src/data/grades';
import { FUSION_CHANCE, GACHA, UPGRADES } from '../src/data/balance';
import {
  autoFusionPick, autoPlace, buyUpgrade, canPromote, draw, drawPrice, freeDraw, fuse, fusionCandidates, penAttract,
  penCount, penSize, placeAnimal, placedSet, promote, totalAttract,
} from '../src/game/rules';

const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('데이터', () => {
  it('동물 100종, 등급별 수와 이름 중복 없음', () => {
    expect(ANIMALS).toHaveLength(100);
    expect(new Set(ANIMALS.map((a) => a.name)).size).toBe(100);
    expect([0, 1, 2, 3, 4].map((g) => ANIMALS.filter((a) => a.grade === g).length)).toEqual([30, 26, 22, 14, 8]);
  });
  it('등급 확률 합 = 1, 합성 확률은 장수가 늘수록 오르고 10장 = 100%', () => {
    expect(GRADES.reduce((a, g) => a + g.chance, 0)).toBeCloseTo(1, 9);
    for (let n = 3; n <= 10; n++) expect(FUSION_CHANCE[n]).toBeGreaterThan(FUSION_CHANCE[n - 1]);
    expect(FUSION_CHANCE[10]).toBe(1);
  });
  it('업그레이드 표 길이', () => { for (const u of UPGRADES) { expect(u.costs.length).toBe(u.values.length - 1); expect(u.need.length).toBe(u.costs.length); } });
});

describe('뽑기', () => {
  it('첫 무료 뽑기는 일반 동물 1장, 두 번은 안 됨', () => {
    const s = defaultSave();
    const c = freeDraw(s)!;
    expect(c.kind).toBe('animal');
    expect(ANIMALS[(c as { animal: number }).animal].grade).toBe(0);
    expect(freeDraw(s)).toBeNull();
  });
  it('1·5·10회는 가격을 정확히 한 번 차감하고 장수만큼 지급', () => {
    for (const n of [1, 5, 10]) {
      const s = defaultSave(); s.coins = 100000;
      const out = draw(s, n)!;
      expect(out).toHaveLength(n);
      expect(s.coins).toBe(100000 - GACHA.price[0] * n);
      expect(s.cards).toHaveLength(n);
    }
  });
  it('코인이 모자라면 아무것도 바뀌지 않음', () => {
    const s = defaultSave(); s.coins = 99;
    expect(draw(s, 1)).toBeNull();
    expect(s.coins).toBe(99); expect(s.cards).toHaveLength(0);
  });
  it('단계가 오르면 가격이 오른다', () => { const s = defaultSave(); s.stage = 3; expect(drawPrice(s)).toBe(GACHA.price[2]); });
  it('확률: 직원 약 8%, 전설 약 1%', () => {
    const s = defaultSave(); s.coins = 1e12;
    const out = draw(s, 10, Math.random)!; void out;
    const big = defaultSave(); big.coins = 1e12;
    const cards = draw(big, 1, Math.random)!; void cards;
    let staff = 0, legend = 0; const N = 40000;
    const t = defaultSave(); t.coins = 1e15;
    for (const c of draw(t, N)!) { if (c.kind === 'staff') staff++; else if (ANIMALS[c.animal].grade === 4) legend++; }
    expect(staff / N).toBeGreaterThan(0.07); expect(staff / N).toBeLessThan(0.09);
    expect(legend / N).toBeGreaterThan(0.006); expect(legend / N).toBeLessThan(0.014);
  });
});

describe('배치 · 매력도', () => {
  it('우리 2개 × 4마리부터, 가득 차면 더 못 넣음', () => {
    const s = defaultSave(); s.coins = 1e9;
    draw(s, 10, seq(0.5, 0.01, 0.1));
    expect(penCount(s)).toBe(2); expect(penSize(s)).toBe(4);
    expect(autoPlace(s)).toBe(8);
    const left = s.cards.find((c) => !placedSet(s).has(c.uid))!;
    expect(placeAnimal(s, left.uid)).toBe(false);
  });
  it('같은 종 3마리면 +10%, 같은 서식지면 +10%', () => {
    const s = defaultSave();
    for (let i = 0; i < 3; i++) { s.cards.push({ uid: s.nextUid, kind: 'animal', animal: 0 }); s.pens[0].push(s.nextUid++); }
    expect(penAttract(s, 0)).toBeCloseTo(3 * 20 * 1.2, 5);
  });
  it('업그레이드하면 우리 수가 바로 늘어난다', () => {
    const s = defaultSave(); s.coins = 300;
    expect(buyUpgrade(s, 'pens')).toBe(true);
    expect(s.pens.length).toBe(3); expect(s.coins).toBe(0);
  });
  it('승급: 조건을 채워야 하고, 올리면 가격이 오른다', () => {
    const s = defaultSave(); s.coins = 1e9;
    expect(canPromote(s)).toBe(false);
    buyUpgrade(s, 'size');
    for (let i = 0; i < 6; i++) { s.cards.push({ uid: s.nextUid, kind: 'animal', animal: 50 }); placeAnimal(s, s.nextUid++); }
    expect(totalAttract(s)).toBeGreaterThanOrEqual(120);
    expect(promote(s)).toBe(true);
    expect(s.stage).toBe(2);
  });
});

describe('합성', () => {
  const withCards = (grade: number, n: number) => {
    const s = defaultSave();
    const ids = ANIMALS.filter((a) => a.grade === grade).map((a) => a.id);
    for (let i = 0; i < n; i++) s.cards.push({ uid: s.nextUid++, kind: 'animal', animal: ids[i % ids.length] });
    return s;
  };
  it('성공: 재료가 모두 사라지고 다음 등급 1장', () => {
    const s = withCards(0, 10);
    const r = fuse(s, s.cards.map((c) => c.uid), seq(0.1, 0.5));
    expect(r.ok && r.success).toBe(true);
    expect(s.cards).toHaveLength(1);
    expect(ANIMALS[(s.cards[0] as { animal: number }).animal].grade).toBe(1);
  });
  it('실패: 넣은 카드 중 1장만 남는다', () => {
    const s = withCards(0, 3);
    const r = fuse(s, s.cards.map((c) => c.uid), seq(0.99, 0.0));
    expect(r.ok && !r.success).toBe(true);
    expect(s.cards).toHaveLength(1);
  });
  it('배치된 카드·잠근 종·다른 등급·1장은 안 된다', () => {
    const s = withCards(0, 4);
    placeAnimal(s, s.cards[0].uid);
    expect(fuse(s, s.cards.map((c) => c.uid)).ok).toBe(false);
    expect(fuse(s, [s.cards[1].uid]).ok).toBe(false);
    s.lockedSpecies.push((s.cards[1] as { animal: number }).animal);
    expect(fusionCandidates(s, 0).some((c) => c.uid === s.cards[1].uid)).toBe(false);
    s.cards.push({ uid: s.nextUid++, kind: 'animal', animal: 40 });
    expect(fuse(s, [s.cards[2].uid, s.cards[4].uid]).ok).toBe(false);
  });
  it('전설은 합성하지 않는다, 자동 채우기는 겹친 종부터', () => {
    expect(fusionCandidates(withCards(4, 5), 4)).toHaveLength(0);
    const s = withCards(0, 3); s.cards.push({ uid: s.nextUid++, kind: 'animal', animal: 0 });
    expect(autoFusionPick(s, 0, 2).map((u) => (s.cards.find((c) => c.uid === u) as { animal: number }).animal)).toEqual([0, 0]);
  });
});

describe('저장', () => {
  it('망가진 참조는 지우고 빠진 칸은 채운다', () => {
    const s = normalize({ coins: 50, cards: [{ uid: 3, kind: 'animal', animal: 5 }], pens: [[3, 99], []], staffSlots: [77] });
    expect(s.pens[0]).toEqual([3]); expect(s.staffSlots).toEqual([null]); expect(s.nextUid).toBe(4); expect(s.dex[5]).toBe(true);
  });
});

describe('최대 수익 배치', () => {
  it('높은 등급을 먼저, 같은 종은 같은 우리에, 자동 배치보다 매력도가 낮지 않다', async () => {
    const { optimizePlacement } = await import('../src/game/rules');
    const s = defaultSave(); s.coins = 1e9;
    for (let i = 0; i < 40; i++) s.cards.push({ uid: s.nextUid++, kind: 'animal', animal: i % 3 === 0 ? 60 : i % 3 === 1 ? 2 : 33 });
    s.cards.push({ uid: s.nextUid++, kind: 'animal', animal: 95 });
    autoPlace(s);
    const before = totalAttract(s);
    const after = optimizePlacement(s);
    expect(after).toBeGreaterThanOrEqual(before);
    expect(s.pens.flat()).toContain(s.cards.find((c) => c.kind === 'animal' && c.animal === 95)!.uid);
    expect(s.pens.flat().length).toBe(8);
  });
});
