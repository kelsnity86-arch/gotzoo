// 우리 조각: 우리 뽑기(코인)로 얻는 테트리스 같은 조각. 부지(블록 격자)에 끼워 넣는다.
// 블록 1칸 = 타일 4×4 (32px). 서식지는 카드에 정해져 나오고, 같은 서식지 동물은 등급별 보너스.
import type { Grade } from './grades';
import type { Habitat } from './animals';

/** 블록 1칸 = 타일 몇 칸 */
export const BLOCK_TILES = 4;
/** 블록 1칸당 수용 마릿수 */
export const CAP_PER_CELL = 1.6;
/** 부지 크기 (부지 넓히기 레벨별, 블록 칸) */
export const BOARD: readonly [number, number][] = [[8, 4], [9, 5], [10, 5], [11, 6], [12, 6], [13, 7], [15, 7], [17, 8], [20, 9]];

/** 안쪽을 둥글게·팔각으로 깎는 모양 (타일 단위) */
export type Carve = 'round' | 'octagon';
export interface PieceDef { id: string; name: string; grade: Grade; cells: [number, number][]; carve?: Carve }

const rect = (w: number, h: number): [number, number][] => { const o: [number, number][] = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o.push([x, y]); return o; };
const P = (id: string, name: string, grade: Grade, rows: string[], carve?: Carve): PieceDef => {
  const cells: [number, number][] = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') cells.push([x, y]); }));
  return { id, name, grade, cells, carve };
};

export const PIECES: readonly PieceDef[] = [
  // 일반: 4칸 (테트로미노)
  P('O', '네모 우리', 0, ['##', '##']),
  P('I', '일자 우리', 0, ['####']),
  P('L', '니은 우리', 0, ['#.', '#.', '##']),
  P('J', '기역 우리', 0, ['.#', '.#', '##']),
  P('T', '티 우리', 0, ['###', '.#.']),
  P('S', '에스 우리', 0, ['.##', '##.']),
  P('Z', '지그재그 우리', 0, ['##.', '.##']),
  // 고급: 5~6칸
  P('R6', '넓은 네모', 1, ['###', '###']),
  P('P5', '피 우리', 1, ['##', '##', '#.']),
  P('U5', '디귿 우리', 1, ['#.#', '###']),
  P('L5', '긴 니은', 1, ['#.', '#.', '#.', '##']),
  P('T5', '큰 티', 1, ['###', '.#.', '.#.']),
  P('X5', '십자 우리', 1, ['.#.', '###', '.#.']),
  // 희귀: 6~9칸 (모양 깎기)
  P('POND', '둥근 연못', 2, ['###', '###', '###'], 'round'),
  P('OCT', '팔각 바위터', 2, ['###', '###', '###'], 'octagon'),
  P('R8', '긴 초원', 2, ['####', '####']),
  P('S6', '굽은 길 우리', 2, ['.###', '###.']),
  P('W6', '계단 우리', 2, ['#..', '##.', '.###']),
  // 영웅: 8~12칸
  P('OVAL', '타원 호수', 3, ['####', '####', '####'], 'round'),
  P('C8', '큰 디귿', 3, ['###', '#..', '###']),
  P('BL', '큰 니은 정원', 3, ['##..', '##..', '####', '####']),
  P('X9', '큰 십자', 3, ['.##.', '####', '####', '.##.'], 'octagon'),
  // 전설: 12칸 이상
  P('STAGE', '원형 무대', 4, ['####', '####', '####', '####'], 'round'),
  P('GARDEN', '팔각 대정원', 4, ['#####', '#####', '#####'], 'octagon'),
  P('PLAZA', '십자 대광장', 4, ['.###.', '#####', '#####', '.###.']),
];
export function pieceDef(id: string): PieceDef {
  const m = /^RECT(\d+)x(\d+)$/.exec(id);
  if (m) return legacyRect(Number(m[1]), Number(m[2]));
  return PIECES.find((p) => p.id === id) ?? PIECES[0];
}
/** 예전 저장의 사각 우리 → 크기가 맞는 사각 조각 (일반, 이름만 '옛 우리') */
export function legacyRect(w: number, h: number): PieceDef { return { id: `RECT${w}x${h}`, name: '옛 우리', grade: 0, cells: rect(w, h) }; }

/** 서식지 보너스 (등급별): 우리 서식지와 같은 동물 매력 + */
export const PEN_THEME_BONUS = [0.1, 0.15, 0.25, 0.3, 0.4];
/** 규모 점수 (등급별) */
export const PEN_SCALE = [2, 5, 12, 28, 60];
/** 우리 뽑기 가격 = 동물 뽑기 × */
export const PEN_DRAW_MUL = 2;

// ── 우리 특수옵션 (영웅 1개 · 전설 2개) ──
export type PenOptId = 'star' | 'feedcut' | 'crowd' | 'landmark' | 'feeder' | 'season';
export interface PenOptDef { id: PenOptId; name: string; range: [number, number]; step?: number; desc: (v: number) => string }
const pct = (v: number) => `${Math.round(v * 100)}%`;
export const PEN_OPTS: readonly PenOptDef[] = [
  { id: 'star', name: '인기 우리', range: [0.15, 0.25], desc: (v) => `이 우리 동물 매력 +${pct(v)}` },
  { id: 'feedcut', name: '알뜰 사료', range: [0.3, 0.3], desc: () => '이 우리 사료비 −30%' },
  { id: 'crowd', name: '포토 스폿', range: [0.05, 0.1], desc: (v) => `관람객 +${pct(v)}` },
  { id: 'landmark', name: '명소', range: [1, 1], desc: () => '이 우리 규모 점수 2배' },
  { id: 'feeder', name: '먹이 정원', range: [1, 1], desc: () => '이 우리 먹이 효과 2배' },
  { id: 'season', name: '사계절 정원', range: [1, 1], desc: () => '이 우리 계절 보너스 2배' },
];
export const penOptDef = (id: PenOptId) => PEN_OPTS.find((o) => o.id === id)!;
export const PEN_OPT_COUNT: Record<Grade, number> = { 0: 0, 1: 0, 2: 0, 3: 1, 4: 2 };

export const HABITATS: readonly Habitat[] = ['grass', 'sand', 'water', 'snow', 'rock', 'cloud'];

/** 조각 칸을 rot번 90° 돌리고 (0,0) 기준으로 맞춘다 */
export function rotateCells(cells: [number, number][], rot: number): [number, number][] {
  let c = cells.map(([x, y]) => [x, y] as [number, number]);
  for (let k = 0; k < ((rot % 4) + 4) % 4; k++) c = c.map(([x, y]) => [-y, x] as [number, number]);
  const mx = Math.min(...c.map((p) => p[0])), my = Math.min(...c.map((p) => p[1]));
  return c.map(([x, y]) => [x - mx, y - my] as [number, number]);
}
