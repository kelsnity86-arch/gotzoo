// 규칙 계산 (화면 없음): 뽑기, 합성, 배치, 매력도, 업그레이드, 승급. 모두 SaveData를 직접 바꾼다.
import { ANIMALS, animalsOfGrade } from '../data/animals';
import { GRADES, type Grade } from '../data/grades';
import { STAFF, type StaffKind } from '../data/staff';
import { FUSION_CHANCE, FUSION_MAX, FUSION_MIN, GACHA, MAX_STAGE, SAME_HABITAT_BONUS, SAME_SPECIES_BONUS, STAGE_REQ, STAGE_TIP_MUL, UPGRADES, upgradeDef, type UpgradeId } from '../data/balance';
import type { Card, MissionKind, SaveData } from './state';
import { DEX_SETS, dexSetMembers } from '../data/dex';
import { MISSION_BONUS, MISSION_POOL, MISSION_REWARD } from '../data/missions';
import { STAFF_FX } from '../data/staff';

export type Rng = () => number;

// ── 업그레이드 값 ──
export const upValue = (s: SaveData, id: UpgradeId) => upgradeDef(id).values[s.upgrades[id]];
export const penCount = (s: SaveData) => upValue(s, 'pens');
export const penSize = (s: SaveData) => upValue(s, 'size');
export const staffSlotCount = (s: SaveData) => upValue(s, 'staff');

/** 우리·직원 슬롯 수가 업그레이드와 맞게 배열 길이를 맞춘다 */
export function syncSlots(s: SaveData) {
  while (s.pens.length < penCount(s)) s.pens.push([]);
  while (s.staffSlots.length < staffSlotCount(s)) s.staffSlots.push(null);
}

export const cardById = (s: SaveData, uid: number) => s.cards.find((c) => c.uid === uid);
export const placedSet = (s: SaveData) => new Set<number>([...s.pens.flat(), ...s.staffSlots.filter((u): u is number => u !== null)]);
export const placedAnimals = (s: SaveData) => s.pens.flat().length;

// ── 뽑기 ──
export const drawPrice = (s: SaveData) => GACHA.price[Math.min(s.stage, MAX_STAGE) - 1];

function rollGrade(rng: Rng): Grade {
  let r = rng();
  for (const g of GRADES) { if (r < g.chance) return g.id; r -= g.chance; }
  return 0;
}
const pick = <T>(list: readonly T[], rng: Rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

type NewCard = { kind: 'animal'; animal: number } | { kind: 'staff'; staff: StaffKind };
function addCard(s: SaveData, card: NewCard): Card {
  const c = { ...card, uid: s.nextUid++ } as Card;
  s.cards.push(c);
  if (c.kind === 'animal') s.dex[c.animal] = true;
  return c;
}

/** 첫 무료 뽑기: 일반 동물 확정 */
export function freeDraw(s: SaveData, rng: Rng = Math.random): Card | null {
  if (s.freeDrawUsed) return null;
  s.freeDrawUsed = true;
  s.stats.draws++;
  return addCard(s, { kind: 'animal', animal: pick(animalsOfGrade(0), rng).id });
}

/** n장 뽑기. 코인이 모자라면 null (아무것도 바뀌지 않음) */
export function draw(s: SaveData, n: number, rng: Rng = Math.random): Card[] | null {
  const cost = drawPrice(s) * n;
  if (s.coins < cost) return null;
  s.coins -= cost;
  s.stats.draws += n;
  return rollCards(s, n, rng);
}

function rollCards(s: SaveData, n: number, rng: Rng): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (rng() < GACHA.staffChance) out.push(addCard(s, { kind: 'staff', staff: pick(STAFF, rng).kind as StaffKind }));
    else out.push(addCard(s, { kind: 'animal', animal: pick(animalsOfGrade(rollGrade(rng)), rng).id }));
  }
  bumpMission(s, 'draw', n);
  bumpMission(s, 'rare', out.filter((c) => c.kind === 'animal' && ANIMALS[c.animal].grade >= 2).length);
  return out;
}

/** 무료 뽑기권 1장으로 1회 뽑기 */
export function ticketDraw(s: SaveData, rng: Rng = Math.random): Card[] | null {
  if (s.tickets <= 0) return null;
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
  const chance = fusionChance(set.length);
  const success = rng() < chance;
  const keepUid = success ? -1 : set[Math.floor(rng() * set.length)];
  s.cards = s.cards.filter((c) => !set.includes(c.uid) || c.uid === keepUid);
  s.stats.fusions++;
  bumpMission(s, 'fuse', 1);
  if (success) {
    s.stats.fusionWins++;
    const card = addCard(s, { kind: 'animal', animal: pick(animalsOfGrade((grade + 1) as Grade), rng).id });
    return { ok: true, success: true, card, chance };
  }
  return { ok: true, success: false, card: cardById(s, keepUid)!, chance };
}

// ── 배치 ──
export function placeAnimal(s: SaveData, uid: number, pen?: number): boolean {
  syncSlots(s);
  const c = cardById(s, uid);
  if (!c || c.kind !== 'animal' || placedSet(s).has(uid)) return false;
  const size = penSize(s);
  const target = pen ?? s.pens.findIndex((p) => p.length < size);
  if (target < 0 || target >= penCount(s) || s.pens[target].length >= size) return false;
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
  const size = penSize(s);
  let n = 0;
  for (const c of free) {
    // 같은 종이 이미 있는 우리 → 같은 서식지 우리 → 아무 빈 우리
    const pens = s.pens.slice(0, penCount(s));
    const hasRoom = (i: number) => pens[i].length < size;
    const species = (i: number) => pens[i].some((u) => (cardById(s, u) as { animal?: number })?.animal === c.animal);
    const habitat = (i: number) => pens[i].length > 0 && pens[i].every((u) => ANIMALS[(cardById(s, u) as { animal: number }).animal].habitat === ANIMALS[c.animal].habitat);
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
  syncSlots(s);
  const nPens = penCount(s), size = penSize(s), capacity = nPens * size;
  const staffUids = new Set(s.staffSlots.filter((u): u is number => u !== null));
  const animals = s.cards.filter((c): c is Extract<Card, { kind: 'animal' }> => c.kind === 'animal' && !staffUids.has(c.uid));
  const attractOf = (id: number) => GRADES[ANIMALS[id].grade].attract;

  // 후보 1: 기본 매력도 높은 순 / 후보 2: 같은 종 묶음을 우선(보너스 노림)
  const bySpecies = new Map<number, number[]>();
  for (const c of animals) bySpecies.set(c.animal, [...(bySpecies.get(c.animal) ?? []), c.uid]);
  const plainPick = animals.slice().sort((a, b) => attractOf(b.animal) - attractOf(a.animal) || a.animal - b.animal).slice(0, capacity).map((c) => c.uid);
  const groupPick: number[] = [];
  const groups = [...bySpecies.entries()].sort((a, b) => {
    const va = attractOf(a[0]) * (a[1].length >= 3 ? 1.1 : 1), vb = attractOf(b[0]) * (b[1].length >= 3 ? 1.1 : 1);
    return vb - va;
  });
  for (const [, list] of groups) for (const u of list) if (groupPick.length < capacity) groupPick.push(u);

  const arrange = (uids: number[]): number[][] => {
    const pens: number[][] = Array.from({ length: nPens }, () => []);
    // 서식지 → 종 순서로 정렬해서 우리를 차례로 채운다 (같은 종·서식지가 한 우리에 모인다)
    const sorted = uids.slice().sort((a, b) => {
      const ca = (cardById(s, a) as { animal: number }).animal, cb = (cardById(s, b) as { animal: number }).animal;
      return ANIMALS[ca].habitat.localeCompare(ANIMALS[cb].habitat) || attractOf(cb) - attractOf(ca) || ca - cb;
    });
    let p = 0;
    for (let i = 0; i < sorted.length; i++) {
      // 서식지가 바뀌고 지금 우리가 반 넘게 찼으면 다음 우리로 넘어가서 서식지를 섞지 않는다
      if (i > 0 && p < nPens - 1 && pens[p].length >= size / 2) {
        const prev = ANIMALS[(cardById(s, sorted[i - 1]) as { animal: number }).animal].habitat;
        const cur = ANIMALS[(cardById(s, sorted[i]) as { animal: number }).animal].habitat;
        const left = nPens - 1 - p, need = Math.ceil((sorted.length - i) / size);
        if (prev !== cur && left >= need) p++;
      }
      if (pens[p].length >= size) p++;
      if (p >= nPens) break;
      pens[p].push(sorted[i]);
    }
    return pens;
  };
  const score = (pens: number[][]) => { const old = s.pens; s.pens = pens; const t = totalAttract(s); s.pens = old; return t; };
  const tries = [arrange(plainPick), arrange(groupPick)];
  // 서식지를 섞지 않고 단순히 채운 배치도 비교 (우리가 적을 때 더 나을 수 있다)
  tries.push(Array.from({ length: nPens }, (_, i) => plainPick.slice(i * size, (i + 1) * size)));
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

// ── 매력도 ──
/** 우리 하나의 매력도 (같은 종·같은 서식지 보너스 포함). fed = 먹이 버프 중인지 */
export function penAttract(s: SaveData, pen: number, fedMul = 1): number {
  const ids = s.pens[pen].map((u) => (cardById(s, u) as { animal: number }).animal);
  if (!ids.length) return 0;
  const count = new Map<number, number>();
  for (const a of ids) count.set(a, (count.get(a) ?? 0) + 1);
  const sameHab = ids.length >= 2 && ids.every((a) => ANIMALS[a].habitat === ANIMALS[ids[0]].habitat) ? SAME_HABITAT_BONUS : 0;
  let total = 0;
  for (const a of ids) {
    const n = count.get(a)!;
    const sp = SAME_SPECIES_BONUS.find(([at]) => n >= at)?.[1] ?? 0;
    total += GRADES[ANIMALS[a].grade].attract * (1 + sp + sameHab + habitatDexBonus(s, ANIMALS[a].habitat));
  }
  return total * fedMul;
}

export function totalAttract(s: SaveData, fed: (pen: number) => number = () => 1): number {
  let t = 0;
  for (let i = 0; i < Math.min(s.pens.length, penCount(s)); i++) t += penAttract(s, i, fed(i));
  return Math.round(t);
}

export const stageTipMul = (s: SaveData) => Math.pow(STAGE_TIP_MUL, s.stage - 1);

// ── 직원 효과 ──
const placedStaff = (s: SaveData, kind: string) => s.staffSlots.filter((u, i) => u !== null && i < staffSlotCount(s) && (cardById(s, u) as { staff?: string } | undefined)?.staff === kind).length;
/** 안내원 수만큼 투척액 + · 도감 등급 보상 */
export const staffTipMul = (s: SaveData) => 1 + STAFF_FX.guideTip * placedStaff(s, 'guide') + dexTipBonus(s);
/** 관리인 수만큼 바닥 동전 수명 + */
export const coinLifeBonus = (s: SaveData) => STAFF_FX.janitorLife * placedStaff(s, 'janitor');

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

// ── 오늘의 미션 ──
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function ensureMissions(s: SaveData, date = todayKey(), rng: Rng = Math.random) {
  if (s.missions && s.missions.date === date) return s.missions;
  const pool = MISSION_POOL.slice();
  const list = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const t = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    list.push({ kind: t.kind, target: t.targets[Math.min(t.targets.length - 1, Math.floor(rng() * t.targets.length))], progress: 0, claimed: false });
  }
  s.missions = { date, list, bonusClaimed: false };
  return s.missions;
}
export function bumpMission(s: SaveData, kind: MissionKind, n: number) {
  if (!s.missions || n <= 0) return;
  for (const m of s.missions.list) if (m.kind === kind) m.progress = Math.min(m.target, m.progress + n);
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

// ── 자리 비움 수익 ──
export const OFFLINE = { rate: 0.3, maxHours: 8, minMinutes: 2 } as const;
/** 닫혀 있던 동안의 수익: 분당 예상 기본 수입 × 분 × 30% (최대 8시간) */
export function offlineEarnings(s: SaveData, now = Date.now()): { minutes: number; amount: number } | null {
  if (!s.lastSeen || placedAnimals(s) === 0) return null;
  const minutes = Math.min(OFFLINE.maxHours * 60, (now - s.lastSeen) / 60000);
  if (minutes < OFFLINE.minMinutes) return null;
  const A = totalAttract(s);
  const perMin = Math.min(upValue(s, 'gate'), 3 + 0.2 * A) * 15 * upValue(s, 'quality') * stageTipMul(s) * staffTipMul(s);
  return { minutes, amount: Math.floor(perMin * minutes * OFFLINE.rate) };
}

// ── 업그레이드 · 승급 ──
export function upgradeCost(s: SaveData, id: UpgradeId): number | null {
  const u = upgradeDef(id), lv = s.upgrades[id];
  return lv < u.costs.length ? u.costs[lv] : null;
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
  bumpMission(s, 'upgrade', 1);
  return true;
}

export function stageReq(s: SaveData): [number, number] | null {
  return s.stage < MAX_STAGE ? STAGE_REQ[s.stage - 1] : null;
}
export function canPromote(s: SaveData): boolean {
  const req = stageReq(s);
  return !!req && placedAnimals(s) >= req[0] && totalAttract(s) >= req[1];
}
export function promote(s: SaveData): boolean {
  if (!canPromote(s)) return false;
  s.stage++;
  return true;
}

export { UPGRADES };
