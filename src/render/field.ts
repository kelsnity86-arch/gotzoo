// 필드 그리기: 관객존(길·관람객·동전) + 동물존(우리·동물). 도트 한 칸이 화면 픽셀 정수 개가 되게 배율을 맞춘다.
import { ANIMALS, type Habitat } from '../data/animals';
import { COIN, DAY } from '../data/balance';
import type { SaveData } from '../game/state';
import { BLOCK, PATH_Y0, PATH_Y1, TILE, ZONE_H, zoneRow, type VisitorEnt, type World } from '../game/world';
import { penAttract } from '../game/rules';
import { animalFrame, person16, personFrame, pixelDown, shinyOf, sprite, staff16, staffFrame, hasPng, type Sprite } from './sprites';
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
const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    this.userZoom = Math.max(1, Math.min(6, this.userZoom * factor));
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
  /** 깔끔한 스타일 (턱 테두리 · 벽돌 광장 · 단색 바닥 · 관객 건물 줄) */
  private wc: HTMLCanvasElement | null = null;
  private bg: HTMLCanvasElement | null = null;
  private seasonN = 1;
  private items: SaveData['items'] = [];
  private decoTier = 0;
  private bgKey = '';
  constructor(private ctx: CanvasRenderingContext2D) {}

  /** 움직이지 않는 바탕을 v2 월드 그림으로 한 번 그려 둔다 (월드 1칸 = R도트, 타일 8칸 = 24도트라 1:1)
   *  잔디(계절) → 관객 길(이어 붙는 돌길) → 우리 바닥 · 울타리(이어 붙는 울타리) → 우리 소품 → 빈 땅 공원 소품 → 시설 · 꾸미기 → 입구 */
  private background(world: World): HTMLCanvasElement | null {
    if (!hasPng('v2_ground_spring_1')) return null;
    const L = world.layout;
    const season = seasonOf(this.seasonN).key;
    const items = this.items.map((it) => `${it.type}@${it.x},${it.y}`).join(';');
    const key = `${season}|${this.decoTier}|${items}|${world.props.length}|${L.w}x${L.h}|${L.pens.map((r) => `${r.x},${r.y},${r.w},${r.h}`).join(';')}|${world.geo.map((g) => `${g.theme}:${g.gx},${g.gy}:${g.mask.map((r) => r.map(Number).join('')).join('/')}`).join(',')}`;
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

    // 2. 관객 길: 맵 양 끝 밖으로 이어진다
    const p0 = Math.floor(PATH_Y0 / TILE), p1 = Math.ceil(PATH_Y1 / TILE) - 1;
    const onPath = (_tx: number, ty: number) => ty >= p0 && ty <= p1;
    const w = season === 'winter' ? '_w' : '';
    for (let ty = p0; ty <= p1; ty++) for (let tx = 0; tx < TW; tx++) autotile(onPath, tx, ty, v(`path_sq${w}`), v(`path_ring${w}`), ringAt, true);

    // 3. 관객존 꾸미기: 길 위쪽 잔디에 나무 · 벤치 · 가로등 · 화단을 번갈아, 길 아래엔 낮은 생울타리
    for (const z of zoneRow(L.w)) obj(`park_${z.name === 'blossom' && season === 'winter' ? 'pine' : z.name}`, z.x, p0 * TILE - (z.name === 'lamp' ? 0 : 1));
    for (let x = 4; x < L.w - 10; x += 16) if ((x / 16) % 5 !== 2) obj('park_hedge', x + 8, ZONE_H - 1);

    // 4. 우리: 바닥 → 울타리. 우리마다 자기 둘레를 다 친다 (맞닿은 쪽은 두 줄이 나란히 붙어 끊김이 없다)
    const owner = new Map<string, number>();
    L.pens.forEach((_, i) => { const g = world.geo[i]; if (g) g.mask.forEach((row, y) => row.forEach((on, x) => { if (on) owner.set(`${g.gx / TILE + x},${g.gy / TILE + y}`, i); })); });
    const tier = Math.max(0, Math.min(3, this.decoTier));
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
      const look = looks[Math.floor(hash(bx, by + 7) * looks.length)];
      const X = bx0 + bx * BLOCK, Y = by0 + by * BLOCK;
      if (look.length === 1) obj(look[0], X + BLOCK / 2, Y + BLOCK * 0.75);
      else { obj(look[0], X + BLOCK * 0.4, Y + BLOCK * 0.62); obj(look[1], X + BLOCK * 0.72, Y + BLOCK * 0.92, hash(bx, by) < 0.5); }
    }

    // 7. 시설 · 꾸미기: 블록 1칸 안 바닥에 맞춰
    for (const it of this.items) {
      if (it.x < 0) continue;
      const X = bx0 + it.x * BLOCK, Y = by0 + it.y * BLOCK;
      if (it.type.startsWith('fac:')) { const k = `bld_${it.type.slice(4)}_2`; if (hasPng(`v2_${k}`)) { obj(k, X + BLOCK / 2, Y + BLOCK - 2); continue; } }
      const k2 = itemSprite(it.type);
      if (hasPng(k2)) this.obj(c, sprite(k2), X + BLOCK / 2, Y + BLOCK - 3, BLOCK - 8);
    }
    // 8. 입구 게이트 (울타리 꾸미기 단계): 관람객 길 왼쪽
    const gk = `fac_gate${this.decoTier}`;
    if (hasPng(gk)) { const im = sprite(gk); const k = Math.min(2, Math.max(1, Math.floor(((ZONE_H - 20) * R) / im.height))); this.obj(c, im, 4 + (im.width * k) / R / 2, p1 * TILE + TILE - 1, (Math.max(im.width, im.height) * k) / R); }
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
      if (uz > 1.15) { this.userZoom = Math.min(6, uz); this.camX = L.w / 2; this.camY = 0; }
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
    c.drawImage(this.wc, Math.round(this.ox * dpr), Math.round(this.oy * dpr), Math.round(L.w * z * dpr), Math.round(L.h * z * dpr));

    // 떠오르는 글자 (화면 좌표로, 글자는 선명하게)
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 글자는 굵은 테두리로 (어떤 바닥 위에서도 읽히게)
    const outlined = (text: string, x: number, y: number, color: string) => {
      c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#1a1c2c'; c.strokeText(text, x, y);
      c.fillStyle = color; c.fillText(text, x, y);
    };
    c.font = '15px Galmuri14, Galmuri11, sans-serif'; c.textAlign = 'center';
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
    c.font = '11px Galmuri11, sans-serif';
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
    this.seasonN = save.season.n; this.items = save.items; this.decoTier = save.upgrades.deco ?? 0;
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
      this.icon(img, co.x, co.y - 1 - co.z, 7);
      c.globalAlpha = 1;
    }

    // 관람객 · 직원 (y 순서)
    type D = { y: number; f: () => void };
    const list: D[] = [];
    for (const v of world.visitors) {
      const fr = v.state === 'view' ? 0 : Math.floor(v.anim * 6) % 2;
      list.push({ y: v.y, f: () => {
        const pose = this.poseSprite(v);
        if (pose) { const hop = v.pose === 'cheer' && !v.tossT && !reduceMotion ? Math.round(Math.abs(Math.sin(v.t * 7)) * 4) : 0; this.blitDev(pose, v.x, v.y, pose.height / FieldRenderer.R, false, hop); if (v.vip) this.icon(sprite('fx_15'), v.x, v.y - 14 + Math.sin(t * 6), 6); return; }
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
    if (world.phase !== 'day') {
      const k = world.phase === 'dusk' ? Math.min(1, (world.phaseT - (DAY.dayLen - DAY.duskLen)) / DAY.duskLen) : 1;
      c.fillStyle = world.phase === 'dusk' ? `rgba(239,125,50,${0.16 * k})` : 'rgba(20,24,60,0.38)';
      c.fillRect(0, 0, L.w, L.h);
      if (world.phase === 'night') {
        c.globalCompositeOperation = 'lighter';
        for (let x = 0, k2 = 0; x < L.w - 4; x += TILE, k2++) if (k2 % 8 === 5) {
          const g = c.createRadialGradient(x + 4, 8, 0, x + 4, 8, 22);
          g.addColorStop(0, 'rgba(247,201,72,0.45)'); g.addColorStop(1, 'rgba(247,201,72,0)');
          c.fillStyle = g; c.fillRect(x - 20, -14, 48, 44);
        }
        c.globalCompositeOperation = 'source-over';
      }
    }
    // 계절: 살짝 덧칠 + 날리는 꽃잎 · 낙엽 · 눈 (이벤트가 눈이면 더 많이)
    const sea = seasonOf(save.season.n);
    const ev = world.event ? eventDef(world.event.id) : null;
    c.fillStyle = sea.tint; c.fillRect(0, 0, L.w, L.h);
    const parts = ev?.snow ? ['#f4f4f4', '#e9f3ff'] : sea.particle;
    if (parts.length && !reduceMotion) {
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
      for (let i = 0; i < 90; i++) { const x = ((i * 53.7 + t * 30) % L.w), y = ((i * 37.3 + t * 140) % L.h); c.fillRect(Math.round(x), Math.round(y), 1, 3); }
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
  }

  private animalsIn(world: World, i: number) {
    const list = world.animals.filter((a) => a.pen === i).sort((a, b) => a.y - b.y);
    const water = world.geo[i]?.theme === 'water';
    for (const a of list) {
      const fr = a.moving ? Math.floor(a.t * 5) % 2 : 0;
      const has16 = hasPng(`animal_${String(a.animal).padStart(3, '0')}`);
      // 행동별 몸짓 (기기 픽셀): 놀기 = 통통, 먹기 · 마시기 = 고개 끄덕, 잠 = 천천히 숨쉬기, 덜덜 = 좌우 떨기
      let hop = a.moving && !reduceMotion && fr && has16 ? 1 : 0, x = a.x;
      if (!reduceMotion) {
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
      this.blitAnimal(a.shiny ? shinyOf(img) : img, x, a.y, mul, a.face > 0, hop, sink);
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

  /** 멈춰 선 관람객의 정면 자세 그림 (4종: 아이 · 여자 · 남자 · 어르신). 걷는 중이면 null */
  private poseSprite(v: VisitorEnt): Sprite | null {
    if (v.state !== 'view' && v.state !== 'sit') return null;
    const p = v.tossT ? 'toss' : v.state === 'sit' ? 'sit' : v.pose ?? 'watch';
    const k = `v2_va_${v.vip ? 1 : v.kind % 4}_${p}`;
    return hasPng(k) ? sprite(k) : null;
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
      const hop = a.moving && !reduceMotion && fr && hasPng(`animal_${String(a.animal).padStart(3, '0')}`) ? 1 : 0;
      const img = animalFrame(a.animal, fr);
      this.blitAnimal(a.shiny ? shinyOf(img) : img, a.x, a.y, GRADE_SIZE[ANIMALS[a.animal].grade], a.face > 0, hop);
      if (a.shiny) this.sparkle(a.x, a.y - 4 * GRADE_SIZE[ANIMALS[a.animal].grade], a.t + a.uid);
    }
  }
}
