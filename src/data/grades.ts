// 동물 등급 5단계. 기본 매력도와 뽑기 확률(동물 카드 안에서)은 기획서 0.2 그대로.
export type Grade = 0 | 1 | 2 | 3 | 4;
export const GRADE_COUNT = 5;

export interface GradeDef {
  id: Grade;
  key: 'common' | 'uncommon' | 'rare' | 'epic' | 'legend';
  name: string;
  /** 기본 매력도 */
  attract: number;
  /** 동물 카드 안에서 이 등급이 나올 확률 */
  chance: number;
  /** 카드 테두리·캡슐 색 */
  color: string;
}

export const GRADES: readonly GradeDef[] = [
  { id: 0, key: 'common', name: '일반', attract: 20, chance: 0.6, color: '#94b0c2' },
  { id: 1, key: 'uncommon', name: '고급', attract: 32, chance: 0.25, color: '#38a35b' },
  { id: 2, key: 'rare', name: '희귀', attract: 55, chance: 0.1, color: '#41a6f6' },
  { id: 3, key: 'epic', name: '영웅', attract: 90, chance: 0.04, color: '#8e44ad' },
  { id: 4, key: 'legend', name: '전설', attract: 140, chance: 0.01, color: '#f7c948' },
];
