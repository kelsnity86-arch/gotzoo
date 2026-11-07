// 라이벌 동물원: 시즌(7일)마다 하나. 시즌 누적 수입이 라이벌보다 적으면 폐원.
export const SEASON = { days: 7, winTickets: 3, winCoinShare: 0.15 } as const;

export const RIVALS: readonly { name: string; owner: string }[] = [
  { name: '냥냥랜드', owner: '고양이 원장' },
  { name: '판다파크', owner: '판다 사장' },
  { name: '펭귄월드', owner: '펭귄 관장' },
  { name: '사자왕국', owner: '사자 대표' },
  { name: '용용동산', owner: '드래곤 회장' },
  { name: '별빛사파리', owner: '부엉이 이사' },
];

// 라이벌 하루 수입: 앞 2주는 표(시뮬레이션 봇 하루 수입의 ~75%), 그 뒤로 하루 3%씩 늘어난다
const EARLY = [1000, 2700, 4400, 6100, 7600, 9000, 10700, 18500, 23000, 26500, 28500, 30500, 32000, 33500];
export function rivalDaily(day: number): number {
  const d = Math.max(1, Math.floor(day));
  if (d <= EARLY.length) return EARLY[d - 1];
  return Math.round(EARLY[EARLY.length - 1] * Math.pow(1.03, d - EARLY.length));
}
export const rivalOf = (season: number) => RIVALS[(season - 1) % RIVALS.length];
