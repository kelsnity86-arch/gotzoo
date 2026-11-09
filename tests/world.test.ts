// 관람객 수입 · 동전 보너스 · 직원
import { describe, expect, it } from 'vitest';
import { defaultSave } from '../src/game/state';
import { World, computeLayout, type DayReport } from '../src/game/world';
import { freeDraw, placeAnimal, assignStaff, closeZoo, draw, placedStaffCards, staffDraw, staffTipMul, ticketDraw } from '../src/game/rules';
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
    const s = defaultSave();
    const L = computeLayout(s);
    expect(L.pens).toHaveLength(4);
    expect(L.w).toBe(L.bx0 * 2 + 8 * 32);
    expect(L.pens[0]).toEqual({ x: L.bx0, y: L.by0 + 32, w: 64, h: 64 });
  });
  it('첫 동물을 배치하면 손님이 오고, 입장료(돈)는 들어올 때 바로 들어온다 · 코인은 바닥에', () => {
    const { s, w } = setup();
    run(w, 30);
    expect(s.coins).toBeGreaterThan(0);
    expect(s.tokens).toBe(0); // 코인은 주워야 들어온다
    expect(w.coins.length + w.missed).toBeGreaterThan(0);
  });
  it('바닥 동전(코인)은 한 번만 주워지고, 오래 방치하면 사라진다', () => {
    const { s, w } = setup();
    const c = waitCoin(w);
    const before = s.tokens, money = s.coins;
    w.pick(c, 'hand'); w.pick(c, 'staff');
    expect(s.tokens - before).toBe(c.value);
    expect(s.coins).toBe(money);
    const t = defaultSave(); const tc = freeDraw(t)!; placeAnimal(t, tc.uid);
    const w2 = new World(t); w2.relayout(1.6); w2.sync();
    waitCoin(w2);
    const ids = w2.coins.map((x) => x.id);
    run(w2, COIN.lifeSec + 1);
    expect(w2.coins.some((x) => ids.includes(x.id))).toBe(false);
    expect(w2.missed).toBeGreaterThan(0);
  });
  it('피버 타임: 손으로 동전을 모으면 게이지가 차고, 가득 차면 피버 동안 하늘에서 동전이 내리다 끝난다', () => {
    const { w } = setup();
    for (let i = 0; i < VISITOR.fever.need && !w.feverOn; i++) w.pick({ id: 9000 + i, x: 50, y: 60, vx: 0, vy: 0, value: 1, count: 1, age: 0, z: 0, picked: false }, 'hand');
    expect(w.feverOn).toBe(true);
    const before = w.coins.length;
    w.update(1, null);
    expect(w.coins.length).toBeGreaterThan(before); // 동전 비
    for (let k = 0; k < VISITOR.fever.sec + 2; k++) w.update(1, null);
    expect(w.feverOn).toBe(false);
    expect(w.fever.gauge).toBe(0);
  });
  it('수거 직원이 주운 동전은 피버 게이지를 채우지 않는다', () => {
    const { w } = setup();
    w.pick({ id: 9999, x: 50, y: 60, vx: 0, vy: 0, value: 1, count: 10, age: 0, z: 0, picked: false }, 'staff');
    expect(w.fever.gauge).toBe(0);
  });
  it('처음부터 끌어서 줍는다: 동전 그림 어디든 닿으면 줍고 업그레이드로 더 멀리서도, 빨리 그어도 사이 동전을 줍는다', () => {
    const { s, w } = setup();
    expect(w.pickupRadius).toBe(1.5);
    const c0 = waitCoin(w);
    const b0 = s.stats.coinsPicked;
    w.update(1 / 30, { x: c0.x + 9, y: c0.y - 1 }); // 동전 그림 밖
    expect(s.stats.coinsPicked).toBe(b0);
    w.update(1 / 30, { x: c0.x - 9, y: c0.y - 1 }); // 동전 위를 지나쳐 그음
    expect(s.stats.coinsPicked).toBeGreaterThan(b0);
    s.upgrades.pickup = 2;
    expect(w.pickupRadius).toBe(4.5);
  });
  it('수거 직원은 동전을 자동으로 줍는다, 직원이 없어도 수입은 생긴다', () => {
    const { s, w } = setup();
    s.cards.push({ uid: 999, kind: 'staff', staff: 'collector', grade: 1, pay: 0.3, opts: [] }); s.nextUid = 1000;
    assignStaff(s, 999); w.sync();
    run(w, 90);
    expect(s.stats.coinsPicked).toBeGreaterThan(0);
  });
  it('사육사는 먹이로 매력도를 올린다', () => {
    const { s, w } = setup();
    const a0 = w.attract;
    s.cards.push({ uid: 998, kind: 'staff', staff: 'keeper', grade: 1, pay: 0.3, opts: [] }); s.nextUid = 1000;
    assignStaff(s, 998); w.sync();
    run(w, 20);
    expect(w.fedLeft[0]).toBeGreaterThan(0);
    expect(w.attract).toBeGreaterThan(a0);
  });
  it('관람객 수: 분당 기본 + 매력도 × perAttract, 정원(부지 칸 × capPerCell) 한도', () => {
    const { w } = setup();
    expect(w.gateCap).toBe(Math.round(8 * 4 * VISITOR.capPerCell));
    expect(w.visitorRate).toBeCloseTo(Math.min(w.gateCap, VISITOR.basePerMin + VISITOR.perAttract * w.attract), 5);
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
  it('밤은 시간 제한이 없다 (개장하기를 눌러야 아침)', async () => {
    const { DAY } = await import('../src/data/balance');
    const { w } = setup();
    run(w, DAY.dayLen + 600);
    expect(w.isNight).toBe(true);
  });
  it('낮에 맞은 관람객만 미션에 센다', async () => {
    const { DAY } = await import('../src/data/balance');
    const { s, w } = setup();
    s.missions = { day: 1, list: [{ kind: 'visitors', target: 9999, progress: 0, claimed: false }], bonusClaimed: false };
    run(w, DAY.dayLen + 1);
    const p = s.missions!.list[0].progress;
    expect(p).toBeGreaterThan(0);
    run(w, 60);
    expect(s.missions!.list[0].progress).toBe(p);
  });
});

describe('라이벌 동물원 (규모 대결)', () => {
  async function playDays(n: number, big: boolean, lastChance = false) {
    const { DAY } = await import('../src/data/balance');
    const { s, w } = setup();
    s.lastChance = lastChance;
    if (big) for (let i = 0; i < 12; i++) { s.cards.push({ uid: 700 + i, kind: 'animal', animal: 95 }); s.pens[i % 4].push(700 + i); } // 전설로 규모를 키운다
    const reports: DayReport[] = [];
    for (let d = 0; d < n; d++) {
      for (let i = 0; i < 30 * (DAY.dayLen + 1); i++) { w.update(1 / 30, null); for (const e of w.events) if (e.type === 'night') reports.push(e.report); w.events.length = 0; }
      s.coins = Math.max(s.coins, 0);
      w.openPark();
    }
    return { s, w, reports };
  }
  it('7일째에 라이벌보다 규모가 크면 승리하고 다음 시즌', async () => {
    const { s, reports } = await playDays(7, true);
    const last = reports[reports.length - 1];
    expect(last.seasonDay).toBe(7);
    expect(last.season?.result).toBe('win');
    expect(s.season.n).toBe(2);
    expect(s.season.start).toBe(8);
    expect(s.records.bestSeasons).toBe(1);
  });
  it('처음 지면 평판 하트로 버티고(최후의 기회) 다음 시즌으로', async () => {
    const { s, reports } = await playDays(7, false);
    expect(reports[6].season?.result).toBe('lose');
    expect(reports[6].season?.survived).toBe(true);
    expect(s.lastChance).toBe(true);
    expect(s.season.lost).toBeUndefined();
    expect(s.season.n).toBe(2);
  });
  it('최후의 기회에서 또 지면 폐원 표시가 남고 더 못 연다', async () => {
    const { s, reports } = await playDays(7, false, true);
    expect(reports[6].season?.result).toBe('lose');
    expect(s.season.lost).toBe(true);
  });
  it('폐원 후 새 동물원: 도감 · 기록만 남는다', async () => {
    const { s } = await playDays(7, false, true);
    s.dex[5] = true;
    const n = closeZoo(s);
    expect(n.cards.filter((c) => c.kind !== 'pen')).toHaveLength(0);
    expect(n.coins).toBe(0);
    expect(n.dex[5]).toBe(true);
    expect(n.records.closures).toBe(1);
    expect(n.records.bestDay).toBe(7);
    expect(n.season.lost).toBeUndefined();
  });
});

describe('정산: 월급 · 유지비 · 빚 · 파업', () => {
  async function oneDay(_s: ReturnType<typeof setup>['s'], w: World) {
    const { DAY } = await import('../src/data/balance');
    let rep: DayReport | null = null;
    for (let i = 0; i < 30 * (DAY.dayLen + 1) && !rep; i++) { w.update(1 / 30, null); for (const e of w.events) if (e.type === 'night') rep = e.report; w.events.length = 0; }
    return rep!;
  }
  it('영업이 끝나면 비용을 빼고, 순이익 = 수입 − 소매치기 − 비용', async () => {
    const { s, w } = setup();
    s.cards.push({ uid: 900, kind: 'staff', staff: 'guide', grade: 0, pay: 0.3, opts: [] }); s.nextUid = 901;
    assignStaff(s, 900); w.sync();
    const r = await oneDay(s, w);
    expect(r.costs.salary).toBeGreaterThan(0);
    expect(r.costs.pens).toBeGreaterThan(0);
    expect(r.net).toBe(r.income - r.stolen - r.costs.total);
    expect(r.coinsAfter).toBe(Math.round(s.coins));
  });
  it('빚으로 3일이 이어지면 다음 날 파업 (충성 직원은 예외), 갚으면 풀린다', async () => {
    const { s, w } = setup();
    s.cards.push({ uid: 901, kind: 'staff', staff: 'guide', grade: 2, pay: 0.4, opts: [] }, { uid: 902, kind: 'staff', staff: 'janitor', grade: 2, pay: 0.4, opts: [{ id: 'loyal', v: 1 }] });
    s.nextUid = 903; s.upgrades.staff = 1; s.staffSlots = [null, null];
    assignStaff(s, 901); assignStaff(s, 902); w.sync();
    for (let d = 0; d < 3; d++) { s.coins = -1e6; await oneDay(s, w); w.openPark(); }
    expect(s.strike).toBe(true);
    expect(staffTipMul(s)).toBeCloseTo(1, 5); // 안내원 파업
    expect(placedStaffCards(s).map((c) => c.uid)).toEqual([902]); // 충성 관리인은 일한다
    s.coins = 1e9; await oneDay(s, w);
    expect(s.strike).toBe(false);
  });
  it('빚이 있으면 동물 · 직원 뽑기 · 뽑기권 모두 막힌다', () => {
    const s = defaultSave(); s.coins = -10; s.tickets = 3;
    expect(draw(s, 1)).toBeNull();
    expect(staffDraw(s, 1)).toBeNull();
    expect(ticketDraw(s)).toBeNull();
  });
});
