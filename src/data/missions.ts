// 오늘의 미션: 날짜마다 3개. 하나 = 무료 뽑기권 1장, 셋 다 받으면 보너스 2장.
import type { MissionKind } from '../game/state';
export const MISSION_POOL: readonly { kind: MissionKind; targets: number[]; text: (n: number) => string }[] = [
  { kind: 'draw', targets: [10, 20, 30], text: (n) => `카드 ${n}장 뽑기` },
  { kind: 'fuse', targets: [1, 3, 5], text: (n) => `합성 ${n}번` },
  { kind: 'pickup', targets: [50, 100, 200], text: (n) => `동전 ${n}개 줍기` },
  { kind: 'rare', targets: [1, 2, 3], text: (n) => `희귀 이상 동물 ${n}장 뽑기` },
  { kind: 'feed', targets: [3, 5, 10], text: (n) => `먹이 ${n}번 주기` },
  { kind: 'upgrade', targets: [1, 2, 3], text: (n) => `업그레이드 ${n}번` },
];
export const MISSION_REWARD = 1, MISSION_BONUS = 2;
