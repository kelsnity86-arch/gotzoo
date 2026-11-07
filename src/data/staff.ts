// 직원(특수) 카드. 뽑기에서 8% 확률로 나온다: 수거 직원 · 사육사 · 안내원 · 관리인.
export type StaffKind = 'collector' | 'keeper' | 'guide' | 'janitor';

export interface StaffDef { kind: StaffKind; name: string; desc: string; body: string; accent: string }

export const STAFF: readonly StaffDef[] = [
  { kind: 'collector', name: '수거 직원', desc: '관객존을 돌아다니며 바닥 동전을 주워요 (수거 보너스 지급)', body: '#ef7d32', accent: '#f6e6c8' },
  { kind: 'keeper', name: '사육사', desc: '우리를 돌며 먹이를 줘요. 먹은 동물은 잠시 매력도 +10%', body: '#c28a5c', accent: '#38a35b' },
  { kind: 'guide', name: '안내원', desc: '관람객을 안내해요. 한 명당 투척액 +12%', body: '#8e44ad', accent: '#f7c948' },
  { kind: 'janitor', name: '관리인', desc: '길을 정리해요. 바닥 동전이 한 명당 30초 더 남아 있어요', body: '#566c86', accent: '#c7cfdd' },
];
/** 직원 효과 수치 */
export const STAFF_FX = { guideTip: 0.12, janitorLife: 30 } as const;
export const staffDef = (k: StaffKind) => STAFF.find((s) => s.kind === k)!;
