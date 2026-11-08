// 우리 모양: 우리 칸(타일 격자) 안에서 어느 칸을 쓰는지(마스크)를 만든다. 테두리 칸은 울타리, 안쪽 칸은 바닥.
// 서식지 테마마다 모양이 정해져 있고, 테마와 같은 서식지 동물은 매력 +THEME_BONUS.
import type { Habitat } from './animals';

export type PenShape = 'rect' | 'L' | 'Lflip' | 'octagon' | 'round' | 'strip' | 'plus';
export const SHAPE_OF: Record<Habitat, PenShape> = { grass: 'L', sand: 'strip', water: 'round', snow: 'Lflip', rock: 'octagon', cloud: 'plus' };
export const SHAPE_NAME: Record<PenShape, string> = { rect: '사각형', L: 'ㄱ자 초원', Lflip: '빙하 계단', octagon: '팔각 바위', round: '둥근 연못', strip: '긴 사막 띠', plus: '십자 구름 정원' };
export const THEME_BONUS = 0.15;

/** cols × rows 격자의 마스크 [y][x] (true = 우리 칸). 너무 작거나 모양이 깨지면 사각형 */
export function penMask(shape: PenShape, cols: number, rows: number): boolean[][] {
  const full = () => Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));
  if (shape === 'rect' || cols < 6 || rows < 5) return full();
  const m = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => inside(shape, x, y, cols, rows)));
  // 바닥(테두리 아닌 칸)이 너무 적으면 사각형으로
  let floor = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (m[y][x] && !isEdge(m, x, y)) floor++;
  return floor >= 6 ? m : full();
}

function inside(shape: PenShape, x: number, y: number, cols: number, rows: number): boolean {
  const cx = x + 0.5 - cols / 2, cy = y + 0.5 - rows / 2;
  switch (shape) {
    case 'L': { const cw = Math.floor(cols * 0.38), ch = Math.floor(rows * 0.42); return !(x >= cols - cw && y < ch); }
    case 'Lflip': { const cw = Math.floor(cols * 0.34), ch = Math.floor(rows * 0.4); return !(x < cw && y >= rows - ch); }
    case 'octagon': { const k = Math.max(2, Math.floor(Math.min(cols, rows) / 3)); const xx = Math.min(x, cols - 1 - x), yy = Math.min(y, rows - 1 - y); return xx + yy >= k - 1; }
    case 'round': return (cx / (cols / 2)) ** 2 + (cy / (rows / 2)) ** 2 <= 1.08;
    case 'strip': { const band = Math.max(5, Math.ceil(rows * 0.72)), y0 = Math.floor((rows - band) / 2); if (y < y0 || y >= y0 + band) return false; const xx = Math.min(x, cols - 1 - x), yy = Math.min(y - y0, y0 + band - 1 - y); return xx + yy >= 1; }
    case 'plus': { const bw = Math.max(4, Math.ceil(cols * 0.5)), bh = Math.max(4, Math.ceil(rows * 0.5)); return Math.abs(cx) < bw / 2 || Math.abs(cy) < bh / 2; }
    default: return true;
  }
}

/** 우리 칸 중 테두리(8방향 이웃에 바깥이 있음) */
export function isEdge(m: boolean[][], x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    if (!m[y + dy]?.[x + dx]) return true;
  }
  return false;
}
