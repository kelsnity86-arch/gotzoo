// 필드 그리기: 관객존(길·관람객·동전) + 동물존(우리·동물). 도트 한 칸이 화면 픽셀 정수 개가 되게 배율을 맞춘다.
import { ANIMALS, type Habitat } from '../data/animals';
import { COIN, DAY } from '../data/balance';
import type { SaveData } from '../game/state';
import { PATH_Y0, PATH_Y1, TILE, ZONE_H, type World } from '../game/world';
import { penAttract } from '../game/rules';
import { animalFrame, personFrame, sprite, staffFrame, hasPng, type Sprite } from './sprites';

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

  private bg: HTMLCanvasElement | null = null;
  private bgKey = '';
  constructor(private ctx: CanvasRenderingContext2D) {}

  /** 우리 바닥: 우리 안 동물의 가장 많은 서식지 */
  private penHabitat(world: World, i: number): Habitat | null {
    const cnt = new Map<Habitat, number>();
    for (const a of world.animals) if (a.pen === i) cnt.set(ANIMALS[a.animal].habitat, (cnt.get(ANIMALS[a.animal].habitat) ?? 0) + 1);
    let hab: Habitat | null = null, best = 0;
    for (const [k, v] of cnt) if (v > best) { best = v; hab = k; }
    return hab;
  }

  /** 움직이지 않는 바탕(잔디·길·나무·울타리·우리 바닥)을 GPT 타일로 한 번 그려 둔다 */
  private background(world: World): HTMLCanvasElement | null {
    if (!hasPng('tiles_01')) return null;
    const L = world.layout;
    const habs = L.pens.map((_, i) => this.penHabitat(world, i) ?? '-');
    const key = `${L.w}x${L.h}|${L.pens.map((r) => `${r.x},${r.y},${r.w},${r.h}`).join(';')}|${habs.join(',')}`;
    if (this.bg && key === this.bgKey) return this.bg;
    this.bgKey = key;
    const cv = this.bg ?? document.createElement('canvas');
    cv.width = L.w; cv.height = L.h;
    const c = cv.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    const tile = (k: string, x: number, y: number) => c.drawImage(sprite(k), x, y, 8, 8);
    const fill = (k: string, x0: number, y0: number, w: number, h: number) => {
      c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
      for (let y = y0; y < y0 + h; y += TILE) for (let x = x0; x < x0 + w; x += TILE) tile(k, x, y);
      c.restore();
    };
    // 잔디 (가끔 꽃잔디)
    for (let y = 0; y < L.h; y += TILE) for (let x = 0; x < L.w; x += TILE) tile(((x * 7 + y * 3) / TILE) % 11 === 0 ? 'tiles_02' : 'tiles_01', x, y);
    // 관객존: 위 줄 나무·덤불·가로등, 길, 아래 울타리
    for (let x = 0, k = 0; x < L.w - 4; x += TILE, k++) {
      const prop = ['tiles_15', 'tiles_16', 'tiles_15', 'tiles_17', 'tiles_15', 'tiles_23', 'tiles_16', 'tiles_22'][k % 8];
      tile(prop, x, 4);
    }
    fill('tiles_03', 0, PATH_Y0 - 2, L.w, PATH_Y1 - PATH_Y0 + 8);
    for (let x = 12; x < L.w - 8; x += 56) { tile('tiles_18', x, PATH_Y0 - 9); tile('tiles_21', x + 26, PATH_Y0 - 9); }
    for (let x = 0; x < L.w; x += TILE) tile('tiles_05', x, ZONE_H - 8);
    // 우리
    L.pens.forEach((r, i) => {
      const hab = this.penHabitat(world, i);
      fill(hab ? FLOOR_TILE[hab] : 'tiles_09', r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      for (let x = r.x + 8; x < r.x + r.w - 8; x += TILE) { tile('tiles_05', x, r.y); tile('tiles_05', x, r.y + r.h - 8); }
      for (let y = r.y + 8; y < r.y + r.h - 8; y += TILE) { tile('tiles_06', r.x, y); tile('tiles_06', r.x + r.w - 8, y); }
      tile('tiles_07', r.x, r.y); tile('tiles_07', r.x + r.w - 8, r.y); tile('tiles_07', r.x, r.y + r.h - 8); tile('tiles_07', r.x + r.w - 8, r.y + r.h - 8);
      tile('tiles_08', r.x + Math.floor(r.w / 2 / TILE) * TILE - 4, r.y);
      if (!hab) tile('tiles_19', r.x + r.w / 2 - 4, r.y + r.h / 2 - 4);
      else tile('tiles_20', r.x + r.w - 18, r.y + r.h - 18);
    });
    this.bg = cv;
    return cv;
  }

  /** 화면(CSS px) → 월드 좌표 */
  toWorld(sx: number, sy: number) { return { x: (sx - this.ox) / this.scale, y: (sy - this.oy) / this.scale }; }

  draw(world: World, save: SaveData, view: View, dpr: number, pointer: { x: number; y: number } | null) {
    const c = this.ctx, L = world.layout, t = world.time;
    // 배율: 기기 픽셀 기준 정수로 (도트가 고르게)
    const fit = Math.min(view.w / L.w, view.h / L.h);
    this.lastView = view; this.lastFit = fit; this.worldW = L.w; this.worldH = L.h;
    const dev = fit * this.userZoom * dpr;
    const z = dev >= 1 ? Math.max(1, Math.floor(dev)) / dpr : fit * this.userZoom;
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

    c.save();
    // 필드 칸 밖으로 그리지 않게 (확대했을 때)
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.beginPath(); c.rect(view.x, view.y, view.w, view.h); c.clip();
    c.setTransform(z * dpr, 0, 0, z * dpr, this.ox * dpr, this.oy * dpr);
    c.beginPath(); c.rect(0, 0, L.w, L.h); c.clip();
    const bg = this.background(world);
    if (bg) { c.drawImage(bg, 0, 0); this.drawDynamic(world, save); }
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
      if (co.count === 2) c.drawImage(sprite('coin_0'), Math.round(co.x - 2), Math.round(co.y - 6 - co.z), 8, 8);
      c.drawImage(img, Math.round(co.x - 4), Math.round(co.y - 5 - co.z), 8, 8);
      c.globalAlpha = 1;
    }

    // 관람객 · 직원 (y 순서)
    type D = { y: number; f: () => void };
    const list: D[] = [];
    for (const v of world.visitors) {
      const fr = v.state === 'view' ? 0 : Math.floor(v.anim * 6) % 2;
      list.push({ y: v.y, f: () => {
        this.blit(personFrame(v.kind, fr), v.x, v.y, 8, 12, v.dir > 0, v.state !== 'view' && fr && hasPng(`person_${String(v.kind).padStart(2, '0')}`) ? 1 : 0);
        // VIP 손님: 머리 위 별 + 금빛 테두리
        if (v.vip) { c.drawImage(sprite('fx_15'), Math.round(v.x - 4), Math.round(v.y - 21 + Math.sin(t * 6)), 8, 8); c.strokeStyle = '#f7c948'; c.lineWidth = 1; c.strokeRect(Math.round(v.x - 5) + 0.5, Math.round(v.y - 13) + 0.5, 10, 13); }
      } });
    }
    for (const e of world.staff) {
      const fr = Math.floor(e.anim * 6) % 2;
      list.push({ y: e.y, f: () => { this.blit(staffFrame(e.kind, fr), e.x, e.y, 8, 12, e.face > 0, 0); c.fillStyle = e.kind === 'collector' ? '#ef7d32' : '#38a35b'; c.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 15, 2, 2); } });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();

    // 동물 말풍선 (하트·음표·먹이)
    for (const e of world.emotes) {
      const k = e.t / 1.4;
      c.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      if (e.icon === 'zz') { c.fillStyle = '#c7cfdd'; c.fillRect(Math.round(e.x + k * 3), Math.round(e.y - 6 - k * 6), 3, 1); c.fillRect(Math.round(e.x + 2 + k * 3), Math.round(e.y - 5 - k * 6), 1, 1); c.fillRect(Math.round(e.x + 1 + k * 3), Math.round(e.y - 4 - k * 6), 1, 1); c.fillRect(Math.round(e.x + k * 3), Math.round(e.y - 3 - k * 6), 3, 1); }
      else c.drawImage(sprite(e.icon), Math.round(e.x - 4), Math.round(e.y - 6 - k * 6), 8, 8);
    }
    c.globalAlpha = 1;
    // 해 질 녘·밤: 붉게 → 남색, 밤에는 가로등 불빛
    if (world.phase !== 'day') {
      const k = world.phase === 'dusk' ? Math.min(1, (world.phaseT - (DAY.dayLen - DAY.duskLen)) / DAY.duskLen) : 1;
      c.fillStyle = world.phase === 'dusk' ? `rgba(239,125,50,${0.22 * k})` : 'rgba(20,24,60,0.55)';
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
    // 소나기
    if (world.event?.id === 'rain') {
      c.fillStyle = 'rgba(115,239,247,0.55)';
      for (let i = 0; i < 90; i++) { const x = ((i * 53.7 + t * 30) % L.w), y = ((i * 37.3 + t * 140) % L.h); c.fillRect(Math.round(x), Math.round(y), 1, 3); }
      c.fillStyle = 'rgba(41,54,111,0.12)'; c.fillRect(0, 0, L.w, L.h);
    }
    // 손 수거 범위
    if (pointer) {
      c.strokeStyle = 'rgba(255,243,163,0.8)'; c.lineWidth = 1 / z;
      c.beginPath(); c.arc(pointer.x, pointer.y, world.pickupRadius, 0, Math.PI * 2); c.stroke();
    }

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
    c.font = '13px Galmuri14, Galmuri11, sans-serif';
    L.pens.forEach((r, i) => {
      const n = save.pens[i]?.length ?? 0;
      const label = n ? `♥ ${Math.round(penAttract(save, i, world.fedLeft[i] > 0 ? 1.1 : 1)).toLocaleString('ko-KR')}` : '빈 우리';
      const sx = this.ox + (r.x + r.w / 2) * z, sy = this.oy + (r.y + 4) * z + 5;
      const tw = c.measureText(label).width + 12;
      c.fillStyle = 'rgba(18,20,30,0.88)';
      c.beginPath(); c.roundRect(sx - tw / 2, sy - 13, tw, 17, 5); c.fill();
      c.strokeStyle = world.fedLeft[i] > 0 ? '#f08cbe' : n ? '#e0a526' : '#566c86'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = world.fedLeft[i] > 0 ? '#ffc8dd' : n ? '#fff3a3' : '#c7cfdd';
      c.fillText(label, sx, sy);
    });
    c.restore();
  }

  /** 타일 바탕 위에: 선택 테두리·먹이 표시·동물 */
  private drawDynamic(world: World, save: SaveData) {
    const c = this.ctx;
    world.layout.pens.forEach((r, i) => {
      if (this.selectedPen === i) { c.strokeStyle = '#f7c948'; c.lineWidth = 1; c.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
      if (world.fedLeft[i] > 0) c.drawImage(sprite('fx_10'), r.x + r.w - 14, r.y + 6, 8, 8);
      void save;
      this.animalsIn(world, i);
    });
  }

  private animalsIn(world: World, i: number) {
    const list = world.animals.filter((a) => a.pen === i).sort((a, b) => a.y - b.y);
    for (const a of list) {
      const fr = a.moving ? Math.floor(a.t * 5) % 2 : 0;
      const hop = a.moving && !reduceMotion && fr && hasPng(`animal_${String(a.animal).padStart(3, '0')}`) ? 1 : 0;
      this.blitAnimal(animalFrame(a.animal, fr), a.x, a.y, GRADE_SIZE[ANIMALS[a.animal].grade], a.face > 0, hop);
    }
  }

  private blit(img: Sprite, x: number, y: number, w: number, h: number, flip: boolean, hop: number) {
    const c = this.ctx;
    const px = Math.round(x - w / 2), py = Math.round(y - h) - hop;
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(px + 1, Math.round(y) - 1, w - 2, 1);
    if (flip) { c.save(); c.translate(px + w, py); c.scale(-1, 1); c.drawImage(img, 0, 0, w, h); c.restore(); }
    else c.drawImage(img, px, py, w, h);
  }

  /** 동물: 등급 배율만큼 크게, 기기 픽셀 좌표로 (도트가 고르게) */
  private blitAnimal(img: Sprite, x: number, y: number, mul: number, flip: boolean, hop: number) {
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
      this.blitAnimal(animalFrame(a.animal, fr), a.x, a.y, GRADE_SIZE[ANIMALS[a.animal].grade], a.face > 0, hop);
    }
  }
}
