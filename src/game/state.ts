// 저장 데이터. 저장 시점: 뽑기·합성·배치·업그레이드·승급 직후, 그리고 30초마다(코인).
import { ANIMALS } from '../data/animals';
import type { StaffKind } from '../data/staff';
import { UPGRADES, type UpgradeId } from '../data/balance';

export type Card =
  | { uid: number; kind: 'animal'; animal: number }
  | { uid: number; kind: 'staff'; staff: StaffKind };

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
  stats: { draws: number; fusions: number; fusionWins: number; coinsEarned: number; coinsPicked: number };
  tutorialDone: boolean;
}

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'bbopzoo.save';

export function defaultSave(): SaveData {
  const upgrades = Object.fromEntries(UPGRADES.map((u) => [u.id, 0])) as Record<UpgradeId, number>;
  return {
    version: SAVE_VERSION, coins: 0, cards: [], nextUid: 1, pens: [[], []], staffSlots: [null],
    upgrades, stage: 1, freeDrawUsed: false, lockedSpecies: [], dex: ANIMALS.map(() => false),
    stats: { draws: 0, fusions: 0, fusionWins: 0, coinsEarned: 0, coinsPicked: 0 }, tutorialDone: false,
  };
}

/** 불러온 값을 검사하고 빠진 칸을 채운다. 망가진 카드 참조는 지운다 */
export function normalize(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<SaveData>;
  const out: SaveData = { ...d, ...r, upgrades: { ...d.upgrades, ...(r.upgrades ?? {}) }, stats: { ...d.stats, ...(r.stats ?? {}) } };
  out.coins = Number.isFinite(out.coins) ? Math.max(0, out.coins) : 0;
  out.cards = Array.isArray(out.cards) ? out.cards.filter((c) => c && typeof c.uid === 'number' && (c.kind === 'animal' ? ANIMALS[c.animal] : c.kind === 'staff')) : [];
  const uids = new Set(out.cards.map((c) => c.uid));
  out.nextUid = Math.max(out.nextUid || 1, ...out.cards.map((c) => c.uid + 1), 1);
  const seen = new Set<number>();
  const keep = (u: unknown) => typeof u === 'number' && uids.has(u) && !seen.has(u) && (seen.add(u), true);
  out.pens = Array.isArray(out.pens) ? out.pens.map((p) => (Array.isArray(p) ? p.filter(keep) : [])) : d.pens;
  out.staffSlots = Array.isArray(out.staffSlots) ? out.staffSlots.map((u) => (u !== null && keep(u) ? u : null)) : d.staffSlots;
  out.dex = ANIMALS.map((_, i) => !!(Array.isArray(r.dex) && r.dex[i]));
  for (const c of out.cards) if (c.kind === 'animal') out.dex[c.animal] = true;
  out.lockedSpecies = Array.isArray(out.lockedSpecies) ? out.lockedSpecies.filter((n) => typeof n === 'number') : [];
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
