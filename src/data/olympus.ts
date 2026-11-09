// 올림푸스 12지신(네임드 동물) · 신화 영웅(네임드 직원)
// 12지의 계절 배치(봄 寅卯辰 · 여름 巳午未 · 가을 申酉戌 · 겨울 亥子丑)대로 계절마다 3신. 그 계절 기계에서만 나온다.
import type { SeasonKey } from './seasons';
import type { StaffKind } from './staff';

export type GodAbility = 'lastStand' | 'penAttract' | 'feverTime' | 'hotCut' | 'gateCap' | 'sadCut' | 'feverCharge' | 'shinyMul' | 'machineLuck' | 'tipMul' | 'buildCut' | 'feed';
export interface GodDef {
  id: number; name: string; title: string; god: string; zodiac: string; season: SeasonKey;
  /** 바탕 종 (서식지 · 임시 그림) */
  base: number;
  ability: GodAbility; value: number;
  /** 능력 설명: v = 수치 (각성이면 ×1.5) */
  desc: (v: number) => string;
  /** 이름표 · 컷인 색 */
  color: string;
}
const pct = (v: number) => `${Math.round(v * 100)}%`;
export const GODS: readonly GodDef[] = [
  { id: 0, name: '아레호', title: '전쟁의 신', god: '아레스', zodiac: '호랑이', season: 'spring', base: 63, ability: 'lastStand', value: 1, desc: (v) => `최후의 기회 막판 대목 강화 · 피버 게이지 +${pct(v)} · 응원 +${pct(v * 0.5)}`, color: '#d83a3a' },
  { id: 1, name: '아프로토', title: '사랑의 신', god: '아프로디테', zodiac: '토끼', season: 'spring', base: 0, ability: 'penAttract', value: 0.25, desc: (v) => `같은 우리 동물 매력 +${pct(v)}`, color: '#f08cbe' },
  { id: 2, name: '제우룡', title: '신들의 왕', god: '제우스', zodiac: '용', season: 'spring', base: 290, ability: 'feverTime', value: 3, desc: (v) => `피버 지속 +${+v.toFixed(1)}초`, color: '#f7c948' },
  { id: 3, name: '아테나가', title: '지혜의 신', god: '아테나', zodiac: '뱀', season: 'summer', base: 163, ability: 'hotCut', value: 0.1, desc: (v) => `라이벌 절호조 확률 −${pct(v)}p`, color: '#2a9d8f' },
  { id: 4, name: '포세이마', title: '바다의 신', god: '포세이돈', zodiac: '말', season: 'summer', base: 172, ability: 'gateCap', value: 0.08, desc: (v) => `손님 정원 +${pct(v)}`, color: '#3b5dc9' },
  { id: 5, name: '아폴양', title: '태양의 신', god: '아폴론', zodiac: '양', season: 'summer', base: 15, ability: 'sadCut', value: 0.3, desc: (v) => `실망 손님 −${pct(v)}`, color: '#e0a526' },
  { id: 6, name: '헤르몽', title: '전령의 신', god: '헤르메스', zodiac: '원숭이', season: 'autumn', base: 39, ability: 'feverCharge', value: 0.2, desc: (v) => `피버 게이지 ${pct(v)} 빨리`, color: '#ef7d32' },
  { id: 7, name: '헤라꼬', title: '신들의 여왕', god: '헤라', zodiac: '닭', season: 'autumn', base: 2, ability: 'shinyMul', value: 1, desc: (v) => `반짝이 확률 ×${+(1 + v).toFixed(2)}`, color: '#8e44ad' },
  { id: 8, name: '아르테멍', title: '사냥의 신', god: '아르테미스', zodiac: '개', season: 'autumn', base: 8, ability: 'machineLuck', value: 0.01, desc: (v) => `특별 기계(은·금·무지개) 확률 +${+(v * 100).toFixed(1)}%p`, color: '#94b0c2' },
  { id: 9, name: '디오꿀', title: '축제의 신', god: '디오니소스', zodiac: '돼지', season: 'winter', base: 14, ability: 'tipMul', value: 0.1, desc: (v) => `손님 씀씀이 +${pct(v)}`, color: '#5d275d' },
  { id: 10, name: '헤파찍', title: '대장장이 신', god: '헤파이스토스', zodiac: '쥐', season: 'winter', base: 6, ability: 'buildCut', value: 0.1, desc: (v) => `건물 · 업그레이드 · 확장 값 −${pct(v)}`, color: '#b8452e' },
  { id: 11, name: '데메음', title: '풍요의 신', god: '데메테르', zodiac: '소', season: 'winter', base: 170, ability: 'feed', value: 0.5, desc: (v) => `먹이 효과 +${pct(v)} · 사료비 −${pct(v / 2)}`, color: '#6b8f2e' },
];

export type HeroAbility = 'guardAll' | 'stage' | 'vetAll' | 'lucky' | 'tipMul' | 'upkeepCut';
export interface HeroDef { id: number; name: string; title: string; staff: StaffKind; ability: HeroAbility; value: number; desc: (v: number) => string; color: string }
export const HEROES: readonly HeroDef[] = [
  { id: 0, name: '헤라클레스', title: '열두 과업의 영웅', staff: 'guard', ability: 'guardAll', value: 0.05, desc: (v) => `소매치기를 모두 막아요 · 시즌 규모 +${pct(v)}`, color: '#c28a5c' },
  { id: 1, name: '오르페우스', title: '전설의 음유시인', staff: 'performer', ability: 'stage', value: 0.25, desc: (v) => `이벤트 간격 −${pct(v)} · 실망 손님 −${pct(v)}`, color: '#38a35b' },
  { id: 2, name: '아스클레피오스', title: '의술의 신', staff: 'vet', ability: 'vetAll', value: 0.1, desc: (v) => `동물 감기를 모두 막아요 · 먹이 효과 +${pct(v)}`, color: '#f4f4f4' },
  { id: 3, name: '이카로스', title: '하늘을 나는 소년', staff: 'collector', ability: 'lucky', value: 0.5, desc: (v) => `행운의 동전 +${pct(v)} · 황금 동전 +${pct(v)}`, color: '#41a6f6' },
  { id: 4, name: '아탈란테', title: '바람의 사냥꾼', staff: 'guide', ability: 'tipMul', value: 0.15, desc: (v) => `손님 씀씀이 +${pct(v)}`, color: '#1f5d3a' },
  { id: 5, name: '다이달로스', title: '위대한 발명가', staff: 'janitor', ability: 'upkeepCut', value: 0.15, desc: (v) => `하루 유지비 −${pct(v)}`, color: '#8a5a3b' },
];

/** 확률: 동물이 나올 때 god, 직원이 나올 때 hero. 금빛 기계 ×2 · 무지개 ×5. 나오면 각성(반짝이) awake 확률. 각성 = 능력 ×awakeMul */
export const NAMED = { god: 0.003, hero: 0.03, machineMul: [1, 1, 2, 5], awake: 0.1, awakeMul: 1.5, attractMul: 1.6, scaleMul: 1.6,
  /** 중복이면 코인 = 뽑기 가격 × dupDraws */
  dupDraws: 15,
  /** 12신을 다 모으면 (올림푸스 완성): 손님 +templeVisitors */
  templeVisitors: 0.05 } as const;
export const godsOfSeason = (season: SeasonKey) => GODS.filter((g) => g.season === season);
