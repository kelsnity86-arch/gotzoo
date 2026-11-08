// 저장 데이터. 저장 시점: 뽑기·합성·배치·업그레이드·승급 직후, 그리고 30초마다(코인).
import { GACHA } from '../data/balance';
import { FACILITIES, FAC_MAX_LV, type FacilityType } from '../data/facilities';
import { ANIMALS } from '../data/animals';
import { STAFF_PAY, isStaffKind, type StaffKind, type StaffOptId } from '../data/staff';
import type { Grade } from '../data/grades';
import type { Habitat } from '../data/animals';
import { HABITATS, pieceDef, type PenOptId } from '../data/pieces';
import { UPGRADES, type UpgradeId } from '../data/balance';

export type Card =
  | { uid: number; kind: 'animal'; animal: number; shiny?: boolean;
    /** 올림푸스 12지신 번호 (네임드). shiny = 각성 */
    god?: number }
  | StaffCard
  | PenCard;
/** 우리 조각 카드: 조각 모양 · 등급 · 서식지 · 특수옵션 */
export interface PenCard { uid: number; kind: 'pen'; piece: string; grade: Grade; habitat: Habitat; opts: { id: PenOptId; v: number }[] }
/** 부지에 놓은 우리: 카드 · 블록 좌표 · 회전(0~3). s.pens[i]는 board[i]에 든 동물 */
export interface Placement { uid: number; x: number; y: number; rot: number }
/** 직원 카드: 등급 · 월급(직원 뽑기 가격 대비 하루 비율) · 특수옵션 */
export interface StaffCard { uid: number; kind: 'staff'; staff: StaffKind; grade: Grade; pay: number; opts: { id: StaffOptId; v: number }[];
  /** 신화 영웅 번호 (네임드 직원) · 각성 */
  hero?: number; awake?: boolean }

export interface SaveData {
  version: number;
  /** 돈: 입장료로 들어온다. 업그레이드 · 시설 · 꾸미기 · 월급 · 유지비 (빚 가능) */
  coins: number;
  /** 코인: 바닥 동전을 주워 모은다. 뽑기 전용 (0 밑으로 안 내려감) */
  tokens: number;
  /** 지난 뽑기 뒤로 모은 코인 (기계 등급: 많이 모았다 뽑을수록 좋은 기계) */
  charge?: number;
  /** 동물원 이름 (비면 뽑ZOO) · 물어봤는지 */
  zooName?: string; zooNameAsked?: boolean;
  /** 별 3개 특별 확장(24×6)을 했는지 */
  bigLand?: boolean;
  /** 동물원 별 등급 0~5 (올라가기만) · 올해 손님 · 실망 손님 */
  stars?: number; yearStats?: { visitors: number; sad: number };
  /** 올림푸스 신전 (폐원해도 남는다): 신 12 · 영웅 6, 0 없음 · 1 만남 · 2 각성 */
  godDex?: number[]; heroDex?: number[];
  cards: Card[];
  nextUid: number;
  /** 우리마다 배치된 동물 카드 uid (board와 같은 순서) */
  pens: number[][];
  /** 시설 · 소품 (x < 0 이면 보관함) */
  items: { uid: number; type: string; x: number; y: number }[];
  /** 관객 건물(시설) 단계 0~3 */
  facLv: Record<FacilityType, number>;
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
  season: { n: number; start: number; mine: number; rival: number; lost?: boolean;
    /** 라이벌 컨디션 (RIVAL_COND 번호) · 라이벌 소식 배율 누적 · 마지막 소식 · 막판 대목 중인지 · 막판 응원 점수 */
    cond?: number; rmul?: number; rev?: { text: string; mul: number } | null; stand?: boolean; cheer?: number };
  /** 화제의 신입: 희귀 이상을 새로 배치하면 그 영업일(day) 하루 매력 2배 · 손님이 몰린다 */
  hot?: { uid: number; day: number }[];
  /** 평판 하트를 잃었는지: 한 번 지면 최후의 기회, 또 지면 폐원 */
  lastChance?: boolean;
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
    version: SAVE_VERSION, coins: 0, tokens: 0, nextUid: 1, staffSlots: [null],
    // 처음 우리 네 개 (네모 우리: 풀밭 · 물가 · 풀밭 · 사막). uid는 일반 카드와 겹치지 않게 크게
    cards: [{ uid: 900001, kind: 'pen', piece: 'O', grade: 0, habitat: 'grass', opts: [] }, { uid: 900002, kind: 'pen', piece: 'O', grade: 0, habitat: 'water', opts: [] },
      { uid: 900003, kind: 'pen', piece: 'O', grade: 0, habitat: 'grass', opts: [] }, { uid: 900004, kind: 'pen', piece: 'O', grade: 0, habitat: 'sand', opts: [] }],
    board: [{ uid: 900001, x: 0, y: 1, rot: 0 }, { uid: 900002, x: 2, y: 1, rot: 0 }, { uid: 900003, x: 4, y: 1, rot: 0 }, { uid: 900004, x: 6, y: 1, rot: 0 }], pens: [[], [], [], []], items: [], facLv: { snack: 0, restroom: 0, bench: 0, fountain: 0, photo: 0, clinic: 0, souvenir: 0, restaurant: 0, icecream: 0, carousel: 0, tower: 0, lab: 0 },
    upgrades, stage: 1, freeDrawUsed: false, lockedSpecies: [], dex: ANIMALS.map(() => false),
    stats: { draws: 0, fusions: 0, fusionWins: 0, coinsEarned: 0, coinsPicked: 0, vips: 0 }, tutorialDone: false,
    tickets: 0, missions: null, dexClaimed: [], lastSeen: 0, day: 1,
    atNight: false, dayT: 0, season: { n: 1, start: 1, mine: 0, rival: 0, cond: 0, rmul: 1, rev: null, stand: false, cheer: 0 }, records: { bestSeasons: 0, bestDay: 0, closures: 0, bestYears: 0 }, debtDays: 0, strike: false, shinyDex: ANIMALS.map(() => false), synergyFound: [], penTheme: [],
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
  // 시설: 단계 (예전 저장의 시설 물건은 개수만큼 단계로 바꾸고 물건은 지운다)
  const fl = (rr.facLv ?? {}) as Partial<Record<FacilityType, number>>;
  out.facLv = Object.fromEntries(FACILITIES.map((f) => [f.type, Math.max(0, Math.min(FAC_MAX_LV, Math.floor(Number(fl[f.type]) || 0)))])) as Record<FacilityType, number>;
  for (const f of FACILITIES) { const n = out.items.filter((it) => it.type === `fac:${f.type}`).length; if (n) out.facLv[f.type] = Math.min(FAC_MAX_LV, Math.max(out.facLv[f.type], n)); }
  out.items = out.items.filter((it) => !it.type.startsWith('fac:'));
  delete (out.upgrades as Record<string, number>).pens; delete (out.upgrades as Record<string, number>).size;
  out.staffSlots = Array.isArray(out.staffSlots) ? out.staffSlots.map((u) => (u !== null && keep(u) ? u : null)) : d.staffSlots;
  out.dex = ANIMALS.map((_, i) => !!(Array.isArray(r.dex) && r.dex[i]));
  for (const c of out.cards) if (c.kind === 'animal') out.dex[c.animal] = true;
  out.lockedSpecies = Array.isArray(out.lockedSpecies) ? out.lockedSpecies.filter((n) => typeof n === 'number') : [];
  out.tickets = Number.isFinite(out.tickets) ? Math.max(0, Math.floor(out.tickets)) : 0;
  // 코인(뽑기용)이 없던 예전 저장: 10회 뽑기 1번 분량을 선물
  out.zooName = typeof rr.zooName === 'string' ? (rr.zooName as string).slice(0, 8) : '';
  out.zooNameAsked = !!rr.zooNameAsked;
  out.stars = Math.max(0, Math.min(5, Math.floor(Number(rr.stars) || 0)));
  out.yearStats = { visitors: 0, sad: 0, ...((rr.yearStats as object) ?? {}) };
  const dexArr = (v: unknown, n: number) => Array.from({ length: n }, (_, i) => { const x = Array.isArray(v) ? Number(v[i]) : 0; return x >= 2 ? 2 : x >= 1 ? 1 : 0; });
  out.godDex = dexArr(rr.godDex, 12); out.heroDex = dexArr(rr.heroDex, 6);
  // 부지는 규모 단계를 따른다 (부지 넓히기 업그레이드는 규모 확장으로 합쳐졌다)
  out.upgrades.land = Math.max(0, Math.min(out.stage - 1 + ((out.stars ?? 0) >= 3 && (rr.bigLand as boolean) ? 1 : 0), 8));
  out.bigLand = !!rr.bigLand;
  out.charge = Number.isFinite(rr.charge as number) ? Math.max(0, rr.charge as number) : 0;
  out.tokens = Number.isFinite(rr.tokens as number) ? Math.max(0, Math.floor(rr.tokens as number)) : (rr.coins !== undefined ? GACHA.price[Math.min(out.stage, GACHA.price.length) - 1] * 10 : 0);
  out.dexClaimed = Array.isArray(out.dexClaimed) ? out.dexClaimed.filter((x) => typeof x === 'string') : [];
  out.lastSeen = Number.isFinite(out.lastSeen) ? out.lastSeen : 0;
  out.day = Number.isFinite(out.day) && out.day >= 1 ? Math.floor(out.day) : 1;
  const ms = out.missions as MissionState | null;
  out.missions = ms && typeof ms.day === 'number' && Array.isArray(ms.list) && ms.list.every((m) => MISSION_KINDS.includes(m.kind)) ? ms : null;
  out.atNight = !!out.atNight;
  out.dayT = Number.isFinite(out.dayT) ? Math.max(0, out.dayT) : 0;
  const se = (r.season ?? {}) as Partial<SaveData['season']>;
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  out.season = { n: Math.max(1, Math.floor(num(se.n, 1))), start: Math.max(1, Math.floor(num(se.start, out.day))), mine: Math.max(0, num(se.mine, 0)), rival: Math.max(0, num(se.rival, 0)), ...(se.lost ? { lost: true } : {}), cond: Math.max(0, Math.min(2, Math.floor(num(se.cond, 0)))), rmul: num(se.rmul, 1), rev: se.rev ?? null, stand: !!se.stand, cheer: Math.max(0, num(se.cheer, 0)) };
  out.lastChance = !!rr.lastChance;
  out.hot = Array.isArray(rr.hot) ? (rr.hot as { uid: number; day: number }[]).filter((x) => x && typeof x.uid === 'number' && typeof x.day === 'number' && x.day >= out.day) : [];
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
