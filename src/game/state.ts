// 저장 데이터. 저장 시점: 뽑기·합성·배치·업그레이드·승급 직후, 그리고 30초마다(코인).
import { ANIMALS } from '../data/animals';
import { STAFF_PAY, isStaffKind, type StaffKind, type StaffOptId } from '../data/staff';
import type { Grade } from '../data/grades';
import type { Habitat } from '../data/animals';
import { HABITATS, pieceDef, type PenOptId } from '../data/pieces';
import { UPGRADES, type UpgradeId } from '../data/balance';

export type Card =
  | { uid: number; kind: 'animal'; animal: number; shiny?: boolean }
  | StaffCard
  | PenCard;
/** 우리 조각 카드: 조각 모양 · 등급 · 서식지 · 특수옵션 */
export interface PenCard { uid: number; kind: 'pen'; piece: string; grade: Grade; habitat: Habitat; opts: { id: PenOptId; v: number }[] }
/** 부지에 놓은 우리: 카드 · 블록 좌표 · 회전(0~3). s.pens[i]는 board[i]에 든 동물 */
export interface Placement { uid: number; x: number; y: number; rot: number }
/** 직원 카드: 등급 · 월급(직원 뽑기 가격 대비 하루 비율) · 특수옵션 */
export interface StaffCard { uid: number; kind: 'staff'; staff: StaffKind; grade: Grade; pay: number; opts: { id: StaffOptId; v: number }[] }

export interface SaveData {
  version: number;
  coins: number;
  cards: Card[];
  nextUid: number;
  /** 우리마다 배치된 동물 카드 uid (board와 같은 순서) */
  pens: number[][];
  /** 시설 · 소품 (x < 0 이면 보관함) */
  items: { uid: number; type: string; x: number; y: number }[];
  /** 부지에 놓은 우리 조각 */
  board: Placement[];
  /** 예전 저장에서 옮겨 온 우리 (불러온 뒤 rules.finishLegacy가 부지에 놓는다) */
  legacyPens?: { uid: number; animals: number[] }[];
  /** 직원 슬롯마다 배치된 카드 uid (빈 칸 null) */
  staffSlots: (number | null)[];
  /** 업그레이드 레벨 (0 = 기본) */
  upgrades: Record<UpgradeId, number>;
  stage: number;
  freeDrawUsed: boolean;
  /** 잠근 종 (합성 재료에서 빠진다) */
  lockedSpecies: number[];
  /** 도감: 한 번이라도 얻은 종 */
  dex: boolean[];
  stats: { draws: number; fusions: number; fusionWins: number; coinsEarned: number; coinsPicked: number; vips: number };
  tutorialDone: boolean;
  /** 무료 뽑기권 (미션 보상) */
  tickets: number;
  /** 오늘의 미션 */
  missions: MissionState | null;
  /** 우리별 서식지 테마 (null = 자동: 가장 많은 서식지) */
  penTheme: (string | null)[];
  /** 반짝이 도감 · 발견한 조합 시너지 id */
  shinyDex: boolean[];
  synergyFound: string[];
  /** 받은 도감 보상 id */
  dexClaimed: string[];
  /** 마지막으로 본 시각 (자리 비움 수익) */
  lastSeen: number;
  /** 며칠째 */
  day: number;
  /** 밤인지 · 낮이 흐른 초 (다시 열어도 이어서) */
  atNight: boolean;
  dayT: number;
  /** 이번 시즌: 몇 번째, 시작한 날, 내 누적 수입, 라이벌 누적 수입 (지난 날까지) */
  season: { n: number; start: number; mine: number; rival: number; lost?: boolean };
  /** 빚(코인 < 0)으로 끝난 날이 이어진 수 · 오늘 파업 중인지 */
  debtDays: number;
  strike: boolean;
  /** 폐원해도 남는 기록 */
  records: { bestSeasons: number; bestDay: number; closures: number; bestYears: number };
}

export interface Mission { kind: MissionKind; target: number; progress: number; claimed: boolean }
export type MissionKind = 'visitors' | 'pickup' | 'earn' | 'feed';
const MISSION_KINDS: MissionKind[] = ['visitors', 'pickup', 'earn', 'feed'];
/** day: 게임 속 며칠째의 미션인지 */
export interface MissionState { day: number; list: Mission[]; bonusClaimed: boolean }

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'bbopzoo.save';

export function defaultSave(): SaveData {
  const upgrades = Object.fromEntries(UPGRADES.map((u) => [u.id, 0])) as Record<UpgradeId, number>;
  return {
    version: SAVE_VERSION, coins: 0, nextUid: 1, staffSlots: [null],
    // 처음 우리 두 개: 네모 우리(풀밭) · 네모 우리(물가). uid는 일반 카드와 겹치지 않게 크게
    cards: [{ uid: 900001, kind: 'pen', piece: 'O', grade: 0, habitat: 'grass', opts: [] }, { uid: 900002, kind: 'pen', piece: 'O', grade: 0, habitat: 'water', opts: [] }],
    board: [{ uid: 900001, x: 1, y: 1, rot: 0 }, { uid: 900002, x: 5, y: 1, rot: 0 }], pens: [[], []], items: [],
    upgrades, stage: 1, freeDrawUsed: false, lockedSpecies: [], dex: ANIMALS.map(() => false),
    stats: { draws: 0, fusions: 0, fusionWins: 0, coinsEarned: 0, coinsPicked: 0, vips: 0 }, tutorialDone: false,
    tickets: 0, missions: null, dexClaimed: [], lastSeen: 0, day: 1,
    atNight: false, dayT: 0, season: { n: 1, start: 1, mine: 0, rival: 0 }, records: { bestSeasons: 0, bestDay: 0, closures: 0, bestYears: 0 }, debtDays: 0, strike: false, shinyDex: ANIMALS.map(() => false), synergyFound: [], penTheme: [],
  };
}

/** 불러온 값을 검사하고 빠진 칸을 채운다. 망가진 카드 참조는 지운다 */
export function normalize(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<SaveData>;
  const out: SaveData = { ...d, ...r, upgrades: { ...d.upgrades, ...(r.upgrades ?? {}) }, stats: { ...d.stats, ...(r.stats ?? {}) } };
  out.coins = Number.isFinite(out.coins) ? out.coins : 0; // 빚(마이너스) 허용
  out.cards = Array.isArray(r.cards) ? r.cards.filter((c) => c && typeof c.uid === 'number' && (c.kind === 'animal' ? ANIMALS[c.animal] : c.kind === 'staff' ? isStaffKind(c.staff) : c.kind === 'pen' && typeof c.piece === 'string')) : d.cards;
  for (const c of out.cards) if (c.kind === 'pen') {
    if (typeof c.grade !== 'number' || c.grade < 0 || c.grade > 4) c.grade = 0;
    if (!HABITATS.includes(c.habitat)) c.habitat = 'grass';
    if (!Array.isArray(c.opts)) c.opts = [];
  }
  // 예전 직원 카드(등급 없음) → 일반~희귀 중 하나, 월급은 범위 가운데
  for (const c of out.cards) if (c.kind === 'staff') {
    if (typeof c.grade !== 'number' || c.grade < 0 || c.grade > 4) c.grade = (c.uid % 3) as Grade;
    if (!Number.isFinite(c.pay) || c.pay <= 0) { const [a, b] = STAFF_PAY[c.grade]; c.pay = Math.round(((a + b) / 2) * 1000) / 1000; }
    if (!Array.isArray(c.opts)) c.opts = [];
  }
  const uids = new Set(out.cards.map((c) => c.uid));
  out.nextUid = Math.max(out.nextUid || 1, ...out.cards.map((c) => c.uid + 1), 1);
  const seen = new Set<number>();
  const keep = (u: unknown) => typeof u === 'number' && uids.has(u) && !seen.has(u) && (seen.add(u), true);
  out.pens = Array.isArray(out.pens) ? out.pens.map((p) => (Array.isArray(p) ? p.filter(keep) : [])) : d.pens;
  const rr = r as Record<string, unknown>;
  if (!Array.isArray(rr.board)) {
    // 예전 저장 (우리 늘리기 · 넓히기): 우리마다 마릿수가 들어갈 사각 조각을 만들고, 동물은 불러온 뒤 다시 넣는다
    const oldUp = (rr.upgrades ?? {}) as Record<string, number>;
    const sizeVals = [4, 6, 8, 10, 12, 15, 18, 22, 26, 30], countVals = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const cap = sizeVals[Math.min(9, Math.max(0, oldUp.size ?? 0))], n = countVals[Math.min(8, Math.max(0, oldUp.pens ?? 0))];
    const cells = Math.ceil(cap / 1.6), h = Math.max(1, Math.round(Math.sqrt(cells / 2))), w = Math.ceil(cells / h);
    out.cards = out.cards.filter((c) => c.kind !== 'pen');
    out.legacyPens = [];
    for (let i = 0; i < n; i++) {
      const uid = 900001 + i;
      const hab = (() => { const cnt = new Map<Habitat, number>(); for (const u of out.pens[i] ?? []) { const c = out.cards.find((x) => x.uid === u); if (c?.kind === 'animal') cnt.set(ANIMALS[c.animal].habitat, (cnt.get(ANIMALS[c.animal].habitat) ?? 0) + 1); } let b: Habitat = 'grass', m = 0; for (const [k, v] of cnt) if (v > m) { m = v; b = k; } return b; })();
      out.cards.push({ uid, kind: 'pen', piece: `RECT${w}x${h}`, grade: 0, habitat: hab, opts: [] });
      out.legacyPens.push({ uid, animals: out.pens[i] ?? [] });
    }
    out.board = []; out.pens = [];
    out.upgrades.land = Math.min(8, Math.max(oldUp.pens ?? 0, oldUp.size ?? 0));
  } else {
    const pens = new Set(out.cards.filter((c) => c.kind === 'pen').map((c) => c.uid));
    const used = new Set<number>();
    const ok = (rr.board as Placement[]).map((b, i) => ({ b, i })).filter(({ b }) => b && pens.has(b.uid) && !used.has(b.uid) && (used.add(b.uid), true) && pieceDef((out.cards.find((c) => c.uid === b.uid) as PenCard).piece));
    out.board = ok.map(({ b }) => ({ uid: b.uid, x: Math.floor(b.x) || 0, y: Math.floor(b.y) || 0, rot: ((Math.floor(b.rot) || 0) % 4 + 4) % 4 }));
    out.pens = ok.map(({ i }) => out.pens[i] ?? []);
  }
  out.items = Array.isArray(rr.items) ? (rr.items as SaveData['items']).filter((it) => it && typeof it.uid === 'number' && typeof it.type === 'string').map((it) => ({ uid: it.uid, type: it.type, x: Number.isFinite(it.x) ? Math.floor(it.x) : -1, y: Number.isFinite(it.y) ? Math.floor(it.y) : -1 })) : [];
  out.nextUid = Math.max(out.nextUid, ...out.items.map((it) => it.uid + 1));
  delete (out.upgrades as Record<string, number>).pens; delete (out.upgrades as Record<string, number>).size;
  out.staffSlots = Array.isArray(out.staffSlots) ? out.staffSlots.map((u) => (u !== null && keep(u) ? u : null)) : d.staffSlots;
  out.dex = ANIMALS.map((_, i) => !!(Array.isArray(r.dex) && r.dex[i]));
  for (const c of out.cards) if (c.kind === 'animal') out.dex[c.animal] = true;
  out.lockedSpecies = Array.isArray(out.lockedSpecies) ? out.lockedSpecies.filter((n) => typeof n === 'number') : [];
  out.tickets = Number.isFinite(out.tickets) ? Math.max(0, Math.floor(out.tickets)) : 0;
  out.dexClaimed = Array.isArray(out.dexClaimed) ? out.dexClaimed.filter((x) => typeof x === 'string') : [];
  out.lastSeen = Number.isFinite(out.lastSeen) ? out.lastSeen : 0;
  out.day = Number.isFinite(out.day) && out.day >= 1 ? Math.floor(out.day) : 1;
  const ms = out.missions as MissionState | null;
  out.missions = ms && typeof ms.day === 'number' && Array.isArray(ms.list) && ms.list.every((m) => MISSION_KINDS.includes(m.kind)) ? ms : null;
  out.atNight = !!out.atNight;
  out.dayT = Number.isFinite(out.dayT) ? Math.max(0, out.dayT) : 0;
  const se = (r.season ?? {}) as Partial<SaveData['season']>;
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  out.season = { n: Math.max(1, Math.floor(num(se.n, 1))), start: Math.max(1, Math.floor(num(se.start, out.day))), mine: Math.max(0, num(se.mine, 0)), rival: Math.max(0, num(se.rival, 0)), ...(se.lost ? { lost: true } : {}) };
  if (out.season.start > out.day) out.season.start = out.day;
  const rc = (r.records ?? {}) as Partial<SaveData['records']>;
  out.records = { bestSeasons: Math.max(0, num(rc.bestSeasons, 0)), bestDay: Math.max(0, num(rc.bestDay, 0)), closures: Math.max(0, num(rc.closures, 0)), bestYears: Math.max(0, num(rc.bestYears, 0)) };
  out.shinyDex = ANIMALS.map((_, i) => !!(Array.isArray(r.shinyDex) && r.shinyDex[i]));
  for (const c of out.cards) if (c.kind === 'animal' && c.shiny) out.shinyDex[c.animal] = true;
  out.penTheme = Array.isArray(r.penTheme) ? r.penTheme.map((t) => (typeof t === 'string' && ['grass', 'sand', 'water', 'snow', 'rock', 'cloud'].includes(t) ? t : null)) : [];
  out.synergyFound = Array.isArray(r.synergyFound) ? r.synergyFound.filter((x) => typeof x === 'string') : [];
  out.debtDays = Number.isFinite(out.debtDays) ? Math.max(0, Math.floor(out.debtDays)) : 0;
  out.strike = !!out.strike;
  out.staffSlots = out.staffSlots.length ? out.staffSlots : [null];
  out.version = SAVE_VERSION;
  return out;
}

export function loadSave(storage: Storage | null = safeStorage()): SaveData {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultSave();
  } catch { return defaultSave(); }
}

export function writeSave(s: SaveData, storage: Storage | null = safeStorage()): boolean {
  try { storage?.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch { return false; }
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
