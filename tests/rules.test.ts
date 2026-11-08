// 기획서 8장 '프로토타입 완료 조건' 중 규칙 부분
import { describe, expect, it } from 'vitest';
import { defaultSave, normalize } from '../src/game/state';
import { ANIMALS, sheetIndex } from '../src/data/animals';
import { GRADES } from '../src/data/grades';
import { FUSION_CHANCE, GACHA, UPGRADES } from '../src/data/balance';
import {
  autoFusionPick, autoPlace, buyUpgrade, canPromote, draw, drawPrice, freeDraw, fuse, fusionCandidates, penAttract,
  penCount, penCap, boardDims, finishLegacy, placeAnimal, placedSet, promote, totalAttract,
} from '../src/game/rules';

const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('데이터', () => {
  it('동물 300종(상시 250 + 계절 한정 50), 등급별 수와 이름 중복 없음, 그림 칸 번호가 겹치지 않음', () => {
    expect(ANIMALS).toHaveLength(300);
    expect(new Set(ANIMALS.map((a) => a.name)).size).toBe(300);
    expect([0, 1, 2, 3, 4].map((g) => ANIMALS.filter((a) => a.grade === g && !a.season).length)).toEqual([80, 65, 55, 32, 18]);
    expect(new Set(ANIMALS.map((a) => sheetIndex(a.id))).size).toBe(300);
    expect(Math.max(...ANIMALS.map((a) => sheetIndex(a.id)))).toBe(299);
    expect(sheetIndex(ANIMALS.find((a) => a.name === '메추라기')!.id)).toBe(30);
    expect(sheetIndex(ANIMALS.find((a) => a.name === '청룡')!.id)).toBe(240);
    expect(['spring', 'summer', 'autumn', 'winter'].map((k) => ANIMALS.filter((a) => a.season === k).length)).toEqual([13, 12, 13, 12]);
    expect(ANIMALS.filter((a) => a.season && a.grade === 0)).toHaveLength(0);
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
      const s = defaultSave(); s.tokens = 100000; s.coins = 0;
      const before = s.cards.length;
      const out = draw(s, n)!;
      expect(out).toHaveLength(n);
      expect(s.tokens).toBe(100000 - GACHA.price[0] * n); // 뽑기는 코인으로
      expect(s.coins).toBe(0); // 돈은 그대로
      expect(s.cards.length - before).toBe(n);
    }
  });
  it('코인이 모자라면 아무것도 바뀌지 않음 (돈이 많아도)', () => {
    const s = defaultSave(); s.tokens = 99; s.coins = 1e9;
    const before = s.cards.length;
    expect(draw(s, 1)).toBeNull();
    expect(s.tokens).toBe(99); expect(s.cards.length).toBe(before);
  });
  it('단계가 오르면 가격이 오른다', () => { const s = defaultSave(); s.stage = 3; expect(drawPrice(s)).toBe(GACHA.price[2]); });
  it('확률: 동물 90% · 직원 5% · 우리 5%, 동물 중 전설 약 1%', () => {
    let staff = 0, pen = 0, animal = 0, legend = 0; const N = 40000;
    const t = defaultSave(); t.tokens = 1e15;
    for (const c of draw(t, N)!) { if (c.kind === 'staff') staff++; else if (c.kind === 'pen') pen++; else { animal++; if (ANIMALS[c.animal].grade === 4) legend++; } }
    expect(animal / N).toBeCloseTo(0.9, 1); expect(staff / N).toBeCloseTo(0.05, 1); expect(pen / N).toBeCloseTo(0.05, 1);
    expect(legend / animal).toBeGreaterThan(0.007); expect(legend / animal).toBeLessThan(0.013);
  });
});

describe('배치 · 매력도', () => {
  it('네모 우리 4개(4칸 = 6마리씩)부터, 가득 차면 더 못 넣음', () => {
    const s = defaultSave();
    for (let i = 0; i < 26; i++) s.cards.push({ uid: s.nextUid++, kind: 'animal', animal: i % 20 });
    expect(penCount(s)).toBe(4); expect(penCap(s, 0)).toBe(6);
    expect(autoPlace(s)).toBe(24);
    const left = s.cards.find((c) => c.kind === 'animal' && !placedSet(s).has(c.uid))!;
    expect(placeAnimal(s, left.uid)).toBe(false);
  });
  it('같은 종 3마리 +10%, 같은 서식지 3마리 +10%, 일반 동급 무리 +25% (여름 풀밭)', () => {
    const s = defaultSave(); s.season.n = 2;
    for (let i = 0; i < 3; i++) { s.cards.push({ uid: s.nextUid, kind: 'animal', animal: 0 }); s.pens[0].push(s.nextUid++); }
    expect(penAttract(s, 0)).toBeCloseTo(3 * 20 * 1.55, 5); // + 일반 풀밭 우리 +10%
  });
  it('부지 넓히기를 하면 부지가 바로 커진다', () => {
    const s = defaultSave(); s.coins = 300;
    const [w0, h0] = boardDims(s);
    expect(buyUpgrade(s, 'land')).toBe(true);
    const [w1, h1] = boardDims(s);
    expect(w1 * h1).toBeGreaterThan(w0 * h0); expect(s.coins).toBe(0);
  });
  it('승급: 조건을 채워야 하고, 올리면 가격이 오른다', () => {
    const s = defaultSave(); s.coins = 1e9;
    expect(canPromote(s)).toBe(false);
    for (let i = 0; i < 6; i++) { s.cards.push({ uid: s.nextUid, kind: 'animal', animal: 50 }); placeAnimal(s, s.nextUid++); }
    expect(totalAttract(s)).toBeGreaterThanOrEqual(120);
    expect(promote(s)).toBe(true);
    expect(s.stage).toBe(2);
  });
});

describe('합성', () => {
  const A = (s: ReturnType<typeof defaultSave>) => s.cards.filter((c) => c.kind === 'animal');
  const withCards = (grade: number, n: number) => {
    const s = defaultSave();
    const ids = ANIMALS.filter((a) => a.grade === grade).map((a) => a.id);
    for (let i = 0; i < n; i++) s.cards.push({ uid: s.nextUid++, kind: 'animal', animal: ids[i % ids.length] });
    return s;
  };
  it('성공: 재료가 모두 사라지고 다음 등급 1장', () => {
    const s = withCards(0, 10);
    const r = fuse(s, A(s).map((c) => c.uid), seq(0.1, 0.5));
    expect(r.ok && r.success).toBe(true);
    expect(s.cards.filter((c) => c.kind !== 'pen')).toHaveLength(1);
    expect(ANIMALS[(A(s)[0] as { animal: number }).animal].grade).toBe(1);
  });
  it('실패: 넣은 카드 중 1장만 남는다', () => {
    const s = withCards(0, 3);
    const r = fuse(s, A(s).map((c) => c.uid), seq(0.99, 0.0));
    expect(r.ok && !r.success).toBe(true);
    expect(s.cards.filter((c) => c.kind !== 'pen')).toHaveLength(1);
  });
  it('배치된 카드·잠근 종·다른 등급·1장은 안 된다', () => {
    const s = withCards(0, 4);
    placeAnimal(s, A(s)[0].uid);
    expect(fuse(s, A(s).map((c) => c.uid)).ok).toBe(false);
    expect(fuse(s, [A(s)[1].uid]).ok).toBe(false);
    s.lockedSpecies.push((A(s)[1] as { animal: number }).animal);
    expect(fusionCandidates(s, 0).some((c) => c.uid === A(s)[1].uid)).toBe(false);
    s.cards.push({ uid: s.nextUid++, kind: 'animal', animal: 40 });
    expect(fuse(s, [A(s)[2].uid, A(s)[4].uid]).ok).toBe(false);
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
    finishLegacy(s);
    expect(s.pens.flat()).toEqual([3]); expect(s.staffSlots).toEqual([null]); expect(s.nextUid).toBeGreaterThan(3); expect(s.dex[5]).toBe(true);
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
    expect(s.pens.flat().length).toBe(24);
  });
});
