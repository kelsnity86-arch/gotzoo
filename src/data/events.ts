// 이벤트 손님: 70~110초마다 하나가 20초 동안 일어난다. season이 있으면 그 계절에만 나온다.
import type { Habitat } from './animals';
import type { SeasonKey } from './seasons';

export type EventId = 'vip' | 'bus' | 'rain' | 'festival'
  | 'blossom' | 'kids' | 'pollen' | 'splash' | 'monsoon' | 'heat' | 'maple' | 'chuseok' | 'halloween' | 'xmas' | 'firstsnow' | 'coldwave';
export interface EventDef {
  id: EventId; name: string; desc: string; weight: number; rateMul: number; tipMul: number;
  season?: SeasonKey;
  /** 동물 매력 배율 (전체 · 서식지) */
  allMul?: number; habitat?: Habitat; habitatMul?: number;
  /** 시작할 때 VIP 손님 수 · 비 오는 연출 · 눈 오는 연출 */
  vips?: number; rain?: boolean; snow?: boolean;
}
export const EVENTS: readonly EventDef[] = [
  { id: 'vip', name: 'VIP 손님', desc: '황금 손님이 큰 동전을 던져요!', weight: 3, rateMul: 1, tipMul: 1, vips: 1 },
  { id: 'bus', name: '단체 관광버스', desc: '20초 동안 관람객이 3배로 몰려와요', weight: 3, rateMul: 3, tipMul: 1 },
  { id: 'rain', name: '소나기', desc: '관람객은 줄지만 우산을 산 손님이 넉넉히 던져요', weight: 2, rateMul: 0.6, tipMul: 1.8, rain: true },
  { id: 'festival', name: '동물원 축제', desc: '20초 동안 투척액 2배!', weight: 2, rateMul: 1.3, tipMul: 2 },
  // 봄
  { id: 'blossom', name: '벚꽃 축제', desc: '꽃구경 손님이 넉넉히 던져요 (투척액 1.7배)', weight: 3, rateMul: 1.2, tipMul: 1.7, season: 'spring' },
  { id: 'kids', name: '어린이날', desc: '가족 손님이 2.5배로 몰려와요', weight: 2, rateMul: 2.5, tipMul: 1, season: 'spring' },
  { id: 'pollen', name: '꽃가루', desc: '재채기에 관람객이 줄어요', weight: 1, rateMul: 0.6, tipMul: 1, season: 'spring' },
  // 여름
  { id: 'splash', name: '물놀이 데이', desc: '물가 동물 매력 2배!', weight: 3, rateMul: 1.2, tipMul: 1, season: 'summer', habitat: 'water', habitatMul: 2 },
  { id: 'monsoon', name: '장마', desc: '관람객이 크게 줄지만 던지는 돈은 2배', weight: 2, rateMul: 0.45, tipMul: 2, season: 'summer', rain: true },
  { id: 'heat', name: '폭염', desc: '관람객이 줄고 지친 동물들 매력 −20%', weight: 1, rateMul: 0.7, tipMul: 1.3, season: 'summer', allMul: 0.8 },
  // 가을
  { id: 'maple', name: '단풍 축제', desc: '단풍 구경 손님 투척액 1.7배', weight: 3, rateMul: 1.2, tipMul: 1.7, season: 'autumn' },
  { id: 'chuseok', name: '추석 연휴', desc: '관람객이 3배로 몰려와요', weight: 2, rateMul: 3, tipMul: 1.1, season: 'autumn' },
  { id: 'halloween', name: '핼러윈', desc: '분장한 VIP 손님 셋이 찾아와요', weight: 2, rateMul: 1.3, tipMul: 1, season: 'autumn', vips: 3 },
  // 겨울
  { id: 'xmas', name: '크리스마스', desc: '선물 동전! 투척액 2배', weight: 3, rateMul: 1.3, tipMul: 2, season: 'winter', snow: true },
  { id: 'firstsnow', name: '첫눈', desc: '눈 구경에 모든 동물 매력 +30%', weight: 2, rateMul: 1.2, tipMul: 1, season: 'winter', allMul: 1.3, snow: true },
  { id: 'coldwave', name: '한파', desc: '추워서 관람객이 절반으로', weight: 1, rateMul: 0.5, tipMul: 1.2, season: 'winter', snow: true },
];
export const EVENT_TIMING = { firstAt: 60, gapMin: 70, gapMax: 110, durationSec: 20, vipTipMul: 20 } as const;
export const eventDef = (id: EventId) => EVENTS.find((e) => e.id === id)!;
