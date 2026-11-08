// 필드 그리기: 관객존(길·관람객·동전) + 동물존(우리·동물). 도트 한 칸이 화면 픽셀 정수 개가 되게 배율을 맞춘다.
import { ANIMALS, type Habitat } from '../data/animals';
import { COIN, DAY } from '../data/balance';
import type { SaveData } from '../game/state';
import { BLOCK, PATH_Y0, PATH_Y1, TILE, ZONE_H, type World } from '../game/world';
import { penAttract } from '../game/rules';
import { animalFrame, avgColor, person16, personFrame, pixelDown, shinyOf, sprite, staff16, staffFrame, hasPng, type Sprite } from './sprites';
import { seasonOf } from '../data/seasons';
import { itemSprite } from '../data/facilities';
import { fmt } from '../ui/dom';
import { eventDef } from '../data/events';

export interface View { x: number; y: number; w: number; h: number }
/** GPT 타일 (assets/sprites/tiles): 서식지별 바닥 */
const FLOOR_TILE: Record<Habitat, string> = { grass: 'tiles_09', sand: 'tiles_10', water: 'tiles_11', snow: 'tiles_12', rock: 'tiles_13', cloud: 'tiles_14' };
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

  static readonly R = 2;
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

  /** 움직이지 않는 바탕(잔디·길·나무·울타리·우리 바닥)을 GPT 타일로 한 번 그려 둔다 */
  private background(world: World): HTMLCanvasElement | null {
    if (!hasPng('tiles_01')) return null;
    const L = world.layout;
    const habs = L.pens.map((_, i) => `${world.geo[i]?.theme ?? '-'}:${world.geo[i]?.shape ?? '-'}`);
    const season = seasonOf(this.seasonN).key;
    const items = this.items.map((it) => `${it.type}@${it.x},${it.y}`).join(';');
    const key = `${season}|${this.decoTier}|${items}|${L.w}x${L.h}|${L.pens.map((r) => `${r.x},${r.y},${r.w},${r.h}`).join(';')}|${habs.join(',')}|${world.geo.map((g) => g.mask.flat().filter(Boolean).length).join(',')}`;
    if (this.bg && key === this.bgKey) return this.bg;
    this.bgKey = key;
    const cv = this.bg ?? document.createElement('canvas');
    // 16px 타일을 살리려고 월드 1칸 = 2px로 그려 둔다
    const R = 2;
    cv.width = L.w * R; cv.height = L.h * R;
    const c = cv.getContext('2d')!;
    c.setTransform(R, 0, 0, R, 0, 0);
    c.imageSmoothingEnabled = false;
    // 예전 8px 타일 이름 → 계절 16px 타일 (있으면)
    const T16: Record<string, number> = { tiles_01: 1, tiles_02: 2, tiles_03: 3, tiles_04: 4, tiles_09: 5, tiles_10: 6, tiles_11: 7, tiles_12: 8, tiles_13: 9, tiles_14: 10, tiles_15: 11, tiles_16: 12, tiles_17: 13, tiles_23: 14, tiles_22: 15 };
    const F16: Record<string, string> = { tiles_05: 'h', tiles_06: 'v', tiles_07: 'p', tiles_08: 'g' };
    const tile = (k: string, x: number, y: number) => {
      const n = T16[k];
      if (n && hasPng(`t16_${season}_${n}`)) {
        const im = sprite(`t16_${season}_${n}`);
        if (n <= 10) { c.drawImage(im, x, y, 8, 8); return; }
        // 나무 · 덤불 같은 물체: 도트 비율 그대로, 칸 바닥에 맞춰 조금 크게
        const sc = 11 / Math.max(im.width, im.height);
        c.drawImage(im, Math.round(x + 4 - (im.width * sc) / 2), Math.round(y + 8 - im.height * sc), im.width * sc, im.height * sc);
        return;
      }
      const f = F16[k];
      if (f && hasPng(`f16_${this.decoTier}_${f}`)) { c.drawImage(sprite(`f16_${this.decoTier}_${f}`), x, y, 8, 8); return; }
      c.drawImage(sprite(k), x, y, 8, 8);
    };
    const fill = (k: string, x0: number, y0: number, w: number, h: number) => {
      c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
      for (let y = y0; y < y0 + h; y += TILE) for (let x = x0; x < x0 + w; x += TILE) tile(k, x, y);
      c.restore();
    };
    // 무늬를 죽여 잔잔하게: 타일 위에 그 타일 평균색을 반투명으로 덮는다
    const flat = (k: string, x0: number, y0: number, w: number, h: number, a: number) => {
      const n = T16[k], key = `t16_${season}_${n}`;
      c.globalAlpha = a; c.fillStyle = avgColor(hasPng(key) ? sprite(key) : sprite(k)); c.fillRect(x0, y0, w, h); c.globalAlpha = 1;
    };
    /** 물체(나무 · 소품): 도트 그림용으로 줄여서 칸 바닥 가운데에 */
    const obj = (im: Sprite, cx: number, by: number, maxUnits: number) => {
      const k = (maxUnits * R) / Math.max(im.width, im.height);
      const d = k < 1 ? pixelDown(im, im.width * k, im.height * k) : im;
      const s2 = k < 1 ? 1 / R : Math.max(1, Math.floor(k)) / R;
      c.drawImage(d, Math.round((cx - (d.width * s2) / 2) * R) / R, Math.round((by - d.height * s2) * R) / R, d.width * s2, d.height * s2);
    };
    const objTile = (k: string, cx: number, by: number, maxUnits: number) => { const n = T16[k]; const key = `t16_${season}_${n}`; if (hasPng(key)) obj(sprite(key), cx, by, maxUnits); };
    // 바닥: 잔디 한 가지 + 잔잔하게
    for (let y = 0; y < L.h; y += TILE) for (let x = 0; x < L.w; x += TILE) tile('tiles_01', x, y);
    flat('tiles_01', 0, 0, L.w, L.h, 0.55);
    // 관객존: 위 줄에 나무를 띄엄띄엄, 길, 아래 울타리 한 줄
    for (let x = 10, k = 0; x < L.w - 10; x += 26, k++) objTile(k % 3 === 1 ? 'tiles_16' : 'tiles_15', x, 15, k % 3 === 1 ? 9 : 13);
    fill('tiles_03', 0, PATH_Y0 - 2, L.w, PATH_Y1 - PATH_Y0 + 8);
    flat('tiles_03', 0, PATH_Y0 - 2, L.w, PATH_Y1 - PATH_Y0 + 8, 0.45);
    for (let x = 0; x < L.w; x += TILE) tile('tiles_05', x, ZONE_H - 8);
    // 우리가 차지한 타일 → 우리 번호 (붙은 우리 사이 울타리를 한 줄만 그리려고)
    const owner = new Map<string, number>();
    L.pens.forEach((_, i) => { const g = world.geo[i]; if (g) g.mask.forEach((row, y) => row.forEach((v, x) => { if (v) owner.set(`${g.gx + x * TILE},${g.gy + y * TILE}`, i); })); });
    const { bx0, by0, bw, bh } = L;
    // 부지 가장자리의 빈 블록에만 나무 몇 그루
    const itemAtBlock = new Set(this.items.filter((it) => it.x >= 0).map((it) => `${it.x},${it.y}`));
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      if (!(bx === 0 || bx === bw - 1 || by === bh - 1) || itemAtBlock.has(`${bx},${by}`)) continue;
      let empty = true;
      for (let ty = 0; ty < 4 && empty; ty++) for (let tx = 0; tx < 4; tx++) if (owner.has(`${bx0 + bx * BLOCK + tx * TILE},${by0 + by * BLOCK + ty * TILE}`)) { empty = false; break; }
      if (!empty || (bx * 7 + by * 13) % 3 !== 0) continue;
      objTile((bx + by) % 4 === 0 ? 'tiles_16' : 'tiles_15', bx0 + bx * BLOCK + BLOCK / 2, by0 + by * BLOCK + BLOCK - 4, (bx + by) % 4 === 0 ? 12 : 22);
    }
    // 우리: 모양대로 바닥(잔잔하게) · 울타리. 다른 우리와 맞닿은 쪽은 번호가 작은 우리만 울타리를 그린다
    L.pens.forEach((_, i) => {
      const g = world.geo[i];
      if (!g) return;
      const hab = g.theme;
      const floorTile = hab ? FLOOR_TILE[hab] : 'tiles_09';
      const m = g.mask;
      const inside = (x: number, y: number) => !!m[y]?.[x] || (owner.get(`${g.gx + x * TILE},${g.gy + y * TILE}`) ?? 99) < i;
      let gate = -1;
      for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
        if (!m[y][x]) continue;
        const px = g.gx + x * TILE, py = g.gy + y * TILE;
        tile(floorTile, px, py);
        flat(floorTile, px, py, TILE, TILE, 0.35);
        if (g.floor[y][x]) continue;
        const up = inside(x, y - 1), dn = inside(x, y + 1), lf = inside(x - 1, y), rt = inside(x + 1, y);
        if (up && dn && lf && rt) continue;
        const horiz = (!up || !dn) && lf && rt, vert = (!lf || !rt) && up && dn;
        if (g.shape === 'rect' && !horiz && !vert) tile('tiles_07', px, py);
        else { if (!up || !dn) tile('tiles_05', px, py); if (!lf || !rt) tile('tiles_06', px, py); }
        if (gate < 0 && horiz && !m[y - 1]?.[x] && Math.abs(x - g.cols / 2) < 1.5) { gate = x; tile('tiles_08', px, py); }
      }
    });
    // 시설 · 소품: 블록 1칸 안에 바닥에 맞춰 (도트 그림용 축소)
    for (const it of this.items) {
      if (it.x < 0) continue;
      const key2 = itemSprite(it.type);
      if (!hasPng(key2)) continue;
      const bx = L.bx0 + it.x * BLOCK, by = L.by0 + it.y * BLOCK;
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(bx + 6, by + BLOCK - 4, BLOCK - 12, 2);
      obj(sprite(key2), bx + BLOCK / 2, by + BLOCK - 3, BLOCK - 6);
    }
    // 입구 게이트 (울타리 꾸미기 단계): 관람객 길 왼쪽
    const gk = `fac_gate${this.decoTier}`;
    if (hasPng(gk)) { const im = sprite(gk); obj(im, 4 + (im.width / im.height) * (ZONE_H - 12) / 2, ZONE_H - 6, Math.max(ZONE_H - 12, (im.width / im.height) * (ZONE_H - 12))); }
    this.bg = cv;
    return cv;
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
    for (const a of list) {
      const fr = a.moving ? Math.floor(a.t * 5) % 2 : 0;
      const hop = a.moving && !reduceMotion && fr && hasPng(`animal_${String(a.animal).padStart(3, '0')}`) ? 1 : 0;
      const img = animalFrame(a.animal, fr);
      this.blitAnimal(a.shiny ? shinyOf(img) : img, a.x, a.y, GRADE_SIZE[ANIMALS[a.animal].grade], a.face > 0, hop);
      if (a.shiny) this.sparkle(a.x, a.y - 4 * GRADE_SIZE[ANIMALS[a.animal].grade], a.t + a.uid);
    }
  }

  private blit(img: Sprite, x: number, y: number, w: number, h: number, flip: boolean, hop: number) {
    const c = this.ctx;
    const px = Math.round(x - w / 2), py = Math.round(y - h) - hop;
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(px + 1, Math.round(y) - 1, w - 2, 1);
    if (flip) { c.save(); c.translate(px + w, py); c.scale(-1, 1); c.drawImage(img, 0, 0, w, h); c.restore(); }
    else c.drawImage(img, px, py, w, h);
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
  private blitAnimal(img: Sprite, x: number, y: number, mul: number, flip: boolean, hop: number) {
    // 16px 시트 그림(크다)은 큰 쪽이 9칸 × 등급 배율이 되게, 예전 8px 그림은 8칸
    if (img.width > 8 || img.height > 8) { this.blitDev(img, x, y, 9 * mul, flip, hop, true); return; }
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
  private blitDev(img: Sprite, x: number, y: number, units: number, flip: boolean, hop: number, fitMax = false) {
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
    this.shadow(c, cx, by, w * 0.62, Math.max(1, Math.round(k)));
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
