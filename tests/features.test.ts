// 추가 기능: 미션·뽑기권, 도감 보상, 자리 비움 수익, 이벤트, 새 직원, 저장 코드
import { describe, expect, it } from 'vitest';
import { defaultSave, normalize } from '../src/game/state';
import { seasonOf, yearOf } from '../src/data/seasons';
import { isEdge, penMask } from '../src/data/shapes';
import { pieceDef } from '../src/data/pieces';
import { STAFF_OPT_COUNT, STAFF_PAY } from '../src/data/staff';
import { exportCode, importCode } from '../src/game/savecode';
import { ANIMALS } from '../src/data/animals';
import { DEX_SETS } from '../src/data/dex';
import { World } from '../src/game/world';
import {
  assignStaff, buyUpgrade, buyItem, buyFacility, facPrice, zooScale, placeItem, facSum, penTheme, penDraw, canPlacePen, placePen, removePen, autoArrangePens, boardGrid, penCells, fusePens, finishLegacy, dailyCosts, discoverSynergies, penDetail, draw, fireStaff, staffDraw, claimDexSet, claimMission, claimMissionBonus, coinLifeBonus, ensureMissions, settleMissions, freeDraw, habitatDexBonus,
  offlineEarnings, penAttract, placeAnimal, staffTipMul, ticketDraw,
} from '../src/game/rules';

describe('오늘 영업 미션 · 뽑기권', () => {
  it('게임 속 하루마다 3개, 달성하면 받고 뽑기권으로 뽑는다', () => {
    const s = defaultSave(); s.coins = 1e6;
    const ms = ensureMissions(s, () => 0);
    expect(ms.list).toHaveLength(3);
    expect(ms.day).toBe(1);
    expect(ensureMissions(s)).toBe(ms); // 같은 날이면 그대로
    ms.list[0].progress = ms.list[0].target;
    expect(claimMission(s, 0)).toBe(true);
    expect(claimMission(s, 0)).toBe(false);
    expect(s.tickets).toBe(1);
    const out = ticketDraw(s)!;
    expect(out).toHaveLength(1); expect(s.tickets).toBe(0);
    expect(ticketDraw(s)).toBeNull();
    expect(claimMissionBonus(s)).toBe(false);
    s.day = 2;
    expect(ensureMissions(s).day).toBe(2);
  });
  it('영업이 끝나면 달성한 미션은 자동으로 받는다', () => {
    const s = defaultSave();
    const ms = ensureMissions(s, () => 0);
    for (const m of ms.list) m.progress = m.target;
    expect(settleMissions(s)).toBe(3 + 2);
  });
});

describe('도감 보상', () => {
  it('다 모아야 받고, 받으면 코인과 서식지 매력도 +20%', () => {
    const s = defaultSave();
    const set = DEX_SETS.find((x) => x.id === 'hab_cloud')!;
    expect(claimDexSet(s, set.id)).toBe(0);
    for (const a of ANIMALS) if (a.habitat === 'cloud') s.dex[a.id] = true;
    expect(claimDexSet(s, set.id)).toBe(set.reward);
    expect(habitatDexBonus(s, 'cloud')).toBeCloseTo(0.2, 5);
    s.cards.push({ uid: 1, kind: 'animal', animal: 92 }); s.pens[0].push(1); s.nextUid = 2;
    expect(penAttract(s, 0)).toBeCloseTo(140 * (1 + 0.2), 5); // 도감 +20% (풀밭 우리라 서식지 보너스 없음)
  });
});

describe('자리 비움 수익', () => {
  it('2분 이상 비우면 받고, 8시간에서 멈춘다', () => {
    const s = defaultSave(); const c = freeDraw(s)!; placeAnimal(s, c.uid);
    s.lastSeen = 1_000_000;
    expect(offlineEarnings(s, 1_000_000 + 60_000)).toBeNull();
    const a = offlineEarnings(s, 1_000_000 + 3600_000)!;
    const b = offlineEarnings(s, 1_000_000 + 24 * 3600_000)!;
    expect(a.amount).toBeGreaterThan(0);
    expect(b.minutes).toBe(480);
  });
});

describe('이벤트 · 새 직원', () => {
  it('이벤트가 일어나고 20초 뒤 끝난다', () => {
    const s = defaultSave(); const c = freeDraw(s)!; placeAnimal(s, c.uid);
    const w = new World(s); w.relayout(1.6); w.sync();
    let started = false;
    for (let i = 0; i < 30 * 130 && !started; i++) { w.update(1 / 30, null); if (w.events.some((e) => e.type === 'eventStart')) started = true; w.events.length = 0; }
    expect(started).toBe(true);
    for (let i = 0; i < 30 * 21; i++) w.update(1 / 30, null);
    expect(w.event).toBeNull();
  });
  it('직원 효과는 등급을 따른다: 고급 안내원 +12%, 고급 관리인 +30초', () => {
    const s = defaultSave(); s.upgrades.staff = 1; s.staffSlots = [null, null];
    s.cards.push({ uid: 1, kind: 'staff', staff: 'guide', grade: 1, pay: 0.3, opts: [] }, { uid: 2, kind: 'staff', staff: 'janitor', grade: 1, pay: 0.3, opts: [] }); s.nextUid = 3;
    assignStaff(s, 1); assignStaff(s, 2);
    expect(staffTipMul(s)).toBeCloseTo(1.12, 5);
    expect(coinLifeBonus(s)).toBe(30);
  });
});

describe('직원 뽑기 · 해고', () => {
  it('직원 뽑기는 동물 뽑기의 3배, 등급 · 월급 범위 · 옵션 수가 맞다', () => {
    const s = defaultSave(); s.coins = 1e7;
    const out = staffDraw(s, 200)!;
    expect(s.coins).toBe(1e7 - 300 * 200);
    for (const c of out) {
      if (c.kind !== 'staff') throw new Error('직원만 나와야 해요');
      const [a, b] = STAFF_PAY[c.grade];
      expect(c.pay).toBeGreaterThanOrEqual(a - 1e-9); expect(c.pay).toBeLessThanOrEqual(b + 1e-9);
      expect(c.opts).toHaveLength(STAFF_OPT_COUNT[c.grade]);
      if (c.grade < 4) expect(c.opts.some((o) => o.id === 'luck')).toBe(false);
    }
  });
  it('뽑기 하나에서 직원 · 우리도 가끔 나오고 등급이 있다', () => {
    const s = defaultSave(); s.tokens = 1e9;
    const out = draw(s, 2000)!;
    expect(out.some((c) => c.kind === 'staff')).toBe(true);
    expect(out.some((c) => c.kind === 'pen')).toBe(true);
    expect(out.every((c) => c.kind === 'animal' || (c.grade >= 0 && c.grade <= 4))).toBe(true);
  });
  it('부지 넓히기 업그레이드는 규모 확장으로 합쳐져 따로 살 수 없다', () => {
    const s = defaultSave(); s.coins = 1e6;
    expect(buyUpgrade(s, 'land')).toBe(false);
  });
  it('해고하면 등급별로 돌려받고 슬롯에서 빠진다', () => {
    const s = defaultSave();
    s.cards.push({ uid: 1, kind: 'staff', staff: 'guide', grade: 4, pay: 0.8, opts: [] }); s.nextUid = 2;
    assignStaff(s, 1);
    expect(fireStaff(s, 1)).toBe(Math.round(300 * 0.25));
    expect(s.cards.filter((c) => c.kind !== 'pen')).toHaveLength(0);
    expect(s.staffSlots[0]).toBeNull();
  });
  it('예전 저장의 직원 카드는 등급 · 월급이 채워진다', () => {
    const n = normalize({ cards: [{ uid: 4, kind: 'staff', staff: 'keeper' }], nextUid: 5 });
    const c = n.cards[0];
    expect(c.kind === 'staff' && c.grade).toBe(1);
    expect(c.kind === 'staff' && c.pay).toBeGreaterThan(0);
  });
});

describe('저장 코드', () => {
  it('내보내고 불러오면 같고, 한 글자라도 바뀌면 거절', () => {
    const s = defaultSave(); s.coins = 12345; s.cards.push({ uid: 1, kind: 'animal', animal: 7 }); s.nextUid = 2;
    const code = exportCode(s);
    const r = importCode(code);
    expect(r.ok && r.save.coins).toBe(12345);
    const bad = code.slice(0, 10) + (code[10] === 'A' ? 'B' : 'A') + code.slice(11);
    expect(importCode(bad).ok).toBe(false);
  });
});

describe('계절 · 반짝이 · 시너지', () => {
  const put = (s: ReturnType<typeof defaultSave>, animal: number, pen = 0, shiny = false) => { s.cards.push({ uid: s.nextUid, kind: 'animal', animal, ...(shiny ? { shiny } : {}) }); s.pens[pen].push(s.nextUid++); };
  const id = (name: string) => ANIMALS.find((a) => a.name === name)!.id;
  it('시즌 → 계절 · 년: 1 봄, 4 겨울, 5 = 2년 봄', () => {
    expect(seasonOf(1).key).toBe('spring'); expect(seasonOf(4).key).toBe('winter');
    expect(seasonOf(5).key).toBe('spring'); expect(yearOf(5)).toBe(2);
  });
  it('계절 한정 동물은 그 계절에만 나온다', () => {
    const s = defaultSave(); s.tokens = 1e12; s.season.n = 3; // 가을
    const out = draw(s, 20000)!;
    const lim = out.filter((c) => c.kind === 'animal' && ANIMALS[c.animal].season);
    expect(lim.length).toBeGreaterThan(0);
    expect(lim.every((c) => c.kind === 'animal' && ANIMALS[c.animal].season === 'autumn')).toBe(true);
    const sh = out.filter((c) => c.kind === 'animal' && c.shiny).length / out.filter((c) => c.kind === 'animal').length;
    expect(sh).toBeGreaterThan(0.005); expect(sh).toBeLessThan(0.016);
  });
  it('반짝이는 매력 1.5배, 제철 서식지 +20% · 약한 서식지 −15%', () => {
    const a = defaultSave(); a.season.n = 2; put(a, id('토끼')); // 여름 풀밭: 보정 없음
    const b = defaultSave(); b.season.n = 2; put(b, id('토끼'), 0, true);
    expect(penAttract(b, 0) / penAttract(a, 0)).toBeCloseTo(1.5, 5);
    const sp = defaultSave(); sp.season.n = 1; put(sp, id('토끼')); // 봄 풀밭 +20%
    expect(penAttract(sp, 0)).toBeCloseTo(20 * (1 + 0.2 + 0.1), 5); // 제철 +20% · 일반 풀밭 우리 +10%
    const su = defaultSave(); su.season.n = 2; put(su, id('펭귄')); // 여름 설원 −15%
    expect(penAttract(su, 0)).toBeCloseTo(32 * (1 - 0.15), 5); // 약한 서식지 −15% (풀밭 우리)
  });
  it('조합 시너지: 사바나 세트가 한 우리에 모이면 +25%, 하나라도 빠지면 없음', () => {
    const s = defaultSave(); s.season.n = 2;
    put(s, id('사자')); put(s, id('얼룩말'));
    const before = penAttract(s, 0);
    put(s, id('기린'));
    const d = penDetail(s, 0);
    expect(d.syn.some((x) => x.name === '사바나')).toBe(true);
    expect(discoverSynergies(s).map((x) => x.id)).toContain('savanna');
    expect(discoverSynergies(s)).toHaveLength(0);
    expect(d.total).toBeGreaterThan(before * 1.5);
  });
  it('계절 한정 동물은 제철에 매력 2배 + 같은 우리 +10%', () => {
    const s = defaultSave(); s.season.n = 4; // 겨울
    put(s, id('루돌프 순록')); put(s, id('토끼'));
    const off = defaultSave(); off.season.n = 2; put(off, id('루돌프 순록')); put(off, id('토끼'));
    expect(penAttract(s, 0)).toBeGreaterThan(penAttract(off, 0) * 1.5);
  });
  it('냉난방비: 겨울엔 사막 동물만큼 난방비', () => {
    const s = defaultSave(); s.season.n = 4;
    put(s, id('두더지')); // 사막
    expect(dailyCosts(s).climate).toBeGreaterThan(0);
    s.season.n = 1;
    expect(dailyCosts(s).climate).toBe(0);
  });
});

describe('우리 모양', () => {
  it('우리 서식지는 카드에 정해져 있고, 모양 깎기 마스크는 테두리 안쪽에 바닥이 있다', () => {
    const s = defaultSave();
    expect(penTheme(s, 0)).toBe('grass'); expect(penTheme(s, 1)).toBe('water');
    for (const shape of ['L', 'Lflip', 'octagon', 'round', 'strip', 'plus'] as const) {
      const m = penMask(shape, 10, 8);
      expect(m.flat().some((v) => !v)).toBe(true);
      let floor = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) if (m[y][x] && !isEdge(m, x, y)) floor++;
      expect(floor).toBeGreaterThanOrEqual(6);
    }
    expect(penMask('round', 4, 3).flat().every(Boolean)).toBe(true);
  });
  it('동물은 모양 바닥 안에서만 움직인다', () => {
    const s = defaultSave(); s.coins = 1e9;
    const pc = s.cards.find((c) => c.kind === 'pen' && c.uid === s.board[0].uid)!;
    if (pc.kind === 'pen') pc.piece = 'L'; // 니은 우리
    for (let i = 0; i < 12; i++) { s.cards.push({ uid: s.nextUid, kind: 'animal', animal: ANIMALS.find((a) => a.habitat === 'grass')!.id }); s.pens[0].push(s.nextUid++); }
    const w = new World(s, Math.random); w.relayout(1.6); w.sync();
    const g = w.geo[0];
    expect(g.shape).toBe('L');
    for (let k = 0; k < 600; k++) {
      w.update(1 / 30, null);
      for (const a of w.animals) {
        const cx = Math.floor((a.x - g.gx) / 8), cy = Math.floor((a.y - 1 - g.gy) / 8);
        expect(g.floor[cy]?.[cx]).toBe(true);
      }
    }
  });
});

describe('우리 조각 · 부지', () => {
  it('우리 뽑기는 동물 뽑기의 2배, 등급별 조각 · 서식지 · 옵션 수', () => {
    const s = defaultSave(); s.coins = 1e9;
    const out = penDraw(s, 300)!;
    expect(s.coins).toBe(1e9 - 200 * 300);
    for (const c of out) {
      if (c.kind !== 'pen') throw new Error('우리만');
      expect(pieceDef(c.piece).grade).toBe(c.grade);
      expect(c.opts).toHaveLength([0, 0, 0, 1, 2][c.grade]);
    }
  });
  it('겹치거나 부지 밖이면 못 놓고, 빈 자리에는 놓인다 · 치우면 동물은 보관함으로', () => {
    const s = defaultSave();
    s.cards.push({ uid: 50, kind: 'pen', piece: 'I', grade: 0, habitat: 'rock', opts: [] });
    expect(canPlacePen(s, 50, 1, 1, 0)).toBe(false); // 처음 우리와 겹침
    expect(canPlacePen(s, 50, 6, 3, 0)).toBe(false); // 부지 밖 (8칸 넘음)
    expect(placePen(s, 50, 0, 3, 0)).toBe(true);
    expect(s.board).toHaveLength(5); expect(s.pens).toHaveLength(5);
    s.cards.push({ uid: 51, kind: 'animal', animal: 0 }); s.pens[4].push(51);
    expect(removePen(s, 4)).toBe(true);
    expect(s.pens.flat()).not.toContain(51);
    expect(s.cards.some((c) => c.uid === 50)).toBe(true); // 조각은 남는다
  });
  it('자동 배치: 부지 안에 겹치지 않게, 들어갈 수 있는 만큼 놓는다', () => {
    const s = defaultSave(); s.upgrades.land = 3;
    for (let i = 0; i < 12; i++) s.cards.push({ uid: 100 + i, kind: 'pen', piece: ['O', 'T', 'S', 'R6', 'POND', 'L5'][i % 6], grade: 0, habitat: 'grass', opts: [] });
    const n = autoArrangePens(s, () => 0.3);
    expect(n).toBeGreaterThan(5);
    const g = boardGrid(s);
    const filled = g.flat().filter((v) => v >= 0).length;
    const cells = s.board.reduce((t, _, i) => t + penCells(s, i).length, 0);
    expect(filled).toBe(cells); // 겹침 없음
  });
  it('우리 합성: 같은 등급 10개면 다음 등급', () => {
    const s = defaultSave();
    for (let i = 0; i < 10; i++) s.cards.push({ uid: 200 + i, kind: 'pen', piece: 'O', grade: 0, habitat: 'sand', opts: [] });
    const r = fusePens(s, Array.from({ length: 10 }, (_, i) => 200 + i));
    expect(r.ok && r.success && r.card.kind === 'pen' && r.card.grade).toBe(1);
  });
  it('예전 저장(우리 늘리기 · 넓히기)은 사각 조각으로 바뀌고 동물이 그대로 남는다', () => {
    const old = { upgrades: { pens: 2, size: 3 }, cards: [{ uid: 1, kind: 'animal', animal: 0 }, { uid: 2, kind: 'animal', animal: 1 }], pens: [[1], [2], []], nextUid: 3 };
    const s = normalize(old);
    finishLegacy(s);
    expect(s.board).toHaveLength(4);
    expect(s.pens.flat().sort()).toEqual([1, 2]);
    expect(s.cards.filter((c) => c.kind === 'pen')).toHaveLength(4);
  });
});

describe('시설 · 꾸미기', () => {
  it('시설은 관객 건물: 단계마다 증축 (최대 5), 효과 · 유지비 · 규모가 단계만큼', () => {
    const s = defaultSave(); s.coins = 1e6;
    expect(facPrice(s, 'snack')).toBe(300);
    expect(buyFacility(s, 'snack')).toBe(true);
    expect(s.coins).toBe(1e6 - 300);
    expect(facSum(s, 'snack')).toBeCloseTo(0.4 / 3, 5);
    expect(staffTipMul(s)).toBeCloseTo(1 + 0.4 / 3, 5);
    const c1 = dailyCosts(s).facility, sc1 = zooScale(s);
    expect(c1).toBeGreaterThan(0);
    expect(buyFacility(s, 'snack')).toBe(true); expect(buyFacility(s, 'snack')).toBe(true);
    expect(facSum(s, 'snack')).toBeCloseTo(0.4, 5);
    expect(dailyCosts(s).facility).toBeGreaterThan(c1 * 2.5);
    expect(zooScale(s) - sc1).toBe(30);
    expect(buyFacility(s, 'snack')).toBe(true); expect(buyFacility(s, 'snack')).toBe(true);
    expect(facSum(s, 'snack')).toBeCloseTo(0.4 * 1.3, 5);
    expect(facPrice(s, 'snack')).toBeNull();
    expect(buyFacility(s, 'snack')).toBe(false);
  });
  it('예전 저장의 시설 물건은 개수만큼 단계로 바뀐다', () => {
    const s = defaultSave() as unknown as Record<string, unknown>;
    s.items = [{ uid: 5, type: 'fac:snack', x: 0, y: 0 }, { uid: 6, type: 'fac:snack', x: -1, y: -1 }, { uid: 7, type: 'deco:spring:1', x: 3, y: 0 }];
    delete s.facLv;
    const n = normalize(JSON.parse(JSON.stringify(s)));
    expect(n.facLv.snack).toBe(2);
    expect(n.items.map((it) => it.type)).toEqual(['deco:spring:1']);
  });
  it('분수 광장은 모든 우리 · 소품은 붙어 있는 우리만, 제철 소품 2배 · 우리 자동 배치가 소품 칸을 피한다', () => {
    const s = defaultSave(); s.coins = 1e6; s.season.n = 1; // 봄
    s.cards.push({ uid: 1, kind: 'animal', animal: 0 }); s.pens[0].push(1); s.nextUid = 2;
    const base = penAttract(s, 0);
    buyFacility(s, 'fountain'); // 1단계: 모든 동물 +5%
    const d = buyItem(s, 'deco:spring:1')!; placeItem(s, d, 1, 0); // 위
    expect(penAttract(s, 0) / base).toBeCloseTo((1 + 0.2 + 0.1 + 0.05 + 0.08) / (1 + 0.2 + 0.1), 3); // 제철 · 우리 서식지 + 분수 5% · 봄 소품 4%×2
    autoArrangePens(s, () => 0.4);
    const g = boardGrid(s);
    expect(g[0][1]).toBe(-2);
  });
  it('울타리 꾸미기: 단계마다 모든 동물 +3%', () => {
    const s = defaultSave(); s.season.n = 2;
    s.cards.push({ uid: 1, kind: 'animal', animal: 0 }); s.pens[0].push(1); s.nextUid = 2;
    const a = penAttract(s, 0);
    s.upgrades.deco = 2;
    expect(penAttract(s, 0) / a).toBeCloseTo((1 + 0.1 + 0.06) / 1.1, 3);
  });
});
