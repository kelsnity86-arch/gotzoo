// 우리 조각 그림: 블록 칸을 서식지 색으로 칠한 작은 도트 (카드 창 16×16에 맞춘다)
import type { PenCard } from '../game/state';
import { pieceDef, rotateCells } from '../data/pieces';

export const HAB_COLOR: Record<string, [string, string]> = {
  grass: ['#38a35b', '#1f5d3a'], sand: ['#e8c39e', '#8a5a3b'], water: ['#41a6f6', '#29366f'],
  snow: ['#f4f4f4', '#566c86'], rock: ['#94b0c2', '#333c57'], cloud: ['#ffc8dd', '#8e44ad'],
};
const cache = new Map<string, HTMLCanvasElement>();
export function pieceArt(c: Pick<PenCard, 'piece' | 'habitat'>, rot = 0, size = 16): HTMLCanvasElement {
  const key = `${c.piece}|${c.habitat}|${rot}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cells = rotateCells(pieceDef(c.piece).cells, rot);
  const w = Math.max(...cells.map((p) => p[0])) + 1, h = Math.max(...cells.map((p) => p[1])) + 1;
  const k = Math.max(1, Math.floor((size - 2) / Math.max(w, h)));
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;
  const ox = Math.floor((size - w * k) / 2), oy = Math.floor((size - h * k) / 2);
  const [fill, edge] = HAB_COLOR[c.habitat] ?? HAB_COLOR.grass;
  const has = new Set(cells.map((p) => p.join(',')));
  for (const [x, y] of cells) {
    g.fillStyle = edge; g.fillRect(ox + x * k, oy + y * k, k, k);
    g.fillStyle = fill;
    const l = has.has(`${x - 1},${y}`) ? 0 : 1, r = has.has(`${x + 1},${y}`) ? 0 : 1, t = has.has(`${x},${y - 1}`) ? 0 : 1, b = has.has(`${x},${y + 1}`) ? 0 : 1;
    g.fillRect(ox + x * k + l, oy + y * k + t, k - l - r, k - t - b);
  }
  cache.set(key, cv);
  return cv;
}
