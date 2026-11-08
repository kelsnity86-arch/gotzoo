// 오늘 영업 미션: 게임 속 하루(낮)마다 3개, 낮에 한 일만 센다. 하나 = 뽑기권 1장, 셋 다 = 보너스 2장.
// 영업이 끝나면 달성한 미션은 자동으로 받고, 못 한 미션은 사라진다.
import type { MissionKind } from '../game/state';
import { rivalDaily } from './rivals';

const STAGE_VISITORS = [40, 60, 80, 100, 130, 160, 190, 220];
const round = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);
export const MISSION_POOL: readonly { kind: MissionKind; target: (day: number, stage: number, k: number) => number; text: (n: number) => string }[] = [
  { kind: 'visitors', target: (_d, st, k) => round(STAGE_VISITORS[st - 1] * k, 5), text: (n) => `관람객 ${n}명 맞이하기` },
  { kind: 'pickup', target: (_d, st, k) => round(STAGE_VISITORS[st - 1] * 0.6 * k, 5), text: (n) => `바닥 동전 ${n}개 직접 줍기` },
  { kind: 'earn', target: (d, _st, k) => round(rivalDaily(d) * k, 100), text: (n) => `오늘 입장료 ${n.toLocaleString('ko-KR')}돈 벌기` },
  { kind: 'feed', target: (_d, _st, k) => Math.round(4 * k), text: (n) => `먹이 ${n}번 주기` },
];
/** 난이도 계수 (쉬움 · 보통 · 어려움) */
export const MISSION_K = [0.8, 1, 1.25];
export const MISSION_REWARD = 1, MISSION_BONUS = 2;
