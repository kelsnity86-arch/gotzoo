// 동물원 필드 시뮬레이션 (화면 없음). 위쪽 관객존: 관람객이 걷다 멈춰 동전을 던진다. 아래쪽 동물존: 우리 안을 동물이 돌아다닌다.
// 좌표 단위 = 도트 1칸. 타일 8칸.
import { ANIMALS } from '../data/animals';
import { COIN, FEED, STAFF_AI, VISITOR, upgradeDef } from '../data/balance';
import type { StaffKind } from '../data/staff';
import type { SaveData } from './state';
import { cardById, penCount, penSize, stageTipMul, totalAttract, upValue } from './rules';

export const TILE = 8;
export const ZONE_H = 48;      // 관객존 높이
export const PATH_Y0 = 18, PATH_Y1 = 40; // 관람객이 걷는 길 (관객존 안)
const GAP = 12;                // 우리 사이 길

export interface PenRect { x: number; y: number; w: number; h: number }
export interface Layout { w: number; h: number; pens: PenRect[]; cols: number }

/** 우리 안쪽 크기: 한 마리당 약 3타일 */
export function penInner(cap: number): [number, number] {
  const tiles = Math.max(12, Math.round(cap * 3));
  const w = Math.max(4, Math.ceil(Math.sqrt(tiles * 1.4)));
  const h = Math.max(3, Math.ceil(tiles / w));
  return [w * TILE, h * TILE];
}

/** 화면 비율(aspect = 가로/세로)에 맞춰 우리를 몇 열로 놓을지 정한다 */
export function computeLayout(n: number, cap: number, aspect: number): Layout {
  const [iw, ih] = penInner(cap);
  const pw = iw + TILE * 2, ph = ih + TILE * 2;
  let best = 1, bestScore = Infinity;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const w = cols * (pw + GAP) + GAP, h = ZONE_H + rows * (ph + GAP) + GAP;
    // 화면 비율과 가까울수록, 빈 칸이 적을수록 좋다
    const score = Math.abs(Math.log((w / h) / aspect)) + (cols * rows - n) * 0.15;
    if (score < bestScore) { bestScore = score; best = cols; }
  }
  const cols = best, rows = Math.ceil(n / cols);
  const w = cols * (pw + GAP) + GAP, h = ZONE_H + rows * (ph + GAP) + GAP;
  const pens: PenRect[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    pens.push({ x: GAP + c * (pw + GAP), y: ZONE_H + GAP + r * (ph + GAP), w: pw, h: ph });
  }
  return { w, h, pens, cols };
}

export interface AnimalEnt { uid: number; animal: number; pen: number; x: number; y: number; tx: number; ty: number; wait: number; t: number; face: number; moving: boolean }
export interface VisitorEnt { x: number; y: number; dir: number; kind: number; state: 'walk' | 'view' | 'leave'; targetX: number; t: number; viewFor: number; thrown: boolean; anim: number }
export interface CoinEnt { id: number; x: number; y: number; value: number; count: number; age: number; z: number; vz: number; picked: boolean }
export interface StaffEnt { uid: number; kind: StaffKind; x: number; y: number; target: { x: number; y: number } | null; t: number; anim: number; face: number }
export interface FloatText { x: number; y: number; text: string; t: number; color: string }

export type WorldEvent =
  | { type: 'tip'; amount: number; x: number; y: number }
  | { type: 'pickup'; amount: number; x: number; y: number; by: 'hand' | 'staff' }
  | { type: 'feed'; pen: number; by: 'hand' | 'staff' };

export class World {
  layout: Layout = { w: 100, h: 100, pens: [], cols: 1 };
  animals: AnimalEnt[] = [];
  visitors: VisitorEnt[] = [];
  coins: CoinEnt[] = [];
  staff: StaffEnt[] = [];
  floats: FloatText[] = [];
  events: WorldEvent[] = [];
  /** 우리별 먹이 버프 남은 시간 / 손으로 줄 때 대기 */
  fedLeft: number[] = [];
  feedCooldown: number[] = [];
  time = 0;
  private spawnAcc = 0;
  private coinId = 1;
  private layoutKey = '';
  /** 최근 1분 수입 (HUD) */
  private incomeLog: { t: number; base: number; bonus: number }[] = [];
  private keeperIdx = 0;

  constructor(private save: SaveData, private rng: () => number = Math.random) {}

  /** 화면 비율이 바뀌거나 우리가 늘면 다시 배치 */
  relayout(aspect: number) {
    const n = penCount(this.save), cap = penSize(this.save);
    const key = `${n}:${cap}:${aspect.toFixed(2)}`;
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.layout = computeLayout(n, cap, aspect);
    while (this.fedLeft.length < n) { this.fedLeft.push(0); this.feedCooldown.push(0); }
    // 동물은 자기 우리 안으로 다시 옮긴다
    for (const a of this.animals) this.placeIn(a, true);
  }

  private placeIn(a: AnimalEnt, keep = false) {
    const r = this.layout.pens[a.pen];
    if (!r) return;
    const x0 = r.x + TILE + 4, x1 = r.x + r.w - TILE - 4, y0 = r.y + TILE + 6, y1 = r.y + r.h - TILE - 2;
    if (!keep || a.x < x0 || a.x > x1 || a.y < y0 || a.y > y1) { a.x = x0 + this.rng() * (x1 - x0); a.y = y0 + this.rng() * (y1 - y0); }
    a.tx = a.x; a.ty = a.y;
  }

  /** 저장 데이터의 배치와 필드의 동물·직원을 맞춘다 */
  sync() {
    const s = this.save;
    const want = new Map<number, number>();
    s.pens.forEach((p, i) => { if (i < penCount(s)) for (const u of p) want.set(u, i); });
    this.animals = this.animals.filter((a) => want.get(a.uid) === a.pen);
    const have = new Set(this.animals.map((a) => a.uid));
    for (const [uid, pen] of want) {
      if (have.has(uid)) continue;
      const c = cardById(s, uid);
      if (!c || c.kind !== 'animal') continue;
      const a: AnimalEnt = { uid, animal: c.animal, pen, x: 0, y: 0, tx: 0, ty: 0, wait: this.rng() * 2, t: this.rng() * 10, face: -1, moving: false };
      this.placeIn(a);
      this.animals.push(a);
    }
    const staffWant = s.staffSlots.filter((u): u is number => u !== null);
    this.staff = this.staff.filter((e) => staffWant.includes(e.uid));
    for (const uid of staffWant) {
      if (this.staff.some((e) => e.uid === uid)) continue;
      const c = cardById(s, uid);
      if (!c || c.kind !== 'staff') continue;
      this.staff.push({ uid, kind: c.staff, x: 20 + this.rng() * (this.layout.w - 40), y: (PATH_Y0 + PATH_Y1) / 2, target: null, t: 0, anim: 0, face: 1 });
    }
  }

  get attract() { return totalAttract(this.save, (i) => (this.fedLeft[i] > 0 ? 1 + FEED.bonus : 1)); }
  get gateCap() { return upValue(this.save, 'gate'); }
  /** 분당 관람객 수요와 실제 입장 수 */
  get visitorDemand() { return VISITOR.basePerMin + VISITOR.perAttract * this.attract; }
  get visitorRate() { return Math.min(this.gateCap, this.visitorDemand); }
  /** 수요가 한도를 넘친 만큼 투척액이 오른다 */
  get overflowMul() {
    const d = this.visitorDemand, cap = this.gateCap;
    return d <= cap ? 1 : Math.min(VISITOR.overflowMaxMul, 1 + ((d - cap) / cap) * 0.5);
  }
  get tipMul() { return upValue(this.save, 'quality') * stageTipMul(this.save) * this.overflowMul; }
  get pickupRadius() { return upValue(this.save, 'pickup'); }

  incomePerMin() {
    const since = this.time - 60;
    let base = 0, bonus = 0;
    for (const e of this.incomeLog) if (e.t >= since) { base += e.base; bonus += e.bonus; }
    const span = Math.min(60, Math.max(10, this.time));
    return { base: Math.round(base * 60 / span), bonus: Math.round(bonus * 60 / span) };
  }

  private earn(base: number, bonus: number) {
    this.save.coins += base + bonus;
    this.save.stats.coinsEarned += base + bonus;
    if (bonus) this.save.stats.coinsPicked += bonus;
    this.incomeLog.push({ t: this.time, base, bonus });
    if (this.incomeLog.length > 600) this.incomeLog.splice(0, this.incomeLog.length - 600);
  }

  /** pointer: 월드 좌표의 커서 (없으면 null) */
  update(dt: number, pointer: { x: number; y: number } | null) {
    this.time += dt;
    const L = this.layout;
    for (let i = 0; i < this.fedLeft.length; i++) { this.fedLeft[i] = Math.max(0, this.fedLeft[i] - dt); this.feedCooldown[i] = Math.max(0, this.feedCooldown[i] - dt); }

    // 동물: 우리 안에서 잠깐 쉬다 걷다
    for (const a of this.animals) {
      a.t += dt;
      const r = L.pens[a.pen];
      if (!r) continue;
      if (a.wait > 0) { a.wait -= dt; a.moving = false; continue; }
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      if (d < 1) {
        a.wait = 0.5 + this.rng() * 2.5;
        const x0 = r.x + TILE + 4, x1 = r.x + r.w - TILE - 4, y0 = r.y + TILE + 6, y1 = r.y + r.h - TILE - 2;
        a.tx = x0 + this.rng() * (x1 - x0); a.ty = y0 + this.rng() * (y1 - y0);
        continue;
      }
      const sp = 10 * dt;
      a.x += (dx / d) * Math.min(sp, d); a.y += (dy / d) * Math.min(sp, d);
      if (Math.abs(dx) > 0.3) a.face = dx < 0 ? -1 : 1;
      a.moving = true;
    }

    // 관람객 생성
    if (this.animals.length > 0) {
      this.spawnAcc += (this.visitorRate / 60) * dt;
      while (this.spawnAcc >= 1) { this.spawnAcc -= 1; this.spawnVisitor(); }
    }
    for (let i = this.visitors.length - 1; i >= 0; i--) {
      const v = this.visitors[i];
      v.t += dt; v.anim += dt;
      if (v.state === 'walk') {
        v.x += v.dir * VISITOR.walkSpeed * dt;
        if ((v.dir > 0 && v.x >= v.targetX) || (v.dir < 0 && v.x <= v.targetX)) { v.state = 'view'; v.t = 0; }
      } else if (v.state === 'view') {
        if (!v.thrown && v.t > v.viewFor * 0.5) { v.thrown = true; this.throwCoin(v); }
        if (v.t > v.viewFor) { v.state = 'leave'; }
      } else {
        v.x += v.dir * VISITOR.walkSpeed * 1.2 * dt;
        if (v.x < -16 || v.x > L.w + 16) this.visitors.splice(i, 1);
      }
    }

    // 동전: 튀어 떨어진 뒤 바닥에서 20초
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.age += dt;
      if (c.z > 0 || c.vz > 0) { c.vz -= 160 * dt; c.z = Math.max(0, c.z + c.vz * dt); if (c.z === 0) c.vz = 0; }
      if (c.picked || c.age > COIN.lifeSec) { this.coins.splice(i, 1); continue; }
      if (pointer && c.z === 0 && Math.hypot(c.x - pointer.x, c.y - pointer.y) < this.pickupRadius) this.pick(c, 'hand');
    }

    this.updateStaff(dt);

    for (let i = this.floats.length - 1; i >= 0; i--) { this.floats[i].t += dt; if (this.floats[i].t > 1.1) this.floats.splice(i, 1); }
  }

  private spawnVisitor() {
    const L = this.layout;
    const dir = this.rng() < 0.5 ? 1 : -1;
    // 동물이 있는 우리 앞을 고른다 (위쪽 줄 우리일수록 잘 고름)
    const pens = this.layout.pens.map((_, i) => i).filter((i) => this.save.pens[i]?.length);
    const pi = pens.length ? pens[Math.floor(this.rng() * pens.length)] : 0;
    const r = L.pens[pi];
    const targetX = r ? r.x + r.w * (0.2 + this.rng() * 0.6) : L.w / 2;
    if (this.visitors.length > 160) return; // 화면이 너무 붐비면 그리기만 생략 (수입은 아래에서 바로)
    this.visitors.push({ x: dir > 0 ? -10 : L.w + 10, y: PATH_Y0 + 4 + this.rng() * (PATH_Y1 - PATH_Y0 - 6), dir, kind: Math.floor(this.rng() * 8),
      state: 'walk', targetX, t: 0, viewFor: VISITOR.viewSecMin + this.rng() * (VISITOR.viewSecMax - VISITOR.viewSecMin), thrown: false, anim: this.rng() });
  }

  private throwCoin(v: VisitorEnt) {
    const tip = Math.round((VISITOR.tipMin + this.rng() * (VISITOR.tipMax - VISITOR.tipMin)) * this.tipMul);
    this.earn(tip, 0); // 기본 수입은 던지는 순간 바로
    this.events.push({ type: 'tip', amount: tip, x: v.x, y: v.y - 12 });
    const bonus = Math.max(1, Math.round(tip * VISITOR.pickupBonus));
    const x = v.x + (this.rng() - 0.5) * 10, y = Math.min(ZONE_H - 4, Math.max(PATH_Y0 + 2, v.y + 6 + this.rng() * 6));
    // 가까운 동전과 합친다 (화면이 동전으로 덮이지 않게)
    const near = this.coins.find((c) => !c.picked && c.z === 0 && Math.hypot(c.x - x, c.y - y) < COIN.mergeDist);
    if (near) { near.value += bonus; near.count++; near.age = Math.min(near.age, 4); return; }
    this.coins.push({ id: this.coinId++, x, y, value: bonus, count: 1, age: 0, z: 10, vz: 40, picked: false });
  }

  /** 동전 줍기: 먼저 닿은 쪽만 보너스 (picked로 한 번만) */
  pick(c: CoinEnt, by: 'hand' | 'staff') {
    if (c.picked) return;
    c.picked = true;
    this.earn(0, c.value);
    this.events.push({ type: 'pickup', amount: c.value, x: c.x, y: c.y, by });
    this.floats.push({ x: c.x, y: c.y - 4, text: `+${c.value}`, t: 0, color: by === 'hand' ? '#fff3a3' : '#a7d65b' });
  }

  /** 손으로 먹이 주기 (우리별 대기 시간) */
  feed(pen: number, by: 'hand' | 'staff' = 'hand'): boolean {
    if (!this.save.pens[pen]?.length) return false;
    if (by === 'hand' && this.feedCooldown[pen] > 0) return false;
    this.fedLeft[pen] = FEED.sec;
    if (by === 'hand') this.feedCooldown[pen] = FEED.manualCooldown;
    this.events.push({ type: 'feed', pen, by });
    const r = this.layout.pens[pen];
    if (r) this.floats.push({ x: r.x + r.w / 2, y: r.y + 6, text: '냠냠! 매력 +10%', t: 0, color: '#ffc8dd' });
    return true;
  }

  private updateStaff(dt: number) {
    for (const e of this.staff) {
      e.t += dt; e.anim += dt;
      if (e.kind === 'collector') {
        // 탐색 범위 안 가장 가까운 동전으로
        if (!e.target || e.t > 1) {
          e.t = 0;
          let best: CoinEnt | null = null, bd: number = STAFF_AI.collectorSearch;
          for (const c of this.coins) { if (c.picked || c.z > 0) continue; const d = Math.hypot(c.x - e.x, c.y - e.y); if (d < bd) { bd = d; best = c; } }
          e.target = best ? { x: best.x, y: best.y } : { x: 10 + this.rng() * (this.layout.w - 20), y: PATH_Y0 + 4 + this.rng() * (PATH_Y1 - PATH_Y0 - 6) };
        }
        this.moveTo(e, STAFF_AI.collectorSpeed, dt);
        for (const c of this.coins) if (!c.picked && c.z === 0 && Math.hypot(c.x - e.x, c.y - e.y) < STAFF_AI.collectorReach) this.pick(c, 'staff');
      } else {
        // 사육사: 동물 있는 우리를 차례로 돌며 먹이
        const pens = this.layout.pens;
        if (!e.target) {
          const filled = pens.map((_, i) => i).filter((i) => this.save.pens[i]?.length);
          if (!filled.length) continue;
          const i = filled[this.keeperIdx++ % filled.length];
          const r = pens[i];
          e.target = { x: r.x + r.w / 2, y: r.y - 4 };
          (e as StaffEnt & { pen?: number }).pen = i;
        }
        if (this.moveTo(e, STAFF_AI.keeperSpeed, dt) && e.t > STAFF_AI.keeperFeedEvery) {
          e.t = 0;
          this.feed((e as StaffEnt & { pen?: number }).pen ?? 0, 'staff');
          e.target = null;
        }
      }
    }
  }

  /** 목표까지 걷는다. 도착하면 true */
  private moveTo(e: StaffEnt, speed: number, dt: number): boolean {
    if (!e.target) return true;
    const dx = e.target.x - e.x, dy = e.target.y - e.y, d = Math.hypot(dx, dy);
    if (d < 1.5) return true;
    const sp = speed * dt;
    e.x += (dx / d) * Math.min(sp, d); e.y += (dy / d) * Math.min(sp, d);
    if (Math.abs(dx) > 0.3) e.face = dx < 0 ? -1 : 1;
    return false;
  }
}

export const upgradeIcon = (id: Parameters<typeof upgradeDef>[0]) => upgradeDef(id).icon;
export { ANIMALS };
