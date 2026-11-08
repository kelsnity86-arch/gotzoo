import { BOARD } from './pieces';
// 경제·확률 수치. 기획서 0.2를 바탕으로 하고, '우리 하나에 여러 마리'와 '많이 넣을수록 확률이 오르는 합성'에 맞춰 늘렸다.
// 숫자는 플레이 테스트(tools/sim)로 다시 맞춘다.

export const GACHA = {
  /** 진행 단계(1~8)별 1장 가격. 5·10회는 장수만큼 (할인 없음) */
  price: [100, 200, 450, 1000, 2200, 5000, 11000, 24000],
} as const;

/** 진행 단계 승급 조건 [전시 마리 수, 총 매력도]. index = 올라갈 단계 - 2 */
export const STAGE_REQ: readonly [number, number][] = [
  [5, 120], [12, 450], [22, 1100], [35, 2000], [50, 4500], [70, 10000], [95, 22000],
];
export const MAX_STAGE = GACHA.price.length;
/** 동물원 규모 이름 (진행 단계) */
export const STAGE_NAMES = ['작은 동물원', '동네 동물원', '시립 동물원', '도시 동물원', '테마 동물원', '국립 동물원', '대륙 동물원', '세계 동물원'] as const;
/** 확장 공사비 (돈): 다음 단계로 · 마지막 = 별 3개 특별 확장 */
export const EXPAND_COST = [300, 1200, 3500, 9000, 22000, 50000, 110000, 240000] as const;
/** 동물원 별 등급: 1년(4시즌)마다 평가 · 점수 기준 (100점 만점) */
export const STAR_NEED = [20, 40, 60, 75, 90] as const;
/** 단계마다 관람객 투척액 배율 (유명세) */
export const STAGE_TIP_MUL = 1.12;

/** 합성: 같은 등급 n장 → 다음 등급 1장 성공 확률. index = 장수 */
export const FUSION_CHANCE = [0, 0, 0.2, 0.33, 0.45, 0.56, 0.66, 0.75, 0.83, 0.9, 1];
export const FUSION_MIN = 2, FUSION_MAX = 10;

/** 업그레이드: 레벨별 값과 다음 레벨 가격. need = 이 레벨을 사려면 필요한 진행 단계 */
export interface UpgradeDef {
  id: UpgradeId; name: string; icon: string;
  /** 업그레이드 탭 묶음 */
  group?: 'zoo' | 'pick' | 'gacha' | 'ops' | 'hidden';
  values: readonly number[]; costs: readonly number[]; need: readonly number[];
  describe: (v: number) => string;
}
export type UpgradeId = 'land' | 'deco' | 'quality' | 'gate' | 'staff' | 'pickup'
  | 'comboTime' | 'comboBonus' | 'feverTime' | 'feverCharge' | 'coinLife'
  | 'machine' | 'shiny' | 'seasonPick' | 'fusion'
  | 'feedCost' | 'feedTime' | 'promo' | 'buildCut';

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'land', name: '부지 넓히기', icon: 'icon_cage', values: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    costs: [300, 900, 2200, 5000, 11000, 25000, 55000, 120000], need: [1, 2, 2, 3, 4, 5, 6, 7], describe: (v) => `부지 ${BOARD[v][0]}×${BOARD[v][1]}칸`, group: 'hidden' },
  { id: 'deco', name: '울타리·입구 꾸미기', icon: 'icon_cage', values: [0, 1, 2, 3],
    costs: [3000, 15000, 70000], need: [2, 4, 6], describe: (v) => `${['나무', '돌', '철', '황금'][v]} 울타리 · 모든 동물 매력 +${v * 3}%`, group: 'zoo' },
  { id: 'quality', name: '관객의 질', icon: 'icon_ticket', values: [1, 1.25, 1.6, 2.1, 2.7, 3.5, 4.5, 6],
    costs: [250, 700, 2000, 5000, 12000, 30000, 75000], need: [1, 2, 3, 4, 5, 6, 7], describe: (v) => `손님 씀씀이 ×${v}`, group: 'zoo' },
  { id: 'gate', name: '입장 게이트', icon: 'icon_visitor', values: [30, 45, 60, 80, 110, 150, 200],
    costs: [800, 2500, 7000, 20000, 55000, 150000], need: [2, 3, 4, 5, 6, 7], describe: (v) => `분당 최대 관람객 ${v}명`, group: 'zoo' },
  { id: 'staff', name: '직원 슬롯', icon: 'icon_badge', values: [1, 2, 3, 4, 5],
    costs: [600, 1800, 6000, 20000], need: [1, 3, 5, 7], describe: (v) => `직원 ${v}명`, group: 'zoo' },
  { id: 'pickup', name: '쓸어 담기', icon: 'icon_magnet', values: [1.5, 3, 4.5, 6.5, 9, 12],
    costs: [400, 900, 2000, 4500, 10000], need: [1, 2, 3, 4, 5], describe: (v) => `끌거나 커서를 대면 줍기 · 범위 ${v}`, group: 'pick' },
  // ── 줍기 · 피버 ──
  { id: 'comboTime', name: '콤보 유지', icon: '', group: 'pick', values: [1.2, 1.4, 1.6, 1.8, 2],
    costs: [1200, 4000, 14000, 45000], need: [2, 3, 5, 6], describe: (v) => `콤보가 ${v}초 안에 이어져요` },
  { id: 'comboBonus', name: '콤보 보너스', icon: '', group: 'pick', values: [0.5, 0.65, 0.8, 1],
    costs: [2500, 12000, 50000], need: [3, 5, 7], describe: (v) => `콤보 끝 보너스 최대 +${Math.round(v * 100)}%` },
  { id: 'feverTime', name: '피버 시간', icon: '', group: 'pick', values: [15, 18, 21, 25],
    costs: [3000, 15000, 60000], need: [3, 5, 7], describe: (v) => `피버 타임 ${v}초` },
  { id: 'feverCharge', name: '피버 충전', icon: '', group: 'pick', values: [1, 1.15, 1.3, 1.5],
    costs: [2000, 10000, 40000], need: [2, 4, 6], describe: (v) => `피버 게이지 ×${v} 빨리` },
  { id: 'coinLife', name: '동전 오래 남기', icon: '', group: 'pick', values: [0, 15, 30, 45, 60],
    costs: [800, 3000, 10000, 35000], need: [1, 3, 4, 6], describe: (v) => `바닥 동전 +${v}초` },
  // ── 뽑기 · 기계 ──
  { id: 'machine', name: '기계 정비', icon: '', group: 'gacha', values: [1, 1.25, 1.5, 2, 2.5],
    costs: [5000, 25000, 100000, 250000], need: [3, 5, 7, 8], describe: (v) => `특별한 기계 확률 ×${v}` },
  { id: 'shiny', name: '반짝이 연구', icon: '', group: 'gacha', values: [0.01, 0.0125, 0.015, 0.0175, 0.02],
    costs: [4000, 15000, 50000, 150000], need: [3, 4, 6, 7], describe: (v) => `반짝이 확률 ${+(v * 100).toFixed(2)}%` },
  { id: 'seasonPick', name: '계절 픽업', icon: '', group: 'gacha', values: [0.2, 0.25, 0.3, 0.35],
    costs: [3000, 12000, 45000], need: [2, 4, 6], describe: (v) => `고급 이상 중 계절 한정 ${Math.round(v * 100)}%` },
  { id: 'fusion', name: '합성 숙련', icon: '', group: 'gacha', values: [0, 0.03, 0.06, 0.1],
    costs: [2500, 12000, 50000], need: [2, 4, 6], describe: (v) => `합성 성공 +${Math.round(v * 100)}%p` },
  // ── 운영 ──
  { id: 'feedCost', name: '사료 공급 계약', icon: '', group: 'ops', values: [0, 0.1, 0.2, 0.3],
    costs: [3000, 15000, 60000], need: [3, 5, 7], describe: (v) => `사료비 −${Math.round(v * 100)}%` },
  { id: 'feedTime', name: '사육사 교육', icon: '', group: 'ops', values: [1, 1.15, 1.3, 1.5],
    costs: [1500, 8000, 35000], need: [2, 4, 6], describe: (v) => `먹이 효과 시간 ×${v}` },
  { id: 'promo', name: '홍보 전단', icon: '', group: 'ops', values: [1, 1.5, 2, 2.5],
    costs: [2000, 10000, 40000], need: [2, 4, 6], describe: (v) => (v > 1 ? `개장 첫 1분 손님 ×${v}` : '개장 첫 1분 손님 그대로') },
  { id: 'buildCut', name: '야간 공사 효율', icon: '', group: 'ops', values: [0, 0.07, 0.14, 0.2],
    costs: [6000, 30000, 120000], need: [3, 5, 7], describe: (v) => `건물 · 업그레이드 값 −${Math.round(v * 100)}%` },
];
export const UPGRADE_GROUPS = [['zoo', '동물원'], ['pick', '줍기 · 피버'], ['gacha', '뽑기'], ['ops', '운영']] as const;
export const upgradeDef = (id: UpgradeId) => UPGRADES.find((u) => u.id === id)!;

/** 관람객 */
export const VISITOR = {
  basePerMin: 3,
  perAttract: 0.2,
  /** 투척액 범위 (관객의 질·단계 배율 전) */
  tipMin: 10, tipMax: 20,
  /** 수거 보너스 = 투척액 × 이 값 */
  pickupBonus: 0.5,
  /** 손님이 바닥에 떨어뜨리는 코인(뽑기용) = 입장료 × 이 값 */
  tokenShare: 0.6,
  /** 행운의 동전 확률 (주우면 뽑기권) */
  luckyChance: 0.025,
  /** 피버 타임: 손으로 동전 need개를 주우면(콤보면 더 빨리) sec초 동안 손님 동전 ×coinMul, 하늘에서 동전 비 (rainEvery초마다) */
  fever: { need: 80, sec: 15, coinMul: 2, rainEvery: 0.4 },
  /** 수요가 게이트 한도를 넘으면 넘친 만큼 투척액이 오른다 (최대 배율) */
  overflowMaxMul: 1.6,
  walkSpeed: 16,
  viewSecMin: 2, viewSecMax: 4,
} as const;

/** 동전: 관람객 발밑(관객존 바닥)에 떨어져 쌓인다. 오래 방치하면(lifeSec) 사라진다. 끝나기 blinkSec 전부터 깜빡인다 */
export const COIN = { lifeSec: 60, blinkSec: 8, mergeDist: 5, popSpeed: 30, gravity: 150 } as const;

/** 같은 우리 안 같은 종 마릿수 → 매력도 보너스 */
export const SAME_SPECIES_BONUS: readonly [number, number][] = [[10, 0.3], [5, 0.2], [3, 0.1]];
/** 우리 안 동물이 모두 같은 서식지면 */
export const SAME_HABITAT_BONUS = 0.1;
/** 먹이: 매력도 +10%, 지속 시간, 손으로 줄 때 우리별 대기 시간 */
export const FEED = { bonus: 0.1, sec: 30, manualCooldown: 20 } as const;

/** 직원 */
export const STAFF_AI = { collectorSpeed: 42, collectorReach: 9, collectorSearch: 140, keeperSpeed: 26, keeperFeedEvery: 6 } as const;

/** 하루: 낮 dayLen초 (마지막 duskLen초는 해 질 녘: 새 관람객 없음), 밤은 시간 제한 없이 '개장하기'를 누르면 아침.
 * nightAvg: 자리 비움 수익 계산용 평균 밤 길이 */
export const DAY = { dayLen: 180, duskLen: 20, nightAvg: 30, janitorShare: 0.5 } as const;

/** 유지비 (매일 영업이 끝날 때). unit = 단계별 비용 단위(코인): 1~2단계는 작게, 뒤로는 수입이 느는 만큼만 (뽑기 가격보다 완만).
 * 우리 하나당 고정비 + 전시 동물 사료비(등급별). 직원 월급도 이 단위 × 3 × 카드의 월급 비율 */
export const UPKEEP = { perCell: 0.045, feed: [0.012, 0.025, 0.05, 0.09, 0.16], unit: [30, 120, 400, 750, 1100, 1500, 2000, 2700] } as const;

/** 동물원 규모 점수: 전시 동물(등급별) + 배치 직원(staff.ts STAFF_SCALE) + 놓은 우리(pieces.ts PEN_SCALE) + 업그레이드 레벨 − 빚 감점 */
export const SCALE = { animal: [1, 3, 8, 20, 50], upgradeLv: 10, debtPerDraw: 5 } as const;

/** 빚: 빚으로 끝난 날이 strikeAfter일 이어지면 다음 날 직원 파업 */
export const DEBT = { strikeAfter: 3 } as const;

/** 사고: 하루에 chance 확률로 낮 at[0]~at[1]초 사이에 한 번. 소매치기 = 오늘 수입의 thiefShare를 잃음, 감기 = 우리 하나 매력 ×sickMul (그날 끝까지) */
export const INCIDENT = { chance: 0.6, at: [30, 140], thiefShare: 0.08, sickMul: 0.6 } as const;
