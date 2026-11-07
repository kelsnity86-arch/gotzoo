// 이벤트 손님: 70~110초마다 하나가 20초 동안 일어난다.
export type EventId = 'vip' | 'bus' | 'rain' | 'festival';
export interface EventDef { id: EventId; name: string; desc: string; weight: number; rateMul: number; tipMul: number }
export const EVENTS: readonly EventDef[] = [
  { id: 'vip', name: 'VIP 손님', desc: '황금 손님이 큰 동전을 던져요!', weight: 3, rateMul: 1, tipMul: 1 },
  { id: 'bus', name: '단체 관광버스', desc: '20초 동안 관람객이 3배로 몰려와요', weight: 3, rateMul: 3, tipMul: 1 },
  { id: 'rain', name: '소나기', desc: '관람객은 줄지만 우산을 산 손님이 넉넉히 던져요', weight: 2, rateMul: 0.6, tipMul: 1.8 },
  { id: 'festival', name: '동물원 축제', desc: '20초 동안 투척액 2배!', weight: 2, rateMul: 1.3, tipMul: 2 },
];
export const EVENT_TIMING = { firstAt: 60, gapMin: 70, gapMax: 110, durationSec: 20, vipTipMul: 20 } as const;
export const eventDef = (id: EventId) => EVENTS.find((e) => e.id === id)!;
