// 추가 기능: 미션·뽑기권, 도감 보상, 자리 비움 수익, 이벤트, 새 직원, 저장 코드
import { describe, expect, it } from 'vitest';
import { defaultSave, normalize } from '../src/game/state';
import { STAFF_OPT_COUNT, STAFF_PAY } from '../src/data/staff';
import { exportCode, importCode } from '../src/game/savecode';
import { ANIMALS } from '../src/data/animals';
import { DEX_SETS } from '../src/data/dex';
import { World } from '../src/game/world';
import {
  assignStaff, draw, fireStaff, staffDraw, claimDexSet, claimMission, claimMissionBonus, coinLifeBonus, ensureMissions, settleMissions, freeDraw, habitatDexBonus,
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
    expect(penAttract(s, 0)).toBeCloseTo(140 * 1.2, 5);
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
  it('동물 뽑기에서는 직원이 나오지 않는다', () => {
    const s = defaultSave(); s.coins = 1e7;
    expect(draw(s, 300)!.every((c) => c.kind === 'animal')).toBe(true);
  });
  it('해고하면 등급별로 돌려받고 슬롯에서 빠진다', () => {
    const s = defaultSave();
    s.cards.push({ uid: 1, kind: 'staff', staff: 'guide', grade: 4, pay: 0.8, opts: [] }); s.nextUid = 2;
    assignStaff(s, 1);
    expect(fireStaff(s, 1)).toBe(Math.round(300 * 0.25));
    expect(s.cards).toHaveLength(0);
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
