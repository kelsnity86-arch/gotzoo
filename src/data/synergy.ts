// 조합 시너지: 정해진 동물을 같은 우리에 모두 모으면 발동. 우리 안 모든 동물의 매력 +attract (계절이 맞으면 2배).
// tip = 동물원 전체 투척액 +, feedCut = 그 우리 사료비 −. 처음 발동하면 시너지 도감에 열린다.
import { ANIMALS } from './animals';
import type { SeasonKey } from './seasons';

export interface SynergySet { id: string; name: string; members: number[]; attract: number; season?: SeasonKey; tip?: number; feedCut?: number }
const byName = (n: string) => { const a = ANIMALS.find((x) => x.name === n); if (!a) throw new Error(`시너지: 동물 없음 ${n}`); return a.id; };
const set = (id: string, name: string, names: string[], attract: number, extra: Partial<SynergySet> = {}): SynergySet => ({ id, name, members: names.map(byName), attract, ...extra });

export const SYNERGY_SETS: readonly SynergySet[] = [
  set('savanna', '사바나', ['사자', '얼룩말', '기린'], 0.25),
  set('polar', '극지', ['펭귄', '북극곰', '물범'], 0.25, { season: 'winter' }),
  set('bamboo', '대나무 숲', ['판다', '레서판다'], 0.2),
  set('farm', '농장', ['닭', '돼지', '양', '젖소'], 0.15, { feedCut: 0.3 }),
  set('catmouse', '천적 콤비', ['고양이', '생쥐'], 0.15),
  set('caravan', '사막 캐러밴', ['낙타', '사막여우', '미어캣'], 0.25),
  set('jungle', '정글', ['고릴라', '오랑우탄', '큰부리새'], 0.25),
  set('sea', '바다 친구', ['돌고래', '범고래', '바다거북', '문어'], 0.3, { season: 'summer' }),
  set('bigcats', '맹수', ['호랑이', '표범', '치타'], 0.25),
  set('white', '백색 맹수', ['백호', '백사자', '눈표범'], 0.35),
  set('myth', '하늘의 신화', ['유니콘', '페가수스', '그리핀'], 0.4),
  set('east', '동양 신수', ['해태', '구미호', '삼족오'], 0.2, { tip: 0.1 }),
  set('chuseok', '추석', ['달토끼', '황금 추수 황소'], 0.3, { season: 'autumn' }),
  set('santa', '산타 썰매', ['루돌프 순록', '산타 북극곰'], 0.3, { season: 'winter' }),
  set('blossom', '꽃놀이', ['벚꽃사슴', '벚꽃 여우', '꽃토끼'], 0.3, { season: 'spring' }),
  set('fourgods', '사신수', ['청룡', '백호', '주작', '현무'], 0.3, { tip: 0.15 }),
  set('iceage', '빙하기', ['매머드', '검치호랑이', '털코뿔소'], 0.35, { season: 'winter' }),
  set('deepsea', '심해', ['대왕오징어', '귀상어', '문어'], 0.25, { season: 'summer' }),
  set('polarsea', '북극 바다', ['일각고래', '벨루가', '바다코끼리'], 0.3, { season: 'winter' }),
  set('primates', '영장류', ['침팬지', '오랑우탄', '고릴라', '긴팔원숭이'], 0.3),
  set('splash', '여름 물놀이', ['수박 거북', '튜브 오리', '선글라스 물개'], 0.3, { season: 'summer' }),
];

/** 서식지 시너지: 같은 우리 같은 서식지 [마릿수, 보너스] (큰 것부터) */
export const HABITAT_TIERS: readonly [number, number][] = [[10, 0.35], [6, 0.2], [3, 0.1]];
/** 등급 시너지 */
export const GRADE_SYN = { rainbow: 0.3, sameGrade: 0.15, sameCommon: 0.25, sameMin: 3, king: 0.2 } as const;
/** 우리 하나당 시너지 합 최대 */
export const SYNERGY_CAP = 1.5;
/** 반짝이 변종 */
export const SHINY = { chance: 0.01, attractMul: 1.5, scaleMul: 1.5, fusionPerShiny: 0.1 } as const;
