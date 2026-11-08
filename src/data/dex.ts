// 도감 보상: 조건의 동물을 모두 모으면 받는다. 받으면 코인 + 영구 보너스. 등급·서식지 세트는 상시 동물만, 계절 세트는 그 계절 한정 동물.
import { ANIMALS, HABITAT_NAMES, type AnimalDef, type Habitat } from './animals';
import { GRADES } from './grades';
import { SEASONS } from './seasons';

export interface DexSet { id: string; name: string; test: (a: AnimalDef) => boolean; reward: number; bonus: { habitat?: Habitat; attract?: number; tip?: number }; desc: string }

const HABITATS: Habitat[] = ['grass', 'sand', 'water', 'snow', 'rock', 'cloud'];
export const DEX_SETS: readonly DexSet[] = [
  ...GRADES.map((g) => ({ id: `grade_${g.key}`, name: `${g.name} 동물 전부`, test: (a: AnimalDef) => a.grade === g.id && !a.season,
    reward: [3000, 12000, 50000, 200000, 800000][g.id], bonus: { tip: 0.05 }, desc: '투척액 +5%' })),
  ...HABITATS.map((h) => ({ id: `hab_${h}`, name: `${HABITAT_NAMES[h]} 동물 전부`, test: (a: AnimalDef) => a.habitat === h && !a.season,
    reward: 5000, bonus: { habitat: h, attract: 0.2 }, desc: `${HABITAT_NAMES[h]} 동물 매력도 +20%` })),
  ...SEASONS.map((se) => ({ id: `season_${se.key}`, name: `${se.name} 한정 동물 전부`, test: (a: AnimalDef) => a.season === se.key,
    reward: 30000, bonus: { tip: 0.05 }, desc: '투척액 +5%' })),
];
export const dexSetMembers = (set: DexSet) => ANIMALS.filter(set.test);
