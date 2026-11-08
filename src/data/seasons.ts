// 계절: 라이벌 시즌 1개(7일) = 계절 1개. 봄 → 여름 → 가을 → 겨울, 4시즌 = 1년.
import type { Habitat } from './animals';

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
export interface SeasonDef {
  key: SeasonKey; name: string; icon: string;
  /** 제철 서식지 (+strong) · 약한 서식지 (weak) */
  strong: Habitat; weak: Habitat | null;
  /** 냉난방비가 드는 서식지 */
  climate: Habitat | null; climateName: string;
  /** 필드 덧칠 색 · 날리는 입자 색 */
  tint: string; particle: string[];
}
export const SEASONS: readonly SeasonDef[] = [
  { key: 'spring', name: '봄', icon: '🌸', strong: 'grass', weak: null, climate: null, climateName: '', tint: 'rgba(255,183,208,0.05)', particle: ['#ffb7d0', '#ffc8dd', '#f4f4f4'] },
  { key: 'summer', name: '여름', icon: '☀', strong: 'water', weak: 'snow', climate: 'snow', climateName: '냉방비', tint: 'rgba(255,243,163,0.03)', particle: [] },
  { key: 'autumn', name: '가을', icon: '🍁', strong: 'rock', weak: null, climate: null, climateName: '', tint: 'rgba(217,130,43,0.08)', particle: ['#d9822b', '#b8452e', '#f7c948'] },
  { key: 'winter', name: '겨울', icon: '❄', strong: 'snow', weak: 'sand', climate: 'sand', climateName: '난방비', tint: 'rgba(233,243,255,0.12)', particle: ['#f4f4f4', '#e9f3ff'] },
];
/** 시즌 n(1부터)의 계절 · 몇 년째 */
export const seasonOf = (n: number) => SEASONS[(n - 1) % 4];
export const yearOf = (n: number) => Math.floor((n - 1) / 4) + 1;
export const seasonByKey = (k: SeasonKey) => SEASONS.find((s) => s.key === k)!;

export const SEASON_FX = {
  /** 제철 서식지 · 약한 서식지 매력 보정 */
  strong: 0.2, weak: -0.15,
  /** 그 계절 한정 종이 있는 등급을 뽑으면 이 확률로 계절 한정 풀에서 */
  limitedShare: 0.2,
  /** 계절 한정 동물: 자기 계절에 매력 +100%, 같은 우리 동물 +10% */
  limitedSelf: 1, limitedAura: 0.1,
  /** 냉난방비: 해당 서식지 동물 한 마리당 하루 (비용 단위 배수) */
  climatePerAnimal: 0.04,
  /** 1주년 (겨울 시즌 승리): 마지막 날 수입 × yearDays 코인 + 뽑기권 */
  yearDays: 3, yearTickets: 5,
} as const;
