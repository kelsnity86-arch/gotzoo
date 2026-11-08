// 필드 그리기: 관객존(길·관람객·동전) + 동물존(우리·동물). 도트 한 칸이 화면 픽셀 정수 개가 되게 배율을 맞춘다.
import { ANIMALS, type Habitat } from '../data/animals';
import { COIN, DAY } from '../data/balance';
import type { SaveData } from '../game/state';
import { BLD_ART, BLOCK, PATH_Y0, PATH_Y1, TILE, ZONE_H, gateX, zoneRow, type VisitorEnt, type World } from '../game/world';
import { penAttract } from '../game/rules';
import { BIG, animalFrame, person16, personFrame, pixelDown, shinyOf, sprite, staff16, staffFrame, hasPng, type Sprite } from './sprites';
import { seasonOf } from '../data/seasons';
import { itemSprite } from '../data/facilities';
import { fmt } from '../ui/dom';
import { eventDef } from '../data/events';
import { STAFF } from '../data/staff';

export interface View { x: number; y: number; w: number; h: number }
/** GPT 타일 (assets/sprites/tiles): 서식지별 바닥 */
const FLOOR: Record<Habitat, [string, string]> = {
  grass: ['#38a35b', '#2f8f4f'], sand: ['#e8c39e', '#d9ae84'], water: ['#41a6f6', '#3b8fe0'],
  snow: ['#f4f4f4', '#dfe6ee'], rock: ['#94b0c2', '#7f99ab'], cloud: ['#ffc8dd', '#f4b3cf'],
};
/** 등급별 크기 배율 (일반 → 전설). 도트 한 칸이 기기 픽셀 정수 개가 되게 반올림해서 그린다 */
export { GRADE_MUL as GRADE_SIZE } from '../game/world';
import { GRADE_MUL as GRADE_SIZE } from '../game/world';
import { motion } from '../ui/motion';

export class FieldRenderer {
  /** 마지막으로 그린 변환 (입력 좌표 변환용) */
  scale = 1; ox = 0; oy = 0;
  /** 사용자 확대 (1 = 전체 보기) 와 화면 가운데에 올 월드 좌표 */
  userZoom = 1; camX = -1; camY = -1;
  private lastView: View = { x: 0, y: 0, w: 1, h: 1 };
  private lastFit = 1; private worldW = 1; private worldH = 1;

  /** 화면 좌표 (sx, sy)를 중심으로 확대·축소 */
  zoomAt(sx: number, sy: number, factor: number) {
    const before = this.toWorld(sx, sy);
    this.userZoom = Math.max(1, Math.min(4, this.userZoom * factor));
    if (this.userZoom === 1) { this.camX = -1; return; }
    if (this.camX < 0) { this.camX = this.worldW / 2; this.camY = this.worldH / 2; }
    // 커서 아래 지점이 그대로 있도록 카메라를 옮긴다
    const z = this.lastFit * this.userZoom;
    this.camX = before.x - (sx - (this.lastView.x + this.lastView.w / 2)) / z;
    this.camY = before.y - (sy - (this.lastView.y + this.lastView.h / 2)) / z;
  }
  panBy(dx: number, dy: number) {
    if (this.userZoom <= 1) return;
    this.camX -= dx / this.scale; this.camY -= dy / this.scale;
  }
  resetZoom() { this.userZoom = 1; this.camX = -1; }
  private dev = 1; private dpr = 1;
  selectedPen = -1;
  /** 우리 놓기 미리 보기 (부지 블록 좌표) */
  ghost: { cells: [number, number][]; ok: boolean } | null = null;

  static readonly R = 3;
  /** 처음 화면의 확대: 월드 1칸 = 화면 몇 px */
  static readonly START_PX = 3;
  private autoZoomed = false;
  /** 시안 모드 (?mock): 산책로 · 산책하는 손님 */
  mock = false;
  /** (시안 loop) 주운 동전이 날아갈 화면 좌표 (CSS px) */
  hudTarget: { x: number; y: number } | null = null;
  private walkTiles: [number, number][] = [];
  private walkers: { x: number; y: number; tx: number; ty: number; kind: number; face: number; t: number }[] = [];
  private walkT = -1;
  /** 깔끔한 스타일 (턱 테두리 · 벽돌 광장 · 단색 바닥 · 관객 건물 줄) */
  private wc: HTMLCanvasElement | null = null;
  private bg: HTMLCanvasElement | null = null;
  private seasonN = 1;
  private items: SaveData['items'] = [];
  private decoTier = 0;
  private facLv: Partial<Record<string, number>> = {};
  private bgKey = '';
  constructor(private ctx: CanvasRenderingContext2D) {}

  /** 지도 바깥 숲: 잔디 위에 나무 · 덤불을 빽빽하게 (지도 둘레 MX · MY칸). 계절 · 지도 크기가 바뀔 때만 다시 그린다 */
  private sur: { cv: HTMLCanvasElement; mx: number; my: number; key: string } | null = null;
  private surround(world: World) {
    if (!hasPng('v2_ground_spring_1')) return null;
    const L = world.layout, season = seasonOf(this.seasonN).key;
    const key = `${season}|${L.w}x${L.h}`;
    if (this.sur && this.sur.key === key) return this.sur;
    const R = FieldRenderer.R, MX = 240, MY = 120;
    const W = L.w + MX * 2, H = L.h + MY * 2;
    const cv = this.sur?.cv ?? document.createElement('canvas');
    cv.width = W * R; cv.height = H * R;
    const c = cv.getContext('2d')!;
    c.setTransform(R, 0, 0, R, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, W, H);
    const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    // 잔디: 지도 안 타일과 이음매가 맞게 같은 격자 (MX · MY는 TILE의 배수)
    for (let ty = 0; ty < H / TILE; ty++) for (let tx = 0; tx < W / TILE; tx++) {
      const r = hash(tx - MX / TILE, ty - MY / TILE), n = r < 0.06 ? 3 : r < 0.12 ? 4 : r < 0.56 ? 1 : 2;
      c.drawImage(sprite(`v2_ground_${season}_${n}`), tx * TILE, ty * TILE, TILE, TILE);
    }
    // 나무 · 덤불: 지도 둘레 바깥에만, 아래쪽일수록 앞에 (y 순서)
    const trees = season === 'winter' ? ['pine', 'pine', 'tree'] : season === 'spring' ? ['tree', 'blossom', 'pine'] : ['tree', 'pine', 'fruit'];
    const objs: { k: string; x: number; y: number }[] = [];
    for (let gy = 0; gy < H; gy += 16) for (let gx = 0; gx < W; gx += 18) {
      const x = gx + (hash(gx, gy) - 0.5) * 12, y = gy + (hash(gy, gx) - 0.5) * 10;
      const inMap = x > MX - 10 && x < MX + L.w + 10 && y > MY - 2 && y - 20 < MY + L.h;
      if (inMap) continue;
      const r = hash(gx + 7, gy + 3);
      objs.push({ k: r < 0.7 ? `park_${trees[Math.floor(r * 10) % 3]}` : r < 0.85 ? 'park_bush' : r < 0.93 ? 'park_flowerbush' : 'park_boulder', x, y });
    }
    objs.sort((a, b) => a.y - b.y);
    for (const o of objs) {
      if (!hasPng(`v2_${o.k}`)) continue;
      const im = sprite(`v2_${o.k}`), w = im.width / R, h = im.height / R;
      c.drawImage(im, Math.round((o.x - w / 2) * R) / R, Math.round((o.y - h) * R) / R, w, h);
    }
    this.sur = { cv, mx: MX, my: MY, key };
    return this.sur;
  }

  /** 움직이지 않는 바탕을 v2 월드 그림으로 한 번 그려 둔다 (월드 1칸 = R도트, 타일 8칸 = 24도트라 1:1)
   *  잔디(계절) → 관객 길(이어 붙는 돌길) → 우리 바닥 · 울타리(이어 붙는 울타리) → 우리 소품 → 빈 땅 공원 소품 → 시설 · 꾸미기 → 입구 */
  private background(world: World): HTMLCanvasElement | null {
    if (!hasPng('v2_ground_spring_1')) return null;
    const L = world.layout;
    const season = seasonOf(this.seasonN).key;
    const items = this.items.map((it) => `${it.type}@${it.x},${it.y}`).join(';');
    const key = `${this.mock}|${season}|${this.decoTier}|${items}|${Object.values(this.facLv).join('')}|${world.props.length}|${L.w}x${L.h}|${L.pens.map((r) => `${r.x},${r.y},${r.w},${r.h}`).join(';')}|${world.geo.map((g) => `${g.theme}:${g.gx},${g.gy}:${g.mask.map((r) => r.map(Number).join('')).join('/')}`).join(',')}`;
    if (this.bg && key === this.bgKey) return this.bg;
    this.bgKey = key;
    const cv = this.bg ?? document.createElement('canvas');
    const R = FieldRenderer.R;
    cv.width = L.w * R; cv.height = L.h * R;
    const c = cv.getContext('2d')!;
    c.setTransform(R, 0, 0, R, 0, 0);
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, L.w, L.h);
    const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const v = (k: string) => sprite(`v2_${k}`);
    /** 바닥 타일 고르기: 대부분 1 · 2번, 가끔 무늬 있는 3 · 4번 */
    const pick = (x: number, y: number) => { const r = hash(x, y); return r < 0.06 ? 3 : r < 0.12 ? 4 : r < 0.56 ? 1 : 2; };
    /** 물체: 도트 그대로(1:1), 가운데 아래 기준 */
    const obj = (k: string, cx: number, by: number, flip = false) => {
      if (!hasPng(`v2_${k}`)) return;
      const im = v(k), w = im.width / R, h = im.height / R;
      const x = Math.round((cx - w / 2) * R) / R, y = Math.round((by - h) * R) / R;
      if (flip) { c.save(); c.translate(x + w, y); c.scale(-1, 1); c.drawImage(im, 0, 0, w, h); c.restore(); }
      else c.drawImage(im, x, y, w, h);
    };
    /** 이어 붙이기: 모양 그림(3×3타일)을 4칸 = 반 타일 조각으로 나눠, 칸마다 이웃에 맞는 조각 4개를 붙인다
     *  sq = 네모 모양(바깥 모서리 · 변 · 안), inner = 안쪽 모서리 조각이 있는 그림과 그 자리 */
    const Q = TILE / 2, QP = Q * R;
    const autotile = (inSet: (tx: number, ty: number) => boolean, tx: number, ty: number, sq: Sprite, inner: Sprite, innerAt: (dx: number) => number, fill: boolean) => {
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const sx = dx ? 1 : -1, sy = dy ? 1 : -1;
        const h = inSet(tx + sx, ty), vv = inSet(tx, ty + sy), d = inSet(tx + sx, ty + sy);
        let src: Sprite = sq, px: number, py: number;
        if (h && vv && d) { if (!fill) continue; px = 2 * QP + dx * QP; py = 2 * QP + dy * QP; }
        else if (h && vv) { src = inner; px = innerAt(dx); py = innerAt(dy); }
        else if (h) { px = 2 * QP + dx * QP; py = dy * 5 * QP; }
        else if (vv) { px = dx * 5 * QP; py = 2 * QP + dy * QP; }
        else { px = dx * 5 * QP; py = dy * 5 * QP; }
        c.drawImage(src, px, py, QP, QP, tx * TILE + dx * Q, ty * TILE + dy * Q, Q, Q);
      }
    };
    // 도넛 길: 가운데 구멍 둘레가 안쪽 모서리 (dx=0 → 오른쪽 아래 타일의 왼쪽 위 조각)
    const ringAt = (d: number) => (d ? 0 : 4) * QP + d * QP;
    // 십자 울타리: 가운데 타일의 네 조각이 안쪽 모서리
    const crossAt = (d: number) => 2 * QP + d * QP;

    // 1. 잔디
    const TW = Math.ceil(L.w / TILE), TH = Math.ceil(L.h / TILE);
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) c.drawImage(v(`ground_${season}_${pick(tx, ty)}`), tx * TILE, ty * TILE, TILE, TILE);

    // 2. 담장 밖: 맨 위에 나무 한 줄 (바깥 세상), 그 앞에 동물원 담장 (게이트 단계 재질)
    const tier4 = Math.max(0, Math.min(3, this.decoTier));
    const gx = gateX(L.w), p0 = Math.floor(PATH_Y0 / TILE), p1 = Math.ceil(PATH_Y1 / TILE) - 1;
    const WALL_Y = 34;
    for (let x = 6, k = 0; x < L.w; x += 22, k++) if (Math.abs(x - gx) > 22) obj(k % 3 === 1 ? 'park_pine' : season === 'spring' && k % 3 === 2 ? 'park_blossom' : 'park_tree', x + (hash(k, 3) - 0.5) * 6, WALL_Y - 8);
    if (hasPng(`v2_gatepart_${tier4}_wall`)) {
      const ww = v(`gatepart_${tier4}_wall`).width / R - 1;
      for (let x = 0; x < gx - 12; x += ww) obj(`gatepart_${tier4}_wall`, x + ww / 2, WALL_Y);
      for (let x = L.w; x > gx + 12; x -= ww) obj(`gatepart_${tier4}_wall`, x - ww / 2, WALL_Y);
    }

    // 3. 관객 길 + 입구 앞 광장 (문 아래로 길이 이어져 들어간다). 길 양 끝은 막힌다
    const gt0 = Math.floor((gx - 12) / TILE), gt1 = Math.ceil((gx + 12) / TILE) - 1;
    const onPath = (tx: number, ty: number) => tx >= 0 && tx < TW && ((ty >= p0 && ty <= p1) || (ty === p0 - 1 && tx >= gt0 && tx <= gt1));
    const w = season === 'winter' ? '_w' : '';
    for (let ty = p0 - 1; ty <= p1; ty++) for (let tx = 0; tx < TW; tx++) if (onPath(tx, ty)) autotile(onPath, tx, ty, v(`path_sq${w}`), v(`path_ring${w}`), ringAt, true);
    obj('park_bush', 4, p1 * TILE + TILE - 6); obj('park_bush', L.w - 4, p1 * TILE + TILE - 6);

    // 3. 관객존 꾸미기: 길 위쪽 잔디에 나무 · 벤치 · 가로등 · 화단을 번갈아, 길 아래엔 낮은 생울타리
    // 관객존 위 건물 줄: 지은 관객 건물(단계 그림)과 사이 소품. 아직 안 지은 자리는 빈 팻말
    for (const z of zoneRow(L.w, this.facLv)) {
      if (z.kind === 'prop') { obj(`park_${z.name === 'blossom' && season === 'winter' ? 'pine' : z.name}`, z.x, p0 * TILE - (z.name === 'lamp' ? 0 : 1)); continue; }
      const lv = this.facLv[z.type] ?? 0;
      if (lv > 0) obj(`bld_${BLD_ART[z.type]}_${lv - 1}`, z.x, p0 * TILE - 1);
      else obj('park_sign', z.x, p0 * TILE - 2);
    }
    // 가운데 입구: 앞에서 본 아치 문 (손님이 문을 지나 화면 쪽으로 나온다), 양옆 매표소 · 깃대, 간판 이름, 계절 장식
    if (hasPng(`v2_gate_${tier4}`)) {
      const im = v(`gate_${tier4}`), gw = im.width / R, gh = im.height / R, gb = p0 * TILE - 1;
      const gl = gx - gw / 2, gt = gb - gh;
      obj(`gatepart_${tier4}_flag`, gl - 13, gb);
      obj(`gatepart_${tier4}_flag`, gl + gw + 13, gb);
      obj(`gatepart_${tier4}_booth`, gl - 4, gb);
      obj(`gatepart_${tier4}_booth`, gl + gw + 4, gb, true);
      obj(`gate_${tier4}`, gx, gb);
      c.save();
      c.font = `${tier4 === 2 ? 4.2 : 5.2}px Jua, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const ty = gt + gh * (tier4 === 2 ? 0.13 : tier4 === 3 ? 0.27 : 0.17), name = tier4 === 2 ? 'ZOO' : '뽑ZOO';
      c.lineJoin = 'round'; c.lineWidth = 1; c.strokeStyle = '#fff6e0'; c.strokeText(name, gx, ty);
      c.fillStyle = '#5d3a24'; c.fillText(name, gx, ty);
      c.restore();
      obj(`gatedeco_${season}_arch`, gx, gt + gh * 0.5);
      obj(`gatedeco_${season}_base0`, gl + 1, gb + 1);
      obj(`gatedeco_${season}_base1`, gl + gw - 1, gb + 1);
    }
    for (let x = 4; x < L.w - 10; x += 16) if ((x / 16) % 5 !== 2 && !(this.mock && Math.abs(x + 8 - gx) < 14)) obj('park_hedge', x + 8, ZONE_H - 1);

    // 4. 우리: 바닥 → 울타리. 우리마다 자기 둘레를 다 친다 (맞닿은 쪽은 두 줄이 나란히 붙어 끊김이 없다)
    const owner = new Map<string, number>();
    L.pens.forEach((_, i) => { const g = world.geo[i]; if (g) g.mask.forEach((row, y) => row.forEach((on, x) => { if (on) owner.set(`${g.gx / TILE + x},${g.gy / TILE + y}`, i); })); });
    const tier = Math.max(0, Math.min(3, this.decoTier));
    // (시안 ?mock) 산책로: 우리 둘레 한 칸 + 생울타리 아래 한 줄, 입구 앞에서 관객 길과 이어진다
    const walk = new Set<string>();
    if (this.mock) {
      const t0x = L.bx0 / TILE, t1x = (L.bx0 + L.bw * BLOCK) / TILE, t0y = L.by0 / TILE - 1, t1y = (L.by0 + L.bh * BLOCK) / TILE;
      for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) {
        if (owner.has(`${tx},${ty}`)) continue;
        let near = ty === t0y;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (owner.has(`${tx + dx},${ty + dy}`)) { near = true; break; }
        if (near) walk.add(`${tx},${ty}`);
      }
      const gtx = Math.floor(gx / TILE);
      for (let ty = p1 + 1; ty < t0y; ty++) for (const tx of [gtx - 1, gtx]) walk.add(`${tx},${ty}`);
      const onWalk = (tx: number, ty: number) => walk.has(`${tx},${ty}`) || onPath(tx, ty);
      for (const k of walk) { const [tx, ty] = k.split(',').map(Number); autotile(onWalk, tx, ty, v(`path_sq${w}`), v(`path_ring${w}`), ringAt, true); }
      // 길가 가로등: 산책로 가장자리 몇 곳
      let n = 0;
      for (const k of walk) { const [tx, ty] = k.split(',').map(Number); if (ty > t0y && !walk.has(`${tx},${ty + 1}`) && !owner.has(`${tx},${ty + 1}`) && hash(tx, ty) < 0.12 && n++ < 24) obj('park_lamp', tx * TILE + TILE / 2, (ty + 1) * TILE + 2); }
      this.walkTiles = [...walk].map((k) => k.split(',').map(Number) as [number, number]);
    }
    L.pens.forEach((_, i) => {
      const g = world.geo[i];
      if (!g) return;
      const hab = g.theme ?? 'grass';
      const ox = g.gx / TILE, oy = g.gy / TILE;
      g.mask.forEach((row, y) => row.forEach((on, x) => { if (on) c.drawImage(v(`floor_${hab}_${pick(ox + x + 50, oy + y)}`), (ox + x) * TILE, (oy + y) * TILE, TILE, TILE); }));
    });
    L.pens.forEach((_, i) => {
      const g = world.geo[i];
      if (!g) return;
      const ox = g.gx / TILE, oy = g.gy / TILE;
      const inside = (tx: number, ty: number) => owner.get(`${tx},${ty}`) === i;
      g.mask.forEach((row, y) => row.forEach((on, x) => { if (on) autotile(inside, ox + x, oy + y, v(`fence${tier}_sq`), v(`fence${tier}_x`), crossAt, false); }));
    });

    // 5. 우리 소품 (자리는 world가 정한다: 동물이 찾아가서 쓴다)
    for (const pr of world.props) obj(`prop_${world.geo[pr.pen]?.theme ?? 'grass'}_${pr.kind}`, pr.x, pr.y, pr.flip);

    // 6. 우리 없는 빈 블록: 풀밭 공원 (나무 · 덤불 · 꽃 · 바위 · 연못)
    const { bx0, by0, bw, bh } = L;
    const itemAt = new Set(this.items.filter((it) => it.x >= 0).map((it) => `${it.x},${it.y}`));
    const tree = season === 'winter' ? 'park_pine' : season === 'spring' ? 'park_blossom' : 'park_tree';
    const looks = [[tree, 'park_bush'], ['park_flowerbed'], ['park_pond'], ['park_tree', 'park_flowerbush'], ['park_boulder', 'park_bush'], ['park_pine', 'park_bush'], ['park_bench', 'park_lamp']];
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      if (itemAt.has(`${bx},${by}`)) continue;
      let empty = true;
      for (let ty = 0; ty < 4 && empty; ty++) for (let tx = 0; tx < 4; tx++) if (owner.has(`${(bx0 + bx * BLOCK) / TILE + tx},${(by0 + by * BLOCK) / TILE + ty}`)) { empty = false; break; }
      if (!empty) continue;
      if (this.mock) { let onW = false; for (let ty = 0; ty < 4 && !onW; ty++) for (let tx = 0; tx < 4; tx++) if (walk.has(`${(bx0 + bx * BLOCK) / TILE + tx},${(by0 + by * BLOCK) / TILE + ty}`)) { onW = true; break; } if (onW) continue; }
      const look = looks[Math.floor(hash(bx, by + 7) * looks.length)];
      const X = bx0 + bx * BLOCK, Y = by0 + by * BLOCK;
      if (look.length === 1) obj(look[0], X + BLOCK / 2, Y + BLOCK * 0.75);
      else { obj(look[0], X + BLOCK * 0.4, Y + BLOCK * 0.62); obj(look[1], X + BLOCK * 0.72, Y + BLOCK * 0.92, hash(bx, by) < 0.5); }
    }

    // 7. 시설 · 꾸미기: 블록 1칸 안 바닥에 맞춰
    for (const it of this.items) {
      if (it.x < 0) continue;
      const X = bx0 + it.x * BLOCK, Y = by0 + it.y * BLOCK;
      const k2 = itemSprite(it.type);
      if (hasPng(`v2_${k2}`)) obj(k2, X + BLOCK / 2, Y + BLOCK - 3);
      else if (hasPng(k2)) this.obj(c, sprite(k2), X + BLOCK / 2, Y + BLOCK - 3, BLOCK - 8);
    }
    this.bg = cv;
    return cv;
  }
  /** 다른 크기의 그림을 도트 그림용으로 줄여 바닥 가운데에 */
  private obj(c: CanvasRenderingContext2D, im: Sprite, cx: number, by: number, maxUnits: number) {
    const R = FieldRenderer.R, k = (maxUnits * R) / Math.max(im.width, im.height);
    const d = k < 1 ? pixelDown(im, im.width * k, im.height * k) : im;
    const s2 = k < 1 ? 1 / R : Math.max(1, Math.floor(k)) / R;
    c.drawImage(d, Math.round((cx - (d.width * s2) / 2) * R) / R, Math.round((by - d.height * s2) * R) / R, d.width * s2, d.height * s2);
  }

  /** 화면(CSS px) → 월드 좌표 */
  toWorld(sx: number, sy: number) { return { x: (sx - this.ox) / this.scale, y: (sy - this.oy) / this.scale }; }

  draw(world: World, save: SaveData, view: View, dpr: number, pointer: { x: number; y: number } | null) {
    const c = this.ctx, L = world.layout;
    // 배율: 기기 픽셀 기준 정수로 (도트가 고르게). 내림하면 10% 넘게 작아질 때는 소수 배율 그대로
    // (예: 1.9배 → 1배로 내리면 화면이 절반으로 줄어든다)
    const fit = Math.min(view.w / L.w, view.h / L.h);
    this.lastView = view; this.lastFit = fit; this.worldW = L.w; this.worldH = L.h;
    // 처음 그릴 때 한 번: 월드 1칸이 화면 3px쯤 되게 키우고 맨 위(입구 · 길)부터 보여 준다. '전체 보기'로 돌아갈 수 있다
    if (!this.autoZoomed && L.w > 64) {
      this.autoZoomed = true;
      const uz = FieldRenderer.START_PX / fit;
      if (uz > 1.15) { this.userZoom = Math.min(4, uz); this.camX = L.w / 2; this.camY = 0; }
    }
    // 배율: 도트 1개가 기기 픽셀 정수 배가 되게 내림 (28% 넘게 작아지면 소수 배율).
    // 화면 밀도가 높은 기기(dpr ≥ 2)는 소수 배율이어도 고르지 않은 게 안 보여서 꽉 채운다
    const art = (fit * this.userZoom * dpr) / FieldRenderer.R;
    const snapped = Math.floor(art);
    const snap = dpr < 2 && snapped >= 1 && snapped / art >= 0.72;
    const z = ((snap ? snapped : art) * FieldRenderer.R) / dpr;
    this.scale = z; this.dev = z * dpr; this.dpr = dpr;
    if (this.userZoom <= 1 || this.camX < 0) {
      this.ox = Math.round((view.x + (view.w - L.w * z) / 2) * dpr) / dpr;
      this.oy = Math.round((view.y + (view.h - L.h * z) / 2) * dpr) / dpr;
    } else {
      // 확대 중: 카메라가 맵 밖을 보지 않게 붙잡는다
      const hw = view.w / 2 / z, hh = view.h / 2 / z;
      this.camX = L.w * z <= view.w ? L.w / 2 : Math.max(hw, Math.min(L.w - hw, this.camX));
      this.camY = L.h * z <= view.h ? L.h / 2 : Math.max(hh, Math.min(L.h - hh, this.camY));
      this.ox = Math.round((view.x + view.w / 2 - this.camX * z) * dpr) / dpr;
      this.oy = Math.round((view.y + view.h / 2 - this.camY * z) * dpr) / dpr;
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#25331f';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.setTransform(z * dpr, 0, 0, z * dpr, this.ox * dpr, this.oy * dpr);

    // 동물원은 '월드 1칸 = 2도트' 캔버스에 먼저 그리고 (모든 그림의 도트 굵기를 같게), 화면엔 정수 배로 확대해 붙인다
    const R = FieldRenderer.R;
    if (!this.wc) this.wc = document.createElement('canvas');
    if (this.wc.width !== L.w * R || this.wc.height !== L.h * R) { this.wc.width = L.w * R; this.wc.height = L.h * R; }
    const main = this.ctx, wctx = this.wc.getContext('2d')!;
    const keep = { ox: this.ox, oy: this.oy, dev: this.dev, dpr: this.dpr };
    this.ctx = wctx; this.ox = 0; this.oy = 0; this.dev = R; this.dpr = 1;
    wctx.setTransform(R, 0, 0, R, 0, 0); wctx.imageSmoothingEnabled = false;
    wctx.clearRect(0, 0, L.w, L.h);
    this.drawWorld(world, save, pointer);
    this.ctx = main; this.ox = keep.ox; this.oy = keep.oy; this.dev = keep.dev; this.dpr = keep.dpr;
    c.save();
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.beginPath(); c.rect(view.x, view.y, view.w, view.h); c.clip();
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    // 지도 바깥(화면 남는 곳): 숲으로 이어서 빈 공간이 없게
    const sur = this.surround(world);
    if (sur) c.drawImage(sur.cv, Math.round((this.ox - sur.mx * z) * dpr), Math.round((this.oy - sur.my * z) * dpr), Math.round((sur.cv.width / FieldRenderer.R) * z * dpr), Math.round((sur.cv.height / FieldRenderer.R) * z * dpr));
    c.drawImage(this.wc, Math.round(this.ox * dpr), Math.round(this.oy * dpr), Math.round(L.w * z * dpr), Math.round(L.h * z * dpr));

    // 떠오르는 글자 (화면 좌표로, 글자는 선명하게)
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // (시안 loop) 주운 동전이 화면 위 코인 칸으로 빨려 들어간다
    if (world.flying.length && this.hudTarget) {
      const coin = hasPng('v2_ui_coin') ? sprite('v2_ui_coin') : sprite('coin_0');
      c.imageSmoothingEnabled = false;
      for (const f of world.flying) {
        const k = Math.min(1, f.t / 0.55), e = k * k * (3 - 2 * k);
        const x0 = this.ox + f.x * z, y0 = this.oy + f.y * z;
        const x = x0 + (this.hudTarget.x - x0) * e, y = y0 + (this.hudTarget.y - y0) * e - Math.sin(k * Math.PI) * 60;
        const s = 20 - k * 6;
        c.globalAlpha = k > 0.9 ? (1 - k) * 10 : 1;
        c.drawImage(coin, Math.round(x - s / 2), Math.round(y - s / 2), s, s);
      }
      c.globalAlpha = 1;
    }
    // 글자는 굵은 테두리로 (어떤 바닥 위에서도 읽히게)
    const outlined = (text: string, x: number, y: number, color: string) => {
      c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#1a1c2c'; c.strokeText(text, x, y);
      c.fillStyle = color; c.fillText(text, x, y);
    };
    c.font = '16px Jua, sans-serif'; c.textAlign = 'center';
    for (const f of world.floats) {
      const k = f.t / 1.1;
      const sx = this.ox + f.x * z, sy = this.oy + (f.y - k * 10) * z;
      c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      outlined(f.text, sx, sy, f.color);
    }
    c.globalAlpha = 1;
    // 우리 이름표: 매력도
    // 우리 이름표: 매력도 (큰 글씨, 진한 배경)
    // 우리 이름표: 작은 반투명 딱지 (♥ 매력). 빈 우리는 표시 안 함
    c.font = '12px Jua, sans-serif';
    L.pens.forEach((r, i) => {
      const n = save.pens[i]?.length ?? 0;
      if (!n) return;
      const label = `♥${fmt(Math.round(penAttract(save, i, world.fedLeft[i] > 0 ? 1.1 : 1)))}`;
      const g = world.geo[i];
      // 모양의 맨 윗줄 가운데 (ㄱ자 등에서 빈 곳에 뜨지 않게)
      let lx = r.x + r.w / 2, ly = r.y;
      if (g) { const row = g.mask.findIndex((rw) => rw.some(Boolean)); const xs = g.mask[row].map((v, k) => (v ? k : -1)).filter((k) => k >= 0); lx = g.gx + ((xs[0] + xs[xs.length - 1] + 1) / 2) * TILE; ly = g.gy + row * TILE; }
      const sx = this.ox + lx * z, sy = this.oy + ly * z + 4;
      const tw = c.measureText(label).width + 8;
      c.fillStyle = 'rgba(18,20,30,0.55)';
      c.beginPath(); c.roundRect(sx - tw / 2, sy - 9, tw, 13, 6); c.fill();
      c.fillStyle = world.fedLeft[i] > 0 ? '#ffc8dd' : '#fff3a3';
      c.fillText(label, sx, sy + 1);
    });
    c.restore();
  }

  /** 동물원 한 장 (월드 좌표, this.ctx = 2도트 캔버스) */
  private drawWorld(world: World, save: SaveData, pointer: { x: number; y: number } | null) {
    const c = this.ctx, L = world.layout, t = world.time;
    this.seasonN = save.season.n; this.items = save.items; this.decoTier = save.upgrades.deco ?? 0; this.facLv = save.facLv ?? {};
    const bg = this.background(world);
    if (bg) { c.drawImage(bg, 0, 0, L.w, L.h); this.drawDynamic(world, save); }
    else {
    // 바닥 잔디
    c.fillStyle = '#4c8a3c'; c.fillRect(0, 0, L.w, L.h);
    c.fillStyle = '#5a9a46';
    for (let y = 0; y < L.h; y += TILE) for (let x = 0; x < L.w; x += TILE) if (((x * 7 + y * 13) / TILE) % 5 === 0) c.fillRect(x + 2, y + 3, 1, 1);
    // 관객존: 위 잔디 + 길 + 난간
    c.fillStyle = '#3f7a33'; c.fillRect(0, 0, L.w, PATH_Y0);
    for (let x = 6; x < L.w; x += 26) this.tree(x + ((x * 13) % 9), 4);
    c.fillStyle = '#d9b07c'; c.fillRect(0, PATH_Y0, L.w, PATH_Y1 - PATH_Y0 + 6);
    c.fillStyle = '#c99c66';
    for (let x = 0; x < L.w; x += 6) c.fillRect(x + ((x / 6) % 2) * 3, PATH_Y0 + 3 + ((x * 5) % 13), 2, 1);
    c.fillStyle = '#8a5a3b'; c.fillRect(0, ZONE_H - 3, L.w, 2);
    c.fillStyle = '#5d3a24'; for (let x = 2; x < L.w; x += 8) c.fillRect(x, ZONE_H - 5, 1, 4);

    // 우리
    L.pens.forEach((r, i) => this.pen(world, save, i, r.x, r.y, r.w, r.h));
    }

    // 동전 (관객존 바닥)
    const coinFrame = Math.floor(t * 8) % 4;
    for (const co of world.coins) {
      const fade = co.age > COIN.lifeSec - COIN.blinkSec ? (Math.floor(co.age * 6) % 2 ? 0.35 : 1) : 1;
      c.globalAlpha = fade;
      // 많이 합쳐진 동전은 동전 더미 그림
      const img = co.count >= 3 && hasPng('fx_06') ? sprite('fx_06') : sprite(`coin_${(coinFrame + co.id) % 4}`);
      if (co.count === 2) this.icon(sprite('coin_0'), co.x + 2, co.y - 2 - co.z, 7);
      // 오래 쌓일수록 더미가 커진다 (시안 loop)
      const sz = world.loop ? Math.min(13, 7 + Math.floor(co.count / 3) * 2) : 7;
      this.icon(img, co.x, co.y - 1 - co.z, sz);
      if (co.lucky) { this.sparkle(co.x, co.y - 6 - co.z, t * 2 + co.id); this.sparkle(co.x + 3, co.y - 3 - co.z, t * 2 + co.id + 1.5); }
      c.globalAlpha = 1;
    }

    // 관람객 · 직원 (y 순서)
    type D = { y: number; f: () => void };
    const list: D[] = [];
    for (const v of world.visitors) {
      const fr = v.state === 'view' ? 0 : Math.floor(v.anim * 6) % 2;
      list.push({ y: v.y, f: () => {
        const pose = this.poseSprite(v);
        if (pose) { const hop = v.pose === 'cheer' && !v.tossT && !motion.reduce ? Math.round(Math.abs(Math.sin(v.t * 7)) * 4) : 0; this.blitDev(pose, v.x, v.y, pose.height / FieldRenderer.R, false, hop); if (v.vip) this.icon(sprite('fx_15'), v.x, v.y - 15 + Math.sin(t * 6), 6); return; }
        // 걷기: 새 관객 8명(계절 옷) · VIP · 분장 손님 (도트 그대로)
        const wk = this.walkKey(v, seasonOf(save.season.n).key, fr);
        if (hasPng(wk)) { const im = sprite(wk); this.blitDev(im, v.x, v.y, im.height / FieldRenderer.R, v.dir > 0, 0); if (v.vip) this.icon(sprite('fx_15'), v.x, v.y - 15 + Math.sin(t * 6), 6); return; }
        const p16 = person16(seasonOf(save.season.n).key, v.kind, fr);
        if (p16) this.blitDev(p16, v.x, v.y, 13, v.dir > 0, 0);
        else this.blit(personFrame(v.kind, fr), v.x, v.y, 8, 12, v.dir > 0, v.state !== 'view' && fr && hasPng(`person_${String(v.kind).padStart(2, '0')}`) ? 1 : 0);
        // VIP 손님: 머리 위 별 + 금빛 테두리
        if (v.vip) this.icon(sprite('fx_15'), v.x, v.y - 14 + Math.sin(t * 6), 6);
      } });
    }
    for (const e of world.staff) {
      const fr = Math.floor(e.anim * 6) % 2;
      list.push({ y: e.y, f: () => {
        const si = STAFF.findIndex((d) => d.kind === e.kind);
        const ak = `v2_sa_${String(si).padStart(2, '0')}_f${Math.floor(e.anim * 3) % 2}`;
        if ((e.act ?? 0) > 0 && hasPng(ak)) { const im = sprite(ak); this.blitDev(im, e.x, e.y, im.height / FieldRenderer.R, e.face > 0, 0); return; }
        const wk = `v2_sw_${String(si).padStart(2, '0')}_f${fr}`;
        if (hasPng(wk)) { const im = sprite(wk); this.blitDev(im, e.x, e.y, im.height / FieldRenderer.R, e.face > 0, 0); return; }
        const s16 = staff16(e.kind, fr);
        if (s16) this.blitDev(s16, e.x, e.y, 13.5, e.face > 0, 0);
        else { this.blit(staffFrame(e.kind, fr), e.x, e.y, 8, 12, e.face > 0, 0); c.fillStyle = e.kind === 'collector' ? '#ef7d32' : '#38a35b'; c.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 15, 2, 2); }
      } });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();

    // 동물 말풍선 (하트·음표·먹이)
    for (const e of world.emotes) {
      const k = e.t / 1.4;
      c.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      if (e.icon === 'zz') { c.fillStyle = '#c7cfdd'; c.fillRect(Math.round(e.x + k * 3), Math.round(e.y - 6 - k * 6), 3, 1); c.fillRect(Math.round(e.x + 2 + k * 3), Math.round(e.y - 5 - k * 6), 1, 1); c.fillRect(Math.round(e.x + 1 + k * 3), Math.round(e.y - 4 - k * 6), 1, 1); c.fillRect(Math.round(e.x + k * 3), Math.round(e.y - 3 - k * 6), 3, 1); }
      else if (e.icon.startsWith('v2_')) { if (hasPng(e.icon)) { const im = sprite(e.icon); this.icon(im, e.x, e.y - k * 6 + 2, Math.max(im.width, im.height) / FieldRenderer.R); } }
      else this.icon(sprite(e.icon), e.x, e.y - k * 6 + 2, 7);
    }
    c.globalAlpha = 1;
    // 해 질 녘·밤: 붉게 → 남색, 밤에는 가로등 불빛
    const sea0 = seasonOf(save.season.n).key;
    if (world.phase !== 'day') {
      const k = world.phase === 'dusk' ? Math.min(1, (world.phaseT - (DAY.dayLen - DAY.duskLen)) / DAY.duskLen) : 1;
      c.fillStyle = world.phase === 'dusk' ? `rgba(239,125,50,${0.16 * k})` : 'rgba(20,24,60,0.38)';
      c.fillRect(0, 0, L.w, L.h);
      if (world.phase === 'night') {
        c.globalCompositeOperation = 'lighter';
        // 가로등 불빛 (관객존 가로등 자리 · 공원 가로등)
        const lamps = zoneRow(L.w, this.facLv).filter((z) => z.kind === 'prop' && z.name === 'lamp').map((z) => z.x);
        for (const lx of lamps) {
          const g = c.createRadialGradient(lx, PATH_Y0 - 12, 0, lx, PATH_Y0 - 6, 20);
          g.addColorStop(0, 'rgba(247,201,72,0.5)'); g.addColorStop(1, 'rgba(247,201,72,0)');
          c.fillStyle = g; c.fillRect(lx - 22, PATH_Y0 - 32, 44, 44);
        }
        c.globalCompositeOperation = 'source-over';
        if (hasPng('v2_wx_lamplight')) { c.globalAlpha = 0.55; for (const lx of lamps) this.icon(sprite('v2_wx_lamplight'), lx, PATH_Y0 + 2, sprite('v2_wx_lamplight').width / FieldRenderer.R); c.globalAlpha = 1; }
        // 반딧불 (여름 · 가을 밤, 우리 위를 천천히)
        if (!motion.reduce && hasPng('v2_wx_firefly') && (sea0 === 'summer' || sea0 === 'autumn')) {
          const ff = sprite('v2_wx_firefly');
          for (let i = 0; i < 14; i++) {
            const fx = ((i * 97.3 + Math.sin(t * 0.4 + i) * 20) % L.w + L.w) % L.w, fy = ZONE_H + ((i * 61.7 + Math.cos(t * 0.5 + i * 2) * 14) % (L.h - ZONE_H));
            c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i); this.icon(ff, fx, fy, Math.max(ff.width, ff.height) / FieldRenderer.R);
          }
          c.globalAlpha = 1;
        }
      }
    }
    // 계절: 살짝 덧칠 + 날리는 꽃잎 · 낙엽 · 눈 (이벤트가 눈이면 더 많이)
    const sea = seasonOf(save.season.n);
    const ev = world.event ? eventDef(world.event.id) : null;
    c.fillStyle = sea.tint; c.fillRect(0, 0, L.w, L.h);
    const parts = ev?.snow ? ['#f4f4f4', '#e9f3ff'] : sea.particle;
    // 날리는 것: 봄 꽃잎 · 가을 낙엽 · 겨울(눈 이벤트) 눈송이는 그림으로, 그 밖엔 점
    const wxKeys = ev?.snow || sea.key === 'winter' ? ['v2_wx_flake1'] : sea.key === 'spring' ? ['v2_wx_petal1', 'v2_wx_petal2', 'v2_wx_petal3'] : sea.key === 'autumn' ? ['v2_wx_leaf1', 'v2_wx_leaf2', 'v2_wx_ginkgo'] : [];
    if (!motion.reduce && wxKeys.length && hasPng(wxKeys[0])) {
      const n = ev?.snow ? 34 : 10, fall = sea.key === 'winter' || ev?.snow ? 14 : 9;
      for (let i = 0; i < n; i++) {
        const sway = Math.sin(t * 1.3 + i) * 6;
        const x = ((i * 71.3 + t * 7 + sway) % L.w + L.w) % L.w, y = ((i * 43.7 + t * fall) % L.h);
        const im = sprite(wxKeys[i % wxKeys.length]);
        this.icon(im, x, y, Math.max(im.width, im.height) / FieldRenderer.R); // 도트 그대로 (줄이면 외곽선만 남아 검은 점이 된다)
      }
    } else if (parts.length && !motion.reduce) {
      const n = ev?.snow ? 60 : 12, fall = sea.key === 'winter' || ev?.snow ? 14 : 9;
      for (let i = 0; i < n; i++) {
        const sway = Math.sin(t * 1.3 + i) * 6;
        const x = ((i * 71.3 + t * 7 + sway) % L.w + L.w) % L.w, y = ((i * 43.7 + t * fall) % L.h);
        c.fillStyle = parts[i % parts.length];
        c.fillRect(Math.round(x), Math.round(y), sea.key === 'autumn' && !ev?.snow ? 2 : 1, 1);
      }
    }
    // 비 (소나기 · 장마)
    if (ev?.rain) {
      c.fillStyle = 'rgba(115,239,247,0.55)';
      const rain = hasPng('v2_wx_rain') ? sprite('v2_wx_rain') : null;
      for (let i = 0; i < 60; i++) { const x = ((i * 53.7 + t * 30) % L.w), y = ((i * 37.3 + t * 140) % L.h); if (rain) this.icon(rain, x, y, Math.max(rain.width, rain.height) / FieldRenderer.R); else c.fillRect(Math.round(x), Math.round(y), 1, 3); }
      // 땅에 튀는 빗방울
      if (hasPng('v2_wx_splash1')) for (let i = 0; i < 16; i++) { const ph = (t * 2 + i * 0.37) % 1; const sx = (i * 131.7) % L.w, sy = ZONE_H * 0.6 + (i * 77.1) % (L.h - ZONE_H * 0.6); c.globalAlpha = 1 - ph; { const sp = sprite(ph < 0.5 ? 'v2_wx_splash1' : 'v2_wx_splash2'); this.icon(sp, sx, sy, Math.max(sp.width, sp.height) / FieldRenderer.R); } c.globalAlpha = 1; }
      c.fillStyle = 'rgba(41,54,111,0.12)'; c.fillRect(0, 0, L.w, L.h);
    }
    // 우리 놓기: 들어갈 자리 미리 보기 (초록 = 놓을 수 있음, 빨강 = 겹침·밖)
    if (this.ghost) {
      const gh = this.ghost;
      c.globalAlpha = 0.55;
      c.fillStyle = gh.ok ? '#38a35b' : '#d83a3a';
      for (const [x, y] of gh.cells) c.fillRect(L.bx0 + x * BLOCK + 1, L.by0 + y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
      c.globalAlpha = 1;
      c.strokeStyle = gh.ok ? '#a7d65b' : '#ffc8dd'; c.lineWidth = 0.5;
      for (const [x, y] of gh.cells) c.strokeRect(L.bx0 + x * BLOCK + 1, L.by0 + y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    }
    // 손 수거 범위
    if (pointer && !this.ghost) {
      c.strokeStyle = 'rgba(255,243,163,0.8)'; c.lineWidth = 0.5;
      c.beginPath(); c.arc(pointer.x, pointer.y, world.pickupRadius, 0, Math.PI * 2); c.stroke();
    }

  }

  /** 타일 바탕 위에: 선택 테두리·먹이 표시·동물 */
  private drawDynamic(world: World, save: SaveData) {
    const c = this.ctx;
    world.layout.pens.forEach((r, i) => {
      if (this.selectedPen === i) { c.strokeStyle = '#f7c948'; c.lineWidth = 1; c.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
      if (world.fedLeft[i] > 0) this.icon(sprite('fx_10'), r.x + r.w - 10, r.y + 13, 6);
      void save;
      this.animalsIn(world, i);
    });
    if (this.mock && this.walkTiles.length) this.drawWalkers(world, save);
  }
  /** (시안) 산책로 손님: 길 칸에서 이웃 길 칸으로 천천히 */
  private drawWalkers(world: World, save: SaveData) {
    const dt = this.walkT < 0 ? 0 : Math.min(0.1, world.time - this.walkT); this.walkT = world.time;
    const tiles = this.walkTiles, set = new Set(tiles.map(([x, y]) => `${x},${y}`));
    const want = Math.min(40, Math.round(tiles.length / 6));
    while (this.walkers.length < want) { const [x, y] = tiles[Math.floor(Math.random() * tiles.length)]; this.walkers.push({ x: (x + 0.5) * TILE, y: (y + 0.8) * TILE, tx: x, ty: y, kind: Math.floor(Math.random() * 8), face: -1, t: Math.random() * 5 }); }
    const se = seasonOf(save.season.n).key;
    for (const w of this.walkers.sort((a, b) => a.y - b.y)) {
      w.t += dt;
      const gx = (w.tx + 0.5) * TILE, gy = (w.ty + 0.8) * TILE, d = Math.hypot(gx - w.x, gy - w.y);
      if (d < 0.5) {
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [w.tx + dx, w.ty + dy]).filter(([x, y]) => set.has(`${x},${y}`));
        if (nb.length) { const pick = nb.find(([x]) => Math.sign(x - w.tx) === w.face && Math.random() < 0.7) ?? nb[Math.floor(Math.random() * nb.length)]; w.tx = pick[0]; w.ty = pick[1]; }
      } else { const sp = 9 * dt; w.x += ((gx - w.x) / d) * Math.min(sp, d); w.y += ((gy - w.y) / d) * Math.min(sp, d); if (Math.abs(gx - w.x) > 0.2) w.face = gx > w.x ? 1 : -1; }
      const k = `v2_pw_${se}_${w.kind}_f${Math.floor(w.t * 6) % 2}`;
      if (hasPng(k)) { const im = sprite(k); this.blitDev(im, w.x, w.y, im.height / FieldRenderer.R, w.face > 0, 0); }
    }
  }

  private animalsIn(world: World, i: number) {
    const list = world.animals.filter((a) => a.pen === i).sort((a, b) => a.y - b.y);
    const water = world.geo[i]?.theme === 'water';
    for (const a of list) {
      const fr = a.moving ? Math.floor(a.t * 5) % 2 : 0;
      const has16 = hasPng(`animal_${String(a.animal).padStart(3, '0')}`);
      // 행동별 몸짓 (기기 픽셀): 놀기 = 통통, 먹기 · 마시기 = 고개 끄덕, 잠 = 천천히 숨쉬기, 덜덜 = 좌우 떨기
      let hop = a.moving && !motion.reduce && fr && has16 ? 1 : 0, x = a.x;
      if (!motion.reduce) {
        if (a.act === 'play' || a.act === 'splash') hop = Math.round(Math.abs(Math.sin(a.t * 9)) * (a.act === 'play' ? 6 : 3));
        else if (a.act === 'eat' || a.act === 'drink') hop = Math.floor(a.t * 4) % 2;
        else if (a.act === 'friend') hop = Math.floor(a.t * 3) % 2;
        else if (a.act === 'sleep') hop = Math.floor(a.t * 0.8) % 2;
        else if (a.act === 'shiver') x += Math.floor(a.t * 18) % 2 ? 0.34 : -0.34;
      }
      const mul = GRADE_SIZE[ANIMALS[a.animal].grade];
      const img = animalFrame(a.animal, fr);
      // 물가 우리: 몸 아래가 잠기고 물결
      const sink = water ? 0.32 : 0;
      if (water && hasPng('v2_fx_ripple1')) { const rp = sprite(Math.floor(a.t * 1.5) % 2 ? 'v2_fx_ripple2' : 'v2_fx_ripple1'); this.ctx.globalAlpha = 0.7; this.icon(rp, x, a.y + 1.5, (rp.width / FieldRenderer.R) * Math.min(1, mul)); this.ctx.globalAlpha = 1; }
      // 크게 다시 그린 영웅 · 전설: 줄이지 않고 도트 그대로 (줄이면 점이 뭉개진다)
      if (BIG.has(a.animal)) { const im = a.shiny ? shinyOf(img) : img; this.blitDev(im, x, a.y, im.height / FieldRenderer.R, a.face > 0, hop, false, sink); }
      else this.blitAnimal(a.shiny ? shinyOf(img) : img, x, a.y, mul, a.face > 0, hop, sink);
      if (a.shiny) this.sparkle(x, a.y - 4 * mul, a.t + a.uid);
    }
  }

  private blit(img: Sprite, x: number, y: number, w: number, h: number, flip: boolean, hop: number) {
    const c = this.ctx;
    const px = Math.round(x - w / 2), py = Math.round(y - h) - hop;
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(px + 1, Math.round(y) - 1, w - 2, 1);
    if (flip) { c.save(); c.translate(px + w, py); c.scale(-1, 1); c.drawImage(img, 0, 0, w, h); c.restore(); }
    else c.drawImage(img, px, py, w, h);
  }

  /** 관객 그림 이름: 보통 손님 8명(kind % 8, 계절 옷) · VIP(kind 15~18 → 금빛 신사 · 스타 · 마녀 · 유령) */
  private walkKey(v: VisitorEnt, season: string, fr: number) { return v.vip ? `v2_vip_${Math.max(0, v.kind - 15)}_f${fr}` : `v2_pw_${season}_${v.kind % 8}_f${fr}`; }
  /** 멈춰 선 관람객의 정면 자세 그림. 걷는 중이면 null */
  private poseSprite(v: VisitorEnt): Sprite | null {
    if (v.state !== 'view' && v.state !== 'sit') return null;
    const p = v.tossT ? 'toss' : v.state === 'sit' ? 'sit' : v.pose ?? 'watch';
    const se = seasonOf(this.seasonN).key;
    const k = v.vip ? `v2_vip_${Math.max(0, v.kind - 15)}_${p}` : `v2_pp_${se}_${v.kind % 8}_${p}`;
    if (hasPng(k)) return sprite(k);
    const old = `v2_va_${v.vip ? 1 : v.kind % 4}_${p}`;
    return hasPng(old) ? sprite(old) : null;
  }

  /** 작은 그림 (동전 · 말풍선): 바닥 가운데 기준, 큰 쪽을 size칸에 맞춰 도트 그대로 */
  private icon(img: Sprite, x: number, y: number, size: number) {
    const R = FieldRenderer.R, k = (size * R) / Math.max(img.width, img.height);
    const im = k < 1 ? pixelDown(img, img.width * k, img.height * k) : img;
    const s = k < 1 ? 1 / R : Math.max(1, Math.round(k)) / R;
    const w = im.width * s, h = im.height * s;
    this.ctx.drawImage(im, Math.round((x - w / 2) * R) / R, Math.round((y - h) * R) / R, w, h);
  }

  /** 반짝이 동물 머리 위 반짝임 (네 방향 별, 깜빡) */
  private sparkle(x: number, y: number, t: number) {
    const ph = (t * 2) % 3;
    if (ph > 1) return;
    const c = this.ctx;
    c.fillStyle = ph < 0.5 ? '#fff3a3' : '#73eff7';
    const sx = Math.round(x + Math.sin(t) * 4), sy = Math.round(y - 2);
    c.fillRect(sx, sy - 1, 1, 3); c.fillRect(sx - 1, sy, 3, 1);
  }

  /** 동물: 등급 배율만큼 크게, 기기 픽셀 좌표로 (도트가 고르게) */
  private blitAnimal(img: Sprite, x: number, y: number, mul: number, flip: boolean, hop: number, sink = 0) {
    // 16px 시트 그림(크다)은 큰 쪽이 9칸 × 등급 배율이 되게, 예전 8px 그림은 8칸
    if (img.width > 8 || img.height > 8) { this.blitDev(img, x, y, 9 * mul, flip, hop, true, sink); return; }
    const c = this.ctx;
    const k = Math.max(1, Math.round(this.dev * mul));
    const size = 8 * k;
    const cx = this.ox * this.dpr + x * this.dev, by = this.oy * this.dpr + y * this.dev;
    const left = Math.round(cx - size / 2), top = Math.round(by - size) - hop * k;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(left + k, Math.round(by) - k, size - 2 * k, k);
    if (flip) { c.translate(left + size, top); c.scale(-1, 1); c.drawImage(img, 0, 0, size, size); }
    else c.drawImage(img, left, top, size, size);
    c.restore();
  }

  /** 발밑 그림자: 가운데가 넓고 위아래가 좁은 도트 타원 (cx · by = 기기 픽셀, w = 너비, u = 도트 한 칸) */
  private shadow(c: CanvasRenderingContext2D, cx: number, by: number, w: number, u: number) {
    const W = Math.max(4 * u, Math.round(w / u) * u), x0 = Math.round(cx - W / 2), y0 = Math.round(by) - 2 * u;
    c.fillStyle = 'rgba(30,40,20,0.22)';
    c.fillRect(x0 + 2 * u, y0, W - 4 * u, u);
    c.fillRect(x0, y0 + u, W, u);
    c.fillRect(x0 + 2 * u, y0 + 2 * u, W - 4 * u, u);
  }

  /** 고해상도 그림을 기기 픽셀로: 크기 기준(units, 월드 칸)을 큰 쪽(fit) 또는 높이에 맞춘다.
   *  1배 이상이면 정수 배로 (도트가 고르게), 작으면 부드럽게 줄인다 */
  private blitDev(img: Sprite, x: number, y: number, units: number, flip: boolean, hop: number, fitMax = false, sink = 0) {
    const c = this.ctx;
    const base = fitMax ? Math.max(img.width, img.height) : img.height;
    let k = (units * this.dev) / base;
    // 크면 도트 그림용으로 미리 줄여서 1:1, 작으면 정수 배
    if (k < 1) { img = pixelDown(img, img.width * k, img.height * k); k = 1; }
    else k = Math.max(1, Math.round(k));
    const smooth = false;
    const w = img.width * k, h = img.height * k;
    const cx = this.ox * this.dpr + x * this.dev, by = this.oy * this.dpr + y * this.dev;
    const left = Math.round(cx - w / 2), top = Math.round(by - h) - Math.round(hop * Math.max(1, k));
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = smooth;
    if (smooth) c.imageSmoothingQuality = 'high';
    if (!sink) this.shadow(c, cx, by, w * 0.62, Math.max(1, Math.round(k)));
    if (sink > 0) { c.beginPath(); c.rect(left - 2, top - 20, w + 4, h * (1 - sink) + 20); c.clip(); c.translate(0, Math.round(h * sink * 0.6)); }
    if (flip) { c.translate(left + w, top); c.scale(-1, 1); c.drawImage(img, 0, 0, w, h); }
    else c.drawImage(img, left, top, w, h);
    c.restore();
  }

  private tree(x: number, y: number) {
    const c = this.ctx;
    c.fillStyle = '#5d3a24'; c.fillRect(x + 3, y + 7, 2, 4);
    c.fillStyle = '#1f5d3a'; c.fillRect(x + 1, y + 1, 6, 7); c.fillRect(x, y + 3, 8, 3);
    c.fillStyle = '#38a35b'; c.fillRect(x + 2, y + 2, 3, 3);
  }

  private pen(world: World, save: SaveData, i: number, x: number, y: number, w: number, h: number) {
    const c = this.ctx;
    const uids = save.pens[i] ?? [];
    // 바닥: 우리 안 동물의 가장 많은 서식지
    const cnt = new Map<Habitat, number>();
    for (const a of world.animals) if (a.pen === i) cnt.set(ANIMALS[a.animal].habitat, (cnt.get(ANIMALS[a.animal].habitat) ?? 0) + 1);
    let hab: Habitat = 'grass', best = 0;
    for (const [k, v] of cnt) if (v > best) { best = v; hab = k; }
    const [f0, f1] = uids.length ? FLOOR[hab] : ['#6f8f5a', '#678554'];
    c.fillStyle = f0; c.fillRect(x + TILE / 2, y + TILE / 2, w - TILE, h - TILE);
    c.fillStyle = f1;
    for (let yy = y + 6; yy < y + h - 6; yy += 5) for (let xx = x + 6 + ((yy / 5) % 2) * 3; xx < x + w - 6; xx += 7) c.fillRect(xx, yy, 2, 1);
    if (hab === 'water' && uids.length) { c.fillStyle = '#73eff7'; const k = Math.floor(world.time * 2) % 4; for (let xx = x + 8 + k; xx < x + w - 8; xx += 12) c.fillRect(xx, y + h / 2, 3, 1); }
    // 울타리
    c.fillStyle = '#8a5a3b';
    c.fillRect(x + 2, y + 2, w - 4, 2); c.fillRect(x + 2, y + h - 4, w - 4, 2);
    c.fillRect(x + 2, y + 2, 2, h - 4); c.fillRect(x + w - 4, y + 2, 2, h - 4);
    c.fillStyle = '#5d3a24';
    for (let xx = x + 2; xx <= x + w - 4; xx += 8) { c.fillRect(xx, y, 2, 6); c.fillRect(xx, y + h - 6, 2, 6); }
    for (let yy = y + 2; yy <= y + h - 4; yy += 8) { c.fillRect(x, yy, 6, 2); c.fillRect(x + w - 6, yy, 6, 2); }
    if (this.selectedPen === i) { c.strokeStyle = '#f7c948'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    if (world.fedLeft[i] > 0) { c.fillStyle = '#f08cbe'; c.fillRect(x + w - 10, y + 6, 3, 2); c.fillRect(x + w - 11, y + 7, 5, 2); c.fillRect(x + w - 10, y + 9, 3, 1); }
    // 동물 (y 순서)
    const list = world.animals.filter((a) => a.pen === i).sort((a, b) => a.y - b.y);
    for (const a of list) {
      const fr = a.moving ? Math.floor(a.t * 5) % 2 : 0;
      const hop = a.moving && !motion.reduce && fr && hasPng(`animal_${String(a.animal).padStart(3, '0')}`) ? 1 : 0;
      const img = animalFrame(a.animal, fr);
      this.blitAnimal(a.shiny ? shinyOf(img) : img, a.x, a.y, GRADE_SIZE[ANIMALS[a.animal].grade], a.face > 0, hop);
      if (a.shiny) this.sparkle(a.x, a.y - 4 * GRADE_SIZE[ANIMALS[a.animal].grade], a.t + a.uid);
    }
  }
}
