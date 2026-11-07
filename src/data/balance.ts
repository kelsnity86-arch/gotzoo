// 경제·확률 수치. 기획서 0.2를 바탕으로 하고, '우리 하나에 여러 마리'와 '많이 넣을수록 확률이 오르는 합성'에 맞춰 늘렸다.
// 숫자는 플레이 테스트(tools/sim)로 다시 맞춘다.

export const GACHA = {
  /** 뽑기에서 직원 카드가 나올 확률 (나머지는 동물) */
  staffChance: 0.08,
  /** 진행 단계(1~8)별 1장 가격. 5·10회는 장수만큼 (할인 없음) */
  price: [100, 160, 260, 420, 680, 1100, 1800, 2900],
} as const;

/** 진행 단계 승급 조건 [전시 마리 수, 총 매력도]. index = 올라갈 단계 - 2 */
export const STAGE_REQ: readonly [number, number][] = [
  [5, 120], [12, 400], [25, 1200], [45, 3000], [70, 7000], [100, 15000], [150, 30000],
];
export const MAX_STAGE = GACHA.price.length;
/** 단계마다 관람객 투척액 배율 (유명세) */
export const STAGE_TIP_MUL = 1.2;

/** 합성: 같은 등급 n장 → 다음 등급 1장 성공 확률. index = 장수 */
export const FUSION_CHANCE = [0, 0, 0.2, 0.33, 0.45, 0.56, 0.66, 0.75, 0.83, 0.9, 1];
export const FUSION_MIN = 2, FUSION_MAX = 10;

/** 업그레이드: 레벨별 값과 다음 레벨 가격. need = 이 레벨을 사려면 필요한 진행 단계 */
export interface UpgradeDef {
  id: UpgradeId; name: string; icon: string;
  values: readonly number[]; costs: readonly number[]; need: readonly number[];
  describe: (v: number) => string;
}
export type UpgradeId = 'pens' | 'size' | 'quality' | 'gate' | 'staff' | 'pickup';

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'pens', name: '우리 늘리기', icon: 'icon_cage', values: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    costs: [300, 800, 1800, 4000, 9000, 20000, 45000, 100000], need: [1, 2, 2, 3, 4, 5, 6, 7], describe: (v) => `우리 ${v}개` },
  { id: 'size', name: '우리 넓히기', icon: 'icon_cage', values: [4, 6, 8, 10, 12, 15, 18, 22, 26, 30],
    costs: [250, 600, 1400, 3000, 6500, 14000, 30000, 65000, 140000], need: [1, 2, 2, 3, 4, 5, 6, 7, 8], describe: (v) => `우리마다 ${v}마리` },
  { id: 'quality', name: '관객의 질', icon: 'icon_ticket', values: [1, 1.25, 1.6, 2.1, 2.7, 3.5, 4.5, 6],
    costs: [250, 700, 2000, 5000, 12000, 30000, 75000], need: [1, 2, 3, 4, 5, 6, 7], describe: (v) => `투척액 ×${v}` },
  { id: 'gate', name: '입장 게이트', icon: 'icon_visitor', values: [30, 45, 60, 80, 110, 150, 200],
    costs: [800, 2500, 7000, 20000, 55000, 150000], need: [2, 3, 4, 5, 6, 7], describe: (v) => `분당 최대 관람객 ${v}명` },
  { id: 'staff', name: '직원 슬롯', icon: 'icon_badge', values: [1, 2, 3, 4, 5],
    costs: [600, 1800, 6000, 20000], need: [1, 3, 5, 7], describe: (v) => `직원 ${v}명` },
  { id: 'pickup', name: '수거 범위', icon: 'icon_magnet', values: [7, 9, 11, 14, 17, 21],
    costs: [400, 900, 2000, 4500, 10000], need: [1, 2, 3, 4, 5], describe: (v) => `손으로 줍는 범위 ${v}` },
];
export const upgradeDef = (id: UpgradeId) => UPGRADES.find((u) => u.id === id)!;

/** 관람객 */
export const VISITOR = {
  basePerMin: 3,
  perAttract: 0.2,
  /** 투척액 범위 (관객의 질·단계 배율 전) */
  tipMin: 10, tipMax: 20,
  /** 수거 보너스 = 투척액 × 이 값 */
  pickupBonus: 0.5,
  /** 수요가 게이트 한도를 넘으면 넘친 만큼 투척액이 오른다 (최대 배율) */
  overflowMaxMul: 3,
  walkSpeed: 16,
  viewSecMin: 2, viewSecMax: 4,
} as const;

export const COIN = { lifeSec: 20, mergeDist: 5 } as const;

/** 같은 우리 안 같은 종 마릿수 → 매력도 보너스 */
export const SAME_SPECIES_BONUS: readonly [number, number][] = [[10, 0.3], [5, 0.2], [3, 0.1]];
/** 우리 안 동물이 모두 같은 서식지면 */
export const SAME_HABITAT_BONUS = 0.1;
/** 먹이: 매력도 +10%, 지속 시간, 손으로 줄 때 우리별 대기 시간 */
export const FEED = { bonus: 0.1, sec: 30, manualCooldown: 20 } as const;

/** 직원 */
export const STAFF_AI = { collectorSpeed: 34, collectorReach: 6, collectorSearch: 140, keeperSpeed: 26, keeperFeedEvery: 6 } as const;
