// 직원(특수) 카드. 뽑기에서 8% 확률로 나온다. 1단계는 수거 직원과 사육사.
export type StaffKind = 'collector' | 'keeper';

export interface StaffDef { kind: StaffKind; name: string; desc: string; body: string; accent: string }

export const STAFF: readonly StaffDef[] = [
  { kind: 'collector', name: '수거 직원', desc: '관객존을 돌아다니며 바닥 동전을 주워요 (수거 보너스 지급)', body: '#ef7d32', accent: '#f6e6c8' },
  { kind: 'keeper', name: '사육사', desc: '우리를 돌며 먹이를 줘요. 먹은 동물은 잠시 매력도 +10%', body: '#c28a5c', accent: '#38a35b' },
];
export const staffDef = (k: StaffKind) => STAFF.find((s) => s.kind === k)!;
