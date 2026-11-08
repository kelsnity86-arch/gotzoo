// 라이벌 동물원: 시즌(7일)마다 하나. 시즌 마지막 날 동물원 규모가 라이벌보다 작으면 폐원.
/** winDays: 이기면 마지막 날 수입 × winDays 만큼 코인 */
export const SEASON = { days: 7, winTickets: 3, winDays: 1.5 } as const;

export const RIVALS: readonly { name: string; owner: string }[] = [
  { name: '냥냥랜드', owner: '고양이 원장' },
  { name: '판다파크', owner: '판다 사장' },
  { name: '펭귄월드', owner: '펭귄 관장' },
  { name: '사자왕국', owner: '사자 대표' },
  { name: '용용동산', owner: '드래곤 회장' },
  { name: '별빛사파리', owner: '부엉이 이사' },
];

// 하루 수입 기준값 (영업 미션 '오늘 N코인 벌기' 목표에 쓴다): 앞 2주는 표(시뮬레이션 봇 하루 수입의 ~75%), 그 뒤로 하루 3%씩 늘어난다
const EARLY = [1000, 2700, 4400, 6100, 7600, 9000, 10700, 18500, 23000, 26500, 28500, 30500, 32000, 33500];
export function rivalDaily(day: number): number {
  const d = Math.max(1, Math.floor(day));
  if (d <= EARLY.length) return EARLY[d - 1];
  return Math.round(EARLY[EARLY.length - 1] * Math.pow(1.03, d - EARLY.length));
}
export const rivalOf = (season: number) => RIVALS[(season - 1) % RIVALS.length];

/** 라이벌 규모: 시즌 n의 k일째 (1~7). 시즌 안에서는 목표의 80% → 100%로 커지고, 목표는 시즌마다 커진다.
 * 목표 = 시뮬레이션 봇의 그 시즌 마지막 날 규모를 기준으로 맞춘 표, 표 뒤로는 시즌마다 ×SCALE_GROWTH */
export const SCALE_TARGET = [350, 830, 1290, 1810, 2470, 3130];
const SCALE_GROWTH = 1.23;
export function rivalScaleTarget(n: number): number {
  if (n <= SCALE_TARGET.length) return SCALE_TARGET[n - 1];
  return Math.round(SCALE_TARGET[SCALE_TARGET.length - 1] * Math.pow(SCALE_GROWTH, n - SCALE_TARGET.length));
}
export function rivalScale(k: number, n: number): number {
  const day = Math.max(1, Math.min(SEASON.days, k));
  return Math.round(rivalScaleTarget(n) * (0.8 + 0.2 * (day - 1) / (SEASON.days - 1)));
}

/** 라이벌 컨디션: 시즌마다 무작위. 운이 좋으면(부진) 쉽고, 나쁘면(절호조) 어렵다. 1시즌은 항상 부진 (처음 배우는 시즌) */
export const RIVAL_COND = [
  { key: 'slump', name: '부진', icon: '😴', mul: 0.78, chance: 0.3 },
  { key: 'normal', name: '보통', icon: '🙂', mul: 1, chance: 0.45 },
  { key: 'hot', name: '절호조', icon: '🔥', mul: 1.2, chance: 0.25 },
] as const;
/** 라이벌 소식: 시즌 2일째부터 아침마다 chance 확률로 하나 (라이벌 규모에 곱한다, 시즌 끝까지 남는다) */
export const RIVAL_EVENT_CHANCE = 0.55;
export const RIVAL_EVENTS: readonly { text: string; mul: number }[] = [
  { text: '새 동물이 들어왔대요!', mul: 1.08 },
  { text: '대형 광고를 냈어요', mul: 1.06 },
  { text: '인기 공연을 열었어요', mul: 1.05 },
  { text: '공사로 일부 휴관 중', mul: 0.95 },
  { text: '동물들이 감기에 걸렸대요', mul: 0.94 },
  { text: '나쁜 소문이 돌아요', mul: 0.95 },
];
/** 최후의 기회 마지막 날 지고 있으면 막판 대목: 피버 게이지 ×feverCharge, 동전 비 ×rain, 손으로 주운 동전마다 응원 점수 (라이벌 목표 × cheerPerCoin, 최대 목표 × cheerMax) */
export const LAST_STAND = { feverCharge: 2, rain: 2, cheerPerCoin: 0.0001, cheerMax: 0.3 } as const;
