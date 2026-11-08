/**
 * Unity C# 대조용 기준값: 웹판 규칙을 씨앗 난수(mulberry32)로 돌린 결과 → unity/Tests/fixtures.json
 * 실행: npx vite-node tools/unity-fixtures.ts → dotnet run --project unity/Tests
 */
import { writeFileSync } from 'node:fs';
import { defaultSave, type Card } from '../src/game/state';
import { draw, lastTier, rollMachine, rollStaff, rollPen, gainGod, gainHero, placeAnimal, rollRivalCond, rivalAt, carrySlots, carryCost, closeZoo, startSeason, rollRivalEvent } from '../src/game/rules';
import { rivalScaleTarget } from '../src/data/rivals';

export function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (c: Card & { dup?: number; upgraded?: boolean }) => {
  const o: Record<string, unknown> = { kind: c.kind };
  if (c.kind === 'animal') { o.animal = c.animal; o.shiny = !!c.shiny; if (c.god !== undefined) o.god = c.god; }
  if (c.kind === 'staff') { o.staff = c.staff; o.grade = c.grade; o.pay = c.pay; o.opts = c.opts; if (c.hero !== undefined) { o.hero = c.hero; o.awake = !!c.awake; } }
  if (c.kind === 'pen') { o.piece = c.piece; o.grade = c.grade; o.habitat = c.habitat; o.opts = c.opts; }
  if (c.dup) o.dup = c.dup; if (c.upgraded) o.upgraded = true;
  return o;
};

const out: Record<string, unknown> = {};
// 1. 뽑기: 계절 4개 × 250번 × 10장 (네임드 · 중복 · 각성 포함), 헤라꼬 · 아르테멍 전시한 판도
const draws: unknown[] = [];
for (const withGods of [false, true]) {
  const s = defaultSave(); s.tokens = 1e12; s.stage = 3;
  if (withGods) { const a = gainGod(s, 7, false), b = gainGod(s, 8, true); placeAnimal(s, a.uid, 0); placeAnimal(s, b.uid, 1); }
  const rng = mulberry32(withGods ? 777 : 12345);
  const batches: unknown[] = [];
  for (let n = 1; n <= 4; n++) { s.season.n = n; for (let i = 0; i < 250; i++) { const cards = draw(s, 10, rng)!; batches.push({ n, tier: lastTier, cards: cards.map(pick) }); } }
  draws.push({ withGods, seed: withGods ? 777 : 12345, batches, tokens: s.tokens, godDex: s.godDex, heroDex: s.heroDex, nextUid: s.nextUid });
}
out.draws = draws;
// 2. 낱개 규칙
{
  const rng = mulberry32(99);
  out.machine = Array.from({ length: 400 }, () => rollMachine(rng, 1.5, 0.005, 0.01));
  out.staff = Array.from({ length: 100 }, () => pick({ uid: 0, ...rollStaff(rng) } as Card));
  out.pens = Array.from({ length: 100 }, () => pick({ uid: 0, ...rollPen(rng) } as Card));
}
// 3. 라이벌: 컨디션 (아테나가 없음/있음) · 규모 · 소식
{
  const s = defaultSave();
  const rs = Array.from({ length: 41 }, (_, i) => i / 40 - 1e-9).map((r) => Math.max(0, r));
  const plain = rs.map((r) => rollRivalCond(s, 2, () => r));
  const a = gainGod(s, 3, false); placeAnimal(s, a.uid, 0);
  const athena = rs.map((r) => rollRivalCond(s, 2, () => r));
  const at: unknown[] = [];
  for (let n = 1; n <= 10; n++) for (const cond of [0, 1, 2]) for (const k of [1, 4, 7]) { s.season.n = n; s.season.cond = cond; s.season.rmul = 1.06 * 0.95; at.push({ n, cond, k, v: rivalAt(s, k), target: rivalScaleTarget(n) }); }
  const rng = mulberry32(5); const ev: unknown[] = [];
  startSeason(s, 3, 15, rng); ev.push({ cond: s.season.cond });
  for (let i = 0; i < 30; i++) { const e = rollRivalEvent(s, rng); ev.push(e ? { text: e.text, rmul: s.season.rmul } : null); }
  out.rival = { rs, plain, athena, at, events: ev };
}
// 4. 폐원 데려가기
{
  const s = defaultSave(); s.season.n = 9; s.day = 60;
  const g = gainGod(s, 1, true);
  s.cards.push({ uid: 501, kind: 'animal', animal: 95 }, { uid: 502, kind: 'animal', animal: 0 }, { uid: 503, kind: 'animal', animal: 0, shiny: true }, { uid: 504, kind: 'animal', animal: 70 });
  const h = gainHero(s, 2, false);
  const ids = [g.uid, 501, 502, 503, 504];
  const n = closeZoo(s, { animals: ids, staff: h.uid });
  out.carry = { slots: carrySlots(s), costs: ids.map((u) => carryCost(s.cards.find((c) => c.uid === u) as never)), kept: n.cards.map(pick), staffSlot0: n.staffSlots[0], godDex: n.godDex, closures: n.records.closures,
    save: JSON.stringify(s) };
}
writeFileSync(new URL('../unity/Tests/fixtures.json', import.meta.url), JSON.stringify(out));
console.log('fixtures 완료');
