// 동물원 필드 시뮬레이션 (화면 없음). 위쪽 관객존: 관람객이 걷다 멈춰 동전을 던진다. 아래쪽 동물존: 우리 안을 동물이 돌아다닌다.
// 좌표 단위 = 도트 1칸. 타일 8칸.
import { ANIMALS } from '../data/animals';
import { COIN, DAY, DEBT, FEED, INCIDENT, STAFF_AI, VISITOR, upgradeDef } from '../data/balance';
import type { StaffKind } from '../data/staff';
import type { Mission, SaveData, StaffCard } from './state';
import { isEdge, penMask, type PenShape } from '../data/shapes';
import { BLOCK_TILES } from '../data/pieces';
import type { Habitat } from '../data/animals';
import { SEASON, rivalOf, rivalScale } from '../data/rivals';
import { SEASON_FX, yearOf } from '../data/seasons';
import { facSum, boardDims, curSeason, discoverSynergies, penCardAt, penCells, penOpt, penPiece, penTheme, type AttractCtx, bumpMission, ensureMissions, settleMissions, penAttract as totalAttractPen, cardById, closingShare, coinLifeBonus, dailyCosts, eventExtraSec, eventGapMul, feedBonus, penCount, placedStaffCards, stageTipMul, staffSpeed, staffSum, staffTipMul, totalAttract, upValue, vipMul, visitorMul, zooScale } from './rules';
import { EVENTS, EVENT_TIMING, eventDef, type EventId } from '../data/events';

export const TILE = 8;
/** 등급별 크기 배율 (render/field.ts의 GRADE_SIZE와 같게) */
export const GRADE_MUL = [1, 1.2, 1.45, 1.75, 2.2] as const;
export const ZONE_H = 80;      // 관객존 높이 (위 = 관객 건물 줄, 아래 = 관람객 길)
export const PATH_Y0 = 50, PATH_Y1 = 72; // 관람객이 걷는 길 (관객존 안)

export interface PenRect { x: number; y: number; w: number; h: number }
/** 우리 모양: 타일 격자 원점 · 칸 수 · 마스크(우리 칸) · 바닥(테두리 아닌 우리 칸) */
export interface PenGeo { gx: number; gy: number; cols: number; rows: number; shape: PenShape; theme: Habitat | null; mask: boolean[][]; floor: boolean[][]; floorCells: [number, number][] }
export interface Layout { w: number; h: number; pens: PenRect[]; cols: number; bx0: number; by0: number; bw: number; bh: number }

/** 블록 1칸 크기(px) · 부지 가장자리 여백 */
export const BLOCK = BLOCK_TILES * TILE;
const MARGIN = 8;
/** 부지(블록 격자) 화면 배치: 관객존 아래에 부지, 놓은 우리마다 바깥 사각형 */
export function computeLayout(s: SaveData): Layout {
  const [bw, bh] = boardDims(s);
  const bx0 = MARGIN, by0 = ZONE_H + MARGIN;
  const pens: PenRect[] = s.board.map((_, i) => {
    const cells = penCells(s, i);
    if (!cells.length) return { x: bx0, y: by0, w: BLOCK, h: BLOCK };
    const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return { x: bx0 + x0 * BLOCK, y: by0 + y0 * BLOCK, w: (Math.max(...xs) - x0 + 1) * BLOCK, h: (Math.max(...ys) - y0 + 1) * BLOCK };
  });
  return { w: bx0 * 2 + bw * BLOCK, h: by0 + bh * BLOCK + MARGIN, pens, cols: bw, bx0, by0, bw, bh };
}

export interface AnimalEnt { shiny?: boolean; uid: number; animal: number; pen: number; x: number; y: number; tx: number; ty: number; wait: number; t: number; face: number; moving: boolean }
export interface VisitorEnt { vip?: boolean; x: number; y: number; dir: number; kind: number; state: 'walk' | 'view' | 'leave'; targetX: number; t: number; viewFor: number; thrown: boolean; anim: number }
export interface CoinEnt { id: number; x: number; y: number; vx: number; vy: number; value: number; count: number; age: number; z: number; picked: boolean }
export interface StaffEnt { uid: number; kind: StaffKind; x: number; y: number; target: { x: number; y: number } | null; t: number; anim: number; face: number }
export interface FloatText { x: number; y: number; text: string; t: number; color: string }

export interface Emote { x: number; y: number; t: number; icon: string }
export type WorldEvent =
  | { type: 'tip'; amount: number; x: number; y: number }
  | { type: 'pickup'; amount: number; x: number; y: number; by: 'hand' | 'staff' }
  | { type: 'feed'; pen: number; by: 'hand' | 'staff' }
  | { type: 'eventStart'; id: EventId }
  | { type: 'eventEnd'; id: EventId }
  | { type: 'vip'; amount: number }
  | { type: 'night'; report: DayReport }
  | { type: 'morning'; day: number; strike: boolean; seasonStart: boolean }
  | { type: 'synergy'; name: string; desc: string }
  | { type: 'incident'; kind: 'thief' | 'sick'; blocked: boolean; loss: number; pen: number };

/** 하루 정산 */
export interface DayReport {
  day: number; base: number; bonus: number; visitors: number; coins: number; janitor: number; lost: number; topPen: number; topAttract: number;
  missions: Mission[]; missionTickets: number;
  /** 돈: 오늘 수입(관리인 회수 포함) − 소매치기 − 비용 = 순이익, 정산 후 코인 */
  income: number; stolen: number; costs: { salary: number; pens: number; food: number; climate: number; climateName: string; facility: number; total: number }; net: number; coinsAfter: number;
  /** 빚으로 끝난 날 연속 수 · 내일 파업하는지 */
  debtDays: number; strikeNext: boolean;
  /** 라이벌: 시즌 며칠째, 내 규모 · 라이벌 규모 */
  rivalName: string; seasonDay: number; mine: number; rival: number;
  /** 시즌 마지막 날이면 결과 */
  season: { result: 'win' | 'lose'; n: number; coins: number; tickets: number; year: number } | null;
}

export class World {
  layout: Layout = { w: 100, h: 100, pens: [], cols: 1, bx0: 0, by0: 0, bw: 1, bh: 1 };
  animals: AnimalEnt[] = [];
  visitors: VisitorEnt[] = [];
  coins: CoinEnt[] = [];
  staff: StaffEnt[] = [];
  floats: FloatText[] = [];
  emotes: Emote[] = [];
  /** 하루: 낮(day) → 해 질 녘(dusk) → 밤(night) */
  phase: 'day' | 'dusk' | 'night' = 'day';
  phaseT = 0;
  private today = { base: 0, bonus: 0, visitors: 0, coins: 0, stolen: 0 };
  /** 오늘 사고 시각(-1 = 없음) · 감기 걸린 우리(-1 = 없음) */
  private incidentAt = -1;
  sickPen = -1;
  /** 진행 중인 이벤트 */
  event: { id: EventId; left: number } | null = null;
  private eventTimer: number = EVENT_TIMING.firstAt;
  private emoteAcc = 0;
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
  /** 바닥까지 떨어져 놓친 보너스 합계 */
  missed = 0;

  constructor(private save: SaveData, private rng: () => number = Math.random) {
    // 다시 열어도 하루를 이어서
    this.scheduleIncident();
    if (save.atNight) this.phase = 'night';
    else { this.phaseT = Math.min(save.dayT, DAY.dayLen - 1); if (this.phaseT >= DAY.dayLen - DAY.duskLen) this.phase = 'dusk'; }
  }

  /** 화면 비율이 바뀌거나 우리가 늘면 다시 배치 */
  relayout(_aspect?: number) {
    const s = this.save, n = penCount(s);
    const key = `${s.upgrades.land}|${s.board.map((b) => `${b.uid},${b.x},${b.y},${b.rot}`).join(';')}`;
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.layout = computeLayout(s);
    while (this.fedLeft.length < n) { this.fedLeft.push(0); this.feedCooldown.push(0); }
    this.geoKey = '';
    this.updateShapes();
  }

  /** 우리 모양 (테마 = 지정했거나 가장 많은 서식지). 바뀌면 동물을 모양 안으로 옮긴다 */
  geo: PenGeo[] = [];
  private geoKey = '';
  private updateShapes() {
    const themes = this.layout.pens.map((_, i) => penTheme(this.save, i));
    const key = `${this.layoutKey}|${themes.join(',')}`;
    if (key === this.geoKey && this.geo.length === this.layout.pens.length) return;
    this.geoKey = key;
    // 조각의 블록 칸을 타일로 펼치고, 둥근 연못·팔각은 바깥 사각형 기준으로 깎는다
    this.geo = this.layout.pens.map((r, i) => {
      const cols = Math.round(r.w / TILE), rows = Math.round(r.h / TILE);
      const gx = r.x, gy = r.y;
      const cells = new Set(penCells(this.save, i).map(([x, y]) => `${x - (r.x - this.layout.bx0) / BLOCK},${y - (r.y - this.layout.by0) / BLOCK}`));
      const pc = penCardAt(this.save, i);
      const carve = pc ? penPiece(pc).carve : undefined;
      const cut = carve ? penMask(carve, cols, rows) : null;
      const mask = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => cells.has(`${Math.floor(x / BLOCK_TILES)},${Math.floor(y / BLOCK_TILES)}`) && (!cut || cut[y][x])));
      const floor = mask.map((row, y) => row.map((v, x) => v && !isEdge(mask, x, y)));
      const floorCells: [number, number][] = [];
      floor.forEach((row, y) => row.forEach((v, x) => { if (v) floorCells.push([x, y]); }));
      const shape: PenShape = mask.flat().every(Boolean) ? 'rect' : (carve ?? 'L');
      return { gx, gy, cols, rows, shape, theme: themes[i], mask, floor, floorCells };
    });
    for (const a of this.animals) this.placeIn(a, true);
  }
  /** 이 자리가 우리 바닥 안인지 (몸 크기만큼 여유) */
  private okAt(pen: number, x: number, y: number, half: number): boolean {
    const g = this.geo[pen];
    if (!g) return false;
    const at = (px: number, py: number) => !!g.floor[Math.floor((py - g.gy) / TILE)]?.[Math.floor((px - g.gx) / TILE)];
    return at(x, y - 1) && at(x - half * 0.8, y - 1) && at(x + half * 0.8, y - 1) && at(x, y - half * 1.6);
  }
  /** 우리 바닥 안 아무 자리 (큰 동물이 들어갈 자리가 없으면 바닥 칸 가운데) */
  private randomSpot(pen: number, animal: number): [number, number] {
    const g = this.geo[pen];
    if (!g || !g.floorCells.length) { const r = this.layout.pens[pen]; return [r.x + r.w / 2, r.y + r.h / 2]; }
    const half = 4 * GRADE_MUL[ANIMALS[animal].grade];
    for (let k = 0; k < 16; k++) {
      const [cx, cy] = g.floorCells[Math.floor(this.rng() * g.floorCells.length)];
      const x = g.gx + (cx + this.rng()) * TILE, y = g.gy + (cy + 0.3 + this.rng() * 0.7) * TILE;
      if (this.okAt(pen, x, y, half)) return [x, y];
    }
    const [cx, cy] = g.floorCells[Math.floor(this.rng() * g.floorCells.length)];
    return [g.gx + (cx + 0.5) * TILE, g.gy + (cy + 0.9) * TILE];
  }

  private placeIn(a: AnimalEnt, keep = false) {
    if (!this.layout.pens[a.pen]) return;
    const half = 4 * GRADE_MUL[ANIMALS[a.animal].grade];
    if (!keep || !this.okAt(a.pen, a.x, a.y, half)) [a.x, a.y] = this.randomSpot(a.pen, a.animal);
    a.tx = a.x; a.ty = a.y;
  }

  /** 저장 데이터의 배치와 필드의 동물·직원을 맞춘다 */
  private penKey = '';
  sync() {
    const s = this.save;
    // 배치가 바뀌면 새로 발동한 조합 시너지를 찾는다
    const pk = s.pens.map((p) => p.join(',')).join('|') + '#' + s.penTheme.join(',');
    if (pk !== this.penKey) {
      this.updateShapes();
      if (this.penKey) for (const st of discoverSynergies(s)) this.events.push({ type: 'synergy', name: st.name, desc: `같은 우리 동물 매력 +${Math.round(st.attract * 100)}%` });
      else discoverSynergies(s);
      this.penKey = pk;
    }
    const want = new Map<number, number>();
    s.pens.forEach((p, i) => { if (i < penCount(s)) for (const u of p) want.set(u, i); });
    this.animals = this.animals.filter((a) => want.get(a.uid) === a.pen);
    const have = new Set(this.animals.map((a) => a.uid));
    for (const [uid, pen] of want) {
      if (have.has(uid)) continue;
      const c = cardById(s, uid);
      if (!c || c.kind !== 'animal') continue;
      const a: AnimalEnt = { shiny: !!c.shiny, uid, animal: c.animal, pen, x: 0, y: 0, tx: 0, ty: 0, wait: this.rng() * 2, t: this.rng() * 10, face: -1, moving: false };
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

  /** 이벤트가 바꾸는 매력 (물놀이 데이 · 첫눈 · 폭염) */
  get attractCtx(): AttractCtx {
    const e = this.event ? eventDef(this.event.id) : null;
    return { allMul: e?.allMul, habitatMul: e?.habitat ? { [e.habitat]: e.habitatMul ?? 1 } : undefined };
  }
  get attract() { const fb = feedBonus(this.save); return totalAttract(this.save, (i) => (this.fedLeft[i] > 0 ? 1 + fb * (penOpt(this.save, i, 'feeder') ? 2 : 1) : 1) * (i === this.sickPen ? INCIDENT.sickMul : 1), this.attractCtx); }
  get gateCap() { return upValue(this.save, 'gate') * (1 + facSum(this.save, 'restroom')); }
  /** 분당 관람객 수요와 실제 입장 수 */
  get visitorDemand() { return (VISITOR.basePerMin + VISITOR.perAttract * this.attract) * visitorMul(this.save); }
  get visitorRate() { return Math.min(this.gateCap, this.visitorDemand) * (this.event ? eventDef(this.event.id).rateMul : 1); }
  /** 수요가 한도를 넘친 만큼 투척액이 오른다 */
  get overflowMul() {
    const d = this.visitorDemand, cap = this.gateCap;
    return d <= cap ? 1 : Math.min(VISITOR.overflowMaxMul, 1 + ((d - cap) / cap) * 0.25);
  }
  get tipMul() { return upValue(this.save, 'quality') * stageTipMul(this.save) * this.overflowMul * staffTipMul(this.save) * (this.event ? eventDef(this.event.id).tipMul : 1); }
  get coinLife() { return COIN.lifeSec + coinLifeBonus(this.save); }
  get pickupRadius() { return upValue(this.save, 'pickup'); }
  /** '쓸어 담기' 업그레이드를 사면 커서를 대기만 해도 줍는다. 그 전에는 눌러야 줍는다 */
  get canSweep() { return this.save.upgrades.pickup >= 1; }
  /** 누른 자리의 동전을 줍는다 (범위 안 모두). 주운 개수 */
  clickAt(x: number, y: number): number {
    let n = 0;
    const r = Math.max(this.pickupRadius, 4);
    for (const c of this.coins) if (!c.picked && Math.hypot(c.x - x, c.y - 1 - c.z - y) < r) { this.pick(c, 'hand'); n++; }
    return n;
  }

  incomePerMin() {
    const since = this.time - 60;
    let base = 0, bonus = 0;
    for (const e of this.incomeLog) if (e.t >= since) { base += e.base; bonus += e.bonus; }
    const span = Math.min(60, Math.max(10, this.time));
    return { base: Math.round(base * 60 / span), bonus: Math.round(bonus * 60 / span) };
  }

  private earn(base: number, bonus: number) {
    this.today.base += base; this.today.bonus += bonus;
    if (this.phase !== 'night') bumpMission(this.save, 'earn', base + bonus);
    this.save.coins += base + bonus;
    this.save.stats.coinsEarned += base + bonus;
    if (bonus) this.save.stats.coinsPicked += bonus;
    this.incomeLog.push({ t: this.time, base, bonus });
    if (this.incomeLog.length > 600) this.incomeLog.splice(0, this.incomeLog.length - 600);
  }

  /** pointer: 월드 좌표의 커서 (없으면 null) */
  /** 낮이 끝날 때까지 남은 초 (밤은 시간 제한 없음) */
  get phaseLeft() { return this.phase === 'night' ? Infinity : DAY.dayLen - this.phaseT; }
  /** 시즌 며칠째 (1 ~ SEASON.days) */
  get seasonDay() { return this.save.day - this.save.season.start + 1; }
  /** 라이벌 규모 (낮 동안 어제 규모에서 오늘 규모로 조금씩 커진다) */
  get rivalNow() {
    const d = this.save.day, k = this.seasonDay;
    const today = rivalScale(k, this.save.season.n);
    if (this.phase === 'night') return today;
    const prev = k > 1 ? rivalScale(k - 1, this.save.season.n) : today * 0.9;
    void d;
    return Math.round(prev + (today - prev) * Math.min(1, this.phaseT / (DAY.dayLen - DAY.duskLen)));
  }
  /** 내 동물원 규모 */
  get scale() { return zooScale(this.save); }
  /** 오늘 파업 중인지 */
  get striking() { return this.save.strike; }
  get isNight() { return this.phase === 'night'; }

  /** 밤 → 아침 (개장하기) */
  openPark() {
    if (this.phase !== 'night' || this.save.season.lost) return; // 폐원하면 더 못 연다
    this.phase = 'day'; this.phaseT = 0;
    this.save.day = (this.save.day ?? 1) + 1;
    this.save.atNight = false; this.save.dayT = 0;
    this.today = { base: 0, bonus: 0, visitors: 0, coins: 0, stolen: 0 };
    this.sickPen = -1;
    this.scheduleIncident();
    ensureMissions(this.save, this.rng);
    this.events.push({ type: 'morning', day: this.save.day, strike: this.save.strike, seasonStart: this.seasonDay === 1 });
  }

  private scheduleIncident() {
    this.incidentAt = this.rng() < INCIDENT.chance ? INCIDENT.at[0] + this.rng() * (INCIDENT.at[1] - INCIDENT.at[0]) : -1;
  }
  /** 사고: 소매치기(경비원이 막음) · 동물 감기(수의사가 막음) */
  private incident() {
    const kind: 'thief' | 'sick' = this.rng() < 0.5 ? 'thief' : 'sick';
    const block = kind === 'thief' ? staffSum(this.save, 'guard') : 1 - (1 - staffSum(this.save, 'vet')) * (1 - facSum(this.save, 'clinic'));
    const blocked = this.rng() < block;
    let loss = 0, pen = -1;
    if (!blocked && kind === 'thief') {
      loss = Math.round((this.today.base + this.today.bonus) * INCIDENT.thiefShare);
      this.save.coins -= loss; this.today.stolen += loss;
    }
    if (!blocked && kind === 'sick') {
      const filled = this.layout.pens.map((_, i) => i).filter((i) => this.save.pens[i]?.length);
      if (!filled.length) return;
      pen = filled[Math.floor(this.rng() * filled.length)];
      this.sickPen = pen;
    }
    this.events.push({ type: 'incident', kind, blocked, loss, pen });
  }

  private updateDay(dt: number) {
    if (!this.animals.length && this.phase === 'day') return; // 동물이 없으면 시간이 흐르지 않는다
    if (this.phase === 'night' || this.save.season.lost) return; // 밤은 '개장하기'를 누를 때까지
    const before = this.phaseT;
    this.phaseT += dt;
    this.save.dayT = this.phaseT;
    if (this.incidentAt >= 0 && before < this.incidentAt && this.phaseT >= this.incidentAt) { this.incidentAt = -1; this.incident(); }
    if (this.phase === 'day' && this.phaseT >= DAY.dayLen - DAY.duskLen) {
      this.phase = 'dusk';
      for (const v of this.visitors) if (v.state === 'walk') v.state = 'leave';
    } else if (this.phase === 'dusk' && this.phaseT >= DAY.dayLen) this.closePark();
  }

  /** 폐장: 바닥 동전 정리, 정산 */
  private closePark() {
    if (this.event) { this.events.push({ type: 'eventEnd', id: this.event.id }); this.event = null; }
    const sv = this.save;
    // 바닥 동전: 관리인 등급만큼 회수 ('야근'이면 전부), 나머지는 사라진다
    const share = closingShare(sv);
    let janitor = 0, lost = 0;
    for (const c of this.coins) {
      if (c.picked) continue;
      const v = Math.round(c.value * share); janitor += v; lost += c.value - v;
    }
    if (janitor) this.earn(0, janitor);
    this.phase = 'night'; this.phaseT = 0;
    sv.atNight = true; sv.dayT = 0;
    this.coins = [];
    this.visitors = [];
    let topPen = 0, topAttract = 0;
    this.layout.pens.forEach((_, i) => { const a = totalAttractPen(sv, i); if (a > topAttract) { topAttract = a; topPen = i; } });
    // 미션 정산
    const missions = (sv.missions?.day === sv.day ? sv.missions.list : []).map((m) => ({ ...m }));
    const missionTickets = settleMissions(sv);
    // 돈 정산: 월급 + 유지비
    const c = dailyCosts(sv);
    sv.coins -= c.total;
    const income = this.today.base + this.today.bonus;
    const net = income - this.today.stolen - c.total;
    sv.debtDays = sv.coins < 0 ? sv.debtDays + 1 : 0;
    sv.strike = sv.debtDays >= DEBT.strikeAfter;
    // 라이벌: 규모 비교
    const se = sv.season;
    sv.records.bestDay = Math.max(sv.records.bestDay, sv.day);
    const seasonDay = this.seasonDay;
    const mine = zooScale(sv), rival = rivalScale(seasonDay, se.n);
    let season: DayReport['season'] = null;
    if (seasonDay >= SEASON.days) {
      if (mine >= rival) {
        // 겨울(4시즌마다)을 이기면 1년 버틴 것: 1주년 보너스
        const year = se.n % 4 === 0 ? yearOf(se.n) : 0;
        const coins = Math.round(Math.max(0, income) * (SEASON.winDays + (year ? SEASON_FX.yearDays : 0)));
        const tickets = SEASON.winTickets + (year ? SEASON_FX.yearTickets : 0);
        sv.coins += coins; sv.tickets += tickets;
        sv.records.bestSeasons = Math.max(sv.records.bestSeasons, se.n);
        if (year) sv.records.bestYears = Math.max(sv.records.bestYears, year);
        season = { result: 'win', n: se.n, coins, tickets, year };
        sv.season = { n: se.n + 1, start: sv.day + 1, mine: 0, rival: 0 };
      } else {
        season = { result: 'lose', n: se.n, coins: 0, tickets: 0, year: 0 };
        se.lost = true;
      }
    }
    se.mine = mine; se.rival = rival;
    const { stolen, ...today } = this.today;
    const report: DayReport = {
      day: sv.day, ...today, janitor, lost, topPen, topAttract: Math.round(topAttract), missions, missionTickets,
      income, stolen, costs: { salary: c.salary, pens: c.pens, food: c.food, climate: c.climate, climateName: c.climateName, facility: c.facility, total: c.total }, net, coinsAfter: Math.round(sv.coins),
      debtDays: sv.debtDays, strikeNext: sv.strike,
      rivalName: rivalOf(se.n).name, seasonDay, mine, rival, season,
    };
    this.events.push({ type: 'night', report });
  }

  update(dt: number, pointer: { x: number; y: number } | null) {
    this.time += dt;
    this.updateDay(dt);
    const night = this.phase === 'night';
    const L = this.layout;
    for (let i = 0; i < this.fedLeft.length; i++) { this.fedLeft[i] = Math.max(0, this.fedLeft[i] - dt); this.feedCooldown[i] = Math.max(0, this.feedCooldown[i] - dt); }

    // 동물: 우리 안에서 잠깐 쉬다 걷다
    for (const a of this.animals) {
      a.t += dt;
      const r = L.pens[a.pen];
      if (!r) continue;
      if (night) { a.moving = false; continue; } // 밤에는 잔다
      if (a.wait > 0) { a.wait -= dt; a.moving = false; continue; }
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      if (d < 1) {
        a.wait = 0.5 + this.rng() * 2.5;
        [a.tx, a.ty] = this.randomSpot(a.pen, a.animal);
        continue;
      }
      const sp = 10 * dt;
      const nx = a.x + (dx / d) * Math.min(sp, d), ny = a.y + (dy / d) * Math.min(sp, d);
      // 모양 밖(ㄱ자 안쪽 모서리 등)으로 나가면 멈추고 다른 곳을 고른다
      if (!this.okAt(a.pen, nx, ny, 4 * GRADE_MUL[ANIMALS[a.animal].grade]) && this.okAt(a.pen, a.x, a.y, 4 * GRADE_MUL[ANIMALS[a.animal].grade])) { a.tx = a.x; a.ty = a.y; continue; }
      a.x = nx; a.y = ny;
      if (Math.abs(dx) > 0.3) a.face = dx < 0 ? -1 : 1;
      a.moving = true;
    }

    // 관람객 생성
    if (this.animals.length > 0 && this.phase === 'day') {
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

    // 동전: 살짝 튀었다가 관객존 바닥에 떨어져 있다. 오래 방치하면 사라진다 (보너스를 놓침)
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.age += dt;
      if (c.z > 0 || c.vy !== 0) { c.vy -= COIN.gravity * dt; c.z = Math.max(0, c.z + c.vy * dt); if (c.z === 0) c.vy = 0; }
      if (c.picked) { this.coins.splice(i, 1); continue; }
      if (c.age > this.coinLife) { this.coins.splice(i, 1); this.missed += c.value; continue; }
      // 손: 떨어지는 중에도 바로 줍는다 (그려진 동전 가운데 기준)
      if (pointer && this.canSweep && Math.hypot(c.x - pointer.x, c.y - 1 - c.z - pointer.y) < this.pickupRadius) this.pick(c, 'hand');
    }

    this.updateStaff(dt);
    this.updateEvent(dt);
    // 동물 말풍선: 가끔 하트·음표 (먹이 먹은 우리는 먹이 그림)
    this.emoteAcc += dt * Math.min(1.2, this.animals.length / 30);
    while (this.emoteAcc > 1 && this.animals.length) {
      this.emoteAcc -= 1;
      const a = this.animals[Math.floor(this.rng() * this.animals.length)];
      const fed = this.fedLeft[a.pen] > 0;
      this.emotes.push({ x: a.x, y: a.y - 10, t: 0, icon: night ? 'zz' : fed ? ['fx_11', 'fx_12', 'fx_13', 'fx_14'][a.animal % 4] : this.rng() < 0.6 ? 'fx_10' : 'fx_17' });
    }
    for (let i = this.emotes.length - 1; i >= 0; i--) { this.emotes[i].t += dt; if (this.emotes[i].t > 1.4) this.emotes.splice(i, 1); }

    for (let i = this.floats.length - 1; i >= 0; i--) { this.floats[i].t += dt; if (this.floats[i].t > 1.1) this.floats.splice(i, 1); }
  }

  private updateEvent(dt: number) {
    if (!this.animals.length || this.phase !== 'day') return;
    if (this.event) {
      this.event.left -= dt;
      if (this.event.left <= 0) { this.events.push({ type: 'eventEnd', id: this.event.id }); this.event = null; this.eventTimer = (EVENT_TIMING.gapMin + this.rng() * (EVENT_TIMING.gapMax - EVENT_TIMING.gapMin)) * eventGapMul(this.save); }
      return;
    }
    this.eventTimer -= dt;
    if (this.eventTimer > 0) return;
    const vm = vipMul(this.save), sk = curSeason(this.save).key;
    const w = (e: (typeof EVENTS)[number]) => (e.season && e.season !== sk ? 0 : e.weight * (e.vips ? vm : 1));
    const total = EVENTS.reduce((a, e) => a + w(e), 0);
    let r = this.rng() * total;
    const ev = EVENTS.find((e) => (r -= w(e)) <= 0) ?? EVENTS[0];
    this.event = { id: ev.id, left: EVENT_TIMING.durationSec + eventExtraSec(this.save) };
    this.events.push({ type: 'eventStart', id: ev.id });
    for (let k = 0; k < (ev.vips ?? 0); k++) this.spawnVisitor(true);
  }

  private spawnVisitor(vip = false) {
    const L = this.layout;
    const dir = this.rng() < 0.5 ? 1 : -1;
    // 동물이 있는 우리 앞을 고른다 (위쪽 줄 우리일수록 잘 고름)
    const pens = this.layout.pens.map((_, i) => i).filter((i) => this.save.pens[i]?.length);
    const pi = pens.length ? pens[Math.floor(this.rng() * pens.length)] : 0;
    const r = L.pens[pi];
    const targetX = r ? r.x + r.w * (0.2 + this.rng() * 0.6) : L.w / 2;
    if (this.visitors.length > 160 && !vip) return; // 화면이 너무 붐비면 더 들이지 않는다
    this.visitors.push({ vip, x: dir > 0 ? -10 : L.w + 10, y: PATH_Y0 + 4 + this.rng() * (PATH_Y1 - PATH_Y0 - 6), dir, kind: vip ? 15 : Math.floor(this.rng() * 15),
      state: 'walk', targetX, t: 0, viewFor: VISITOR.viewSecMin + this.rng() * (VISITOR.viewSecMax - VISITOR.viewSecMin), thrown: false, anim: this.rng() });
  }

  private throwCoin(v: VisitorEnt) {
    this.today.visitors++;
    bumpMission(this.save, 'visitors', 1);
    const raw = (VISITOR.tipMin + this.rng() * (VISITOR.tipMax - VISITOR.tipMin)) * this.tipMul;
    const tip = Math.round(raw * (v.vip ? EVENT_TIMING.vipTipMul : 1));
    // 매표원: 관람객마다 입장료 (투척액 기준, VIP 배율 제외)
    const fee = Math.round(raw * staffSum(this.save, 'ticket'));
    if (fee > 0) this.earn(fee, 0);
    if (v.vip) { this.save.stats.vips++; this.events.push({ type: 'vip', amount: tip }); this.floats.push({ x: v.x, y: v.y - 16, text: `VIP +${tip}`, t: 0, color: '#f7c948' }); }
    this.earn(tip, 0); // 기본 수입은 던지는 순간 바로
    this.events.push({ type: 'tip', amount: tip, x: v.x, y: v.y - 12 });
    const bonus = Math.max(1, Math.round(tip * VISITOR.pickupBonus));
    const x = v.x + (this.rng() - 0.5) * 10, y = Math.min(ZONE_H - 6, Math.max(PATH_Y0 + 2, v.y + 4 + this.rng() * 6));
    // 가까운 동전과 합친다 (오래된 쪽 시간을 그대로 따라서 수명이 늘지 않게)
    const near = this.coins.find((c) => !c.picked && c.z === 0 && Math.hypot(c.x - x, c.y - y) < COIN.mergeDist);
    if (near) { near.value += bonus; near.count++; return; }
    this.coins.push({ id: this.coinId++, x, y, vx: 0, vy: COIN.popSpeed, value: bonus, count: 1, age: 0, z: 8, picked: false });
  }

  /** 동전 줍기: 먼저 닿은 쪽만 보너스 (picked로 한 번만) */
  pick(c: CoinEnt, by: 'hand' | 'staff') {
    if (c.picked) return;
    c.picked = true;
    this.earn(0, c.value);
    this.events.push({ type: 'pickup', amount: c.value, x: c.x, y: c.y, by });
    if (by === 'hand') bumpMission(this.save, 'pickup', c.count);
    this.today.coins += c.count;
    this.floats.push({ x: c.x, y: c.y - 4, text: `+${c.value}`, t: 0, color: by === 'hand' ? '#fff3a3' : '#a7d65b' });
  }

  /** 손으로 먹이 주기 (우리별 대기 시간) */
  feed(pen: number, by: 'hand' | 'staff' = 'hand'): boolean {
    if (!this.save.pens[pen]?.length || this.phase === 'night') return false; // 밤엔 동물이 잔다
    if (by === 'hand' && this.feedCooldown[pen] > 0) return false;
    this.fedLeft[pen] = FEED.sec;
    if (by === 'hand') { this.feedCooldown[pen] = FEED.manualCooldown; bumpMission(this.save, 'feed', 1); }
    this.events.push({ type: 'feed', pen, by });
    const r = this.layout.pens[pen];
    if (r) this.floats.push({ x: r.x + r.w / 2, y: r.y + 6, text: `냠냠! 매력 +${Math.round(feedBonus(this.save) * 100)}%`, t: 0, color: '#ffc8dd' });
    return true;
  }

  private updateStaff(dt: number) {
    const working = new Map<number, StaffCard>(placedStaffCards(this.save).map((c) => [c.uid, c]));
    for (const e of this.staff) {
      const card = working.get(e.uid);
      if (!card) continue; // 파업 중: 제자리에 서 있다
      const sp = staffSpeed(card) > 1.01 && (e.kind === 'collector' || e.kind === 'keeper') ? staffSpeed(card) : 1;
      e.t += dt; e.anim += dt;
      if (e.kind === 'collector') {
        // 탐색 범위 안 가장 가까운 동전으로
        if (!e.target || e.t > 1) {
          e.t = 0;
          let best: CoinEnt | null = null, bd: number = STAFF_AI.collectorSearch;
          for (const c of this.coins) { if (c.picked || c.z > 0) continue; const d = Math.hypot(c.x - e.x, c.y - e.y); if (d < bd) { bd = d; best = c; } }
          e.target = best ? { x: best.x, y: best.y } : { x: 10 + this.rng() * (this.layout.w - 20), y: PATH_Y0 + 4 + this.rng() * (PATH_Y1 - PATH_Y0 - 6) };
        }
        this.moveTo(e, STAFF_AI.collectorSpeed * sp, dt);
        for (const c of this.coins) if (!c.picked && c.z === 0 && Math.hypot(c.x - e.x, c.y - e.y) < STAFF_AI.collectorReach) this.pick(c, 'staff');
      } else if (e.kind !== 'keeper') {
        // 그 밖의 직원: 길을 천천히 오가며 일한다 (효과는 상시 적용)
        if (!e.target || this.moveTo(e, 14, dt)) e.target = { x: 10 + this.rng() * (this.layout.w - 20), y: PATH_Y0 + 4 + this.rng() * (PATH_Y1 - PATH_Y0 - 6) };
        this.moveTo(e, 14, dt);
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
        if (this.moveTo(e, STAFF_AI.keeperSpeed * sp, dt) && e.t > STAFF_AI.keeperFeedEvery / sp) {
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
