// 동물 150종 (상시 100 + 계절 한정 50). 상시 순서는 그림 명령서(animals_01~10.png)의 칸 순서와 같다.
// 등급별: 일반 30 · 고급 26 · 희귀 22 · 영웅 14 · 전설 8.
// shape·body·accent는 그림이 오기 전 코드로 그리는 임시 8×8 도트에 쓴다.
import type { Grade } from './grades';
import type { SeasonKey } from './seasons';

export type Habitat = 'grass' | 'sand' | 'water' | 'snow' | 'rock' | 'cloud';
export type Shape = 'quad' | 'small' | 'bird' | 'fish' | 'reptile' | 'bug' | 'tall' | 'big' | 'myth';

export interface AnimalDef {
  /** 0~99 */
  id: number;
  name: string;
  en: string;
  grade: Grade;
  habitat: Habitat;
  shape: Shape;
  body: string;
  accent: string;
  /** 계절 한정 동물이면 그 계절 (그 계절 뽑기에서만 나온다) */
  season?: SeasonKey;
}

// [이름, 영어, 서식지, 모양, 몸 색, 포인트 색]
type Row = [string, string, Habitat, Shape, string, string];
const C = { ink: '#1a1c2c', navy: '#333c57', gray: '#566c86', lgray: '#94b0c2', white: '#f4f4f4', dbrown: '#2b1d14', brown: '#5d3a24', mbrown: '#8a5a3b', tan: '#c28a5c', beige: '#e8c39e', cream: '#f6e6c8', dred: '#8b1e2d', red: '#d83a3a', orange: '#ef7d32', yellow: '#f7c948', lyellow: '#fff3a3', gold: '#e0a526', dgreen: '#1f5d3a', green: '#38a35b', lime: '#a7d65b', teal: '#2a9d8f', dblue: '#29366f', blue: '#3b5dc9', sky: '#41a6f6', cyan: '#73eff7', dpurple: '#5d275d', purple: '#8e44ad', pink: '#f08cbe', lpink: '#ffc8dd', silver: '#c7cfdd' };

const ROWS: Record<Grade, Row[]> = {
  0: [
    ['토끼', 'rabbit', 'grass', 'small', C.white, C.pink], ['오리', 'duck', 'water', 'bird', C.white, C.orange], ['닭', 'chicken', 'grass', 'bird', C.white, C.red],
    ['병아리', 'baby chick', 'grass', 'bird', C.yellow, C.orange], ['햄스터', 'hamster', 'grass', 'small', C.tan, C.cream], ['다람쥐', 'squirrel', 'grass', 'small', C.mbrown, C.beige],
    ['생쥐', 'mouse', 'grass', 'small', C.lgray, C.pink], ['고양이', 'cat', 'grass', 'quad', C.orange, C.cream], ['강아지', 'puppy', 'grass', 'quad', C.beige, C.mbrown],
    ['비둘기', 'pigeon', 'grass', 'bird', C.lgray, C.teal], ['참새', 'sparrow', 'grass', 'bird', C.mbrown, C.beige], ['개구리', 'frog', 'water', 'reptile', C.green, C.lime],
    ['거북이', 'tortoise', 'grass', 'reptile', C.dgreen, C.tan], ['달팽이', 'snail', 'grass', 'bug', C.tan, C.mbrown], ['돼지', 'pig', 'grass', 'quad', C.lpink, C.pink],
    ['양', 'sheep', 'grass', 'quad', C.white, C.navy], ['염소', 'goat', 'rock', 'quad', C.silver, C.mbrown], ['젖소', 'dairy cow', 'grass', 'quad', C.white, C.ink],
    ['조랑말', 'pony', 'grass', 'quad', C.mbrown, C.dbrown], ['당나귀', 'donkey', 'grass', 'quad', C.gray, C.lgray], ['거위', 'goose', 'water', 'bird', C.white, C.orange],
    ['칠면조', 'turkey', 'grass', 'bird', C.brown, C.red], ['기니피그', 'guinea pig', 'grass', 'small', C.orange, C.white], ['고슴도치', 'hedgehog', 'grass', 'small', C.brown, C.beige],
    ['너구리', 'raccoon', 'grass', 'quad', C.gray, C.ink], ['금붕어', 'goldfish', 'water', 'fish', C.orange, C.yellow], ['잉꼬', 'budgie parakeet', 'grass', 'bird', C.lime, C.sky],
    ['오소리', 'badger', 'grass', 'quad', C.navy, C.white], ['두더지', 'mole', 'sand', 'small', C.dbrown, C.pink], ['꿀벌', 'honeybee', 'grass', 'bug', C.yellow, C.ink],
  ],
  1: [
    ['여우', 'red fox', 'grass', 'quad', C.orange, C.white], ['펭귄', 'penguin', 'snow', 'bird', C.ink, C.white], ['코알라', 'koala', 'grass', 'small', C.lgray, C.white],
    ['꽃사슴', 'spotted deer', 'grass', 'tall', C.tan, C.cream], ['알파카', 'alpaca', 'rock', 'tall', C.cream, C.beige], ['수달', 'river otter', 'water', 'small', C.mbrown, C.beige],
    ['비버', 'beaver', 'water', 'small', C.brown, C.orange], ['미어캣', 'meerkat', 'sand', 'small', C.beige, C.mbrown], ['캥거루', 'kangaroo', 'sand', 'tall', C.tan, C.beige],
    ['원숭이', 'monkey', 'grass', 'small', C.mbrown, C.beige], ['부엉이', 'owl', 'grass', 'bird', C.mbrown, C.yellow], ['마코앵무', 'scarlet macaw', 'grass', 'bird', C.red, C.sky],
    ['물범', 'harbor seal', 'water', 'fish', C.lgray, C.navy], ['오리너구리', 'platypus', 'water', 'small', C.mbrown, C.ink], ['아르마딜로', 'armadillo', 'sand', 'small', C.tan, C.mbrown],
    ['나무늘보', 'sloth', 'grass', 'small', C.beige, C.mbrown], ['스컹크', 'skunk', 'grass', 'small', C.ink, C.white], ['늑대', 'gray wolf', 'snow', 'quad', C.gray, C.silver],
    ['불곰', 'brown bear', 'grass', 'big', C.brown, C.tan], ['얼룩말', 'zebra', 'grass', 'quad', C.white, C.ink], ['낙타', 'camel', 'sand', 'tall', C.tan, C.beige],
    ['타조', 'ostrich', 'sand', 'bird', C.ink, C.pink], ['악어', 'crocodile', 'water', 'reptile', C.dgreen, C.lime], ['하마', 'hippo', 'water', 'big', C.lgray, C.pink],
    ['개미핥기', 'anteater', 'grass', 'quad', C.gray, C.ink], ['큰부리새', 'toucan', 'grass', 'bird', C.ink, C.orange],
  ],
  2: [
    ['카피바라', 'capybara', 'water', 'quad', C.mbrown, C.tan], ['레서판다', 'red panda', 'grass', 'small', C.orange, C.white], ['플라밍고', 'flamingo', 'water', 'bird', C.pink, C.lpink],
    ['판다', 'giant panda', 'grass', 'big', C.white, C.ink], ['기린', 'giraffe', 'sand', 'tall', C.yellow, C.mbrown], ['코끼리', 'elephant', 'sand', 'big', C.lgray, C.gray],
    ['사자', 'lion', 'sand', 'quad', C.gold, C.mbrown], ['호랑이', 'tiger', 'grass', 'quad', C.orange, C.ink], ['표범', 'leopard', 'grass', 'quad', C.yellow, C.dbrown],
    ['치타', 'cheetah', 'sand', 'quad', C.lyellow, C.ink], ['고릴라', 'gorilla', 'grass', 'big', C.navy, C.gray], ['오랑우탄', 'orangutan', 'grass', 'big', C.orange, C.dred],
    ['북극곰', 'polar bear', 'snow', 'big', C.white, C.silver], ['코뿔소', 'rhino', 'sand', 'big', C.gray, C.lgray], ['돌고래', 'dolphin', 'water', 'fish', C.sky, C.white],
    ['범고래', 'orca', 'water', 'fish', C.ink, C.white], ['바다거북', 'sea turtle', 'water', 'reptile', C.teal, C.lime], ['문어', 'octopus', 'water', 'fish', C.red, C.pink],
    ['카멜레온', 'chameleon', 'grass', 'reptile', C.lime, C.purple], ['사막여우', 'fennec fox', 'sand', 'quad', C.beige, C.cream], ['쿼카', 'quokka', 'grass', 'small', C.tan, C.mbrown],
    ['맥', 'tapir', 'grass', 'big', C.ink, C.white],
  ],
  3: [
    ['백호', 'white tiger', 'snow', 'quad', C.white, C.ink], ['눈표범', 'snow leopard', 'snow', 'quad', C.silver, C.navy], ['공작', 'peacock', 'grass', 'bird', C.blue, C.teal],
    ['흑표범', 'black panther', 'rock', 'quad', C.ink, C.yellow], ['흰머리수리', 'bald eagle', 'rock', 'bird', C.brown, C.white], ['오카피', 'okapi', 'grass', 'tall', C.dbrown, C.white],
    ['코모도왕도마뱀', 'komodo dragon', 'sand', 'reptile', C.gray, C.tan], ['백사자', 'white lion', 'sand', 'quad', C.cream, C.beige], ['고래상어', 'whale shark', 'water', 'fish', C.dblue, C.white],
    ['혹등고래', 'humpback whale', 'water', 'fish', C.navy, C.lgray], ['황금원숭이', 'golden snub-nosed monkey', 'rock', 'small', C.gold, C.sky], ['아이아이', 'aye-aye', 'grass', 'small', C.dbrown, C.yellow],
    ['천산갑', 'pangolin', 'sand', 'reptile', C.mbrown, C.tan], ['극락조', 'bird of paradise', 'grass', 'bird', C.orange, C.yellow],
  ],
  4: [
    ['유니콘', 'unicorn', 'cloud', 'myth', C.white, C.pink], ['불사조', 'phoenix', 'cloud', 'myth', C.red, C.yellow], ['황금 용', 'golden dragon', 'cloud', 'myth', C.gold, C.red],
    ['그리핀', 'griffin', 'cloud', 'myth', C.tan, C.white], ['페가수스', 'pegasus', 'cloud', 'myth', C.white, C.sky], ['구미호', 'nine-tailed fox', 'cloud', 'myth', C.white, C.orange],
    ['해태', 'haetae', 'cloud', 'myth', C.sky, C.navy], ['삼족오', 'three-legged sun crow', 'cloud', 'myth', C.ink, C.gold],
  ],
};

export const ANIMALS: readonly AnimalDef[] = (() => {
  const out: AnimalDef[] = [];
  for (const g of [0, 1, 2, 3, 4] as Grade[]) {
    for (const [name, en, habitat, shape, body, accent] of ROWS[g]) out.push({ id: out.length, name, en, grade: g, habitat, shape, body, accent });
  }
  // 계절 한정 50종 (id 100~149): [이름, 영어, 등급, 서식지, 모양, 몸 색, 포인트 색]
  const SEASONAL: Record<SeasonKey, [string, string, Grade, Habitat, Shape, string, string][]> = {
    spring: [
      ['꽃토끼', 'rabbit wearing a flower crown', 1, 'grass', 'small', C.white, C.pink], ['민들레 햄스터', 'dandelion hamster', 1, 'grass', 'small', C.yellow, C.white],
      ['개나리 참새', 'forsythia sparrow', 1, 'grass', 'bird', C.yellow, C.mbrown], ['무지개 송어', 'rainbow trout', 1, 'water', 'fish', C.sky, C.pink],
      ['벚꽃사슴', 'cherry blossom deer', 2, 'grass', 'tall', C.tan, C.lpink], ['꿀벌 여왕', 'queen bee', 2, 'grass', 'bug', C.yellow, C.gold],
      ['새싹 거북', 'sprout turtle', 2, 'grass', 'reptile', C.dgreen, C.lime], ['봄비 개구리', 'rain frog with leaf umbrella', 2, 'water', 'reptile', C.lime, C.teal],
      ['벚꽃 여우', 'cherry blossom fox', 3, 'grass', 'quad', C.lpink, C.white], ['장미 공작', 'rose peacock', 3, 'grass', 'bird', C.red, C.pink],
      ['은방울 학', 'lily crane', 3, 'water', 'bird', C.white, C.lime], ['꽃기린', 'flower qilin', 4, 'cloud', 'myth', C.lpink, C.gold],
      ['봄바람 용', 'spring breeze dragon', 4, 'cloud', 'myth', C.lime, C.pink],
    ],
    summer: [
      ['수박 거북', 'watermelon turtle', 1, 'water', 'reptile', C.green, C.red], ['선글라스 물개', 'seal with sunglasses', 1, 'water', 'fish', C.gray, C.ink],
      ['해바라기 앵무', 'sunflower parrot', 1, 'grass', 'bird', C.yellow, C.mbrown], ['튜브 오리', 'duck in a swim ring', 1, 'water', 'bird', C.white, C.red],
      ['반딧불 여우', 'firefly fox', 2, 'grass', 'quad', C.navy, C.lyellow], ['산호 문어', 'coral octopus', 2, 'water', 'fish', C.pink, C.orange],
      ['서핑 돌고래', 'surfing dolphin', 2, 'water', 'fish', C.sky, C.yellow], ['무지개 해파리', 'rainbow jellyfish', 2, 'water', 'fish', C.cyan, C.pink],
      ['태양 사자', 'sun lion', 3, 'sand', 'big', C.gold, C.orange], ['황금 만타', 'golden manta', 3, 'water', 'fish', C.gold, C.yellow],
      ['해신 고래', 'sea god whale', 4, 'water', 'big', C.blue, C.gold], ['무지개 뱀', 'rainbow serpent', 4, 'cloud', 'myth', C.purple, C.cyan],
    ],
    autumn: [
      ['도토리 다람쥐', 'acorn squirrel', 1, 'grass', 'small', C.mbrown, C.tan], ['단풍 너구리', 'maple raccoon', 1, 'rock', 'quad', C.gray, C.orange],
      ['허수아비 까마귀', 'scarecrow crow', 1, 'grass', 'bird', C.ink, C.yellow], ['버섯 두꺼비', 'mushroom toad', 1, 'rock', 'reptile', C.tan, C.red],
      ['낙엽 고양이', 'leaf pile kitten', 1, 'grass', 'quad', C.orange, C.red],
      ['호박 고슴도치', 'pumpkin hedgehog', 2, 'grass', 'small', C.brown, C.orange], ['은행잎 사슴', 'ginkgo deer', 2, 'rock', 'tall', C.tan, C.yellow],
      ['망토 박쥐', 'caped bat', 2, 'rock', 'bird', C.dpurple, C.red], ['갈대 두루미', 'reed crane', 2, 'water', 'bird', C.white, C.silver],
      ['달토끼', 'moon rabbit', 3, 'cloud', 'small', C.white, C.lyellow], ['유령 고양이', 'ghost cat', 3, 'rock', 'quad', C.silver, C.cyan],
      ['황금 추수 황소', 'golden harvest ox', 4, 'grass', 'big', C.gold, C.yellow], ['호박등 드래곤', 'jack-o-lantern dragon', 4, 'cloud', 'myth', C.orange, C.dpurple],
    ],
    winter: [
      ['털모자 펭귄', 'penguin in a knit hat', 1, 'snow', 'bird', C.ink, C.red], ['눈사람 곰', 'snowman bear cub', 1, 'snow', 'quad', C.white, C.orange],
      ['목도리 수달', 'otter with a scarf', 1, 'water', 'small', C.mbrown, C.red], ['눈꽃 토끼', 'snowflake rabbit', 1, 'snow', 'small', C.white, C.sky],
      ['루돌프 순록', 'red-nosed reindeer', 2, 'snow', 'tall', C.mbrown, C.red], ['얼음 여우', 'ice fox', 2, 'snow', 'quad', C.cyan, C.white],
      ['고드름 고슴도치', 'icicle hedgehog', 2, 'snow', 'small', C.silver, C.cyan], ['산타 북극곰', 'santa polar bear', 2, 'snow', 'big', C.white, C.red],
      ['오로라 고래', 'aurora whale', 3, 'water', 'big', C.dblue, C.lime], ['서리 늑대', 'frost wolf', 3, 'snow', 'quad', C.silver, C.sky],
      ['얼음 용', 'ice dragon', 4, 'snow', 'myth', C.cyan, C.white], ['겨울 정령 사슴', 'winter spirit stag', 4, 'cloud', 'tall', C.white, C.cyan],
    ],
  };
  for (const season of ['spring', 'summer', 'autumn', 'winter'] as SeasonKey[]) {
    for (const [name, en, grade, habitat, shape, body, accent] of SEASONAL[season]) out.push({ id: out.length, name, en, grade, habitat, shape, body, accent, season });
  }
  return out;
})();

/** 상시 동물 (계절 한정 제외) */
export const animalsOfGrade = (g: Grade) => ANIMALS.filter((a) => a.grade === g && !a.season);
/** 이 계절 한정 동물 중 이 등급 */
export const seasonalOfGrade = (g: Grade, season: SeasonKey) => ANIMALS.filter((a) => a.grade === g && a.season === season);
export const isSeasonal = (id: number) => !!ANIMALS[id]?.season;
export const HABITAT_NAMES: Record<Habitat, string> = { grass: '풀밭', sand: '사막', water: '물가', snow: '설원', rock: '바위산', cloud: '구름' };
