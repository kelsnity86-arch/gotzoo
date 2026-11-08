// 직원: 직원 뽑기(코인)로만 나온다. 10종 × 등급 5단계(일반~전설), 영웅은 특수옵션 1개 · 전설은 2개.
// 월급은 뽑을 때 등급 범위 안에서 랜덤으로 정해져 카드에 고정된다 (단계별 비용 단위 대비 비율 → 단계가 올라도 의미가 유지).
import type { Grade } from './grades';

export type StaffKind = 'collector' | 'keeper' | 'guide' | 'janitor' | 'ticket' | 'cleaner' | 'guard' | 'vet' | 'promoter' | 'performer';

export interface StaffDef {
  kind: StaffKind; name: string;
  /** 등급별 효과 수치 (일반 → 전설) */
  values: [number, number, number, number, number];
  /** 효과 설명: v = 그 등급의 수치 */
  desc: (v: number) => string;
  body: string; accent: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
export const STAFF: readonly StaffDef[] = [
  { kind: 'collector', name: '수거 직원', values: [1, 1.25, 1.5, 1.8, 2.2], desc: (v) => `바닥 동전을 주우러 다녀요 · 속도 ×${v}`, body: '#ef7d32', accent: '#f6e6c8' },
  { kind: 'keeper', name: '사육사', values: [1, 1.25, 1.5, 1.8, 2.2], desc: (v) => `우리를 돌며 먹이 (매력 +10%) · 속도 ×${v}`, body: '#c28a5c', accent: '#38a35b' },
  { kind: 'guide', name: '안내원', values: [0.08, 0.12, 0.17, 0.23, 0.3], desc: (v) => `투척액 +${pct(v)}`, body: '#8e44ad', accent: '#f7c948' },
  { kind: 'janitor', name: '관리인', values: [20, 30, 45, 60, 90], desc: (v) => `바닥 동전 +${v}초 · 폐장 후 동전 회수`, body: '#566c86', accent: '#c7cfdd' },
  { kind: 'ticket', name: '매표원', values: [0.15, 0.22, 0.3, 0.4, 0.55], desc: (v) => `관람객마다 입장료 (투척액의 ${pct(v)})`, body: '#d83a3a', accent: '#f6e6c8' },
  { kind: 'cleaner', name: '청소부', values: [0.05, 0.09, 0.14, 0.19, 0.25], desc: (v) => `유지비 −${pct(v)}`, body: '#41a6f6', accent: '#f4f4f4' },
  { kind: 'guard', name: '경비원', values: [0.4, 0.55, 0.7, 0.85, 1], desc: (v) => `소매치기를 ${pct(v)} 확률로 막아요`, body: '#29366f', accent: '#f7c948' },
  { kind: 'vet', name: '수의사', values: [0.4, 0.55, 0.7, 0.85, 1], desc: (v) => `동물 감기를 ${pct(v)} 확률로 막아요`, body: '#f4f4f4', accent: '#38a35b' },
  { kind: 'promoter', name: '홍보 담당', values: [0.05, 0.09, 0.14, 0.19, 0.25], desc: (v) => `관람객 +${pct(v)}`, body: '#f7c948', accent: '#d83a3a' },
  { kind: 'performer', name: '공연가', values: [0.1, 0.16, 0.22, 0.28, 0.35], desc: (v) => `이벤트 간격 −${pct(v)}`, body: '#f08cbe', accent: '#73eff7' },
];
export const staffDef = (k: StaffKind) => STAFF.find((s) => s.kind === k)!;
export const isStaffKind = (k: unknown): k is StaffKind => STAFF.some((s) => s.kind === k);

/** 같은 효과가 겹칠 때 최대치 */
export const STAFF_CAP = { guide: 1, ticket: 1.5, cleaner: 0.6, guard: 1, vet: 1, promoter: 0.8, performer: 0.6 } as const;
/** 관리인 폐장 후 회수율 (등급별) */
export const JANITOR_SHARE = [0.4, 0.5, 0.6, 0.75, 0.9];

// ── 특수옵션 ──
export type StaffOptId = 'thrifty' | 'vip' | 'overtime' | 'crowd' | 'tips' | 'saver' | 'party' | 'feeder' | 'loyal' | 'luck';
export interface StaffOptDef { id: StaffOptId; name: string; range: [number, number]; desc: (v: number) => string; legendOnly?: boolean; step?: number }
export const STAFF_OPTS: readonly StaffOptDef[] = [
  { id: 'thrifty', name: '검소함', range: [0.2, 0.4], desc: (v) => `월급 −${pct(v)}` },
  { id: 'vip', name: 'VIP 담당', range: [1.5, 2], desc: (v) => `VIP 손님 ×${v.toFixed(1)}`, step: 0.1 },
  { id: 'overtime', name: '야근', range: [1, 1], desc: () => '폐장 후 바닥 동전 100% 회수' },
  { id: 'crowd', name: '인기인', range: [0.05, 0.15], desc: (v) => `관람객 +${pct(v)}` },
  { id: 'tips', name: '말솜씨', range: [0.05, 0.15], desc: (v) => `투척액 +${pct(v)}` },
  { id: 'saver', name: '살림꾼', range: [0.1, 0.2], desc: (v) => `유지비 −${pct(v)}` },
  { id: 'party', name: '분위기 메이커', range: [5, 10], desc: (v) => `이벤트 +${v}초`, step: 1 },
  { id: 'feeder', name: '먹이 장인', range: [0.5, 0.5], desc: () => '먹이 효과 +50%' },
  { id: 'loyal', name: '충성', range: [1, 1], desc: () => '빚이 있어도 파업하지 않아요' },
  { id: 'luck', name: '행운', range: [0.005, 0.01], desc: (v) => `동물 뽑기 영웅 이상 +${(v * 100).toFixed(1)}%p`, legendOnly: true, step: 0.001 },
];
export const staffOptDef = (id: StaffOptId) => STAFF_OPTS.find((o) => o.id === id)!;
/** 등급별 특수옵션 개수 */
export const STAFF_OPT_COUNT: Record<Grade, number> = { 0: 0, 1: 0, 2: 0, 3: 1, 4: 2 };

// ── 월급 · 뽑기 · 해고 ──
/** 하루 월급 = 단계별 비용 단위 × 3 × 이 비율 (등급별 범위에서 랜덤, balance.ts UPKEEP.unit) */
export const STAFF_PAY: Record<Grade, [number, number]> = { 0: [0.2, 0.32], 1: [0.28, 0.42], 2: [0.38, 0.56], 3: [0.5, 0.75], 4: [0.7, 1.05] };
/** 해고하면 직원 뽑기 1회 가격의 이 비율을 돌려받는다 */
export const STAFF_REFUND: Record<Grade, number> = { 0: 0.1, 1: 0.13, 2: 0.16, 3: 0.2, 4: 0.25 };
/** 직원 뽑기 가격 = 동물 뽑기 가격 × */
export const STAFF_DRAW_MUL = 3;
/** 규모 점수 */
export const STAFF_SCALE = [2, 5, 12, 30, 70];
