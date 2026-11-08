// 시설 = 관객존 위 건물 줄에 서는 관객 건물 6종, 1~3단계로 증축 (밤에만 공사). 효과 · 유지비 · 규모는 단계만큼.
// 계절 소품 = 부지 블록 1칸에 놓고 붙어 있는 우리 매력 + (그 계절이면 2배), 울타리·입구 꾸미기 = 업그레이드 4단계.
import type { SeasonKey } from './seasons';

export type FacilityType = 'snack' | 'restroom' | 'bench' | 'fountain' | 'photo' | 'clinic'
  | 'souvenir' | 'restaurant' | 'icecream' | 'carousel' | 'tower' | 'lab';
export interface FacilityDef {
  type: FacilityType; name: string;
  /** 1단계 효과 · 3단계 효과(cap). 단계 효과 = cap × 단계 / 3, 4 · 5단계는 단계마다 cap × 15% 더 */
  value: number; cap: number;
  desc: (v: number) => string;
  /** 짓는 값 = 동물 뽑기 가격 × price × FAC_LV_PRICE[단계], 하루 유지비 = 비용 단위 × upkeep × 단계 */
  price: number; upkeep: number;
}
const pct = (v: number) => `${Math.round(v * 100)}%`;
export const FACILITIES: readonly FacilityDef[] = [
  { type: 'snack', name: '매점', value: 0.13, cap: 0.4, desc: (v) => `관람객이 간식을 사요 · 투척액 +${pct(v)}`, price: 3, upkeep: 0.2 },
  { type: 'restroom', name: '화장실', value: 0.17, cap: 0.5, desc: (v) => `오래 머물러요 · 손님 정원 +${pct(v)}`, price: 3, upkeep: 0.15 },
  { type: 'bench', name: '쉼터', value: 20, cap: 60, desc: (v) => `쉬어 가요 · 바닥 동전 +${v}초`, price: 1, upkeep: 0.05 },
  { type: 'fountain', name: '분수 광장', value: 0.05, cap: 0.15, desc: (v) => `모든 동물 매력 +${pct(v)}`, price: 4, upkeep: 0.15 },
  { type: 'photo', name: '포토존', value: 0.13, cap: 0.4, desc: (v) => `사진 찍으러 와요 · 관람객 +${pct(v)}`, price: 4, upkeep: 0.15 },
  { type: 'clinic', name: '동물병원', value: 0.3, cap: 0.9, desc: (v) => `동물 감기를 ${pct(v)} 확률로 막아요 (수의사와 따로)`, price: 5, upkeep: 0.2 },
  // 새 건물 6종 (업그레이드 효과가 하나씩)
  { type: 'souvenir', name: '기념품점', value: 0.1, cap: 0.3, desc: (v) => `입장료 +${pct(v)}`, price: 4, upkeep: 0.2 },
  { type: 'restaurant', name: '식당', value: 0.1, cap: 0.3, desc: (v) => `손님이 떨어뜨리는 코인 +${pct(v)}`, price: 4, upkeep: 0.2 },
  { type: 'icecream', name: '아이스크림 가게', value: 0.33, cap: 1, desc: (v) => `행운의 동전이 ${pct(v)} 더 자주`, price: 3, upkeep: 0.15 },
  { type: 'carousel', name: '회전목마', value: 0.33, cap: 1, desc: (v) => `VIP 손님이 ${pct(v)} 더 자주`, price: 5, upkeep: 0.25 },
  { type: 'tower', name: '전망대', value: 0.17, cap: 0.5, desc: (v) => `동전 줍는 범위 +${pct(v)}`, price: 4, upkeep: 0.15 },
  { type: 'lab', name: '동물 연구소', value: 0.01, cap: 0.03, desc: (v) => `희귀 이상 동물 확률 +${(v * 100).toFixed(0)}%p`, price: 6, upkeep: 0.25 },
];
export const facilityDef = (t: FacilityType) => FACILITIES.find((f) => f.type === t)!;
/** 시설 최대 단계 · 단계별 증축 값 배율 (0→1, 1→2, 2→3) */
/** 4 · 5단계는 후반용 (그림은 3단계 그림 + 별 표시) */
export const FAC_MAX_LV = 5;
export const FAC_LV_PRICE = [1, 2.5, 5, 15, 40] as const;
/** 단계 효과 (bench는 초, 나머지는 비율) */
export const facLevelValue = (t: FacilityType, lv: number) => { const d = facilityDef(t); const l = Math.max(0, Math.min(FAC_MAX_LV, lv)); const v = l <= 3 ? (d.cap * l) / 3 : d.cap * (1 + 0.15 * (l - 3)); return t === 'bench' ? Math.round(v) : v; };

/** 계절 소품: 계절마다 12종 (그 계절에만 팔고, 산 건 계속 남는다) */
export const DECOR: Record<SeasonKey, string[]> = {
  spring: ['벚꽃나무', '튤립 화단', '꽃 아치', '피크닉 매트', '연', '분홍 등', '화분대', '새집', '물뿌리개', '잉어 깃발', '그네', '나비 덤불'],
  summer: ['파라솔', '미니 수영장', '모래성', '수박 가판', '풍경', '히비스커스', '비치체어', '서핑보드', '스프링클러', '아이스크림 카트', '구명튜브', '야자수'],
  autumn: ['단풍나무', '은행나무', '허수아비', '호박 더미', '건초', '감나무', '수확 바구니', '호박등', '낙엽 더미', '수레', '코스모스', '보름달 등'],
  winter: ['눈사람', '크리스마스 트리', '눈 덮인 소나무', '이글루', '썰매', '얼음 조각', '선물 더미', '지팡이 사탕', '눈덩이', '모닥불', '전구 아치', '코코아 가판'],
};
/** 소품: 붙어 있는 우리 매력 + (그 계절이면 2배), 값 = 뽑기 가격 × */
export const DECOR_FX = { attract: 0.04, price: 1 } as const;
/** 규모 점수 (시설은 단계마다) */
export const ITEM_SCALE = { facility: 15, decor: 5 } as const;
/** 치우면 보관함으로 (팔지 않는다) */

/** 울타리 · 입구 단계 이름 (업그레이드 'deco' 레벨 0~3) */
export const DECO_TIERS = ['나무', '돌', '철', '황금'] as const;
/** 울타리 · 입구 꾸미기: 단계마다 모든 동물 매력 + */
export const DECO_ATTRACT = 0.03;

export type ItemType = `fac:${FacilityType}` | `deco:${SeasonKey}:${number}`;
export function itemName(type: string): string {
  if (type.startsWith('fac:')) return facilityDef(type.slice(4) as FacilityType).name;
  const [, se, n] = type.split(':');
  return DECOR[se as SeasonKey]?.[Number(n) - 1] ?? '소품';
}
export const itemSprite = (type: string) => (type.startsWith('fac:') ? `fac_${type.slice(4)}` : `decor_${type.split(':')[1]}_${type.split(':')[2]}`);
