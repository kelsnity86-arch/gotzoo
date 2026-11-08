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
export const SCALE_TARGET = [220, 570, 940, 1360, 1770, 2210];
const SCALE_GROWTH = 1.17;
export function rivalScaleTarget(n: number): number {
  if (n <= SCALE_TARGET.length) return SCALE_TARGET[n - 1];
  return Math.round(SCALE_TARGET[SCALE_TARGET.length - 1] * Math.pow(SCALE_GROWTH, n - SCALE_TARGET.length));
}
export function rivalScale(k: number, n: number): number {
  const day = Math.max(1, Math.min(SEASON.days, k));
  return Math.round(rivalScaleTarget(n) * (0.8 + 0.2 * (day - 1) / (SEASON.days - 1)));
}
