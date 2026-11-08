// 저장 데이터. 저장 시점: 뽑기·합성·배치·업그레이드·승급 직후, 그리고 30초마다(코인).
import { ANIMALS } from '../data/animals';
import { STAFF_PAY, isStaffKind, type StaffKind, type StaffOptId } from '../data/staff';
import type { Grade } from '../data/grades';
import { UPGRADES, type UpgradeId } from '../data/balance';

export type Card =
  | { uid: number; kind: 'animal'; animal: number }
  | StaffCard;
/** 직원 카드: 등급 · 월급(직원 뽑기 가격 대비 하루 비율) · 특수옵션 */
export interface StaffCard { uid: number; kind: 'staff'; staff: StaffKind; grade: Grade; pay: number; opts: { id: StaffOptId; v: number }[] }

export interface SaveData {
  version: number;
  coins: number;
  cards: Card[];
  nextUid: number;
  /** 우리마다 배치된 카드 uid */
  pens: number[][];
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
  records: { bestSeasons: number; bestDay: number; closures: number };
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
    version: SAVE_VERSION, coins: 0, cards: [], nextUid: 1, pens: [[], []], staffSlots: [null],
    upgrades, stage: 1, freeDrawUsed: false, lockedSpecies: [], dex: ANIMALS.map(() => false),
    stats: { draws: 0, fusions: 0, fusionWins: 0, coinsEarned: 0, coinsPicked: 0, vips: 0 }, tutorialDone: false,
    tickets: 0, missions: null, dexClaimed: [], lastSeen: 0, day: 1,
    atNight: false, dayT: 0, season: { n: 1, start: 1, mine: 0, rival: 0 }, records: { bestSeasons: 0, bestDay: 0, closures: 0 }, debtDays: 0, strike: false,
  };
}

/** 불러온 값을 검사하고 빠진 칸을 채운다. 망가진 카드 참조는 지운다 */
export function normalize(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<SaveData>;
  const out: SaveData = { ...d, ...r, upgrades: { ...d.upgrades, ...(r.upgrades ?? {}) }, stats: { ...d.stats, ...(r.stats ?? {}) } };
  out.coins = Number.isFinite(out.coins) ? out.coins : 0; // 빚(마이너스) 허용
  out.cards = Array.isArray(out.cards) ? out.cards.filter((c) => c && typeof c.uid === 'number' && (c.kind === 'animal' ? ANIMALS[c.animal] : c.kind === 'staff' && isStaffKind(c.staff))) : [];
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
  out.records = { bestSeasons: Math.max(0, num(rc.bestSeasons, 0)), bestDay: Math.max(0, num(rc.bestDay, 0)), closures: Math.max(0, num(rc.closures, 0)) };
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
