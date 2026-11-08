// 규칙 계산 (화면 없음): 뽑기, 합성, 배치, 매력도, 업그레이드, 승급. 모두 SaveData를 직접 바꾼다.
import { ANIMALS, animalsOfGrade, seasonalOfGrade, type Habitat } from '../data/animals';
import { SEASON_FX, seasonOf, type SeasonDef } from '../data/seasons';
import { DECO_ATTRACT, DECOR_FX, FACILITIES, FAC_LV_PRICE, FAC_MAX_LV, ITEM_SCALE, facLevelValue, facilityDef, type FacilityType } from '../data/facilities';
import { BOARD, CAP_PER_CELL, PEN_DRAW_MUL, PEN_OPTS, PEN_OPT_COUNT, PEN_SCALE, PEN_THEME_BONUS, PIECES, pieceDef, rotateCells, type PieceDef } from '../data/pieces';
import { GRADE_SYN, HABITAT_TIERS, SHINY, SYNERGY_CAP, SYNERGY_SETS, type SynergySet } from '../data/synergy';
import { GRADES, type Grade } from '../data/grades';
import { JANITOR_SHARE, STAFF, STAFF_CAP, STAFF_DRAW_MUL, STAFF_OPTS, STAFF_OPT_COUNT, STAFF_PAY, STAFF_REFUND, STAFF_SCALE, staffDef, type StaffKind, type StaffOptId } from '../data/staff';
import { EXPAND_COST, STAGE_NAMES, STAR_NEED, DAY, FEED, SCALE, UPKEEP, FUSION_CHANCE, FUSION_MAX, FUSION_MIN, GACHA, MAX_STAGE, SAME_SPECIES_BONUS, STAGE_REQ, STAGE_TIP_MUL, UPGRADES, upgradeDef, type UpgradeId } from '../data/balance';
import { defaultSave, type Card, type MissionKind, type PenCard, type SaveData, type StaffCard } from './state';
import { DEX_SETS, dexSetMembers } from '../data/dex';
import { MISSION_BONUS, MISSION_K, MISSION_POOL, MISSION_REWARD } from '../data/missions';

export type Rng = () => number;

// ── 업그레이드 값 ──
export const upValue = (s: SaveData, id: UpgradeId) => upgradeDef(id).values[s.upgrades[id] ?? 0];
// ── 부지 · 우리 조각 ──
/** 부지 크기 (블록 칸) */
export const boardDims = (s: SaveData) => BOARD[Math.min(BOARD.length - 1, s.upgrades.land ?? 0)];
/** 놓은 우리 수 */
export const penCount = (s: SaveData) => s.board.length;
export const penCardAt = (s: SaveData, i: number) => cardById(s, s.board[i]?.uid ?? -1) as PenCard | undefined;
export const penPiece = (c: PenCard): PieceDef => pieceDef(c.piece);
/** 우리 i가 차지하는 블록 칸 (부지 좌표) */
export function penCells(s: SaveData, i: number): [number, number][] {
  const b = s.board[i], c = penCardAt(s, i);
  if (!b || !c) return [];
  return rotateCells(penPiece(c).cells, b.rot).map(([x, y]) => [x + b.x, y + b.y]);
}
/** 우리 i 수용 마릿수 = 블록 칸 × CAP_PER_CELL */
export const capOfCells = (n: number) => Math.max(2, Math.round(n * CAP_PER_CELL));
export const penCap = (s: SaveData, i: number) => { const c = penCardAt(s, i); return c ? capOfCells(penPiece(c).cells.length) : 0; };
export const totalCap = (s: SaveData) => s.board.reduce((t, _, i) => t + penCap(s, i), 0);
/** 우리 특수옵션 값 */
export const penOpt = (s: SaveData, i: number, id: string) => penCardAt(s, i)?.opts.find((o) => o.id === id)?.v ?? 0;
/** 부지 칸 점유 [y][x] = 우리 번호 (-1 = 빈 칸) */
export function boardGrid(s: SaveData, skip = -1): number[][] {
  const [w, h] = boardDims(s);
  const g = Array.from({ length: h }, () => Array.from({ length: w }, () => -1));
  s.board.forEach((_, i) => { if (i !== skip) for (const [x, y] of penCells(s, i)) if (g[y]?.[x] !== undefined) g[y][x] = i; });
  for (const it of s.items) if (it.x >= 0 && g[it.y]?.[it.x] !== undefined) g[it.y][it.x] = -2; // 시설 · 소품
  return g;
}

// ── 시설 · 꾸미기 ──
export const placedItems = (s: SaveData) => s.items.filter((it) => it.x >= 0);
/** 시설 단계 (0 = 없음) */
export const facCount = (s: SaveData, t: FacilityType) => s.facLv?.[t] ?? 0;
/** 시설 효과 (단계만큼) */
export const facSum = (s: SaveData, t: FacilityType) => facLevelValue(t, facCount(s, t));
/** 다음 단계 증축 값 (최고 단계면 null) */
export const facPrice = (s: SaveData, t: FacilityType): number | null => { const lv = facCount(s, t); return lv >= FAC_MAX_LV ? null : Math.round(drawPrice(s) * facilityDef(t).price * FAC_LV_PRICE[lv] * (1 - upValue(s, 'buildCut'))); };
/** 시설 한 단계 증축 (코인 모자라거나 최고 단계면 false) */
export function buyFacility(s: SaveData, t: FacilityType): boolean {
  const cost = facPrice(s, t);
  if (cost === null || s.coins < cost) return false;
  s.coins -= cost; s.facLv[t] = facCount(s, t) + 1;
  return true;
}
export const decorPrice = (s: SaveData) => Math.round(drawPrice(s) * DECOR_FX.price);
/** 사서 보관함에 넣는다. 코인이 모자라면(빚 포함) null */
export function buyItem(s: SaveData, type: string): number | null {
  const cost = decorPrice(s);
  if (s.coins < cost) return null;
  s.coins -= cost;
  const uid = s.nextUid++;
  s.items.push({ uid, type, x: -1, y: -1 });
  return uid;
}
export function canPlaceItem(s: SaveData, uid: number, x: number, y: number): boolean {
  const it = s.items.find((i) => i.uid === uid);
  return !!it && it.x < 0 && boardGrid(s)[y]?.[x] === -1;
}
export function placeItem(s: SaveData, uid: number, x: number, y: number): boolean {
  if (!canPlaceItem(s, uid, x, y)) return false;
  const it = s.items.find((i) => i.uid === uid)!; it.x = x; it.y = y;
  return true;
}
/** 치우면 보관함으로 */
export function removeItem(s: SaveData, uid: number) { const it = s.items.find((i) => i.uid === uid); if (it) { it.x = -1; it.y = -1; } }
export const itemAt = (s: SaveData, x: number, y: number) => s.items.find((it) => it.x === x && it.y === y);
/** 우리 i의 분수 광장(모든 우리) · 붙어 있는 소품 보너스 (계절 소품은 그 계절이면 2배) */
export function penItemBonus(s: SaveData, i: number): { fountain: number; decor: number } {
  const cells = new Set(penCells(s, i).map(([x, y]) => `${x},${y}`));
  const season = curSeason(s).key;
  let decor = 0;
  for (const it of placedItems(s)) {
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => cells.has(`${it.x + dx},${it.y + dy}`));
    if (!near) continue;
    if (it.type.startsWith('deco:')) decor += DECOR_FX.attract * (it.type.split(':')[1] === season ? 2 : 1);
  }
  return { fountain: facSum(s, 'fountain'), decor };
}
function fits(grid: number[][], cells: [number, number][], ox: number, oy: number): boolean {
  return cells.every(([x, y]) => grid[y + oy]?.[x + ox] === -1);
}
/** 이 우리 조각을 (x, y, rot)에 놓을 수 있는지 */
export function canPlacePen(s: SaveData, uid: number, x: number, y: number, rot: number): boolean {
  const c = cardById(s, uid);
  if (!c || c.kind !== 'pen' || s.board.some((b) => b.uid === uid)) return false;
  return fits(boardGrid(s), rotateCells(penPiece(c).cells, rot), x, y);
}
export function placePen(s: SaveData, uid: number, x: number, y: number, rot: number): boolean {
  if (!canPlacePen(s, uid, x, y, rot)) return false;
  s.board.push({ uid, x, y, rot: ((rot % 4) + 4) % 4 });
  s.pens.push([]);
  return true;
}
/** 우리 치우기: 안의 동물은 보관함으로 */
export function removePen(s: SaveData, i: number): boolean {
  if (!s.board[i]) return false;
  s.board.splice(i, 1); s.pens.splice(i, 1); s.penTheme.splice(i, 1);
  return true;
}
/** 우리 조각 하나의 가치 (자동 배치 순서): 수용 × (1 + 서식지 보너스) + 등급 */
const penValue = (c: PenCard) => capOfCells(penPiece(c).cells.length) * (1 + PEN_THEME_BONUS[c.grade]) + c.grade * 3;
/** 자동 배치 (가장 효율 좋게): 가진 우리 조각을 부지에 빈틈이 적고 가치가 크게 끼워 넣는다. 동물은 다시 최대 수익 배치. 놓은 우리 수 */
export function autoArrangePens(s: SaveData, rng: Rng = Math.random): number {
  const [w, h] = boardDims(s);
  const all = s.cards.filter((c): c is PenCard => c.kind === 'pen');
  const tryOrder = (order: PenCard[]) => {
    const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => -1));
    for (const it of s.items) if (it.x >= 0 && grid[it.y]?.[it.x] !== undefined) grid[it.y][it.x] = -2; // 시설 · 소품은 그대로
    const out: { uid: number; x: number; y: number; rot: number }[] = [];
    let value = 0;
    for (const c of order) {
      let best: { x: number; y: number; rot: number; sc: number } | null = null;
      const seen = new Set<string>();
      for (let rot = 0; rot < 4; rot++) {
        const cells = rotateCells(penPiece(c).cells, rot);
        const key = cells.map((p) => p.join(',')).sort().join(';');
        if (seen.has(key)) continue;
        seen.add(key);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (!fits(grid, cells, x, y)) continue;
          // 왼쪽 위로 붙이고, 이웃(벽·다른 우리)에 많이 닿을수록 좋다 → 빈틈이 덜 생긴다
          let touch = 0;
          for (const [cx, cy] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = grid[cy + y + dy]?.[cx + x + dx]; if (v === undefined || v >= 0) touch++; }
          const sc = touch * 10 - y * 2 - x;
          if (!best || sc > best.sc) best = { x, y, rot, sc };
        }
      }
      if (!best) continue;
      for (const [cx, cy] of rotateCells(penPiece(c).cells, best.rot)) grid[cy + best.y][cx + best.x] = out.length;
      out.push({ uid: c.uid, x: best.x, y: best.y, rot: best.rot });
      value += penValue(c);
    }
    return { out, value };
  };
  const byValue = all.slice().sort((a, b) => penValue(b) - penValue(a));
  const bySize = all.slice().sort((a, b) => penPiece(b).cells.length - penPiece(a).cells.length || b.grade - a.grade);
  let best = tryOrder(byValue);
  for (const order of [bySize, ...Array.from({ length: 10 }, () => byValue.slice().sort(() => rng() - 0.5))]) {
    const t = tryOrder(order);
    if (t.value > best.value) best = t;
  }
  s.board = best.out;
  s.pens = best.out.map(() => []);
  s.penTheme = [];
  optimizePlacement(s);
  return best.out.length;
}
/** 예전 저장에서 옮겨 온 우리를 부지에 놓고 동물을 그대로 다시 넣는다 */
export function finishLegacy(s: SaveData) {
  if (!s.legacyPens) return;
  const legacy = s.legacyPens; delete s.legacyPens;
  // 부지가 모자라면 넓혀 준다
  const need = s.cards.filter((c): c is PenCard => c.kind === 'pen').reduce((t, c) => t + penPiece(c).cells.length, 0) * 1.35;
  while (s.upgrades.land < BOARD.length - 1 && BOARD[s.upgrades.land][0] * BOARD[s.upgrades.land][1] < need) s.upgrades.land++;
  autoArrangePens(s, () => 0.5);
  // 원래 우리에 있던 동물을 같은 조각에 다시
  s.pens = s.board.map((b) => { const l = legacy.find((x) => x.uid === b.uid); return l ? l.animals.filter((u) => s.cards.some((c) => c.uid === u)) : []; });
  s.pens = s.pens.map((p, i) => p.slice(0, penCap(s, i)));
}

// ── 우리 뽑기 (코인) ──
export const penDrawPrice = (s: SaveData) => drawPrice(s) * PEN_DRAW_MUL;
export function rollPen(rng: Rng, grade: Grade = rollGrade(rng)): Omit<PenCard, 'uid'> {
  const pool = PIECES.filter((p) => p.grade === grade);
  const piece = pick(pool, rng);
  const habitats = ['grass', 'sand', 'water', 'snow', 'rock', 'cloud'] as const;
  const optPool = PEN_OPTS.slice();
  const opts: PenCard['opts'] = [];
  for (let i = 0; i < PEN_OPT_COUNT[grade] && optPool.length; i++) {
    const o = optPool.splice(Math.floor(rng() * optPool.length), 1)[0];
    const step = o.step ?? 0.01;
    opts.push({ id: o.id, v: Math.round(Math.round((o.range[0] + rng() * (o.range[1] - o.range[0])) / step) * step * 1000) / 1000 });
  }
  return { kind: 'pen', piece: piece.id, grade, habitat: pick(habitats, rng), opts };
}
export function penDraw(s: SaveData, n: number, rng: Rng = Math.random): Card[] | null {
  const cost = penDrawPrice(s) * n;
  if (s.coins < cost) return null;
  s.coins -= cost;
  const out: Card[] = [];
  for (let i = 0; i < n; i++) out.push(addCard(s, rollPen(rng)));
  return out;
}
/** 우리 합성 재료: 놓지 않은 이 등급 우리 조각 */
export const penFusionCandidates = (s: SaveData, grade: Grade) => grade >= 4 ? [] : s.cards.filter((c): c is PenCard => c.kind === 'pen' && c.grade === grade && !s.board.some((b) => b.uid === c.uid));
/** 같은 등급 우리 조각 2~10장 → 다음 등급 1장 (동물 합성과 같은 확률). 실패하면 1장 돌려받음 */
export function fusePens(s: SaveData, uids: number[], rng: Rng = Math.random): FusionResult {
  const set = [...new Set(uids)];
  if (set.length < FUSION_MIN || set.length > FUSION_MAX) return { ok: false, reason: `${FUSION_MIN}~${FUSION_MAX}장을 넣어야 해요` };
  const first = cardById(s, set[0]);
  if (!first || first.kind !== 'pen') return { ok: false, reason: '우리 조각만 넣을 수 있어요' };
  const allowed = new Set(penFusionCandidates(s, first.grade).map((c) => c.uid));
  if (!set.every((u) => allowed.has(u))) return { ok: false, reason: '같은 등급의 놓지 않은 우리만 넣을 수 있어요' };
  const chance = Math.min(1, fusionChance(set.length) + upValue(s, 'fusion'));
  const success = rng() < chance;
  const keepUid = success ? -1 : set[Math.floor(rng() * set.length)];
  s.cards = s.cards.filter((c) => !set.includes(c.uid) || c.uid === keepUid);
  if (success) return { ok: true, success: true, card: addCard(s, rollPen(rng, (first.grade + 1) as Grade)), chance };
  return { ok: true, success: false, card: cardById(s, keepUid)!, chance };
}
export const staffSlotCount = (s: SaveData) => upValue(s, 'staff');

/** 우리·직원 슬롯 수가 업그레이드와 맞게 배열 길이를 맞춘다 */
export function syncSlots(s: SaveData) {
  while (s.pens.length < s.board.length) s.pens.push([]);
  if (s.pens.length > s.board.length) s.pens.length = s.board.length;
  while (s.staffSlots.length < staffSlotCount(s)) s.staffSlots.push(null);
}

export const cardById = (s: SaveData, uid: number) => s.cards.find((c) => c.uid === uid);
export const placedSet = (s: SaveData) => new Set<number>([...s.pens.flat(), ...s.staffSlots.filter((u): u is number => u !== null)]);
export const placedAnimals = (s: SaveData) => s.pens.flat().length;

// ── 뽑기 ──
export const drawPrice = (s: SaveData) => GACHA.price[Math.min(s.stage, MAX_STAGE) - 1];

/** 등급 뽑기. luck = 영웅 이상 확률 추가 (일반에서 떼어 영웅 3/4 · 전설 1/4로) */
function rollGrade(rng: Rng, luck = 0): Grade {
  let r = rng();
  const ch = GRADES.map((g) => g.chance);
  ch[0] -= luck; ch[3] += luck * 0.75; ch[4] += luck * 0.25;
  for (let i = 0; i < ch.length; i++) { if (r < ch[i]) return i as Grade; r -= ch[i]; }
  return 0;
}
const pick = <T>(list: readonly T[], rng: Rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

type NewCard = { kind: 'animal'; animal: number; shiny?: boolean } | Omit<StaffCard, 'uid'> | Omit<PenCard, 'uid'>;
function addCard(s: SaveData, card: NewCard): Card {
  const c = { ...card, uid: s.nextUid++ } as Card;
  if (c.kind === 'animal' && !c.shiny) delete c.shiny;
  s.cards.push(c);
  if (c.kind === 'animal') { s.dex[c.animal] = true; if (c.shiny) s.shinyDex[c.animal] = true; }
  return c;
}
/** 지금 계절 */
export const curSeason = (s: SaveData): SeasonDef => seasonOf(s.season.n);
/** 이 등급의 동물 하나: 그 계절 한정 종이 있으면 일정 확률로 계절 한정 풀에서 */
function pickAnimal(s: SaveData, g: Grade, rng: Rng, limitedShare: number = upValue(s, 'seasonPick') ?? SEASON_FX.limitedShare): number {
  const lim = seasonalOfGrade(g, curSeason(s).key);
  if (lim.length && rng() < limitedShare) return pick(lim, rng).id;
  return pick(animalsOfGrade(g), rng).id;
}

/** 첫 무료 뽑기: 일반 동물 확정 */
export function freeDraw(s: SaveData, rng: Rng = Math.random): Card | null {
  if (s.freeDrawUsed) return null;
  s.freeDrawUsed = true;
  s.stats.draws++;
  return addCard(s, { kind: 'animal', animal: pick(animalsOfGrade(0), rng).id });
}

/** n장 뽑기. 코인이 모자라면 null (아무것도 바뀌지 않음) */
/** 뽑기 하나: 동물 90% · 직원 5% · 우리 5%, 나온 것 안에서 등급. 코인(뽑기용)이 모자라면 null */
export const DRAW_KIND = { animal: 0.9, staff: 0.05, pen: 0.05 } as const;
/** 기계 등급: 뽑을 때마다 랜덤 (계절 기계는 지금 계절, 가끔 은 · 금 · 무지개) */
export const MACHINE_TIERS = [
  { name: '계절 기계', key: 'base', chance: 0.89, luck: 0, shiny: 1 },
  { name: '은빛 기계', key: 'silver', chance: 0.08, luck: 0.01, shiny: 1 },
  { name: '금빛 기계', key: 'gold', chance: 0.025, luck: 0.03, shiny: 1 },
  { name: '무지개 기계', key: 'rainbow', chance: 0.005, luck: 0.06, shiny: 2 },
] as const;
export function rollMachine(rng: Rng, mul = 1, rainbowPlus = 0): number {
  let r = rng();
  for (let i = MACHINE_TIERS.length - 1; i > 0; i--) { const c = MACHINE_TIERS[i].chance * mul + (i === 3 ? rainbowPlus : 0); if (r < c) return i; r -= c; }
  return 0;
}
/** 마지막 뽑기의 기계 등급 (연출용) */
export let lastTier = 0;
export function draw(s: SaveData, n: number, rng: Rng = Math.random): Card[] | null {
  const cost = drawPrice(s) * n;
  if ((s.tokens ?? 0) < cost) return null;
  const tier = rollMachine(rng, upValue(s, 'machine'), (s.stars ?? 0) >= 4 ? 0.005 : 0);
  lastTier = tier;
  s.tokens -= cost;
  s.stats.draws += n;
  return rollCards(s, n, rng, tier);
}

// ── 직원 뽑기 (코인) ──
export const staffDrawPrice = (s: SaveData) => drawPrice(s) * STAFF_DRAW_MUL;
const round3 = (v: number) => Math.round(v * 1000) / 1000;
/** 직원 카드 하나 만들기: 종류 · 등급 · 월급 · 특수옵션 랜덤 */
export function rollStaff(rng: Rng, grade: Grade = rollGrade(rng), kind: StaffKind = pick(STAFF, rng).kind): Omit<StaffCard, 'uid'> {
  const [a, b] = STAFF_PAY[grade];
  const pool = STAFF_OPTS.filter((o) => !o.legendOnly || grade === 4).slice();
  const opts: StaffCard['opts'] = [];
  for (let i = 0; i < STAFF_OPT_COUNT[grade] && pool.length; i++) {
    const o = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const step = o.step ?? 0.01;
    opts.push({ id: o.id, v: round3(Math.round((o.range[0] + rng() * (o.range[1] - o.range[0])) / step) * step) });
  }
  return { kind: 'staff', staff: kind, grade, pay: round3(a + rng() * (b - a)), opts };
}
/** 직원 n명 뽑기. 코인이 모자라면(빚 포함) null */
export function staffDraw(s: SaveData, n: number, rng: Rng = Math.random): Card[] | null {
  const cost = staffDrawPrice(s) * n;
  if (s.coins < cost) return null;
  s.coins -= cost;
  const out: Card[] = [];
  for (let i = 0; i < n; i++) out.push(addCard(s, rollStaff(rng)));
  return out;
}
/** 해고: 직원 뽑기 가격의 일부를 돌려받는다. 돌려받은 코인 (실패하면 -1) */
export function fireStaff(s: SaveData, uid: number): number {
  const c = cardById(s, uid);
  if (!c || c.kind !== 'staff') return -1;
  const refund = Math.round(staffDrawPrice(s) * STAFF_REFUND[c.grade]);
  unplace(s, uid);
  s.cards = s.cards.filter((x) => x.uid !== uid);
  s.coins += refund;
  return refund;
}
export const fireRefund = (s: SaveData, c: StaffCard) => Math.round(staffDrawPrice(s) * STAFF_REFUND[c.grade]);
/** 이 직원의 하루 월급 (코인) */
export const costUnit = (s: SaveData) => UPKEEP.unit[Math.min(s.stage, UPKEEP.unit.length) - 1];
export const staffPay = (s: SaveData, c: StaffCard) => Math.round(costUnit(s) * STAFF_DRAW_MUL * c.pay * (1 - (c.opts.find((o) => o.id === 'thrifty')?.v ?? 0)));

function rollCards(s: SaveData, n: number, rng: Rng, tier = 0): Card[] {
  const mt = MACHINE_TIERS[tier];
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    const k = rng();
    if (k >= DRAW_KIND.animal + DRAW_KIND.staff) { out.push(addCard(s, rollPen(rng))); continue; }
    if (k >= DRAW_KIND.animal) { out.push(addCard(s, rollStaff(rng))); continue; }
    const g = rollGrade(rng, optSum(s, 'luck') + facSum(s, 'lab') + mt.luck);
    out.push(addCard(s, { kind: 'animal', animal: pickAnimal(s, g, rng), shiny: rng() < upValue(s, 'shiny') * mt.shiny }));
  }
  return out;
}

/** 무료 뽑기권 1장으로 1회 뽑기 */
export function ticketDraw(s: SaveData, rng: Rng = Math.random): Card[] | null {
  if (s.tickets <= 0 || s.coins < 0) return null; // 빚이 있으면 못 뽑는다
  lastTier = 0;
  s.tickets--;
  s.stats.draws++;
  return rollCards(s, 1, rng);
}

// ── 합성 ──
export const fusionChance = (n: number) => (n < FUSION_MIN ? 0 : FUSION_CHANCE[Math.min(n, FUSION_MAX)]);

/** 합성 재료가 될 수 있는 카드: 동물, 미배치, 잠금 아닌 종, 이 등급, 최상위 등급 아님 */
export function fusionCandidates(s: SaveData, grade: Grade): Card[] {
  if (grade >= 4) return [];
  const placed = placedSet(s);
  return s.cards.filter((c) => c.kind === 'animal' && !placed.has(c.uid) && !s.lockedSpecies.includes(c.animal) && ANIMALS[c.animal].grade === grade);
}

/** 자동으로 채우기: 같은 종이 많이 겹친 카드부터 n장 */
export function autoFusionPick(s: SaveData, grade: Grade, n: number): number[] {
  const cands = fusionCandidates(s, grade);
  const count = new Map<number, number>();
  for (const c of cands) if (c.kind === 'animal') count.set(c.animal, (count.get(c.animal) ?? 0) + 1);
  return cands.slice().sort((a, b) => (count.get((b as { animal: number }).animal)! - count.get((a as { animal: number }).animal)!)).slice(0, n).map((c) => c.uid);
}

export type FusionResult = { ok: true; success: boolean; card: Card; chance: number } | { ok: false; reason: string };

/** 같은 등급 카드 2~10장 합성. 성공하면 다음 등급 1장, 실패하면 넣은 카드 중 1장을 돌려받는다 */
export function fuse(s: SaveData, uids: number[], rng: Rng = Math.random): FusionResult {
  const set = [...new Set(uids)];
  if (set.length < FUSION_MIN || set.length > FUSION_MAX) return { ok: false, reason: `${FUSION_MIN}~${FUSION_MAX}장을 넣어야 해요` };
  const cards = set.map((u) => cardById(s, u));
  const first = cards[0];
  if (!first || first.kind !== 'animal') return { ok: false, reason: '동물 카드만 넣을 수 있어요' };
  const grade = ANIMALS[first.animal].grade;
  const allowed = new Set(fusionCandidates(s, grade).map((c) => c.uid));
  if (!set.every((u) => allowed.has(u))) return { ok: false, reason: '같은 등급의 배치·잠금 안 된 동물만 넣을 수 있어요' };
  const chance = Math.min(1, fusionChance(set.length) + upValue(s, 'fusion'));
  const shinyIn = cards.filter((c) => c?.kind === 'animal' && c.shiny).length;
  const success = rng() < chance;
  const keepUid = success ? -1 : set[Math.floor(rng() * set.length)];
  s.cards = s.cards.filter((c) => !set.includes(c.uid) || c.uid === keepUid);
  s.stats.fusions++;
  if (success) {
    s.stats.fusionWins++;
    const card = addCard(s, { kind: 'animal', animal: pickAnimal(s, (grade + 1) as Grade, rng), shiny: rng() < SHINY.chance + SHINY.fusionPerShiny * shinyIn });
    return { ok: true, success: true, card, chance };
  }
  return { ok: true, success: false, card: cardById(s, keepUid)!, chance };
}

// ── 배치 ──
export function placeAnimal(s: SaveData, uid: number, pen?: number): boolean {
  syncSlots(s);
  const c = cardById(s, uid);
  if (!c || c.kind !== 'animal' || placedSet(s).has(uid)) return false;
  const target = pen ?? s.pens.findIndex((p, i) => p.length < penCap(s, i));
  if (target < 0 || target >= penCount(s) || s.pens[target].length >= penCap(s, target)) return false;
  s.pens[target].push(uid);
  return true;
}

export function unplace(s: SaveData, uid: number) {
  s.pens = s.pens.map((p) => p.filter((u) => u !== uid));
  s.staffSlots = s.staffSlots.map((u) => (u === uid ? null : u));
}

/** 빈 칸을 매력도 높은 카드부터 채운다. 같은 종은 같은 우리에 모이게 */
export function autoPlace(s: SaveData): number {
  syncSlots(s);
  const placed = placedSet(s);
  const free = s.cards.filter((c): c is Extract<Card, { kind: 'animal' }> => c.kind === 'animal' && !placed.has(c.uid))
    .sort((a, b) => ANIMALS[b.animal].grade - ANIMALS[a.animal].grade || a.animal - b.animal);
  let n = 0;
  for (const c of free) {
    // 같은 종이 이미 있는 우리 → 서식지가 같은 우리 → 아무 빈 우리
    const pens = s.pens.slice(0, penCount(s));
    const hasRoom = (i: number) => pens[i].length < penCap(s, i);
    const species = (i: number) => pens[i].some((u) => (cardById(s, u) as { animal?: number })?.animal === c.animal);
    const habitat = (i: number) => penTheme(s, i) === ANIMALS[c.animal].habitat;
    let i = pens.findIndex((_, k) => hasRoom(k) && species(k));
    if (i < 0) i = pens.findIndex((_, k) => hasRoom(k) && habitat(k));
    if (i < 0) i = pens.findIndex((_, k) => hasRoom(k) && pens[k].length === 0);
    if (i < 0) i = pens.findIndex((_, k) => hasRoom(k));
    if (i < 0) break;
    s.pens[i].push(c.uid);
    n++;
  }
  return n;
}

/** 최대 수익 배치: 전시 중인 동물을 모두 내리고, 매력도 합이 가장 크게 다시 배치한다.
 *  1) 넣을 카드 고르기: 기본 매력도 높은 순 (같은 종 보너스를 노릴 수 있으면 같은 종을 함께)
 *  2) 우리 나누기: 같은 서식지끼리 한 우리에, 같은 종은 같은 우리에 모은다 (같은 종·같은 서식지 보너스)
 *  여러 방법을 시도해 총 매력도가 가장 높은 배치를 고른다. 돌려주는 값: 배치 후 총 매력도 */
export function optimizePlacement(s: SaveData): number {
  // 지금 배치보다 나빠지면 되돌린다 (찾기가 놓친 경우)
  const keep = s.pens.map((p) => p.slice()), before = totalAttract(s);
  const after = optimizePlacementRaw(s);
  if (after < before) { s.pens = keep; return before; }
  return after;
}
function optimizePlacementRaw(s: SaveData): number {
  syncSlots(s);
  const nPens = penCount(s), caps = s.board.map((_, i) => penCap(s, i)), capacity = caps.reduce((a, b) => a + b, 0);
  const staffUids = new Set(s.staffSlots.filter((u): u is number => u !== null));
  const animals = s.cards.filter((c): c is Extract<Card, { kind: 'animal' }> => c.kind === 'animal' && !staffUids.has(c.uid));
  const attractOf = (id: number) => GRADES[ANIMALS[id].grade].attract;
  // 반짝이는 같은 종 안에서 먼저
  animals.sort((a, b) => Number(!!b.shiny) - Number(!!a.shiny));

  // 후보 1: 기본 매력도 높은 순 / 후보 2: 같은 종 묶음을 우선(보너스 노림)
  const bySpecies = new Map<number, number[]>();
  for (const c of animals) bySpecies.set(c.animal, [...(bySpecies.get(c.animal) ?? []), c.uid]);
  const season = curSeason(s).key;
  const cardVal = (c: { animal: number; shiny?: boolean }) => attractOf(c.animal) * (c.shiny ? SHINY.attractMul : 1) * (ANIMALS[c.animal].season === season ? 1 + SEASON_FX.limitedSelf : 1);
  const plainPick = animals.slice().sort((a, b) => cardVal(b) - cardVal(a) || a.animal - b.animal).slice(0, capacity).map((c) => c.uid);
  const groupPick: number[] = [];
  const groups = [...bySpecies.entries()].sort((a, b) => {
    const va = attractOf(a[0]) * (a[1].length >= 3 ? 1.1 : 1), vb = attractOf(b[0]) * (b[1].length >= 3 ? 1.1 : 1);
    return vb - va;
  });
  for (const [, list] of groups) for (const u of list) if (groupPick.length < capacity) groupPick.push(u);

  // 조합 세트: 고른 카드 안에 멤버가 다 있으면 세트끼리 묶는다
  const setKeyOf = (uids: number[]) => {
    const have = new Set(uids.map((u) => (cardById(s, u) as { animal: number }).animal));
    const key = new Map<number, string>();
    for (const st of SYNERGY_SETS) if (st.members.every((m) => have.has(m))) for (const m of st.members) if (!key.has(m)) key.set(m, `0${st.id}`);
    return (a: number) => key.get(a) ?? `1${ANIMALS[a].habitat}`;
  };
  const arrange = (uids: number[], useSets = false): number[][] => {
    const pens: number[][] = Array.from({ length: nPens }, () => []);
    const groupOf = useSets ? setKeyOf(uids) : (a: number) => ANIMALS[a].habitat;
    // 서식지(또는 세트) → 종 순서로 정렬해서 우리를 차례로 채운다 (같은 종·서식지가 한 우리에 모인다)
    const sorted = uids.slice().sort((a, b) => {
      const ca = (cardById(s, a) as { animal: number }).animal, cb = (cardById(s, b) as { animal: number }).animal;
      return groupOf(ca).localeCompare(groupOf(cb)) || attractOf(cb) - attractOf(ca) || ca - cb;
    });
    let p = 0;
    for (let i = 0; i < sorted.length; i++) {
      // 서식지가 바뀌고 지금 우리가 반 넘게 찼으면 다음 우리로 넘어가서 서식지를 섞지 않는다
      if (i > 0 && p < nPens - 1 && pens[p].length >= caps[p] / 2) {
        const prev = groupOf((cardById(s, sorted[i - 1]) as { animal: number }).animal);
        const cur = groupOf((cardById(s, sorted[i]) as { animal: number }).animal);
        const leftCap = caps.slice(p + 1).reduce((a, b) => a + b, 0);
        if (prev !== cur && leftCap >= sorted.length - i) p++;
      }
      while (p < nPens && pens[p].length >= caps[p]) p++;
      if (p >= nPens) break;
      pens[p].push(sorted[i]);
    }
    return pens;
  };
  const score = (pens: number[][]) => { const old = s.pens; s.pens = pens; const t = totalAttract(s); s.pens = old; return t; };
  // 우리 서식지에 맞춰 넣기: 서식지가 같은 동물부터 그 우리에 (큰 우리 먼저), 남는 칸은 나머지로
  const byHabitat = (uids: number[]): number[][] => {
    const pens: number[][] = Array.from({ length: nPens }, () => []);
    const left = uids.slice();
    const order = caps.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    for (const i of order) {
      const th = penTheme(s, i);
      for (let k = 0; k < left.length && pens[i].length < caps[i];) {
        if (ANIMALS[(cardById(s, left[k]) as { animal: number }).animal].habitat === th) { pens[i].push(left[k]); left.splice(k, 1); } else k++;
      }
    }
    for (const i of order) while (pens[i].length < caps[i] && left.length) pens[i].push(left.shift()!);
    return pens;
  };
  const tries = [arrange(plainPick), arrange(groupPick), arrange(plainPick, true), arrange(groupPick, true), byHabitat(plainPick), byHabitat(groupPick)];
  // 서식지를 섞지 않고 단순히 채운 배치도 비교 (우리가 적을 때 더 나을 수 있다)
  { let k = 0; tries.push(caps.map((c) => plainPick.slice(k, (k += c)))); }
  let best = tries[0], bestScore = score(best);
  for (const t of tries.slice(1)) { const sc = score(t); if (sc > bestScore) { best = t; bestScore = sc; } }
  s.pens = best;
  return bestScore;
}

export function assignStaff(s: SaveData, uid: number, slot?: number): boolean {
  syncSlots(s);
  const c = cardById(s, uid);
  if (!c || c.kind !== 'staff' || placedSet(s).has(uid)) return false;
  const i = slot ?? s.staffSlots.findIndex((u, k) => u === null && k < staffSlotCount(s));
  if (i < 0 || i >= staffSlotCount(s)) return false;
  s.staffSlots[i] = uid;
  return true;
}

// ── 매력도 · 시너지 ──
export interface AttractCtx { habitatMul?: Partial<Record<Habitat, number>>; allMul?: number }
export interface PenSyn { kind: 'set' | 'habitat' | 'grade' | 'season'; name: string; desc: string }
/** 이 우리에서 발동한 조합 시너지 */
export function penSets(s: SaveData, pen: number): SynergySet[] {
  const ids = new Set(s.pens[pen]?.map((u) => (cardById(s, u) as { animal?: number })?.animal));
  return SYNERGY_SETS.filter((st) => st.members.every((m) => ids.has(m)));
}
/** 우리 테마: 지정했으면 그것, 아니면 우리 안 가장 많은 서식지 (빈 우리는 null) */
export function penTheme(s: SaveData, pen: number): Habitat | null {
  const pc = penCardAt(s, pen);
  if (pc) return pc.habitat;
  const t = s.penTheme[pen];
  if (t) return t as Habitat;
  const cnt = new Map<Habitat, number>();
  for (const u of s.pens[pen] ?? []) { const c = cardById(s, u); if (c?.kind === 'animal') cnt.set(ANIMALS[c.animal].habitat, (cnt.get(ANIMALS[c.animal].habitat) ?? 0) + 1); }
  let best: Habitat | null = null, n = 0;
  for (const [h, v] of cnt) if (v > n) { n = v; best = h; }
  return best;
}
const pctTxt = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
/** 우리 하나의 매력도와 발동 중인 시너지 · '1마리 더' 힌트 */
export function penDetail(s: SaveData, pen: number, fedMul = 1, ctx: AttractCtx = {}) {
  const cards = (s.pens[pen] ?? []).map((u) => cardById(s, u)).filter((c): c is Extract<Card, { kind: 'animal' }> => c?.kind === 'animal');
  const syn: PenSyn[] = [], near: string[] = [];
  if (!cards.length) return { total: 0, syn, near };
  const season = curSeason(s);
  const ids = cards.map((c) => c.animal);
  const species = new Map<number, number>(), habitats = new Map<Habitat, number>();
  for (const a of ids) { species.set(a, (species.get(a) ?? 0) + 1); habitats.set(ANIMALS[a].habitat, (habitats.get(ANIMALS[a].habitat) ?? 0) + 1); }
  // 조합 세트 (우리 전체)
  let setBonus = 0;
  for (const st of penSets(s, pen)) {
    const v = st.attract * (st.season === season.key ? 2 : 1);
    setBonus += v;
    syn.push({ kind: 'set', name: st.name, desc: `매력 ${pctTxt(v)}${st.tip ? ` · 동물원 투척액 ${pctTxt(st.tip)}` : ''}${st.feedCut ? ` · 사료비 −${Math.round(st.feedCut * 100)}%` : ''}${st.season === season.key ? ' (제철 2배)' : ''}` });
  }
  for (const st of SYNERGY_SETS) {
    const miss = st.members.filter((m) => !species.has(m));
    if (miss.length === 1 && st.members.length > 1 && (s.synergyFound.includes(st.id) || st.members.length >= 3)) near.push(`${st.name}: ${s.synergyFound.includes(st.id) ? ANIMALS[miss[0]].name : '???'} 1마리 더!`);
  }
  // 서식지 단계
  for (const [h, n] of habitats) {
    const tier = HABITAT_TIERS.find(([at]) => n >= at);
    if (tier) syn.push({ kind: 'habitat', name: `${habitatName(h)} ${n}마리`, desc: `${habitatName(h)} 동물 ${pctTxt(tier[1])}` });
    const next = HABITAT_TIERS.slice().reverse().find(([at]) => n < at);
    if (next && next[0] - n === 1) near.push(`${habitatName(h)} 1마리 더면 ${pctTxt(next[1])}`);
  }
  // 우리 모양 (테마와 같은 서식지)
  const theme = penTheme(s, pen);
  const pc = penCardAt(s, pen);
  const themeBonus = pc ? PEN_THEME_BONUS[pc.grade] : 0;
  const star = penOpt(s, pen, 'star'), seasonMul = penOpt(s, pen, 'season') ? 2 : 1;
  if (theme && habitats.has(theme) && themeBonus) syn.push({ kind: 'habitat', name: `${habitatName(theme)} 우리`, desc: `${habitatName(theme)} 동물 ${pctTxt(themeBonus)} (${GRADES[pc!.grade].name} 우리)` });
  if (star) syn.push({ kind: 'set', name: '인기 우리', desc: `이 우리 동물 ${pctTxt(star)}` });
  const ib = penItemBonus(s, pen), decoTier = (s.upgrades.deco ?? 0) * DECO_ATTRACT;
  if (ib.fountain) syn.push({ kind: 'set', name: '분수 옆', desc: `이 우리 동물 ${pctTxt(ib.fountain)}` });
  if (ib.decor) syn.push({ kind: 'season', name: '꾸미기 소품', desc: `붙어 있는 소품 ${pctTxt(ib.decor)} (제철 소품 2배)` });
  if (decoTier) syn.push({ kind: 'set', name: '울타리 꾸미기', desc: `모든 동물 ${pctTxt(decoTier)}` });
  // 등급
  const grades = new Set(ids.map((a) => ANIMALS[a].grade));
  const rainbow = grades.size === 5 ? GRADE_SYN.rainbow : 0;
  if (rainbow) syn.push({ kind: 'grade', name: '무지개', desc: `일반~전설 한 마리씩 · ${pctTxt(rainbow)}` });
  else if (grades.size === 4) near.push('무지개: 등급 하나만 더!');
  const same = grades.size === 1 && ids.length >= GRADE_SYN.sameMin ? (ids[0] !== undefined && ANIMALS[ids[0]].grade === 0 ? GRADE_SYN.sameCommon : GRADE_SYN.sameGrade) : 0;
  if (same) syn.push({ kind: 'grade', name: '동급 무리', desc: `모두 같은 등급 · ${pctTxt(same)}` });
  const kingHabs = new Set(ids.filter((a) => ANIMALS[a].grade === 4).map((a) => ANIMALS[a].habitat));
  if (kingHabs.size) syn.push({ kind: 'grade', name: '왕의 무리', desc: `전설과 같은 서식지 일반·고급 ${pctTxt(GRADE_SYN.king)}` });
  // 계절
  const inSeason = ids.filter((a) => ANIMALS[a].season === season.key);
  const aura = inSeason.length ? SEASON_FX.limitedAura : 0;
  if (inSeason.length) syn.push({ kind: 'season', name: `${season.name} 한정`, desc: `제철 한정 동물 +${Math.round(SEASON_FX.limitedSelf * 100)}% · 같은 우리 ${pctTxt(aura)}` });
  if (habitats.has(season.strong)) syn.push({ kind: 'season', name: `제철 ${habitatName(season.strong)}`, desc: `${season.name}: ${habitatName(season.strong)} 동물 ${pctTxt(SEASON_FX.strong)}` });
  if (season.weak && habitats.has(season.weak)) syn.push({ kind: 'season', name: `${season.name}에 약한 ${habitatName(season.weak)}`, desc: `${habitatName(season.weak)} 동물 ${pctTxt(SEASON_FX.weak)}` });

  let total = 0;
  for (const c of cards) {
    const a = ANIMALS[c.animal];
    const n = species.get(c.animal)!;
    let bonus = setBonus + rainbow + same;
    bonus += SAME_SPECIES_BONUS.find(([at]) => n >= at)?.[1] ?? 0;
    bonus += HABITAT_TIERS.find(([at]) => habitats.get(a.habitat)! >= at)?.[1] ?? 0;
    bonus += habitatDexBonus(s, a.habitat);
    if (theme === a.habitat) bonus += themeBonus;
    bonus += star + ib.fountain + ib.decor + decoTier;
    if (kingHabs.has(a.habitat) && a.grade <= 1) bonus += GRADE_SYN.king;
    if (a.season === season.key) bonus += SEASON_FX.limitedSelf * seasonMul; else bonus += aura * seasonMul;
    if (a.habitat === season.strong) bonus += SEASON_FX.strong * seasonMul;
    if (a.habitat === season.weak) bonus += SEASON_FX.weak;
    bonus = Math.max(-0.5, Math.min(SYNERGY_CAP, bonus));
    const ev = (ctx.habitatMul?.[a.habitat] ?? 1) * (ctx.allMul ?? 1);
    total += GRADES[a.grade].attract * (c.shiny ? SHINY.attractMul : 1) * (1 + bonus) * ev;
  }
  return { total: total * fedMul, syn, near };
}
const HAB_KO: Record<Habitat, string> = { grass: '풀밭', sand: '사막', water: '물가', snow: '설원', rock: '바위산', cloud: '구름' };
const habitatName = (h: Habitat) => HAB_KO[h];
/** 우리 하나의 매력도 */
export function penAttract(s: SaveData, pen: number, fedMul = 1, ctx: AttractCtx = {}): number { return penDetail(s, pen, fedMul, ctx).total; }
/** 동물원 전체 투척액 + (조합 시너지) */
export function zoneTipBonus(s: SaveData): number {
  let t = 0;
  for (let i = 0; i < Math.min(s.pens.length, penCount(s)); i++) for (const st of penSets(s, i)) t += st.tip ?? 0;
  return t;
}
/** 처음 발동한 조합 시너지를 도감에 기록. 새로 찾은 것 */
export function discoverSynergies(s: SaveData): SynergySet[] {
  const found: SynergySet[] = [];
  for (let i = 0; i < Math.min(s.pens.length, penCount(s)); i++) for (const st of penSets(s, i)) if (!s.synergyFound.includes(st.id)) { s.synergyFound.push(st.id); found.push(st); }
  return found;
}

export function totalAttract(s: SaveData, fed: (pen: number) => number = () => 1, ctx: AttractCtx = {}): number {
  let t = 0;
  for (let i = 0; i < Math.min(s.pens.length, penCount(s)); i++) t += penAttract(s, i, fed(i), ctx);
  return Math.round(t);
}

export const stageTipMul = (s: SaveData) => Math.pow(STAGE_TIP_MUL, s.stage - 1);

// ── 직원 효과 ──
/** 배치된 직원 카드 (슬롯 수 안). working = 파업 중이면 '충성' 직원만 */
export function placedStaffCards(s: SaveData, working = true): StaffCard[] {
  const out: StaffCard[] = [];
  s.staffSlots.forEach((u, i) => {
    if (u === null || i >= staffSlotCount(s)) return;
    const c = cardById(s, u);
    if (c?.kind !== 'staff') return;
    if (working && s.strike && !c.opts.some((o) => o.id === 'loyal')) return;
    out.push(c);
  });
  return out;
}
/** 일하는 직원 중 이 종류 효과 합 (겹치면 최대치까지) */
export function staffSum(s: SaveData, kind: StaffKind): number {
  const v = placedStaffCards(s).filter((c) => c.staff === kind).reduce((t, c) => t + staffDef(kind).values[c.grade], 0);
  const cap = (STAFF_CAP as Record<string, number>)[kind];
  return cap !== undefined ? Math.min(cap, v) : v;
}
/** 일하는 직원의 특수옵션 합 */
export const optSum = (s: SaveData, id: StaffOptId) => placedStaffCards(s).reduce((t, c) => t + c.opts.filter((o) => o.id === id).reduce((a, o) => a + o.v, 0), 0);
/** 투척액 배율: 안내원 + '말솜씨' + 도감 등급 보상 */
export const staffTipMul = (s: SaveData) => 1 + staffSum(s, 'guide') + optSum(s, 'tips') + dexTipBonus(s) + zoneTipBonus(s) + facSum(s, 'snack');
/** 관리인: 바닥 동전 수명 + */
export const coinLifeBonus = (s: SaveData) => staffSum(s, 'janitor') + facSum(s, 'bench');
/** 폐장 후 바닥 동전 회수율: 관리인 등급별, '야근'이면 100% */
export function closingShare(s: SaveData): number {
  if (optSum(s, 'overtime') > 0) return 1;
  const js = placedStaffCards(s).filter((c) => c.staff === 'janitor');
  return js.length ? Math.max(...js.map((c) => JANITOR_SHARE[c.grade])) : 0;
}
/** 관람객 수 배율: 홍보 담당 + '인기인' */
export const visitorMul = (s: SaveData) => starVisitorMul(s) + staffSum(s, 'promoter') + optSum(s, 'crowd') + s.board.reduce((t, _, i) => t + penOpt(s, i, 'crowd'), 0) + facSum(s, 'photo');
/** 먹이 효과 */
export const feedBonus = (s: SaveData) => FEED.bonus * (1 + optSum(s, 'feeder'));
/** 이벤트 간격 배율 · 추가 지속 시간 · VIP 배율 */
export const eventGapMul = (s: SaveData) => 1 - staffSum(s, 'performer');
export const eventExtraSec = (s: SaveData) => optSum(s, 'party');
export const vipMul = (s: SaveData) => Math.max(1, placedStaffCards(s).reduce((m, c) => m * (c.opts.find((o) => o.id === 'vip')?.v ?? 1), 1)) * (1 + facSum(s, 'carousel'));
/** 수거 직원 · 사육사 속도 배율 (그 직원 하나의 등급) */
export const staffSpeed = (c: StaffCard) => staffDef(c.staff).values[c.grade];

// ── 하루 비용: 월급 + 유지비 ──
export function dailyCosts(s: SaveData) {
  const unit = costUnit(s);
  const salary = placedStaffCards(s, false).reduce((t, c) => t + staffPay(s, c), 0);
  const season = curSeason(s);
  let feed = 0, climateN = 0;
  s.pens.slice(0, penCount(s)).forEach((p, i) => {
    const farm = penSets(s, i).reduce((m, st) => m * (1 - (st.feedCut ?? 0)), 1) * (1 - penOpt(s, i, 'feedcut'));
    for (const u of p) {
      const c = cardById(s, u);
      if (c?.kind !== 'animal') continue;
      feed += UPKEEP.feed[ANIMALS[c.animal].grade] * farm * (1 - upValue(s, 'feedCost'));
      if (season.climate && ANIMALS[c.animal].habitat === season.climate) climateN++;
    }
  });
  const cut = Math.min(0.6, staffSum(s, 'cleaner') + optSum(s, 'saver'));
  const facility = Math.round(FACILITIES.reduce((t, f) => t + f.upkeep * facCount(s, f.type), 0) * unit * (1 - cut));
  const cells = s.board.reduce((t, _, i) => t + penCells(s, i).length, 0);
  const pens = Math.round(UPKEEP.perCell * cells * unit * (1 - cut));
  const food = Math.round(feed * unit * (1 - cut));
  const climate = Math.round(climateN * SEASON_FX.climatePerAnimal * unit * (1 - cut));
  return { salary, pens, food, climate, climateName: season.climateName, facility, cut, total: salary + pens + food + climate + facility };
}

// ── 동물원 규모 (라이벌 대결) ──
export function zooScale(s: SaveData): number {
  let v = 0;
  s.pens.forEach((p, i) => {
    const lm = penOpt(s, i, 'landmark') ? 2 : 1;
    for (const u of p) { const c = cardById(s, u); if (c?.kind === 'animal') v += SCALE.animal[ANIMALS[c.animal].grade] * (c.shiny ? SHINY.scaleMul : 1) * lm; }
    const pc = penCardAt(s, i); if (pc) v += PEN_SCALE[pc.grade] * lm;
  });
  for (const c of placedStaffCards(s, false)) v += STAFF_SCALE[c.grade];
  for (const lv of Object.values(s.upgrades)) v += lv * SCALE.upgradeLv;
  for (const it of placedItems(s)) v += it.type.startsWith('fac:') ? 0 : ITEM_SCALE.decor;
  for (const f of FACILITIES) v += facCount(s, f.type) * ITEM_SCALE.facility;
  if (s.coins < 0) v -= (-s.coins / drawPrice(s)) * SCALE.debtPerDraw;
  return Math.round(v);
}

// ── 도감 보상 ──
export const dexSetDone = (s: SaveData, id: string) => { const set = DEX_SETS.find((x) => x.id === id)!; return dexSetMembers(set).every((a) => s.dex[a.id]); };
export function habitatDexBonus(s: SaveData, h: string): number {
  let b = 0;
  for (const id of s.dexClaimed) { const set = DEX_SETS.find((x) => x.id === id); if (set?.bonus.habitat === h) b += set.bonus.attract ?? 0; }
  return b;
}
export function dexTipBonus(s: SaveData): number {
  let b = 0;
  for (const id of s.dexClaimed) b += DEX_SETS.find((x) => x.id === id)?.bonus.tip ?? 0;
  return b;
}
export function claimDexSet(s: SaveData, id: string): number {
  const set = DEX_SETS.find((x) => x.id === id);
  if (!set || s.dexClaimed.includes(id) || !dexSetDone(s, id)) return 0;
  s.dexClaimed.push(id);
  s.coins += set.reward;
  return set.reward;
}

// ── 오늘 영업 미션 (게임 속 하루마다) ──
export function ensureMissions(s: SaveData, rng: Rng = Math.random) {
  if (s.missions && s.missions.day === s.day) return s.missions;
  const pool = MISSION_POOL.slice();
  const list = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const t = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const k = MISSION_K[Math.min(MISSION_K.length - 1, Math.floor(rng() * MISSION_K.length))];
    list.push({ kind: t.kind, target: t.target(s.day, s.stage, k), progress: 0, claimed: false });
  }
  s.missions = { day: s.day, list, bonusClaimed: false };
  return s.missions;
}
/** 미션 진행: 낮에 한 일만 (World가 부른다) */
export function bumpMission(s: SaveData, kind: MissionKind, n: number) {
  if (!s.missions || s.missions.day !== s.day || n <= 0) return;
  for (const m of s.missions.list) if (m.kind === kind) m.progress = Math.min(m.target, m.progress + n);
}
/** 영업 끝: 달성한 미션을 모두 받는다. 받은 뽑기권 수 */
export function settleMissions(s: SaveData): number {
  const before = s.tickets;
  s.missions?.list.forEach((_, i) => claimMission(s, i));
  claimMissionBonus(s);
  return s.tickets - before;
}
export const missionText = (kind: MissionKind, n: number) => MISSION_POOL.find((m) => m.kind === kind)!.text(n);
export function claimMission(s: SaveData, i: number): boolean {
  const m = s.missions?.list[i];
  if (!m || m.claimed || m.progress < m.target) return false;
  m.claimed = true; s.tickets += MISSION_REWARD;
  return true;
}
export function claimMissionBonus(s: SaveData): boolean {
  const ms = s.missions;
  if (!ms || ms.bonusClaimed || !ms.list.every((m) => m.claimed)) return false;
  ms.bonusClaimed = true; s.tickets += MISSION_BONUS;
  return true;
}

// ── 폐원 ──
/** 폐원하고 새 동물원: 동물원·코인·카드는 처음부터, 도감과 기록만 남는다 */
export function closeZoo(s: SaveData): SaveData {
  const n = defaultSave();
  n.dex = s.dex.slice();
  n.dexClaimed = s.dexClaimed.slice();
  n.records = { bestSeasons: s.records.bestSeasons, bestDay: Math.max(s.records.bestDay, s.day), closures: s.records.closures + 1, bestYears: s.records.bestYears };
  n.shinyDex = s.shinyDex.slice();
  n.synergyFound = s.synergyFound.slice();
  return n;
}

// ── 자리 비움 수익 ──
export const OFFLINE = { rate: 0.3, maxHours: 8, minMinutes: 2 } as const;
/** 닫혀 있던 동안의 수익: 분당 예상 기본 수입 × 분 × 30% (최대 8시간) */
export function offlineEarnings(s: SaveData, now = Date.now()): { minutes: number; amount: number } | null {
  if (!s.lastSeen || placedAnimals(s) === 0) return null;
  const minutes = Math.min(OFFLINE.maxHours * 60, (now - s.lastSeen) / 60000);
  if (minutes < OFFLINE.minMinutes) return null;
  const A = totalAttract(s);
  const perMin = Math.min(upValue(s, 'gate'), 3 + 0.2 * A) * 15 * upValue(s, 'quality') * stageTipMul(s) * staffTipMul(s);
  // 낮 시간 몫만 (하루 중 관람객이 오는 비율)
  const dayShare = (DAY.dayLen - DAY.duskLen) / (DAY.dayLen + DAY.nightAvg);
  return { minutes, amount: Math.floor(perMin * minutes * OFFLINE.rate * dayShare) };
}

// ── 업그레이드 · 승급 ──
export function upgradeCost(s: SaveData, id: UpgradeId): number | null {
  const u = upgradeDef(id), lv = s.upgrades[id] ?? 0;
  if (id === 'land') return null; // 부지는 규모 확장(promote)으로만
  if (id === 'machine' && lv >= 3 && (s.stars ?? 0) < 2) return null; // 마지막 단계는 별 2개부터
  return lv < u.costs.length ? Math.round(u.costs[lv] * (1 - (id === 'buildCut' ? 0 : upValue(s, 'buildCut')))) : null;
}
export function upgradeLockedBy(s: SaveData, id: UpgradeId): number | null {
  const u = upgradeDef(id), lv = s.upgrades[id];
  return lv < u.need.length && s.stage < u.need[lv] ? u.need[lv] : null;
}
export function buyUpgrade(s: SaveData, id: UpgradeId): boolean {
  const cost = upgradeCost(s, id);
  if (cost === null || s.coins < cost || upgradeLockedBy(s, id) !== null) return false;
  s.coins -= cost;
  s.upgrades[id]++;
  syncSlots(s);
  // 부지를 넓히면 일반 우리 하나를 선물
  if (id === 'land') addCard(s, rollPen(Math.random, 0));
  return true;
}

export function stageReq(s: SaveData): [number, number] | null {
  return s.stage < MAX_STAGE ? STAGE_REQ[s.stage - 1] : null;
}
/** 다음 확장 공사비 (최고면 null). 8단계 다음은 별 3개 특별 확장(24×6) */
export function expandCost(s: SaveData): number | null {
  if (s.stage < MAX_STAGE) return Math.round(EXPAND_COST[s.stage - 1] * (1 - upValue(s, 'buildCut')));
  if (!s.bigLand && (s.stars ?? 0) >= 3) return Math.round(EXPAND_COST[MAX_STAGE - 1] * (1 - upValue(s, 'buildCut')));
  return null;
}
/** 조건(전시 · 매력)을 채웠는지 (공사비는 따로) */
export function canPromote(s: SaveData): boolean {
  if (s.stage >= MAX_STAGE) return !s.bigLand && (s.stars ?? 0) >= 3;
  const req = stageReq(s);
  return !!req && placedAnimals(s) >= req[0] && totalAttract(s) >= req[1];
}
/** 규모 확장: 단계 +1 · 부지 확장 · 일반 우리 선물 (공사비를 낸다) */
export function promote(s: SaveData): boolean {
  const cost = expandCost(s);
  if (!canPromote(s) || cost === null || s.coins < cost) return false;
  s.coins -= cost;
  if (s.stage < MAX_STAGE) s.stage++; else s.bigLand = true;
  s.upgrades.land = Math.min(BOARD.length - 1, s.stage - 1 + (s.bigLand ? 1 : 0));
  addCard(s, rollPen(Math.random, 0));
  syncSlots(s);
  return true;
}
export const stageName = (s: SaveData) => STAGE_NAMES[Math.min(s.stage, STAGE_NAMES.length) - 1];

// ── 별 등급: 1년(4시즌)마다 평가, 올라가기만 ──
export interface YearEval { items: { name: string; score: number; note: string }[]; total: number; before: number; after: number }
export function evaluateYear(s: SaveData, mine: number, rival: number): YearEval {
  const clamp = (v: number) => Math.max(0, Math.min(20, Math.round(v)));
  const ys = s.yearStats ?? { visitors: 0, sad: 0 };
  const placed = s.pens.flat().map((u) => cardById(s, u)).filter((c): c is Extract<Card, { kind: 'animal' }> => c?.kind === 'animal');
  const legends = placed.filter((c) => ANIMALS[c.animal].grade >= 4).length, shinies = placed.filter((c) => c.shiny).length;
  const facLv = Object.values(s.facLv ?? {}).reduce((a, b) => a + b, 0);
  const dex = s.dex.filter(Boolean).length;
  const items = [
    { name: '규모', score: clamp(10 + (mine / Math.max(1, rival) - 1) * 40), note: `라이벌 대비 ${Math.round((mine / Math.max(1, rival)) * 100)}%` },
    { name: '도감', score: clamp((dex / 150) * 20), note: `${dex}종` },
    { name: '손님 만족', score: clamp((ys.visitors / 5000) * 20 * (1 - Math.min(1, ys.sad / Math.max(1, ys.visitors)))), note: `손님 ${ys.visitors.toLocaleString('ko-KR')}명 · 실망 ${Math.round((ys.sad / Math.max(1, ys.visitors)) * 100)}%` },
    { name: '꾸밈', score: clamp(((facLv + (s.upgrades.deco ?? 0) * 3) / 45) * 20), note: `건물 단계 ${facLv} · 울타리 ${s.upgrades.deco ?? 0}` },
    { name: '특별함', score: clamp(legends * 2 + shinies * 2 + s.synergyFound.length), note: `전설 ${legends} · 반짝이 ${shinies} · 시너지 ${s.synergyFound.length}` },
  ];
  const total = items.reduce((a, b) => a + b.score, 0);
  const before = s.stars ?? 0;
  let earned = 0; STAR_NEED.forEach((n, i) => { if (total >= n) earned = i + 1; });
  s.stars = Math.max(before, earned);
  s.yearStats = { visitors: 0, sad: 0 };
  return { items, total, before, after: s.stars };
}
/** 별 보상: 손님 배율 (★1 +5% · ★5 +15%) */
export const starVisitorMul = (s: SaveData) => 1 + ((s.stars ?? 0) >= 5 ? 0.15 : (s.stars ?? 0) >= 1 ? 0.05 : 0);

export { UPGRADES };
