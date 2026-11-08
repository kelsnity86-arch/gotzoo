// 뽑ZOO: 시작 · 화면 배치 · 입력 · 루프 · 자동 저장
import './ui/styles.css';
import juaLicense from '@fontsource/jua/LICENSE?raw';
import gowunLicense from '@fontsource/gowun-dodum/LICENSE?raw';
import juaKo from '@fontsource/jua/files/jua-korean-400-normal.woff2?url';
import juaLa from '@fontsource/jua/files/jua-latin-400-normal.woff2?url';
import gowunKo from '@fontsource/gowun-dodum/files/gowun-dodum-korean-400-normal.woff2?url';
import gowunLa from '@fontsource/gowun-dodum/files/gowun-dodum-latin-400-normal.woff2?url';
import { defaultSave, loadSave, writeSave } from './game/state';
import { exportCode, importCode } from './game/savecode';
import { eventDef } from './data/events';
import { BLOCK, PATH_Y0, TILE, World, ZONE_H, zoneRow, type DayReport } from './game/world';
import { rotateCells } from './data/pieces';
import { facLevelValue, facilityDef, itemName } from './data/facilities';
import { drawPrice, penAttract, penCardAt, syncSlots, totalAttract, placedAnimals, offlineEarnings, finishLegacy, canPlacePen, placePen, autoPlace, cardById, penPiece, canPlaceItem, placeItem, itemAt, removeItem, ensureMissions, missionText, closeZoo } from './game/rules';
import { SEASON, rivalOf } from './data/rivals';
import { seasonOf, yearOf } from './data/seasons';
import { FieldRenderer } from './render/field';
import { hasPng, preloadPngs } from './render/sprites';
import { Panel, openPenSheet } from './ui/panel';
import { motion } from './ui/motion';
import { audio } from './ui/audio';
import { fillIcons, fmt, h, iconSlot, pix, toast } from './ui/dom';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const ui = document.getElementById('ui')!;
const ctx = canvas.getContext('2d', { alpha: false })!;
const habitatKo: Record<string, string> = { grass: '풀밭', sand: '사막', water: '물가', snow: '설원', rock: '바위산', cloud: '구름' };

let save = loadSave();
finishLegacy(save); // 예전 저장(우리 늘리기·넓히기) → 우리 조각
syncSlots(save);
const world = new World(save);
const field = new FieldRenderer(ctx);
field.mock = new URLSearchParams(location.search).has("mock");
const LOOP = true; // 코인(바닥 동전) → 뽑기 고리
let dpr = 1, W = 0, H = 0;
let fieldRect = { x: 0, y: 0, w: 1, h: 1 };
let pointer: { x: number; y: number } | null = null;
let penSheetOpen = false;

let replacing = false;
function persist() { if (replacing) return; save.lastSeen = Date.now(); if (!writeSave(save)) toast('저장에 실패했어요 (브라우저 저장소 확인)', 'bad'); }

// ── HUD ──
const hudCoins = h('b', {}), hudIncome = h('b', {});
const stat = (icon: string, val: HTMLElement, title: string) => h('span', { class: 'stat', title }, hasPng(icon) ? iconSlot(icon, 16) : null, val);
const strikeTag = h('span', { class: 'strike-tag hidden' }, '파업');
const clockText = h('b', {}), clockFill = h('i', {});
const clock = h('span', { class: 'clock', title: '하루: 낮에는 관람객, 밤에는 정비' }, clockText, h('span', { class: 'bar' }, clockFill));
const rivalText = h('b', {}), rivalFill = h('i', {});
const rivalChip = h('span', { class: 'rival', title: `라이벌 동물원: 시즌 마지막 날(${SEASON.days}일째) 동물원 규모가 더 커야 버틸 수 있어요. 규모 = 전시 동물 + 우리 + 직원 + 업그레이드 − 빚` }, rivalText, h('span', { class: 'bar' }, rivalFill));
const logo = h('div', { class: 'logo' }, '뽑', h('span', {}, 'ZOO'));
const hud = h('div', { class: 'hud' }, logo,
  h('div', { class: 'hud-coins hud-money', title: '돈 (입장료): 건물 · 업그레이드 · 월급' }, hasPng('v2_ui_money') ? iconSlot('v2_ui_money', 18) : h('i', { class: 'coin-ico' }), hudCoins, strikeTag),
  stat('v2_ui_up', hudIncome, '분당 입장료(돈) · 주운 코인'),
  h('div', { class: 'hud-stats' }, clock, rivalChip));
const hint = h('div', { class: 'field-hint' });
const eventBanner = h('div', { class: 'event-banner hidden' });
const openLeft = h('small', {});
const openBtn = h('div', { class: 'open-btn hidden' }, h('button', { class: 'btn', onclick: () => { world.openPark(); audio.sfx('event'); } }, '☀ 개장하기'), openLeft);
openLeft.textContent = '정비를 다 했으면 눌러서 다음 날 영업 시작';
// 확대 버튼: ＋ / － / 전체 (화면 오른쪽 아래). 누른 단계로 부드럽게
let zoomAnim: { sx: number; sy: number; to: number } | null = null;
const zoomCenter = () => ({ sx: fieldRect.x + fieldRect.w / 2 - canvas.getBoundingClientRect().left, sy: fieldRect.y + fieldRect.h / 2 - canvas.getBoundingClientRect().top });
const zoomTo = (to: number, at = zoomCenter()) => { zoomAnim = { ...at, to: Math.max(1, Math.min(MAX_ZOOM, to)) }; fling = null; };
const zoomReset = h('div', { class: 'zoom-btns' },
  h('button', { type: 'button', 'aria-label': '확대', onclick: () => { audio.sfx('click'); zoomTo(field.userZoom * 1.5); } }, '＋'),
  h('button', { type: 'button', 'aria-label': '축소', onclick: () => { audio.sfx('click'); zoomTo(field.userZoom / 1.5); } }, '－'),
  h('button', { type: 'button', class: 'all', onclick: () => { audio.sfx('click'); zoomAnim = null; fling = null; field.resetZoom(); } }, '전체'));
const settingsBtn = h('button', { class: 'hud-gear', title: '설정', onclick: () => openSettings() }, hasPng('v2_ui_gear') ? iconSlot('v2_ui_gear', 20) : '⚙');
hud.append(zoomReset, settingsBtn);

// ── 우리 놓기: 조각을 고르면 부지 위에 미리 보기, 누른 자리에 놓는다 ──
let placing: { uid: number; rot: number; item?: boolean } | null = null;
const placeInfo = h('span', {});
const placeBar = h('div', { class: 'place-bar hidden' }, placeInfo,
  h('button', { class: 'btn small', onclick: () => { if (placing) { placing.rot = (placing.rot + 1) % 4; audio.sfx('click'); updateGhost(); } } }, '⟳ 돌리기'),
  h('button', { class: 'btn small ghost', onclick: () => endPlace() }, '취소'));
function startPlace(uid: number) {
  placing = { uid, rot: 0 };
  if (!document.body.classList.contains('landscape')) panel.setOpen(false);
  const c = cardById(save, uid);
  placeInfo.textContent = c?.kind === 'pen' ? `${penPiece(c).name} 놓기 · 부지를 눌러요` : '';
  placeBar.classList.remove('hidden');
  updateGhost();
}
/** 시설 · 소품 놓기 (1칸) */
function startPlaceItem(uid: number) {
  placing = { uid, rot: 0, item: true };
  if (!document.body.classList.contains('landscape')) panel.setOpen(false);
  const it = save.items.find((i) => i.uid === uid);
  placeInfo.textContent = it ? `${itemName(it.type)} 놓기 · 빈 칸을 눌러요` : '';
  placeBar.classList.remove('hidden');
  updateGhost();
}
function endPlace() { placing = null; field.ghost = null; placeBar.classList.add('hidden'); panel.render(true); }
/** 커서(또는 마지막으로 누른 자리)를 블록 좌표로 */
let lastPlaceAt: { x: number; y: number } | null = null;
function blockAt(p: { x: number; y: number }, cells: [number, number][]) {
  const L = world.layout;
  const w = Math.max(...cells.map((c) => c[0])) + 1, hh = Math.max(...cells.map((c) => c[1])) + 1;
  return { bx: Math.round((p.x - L.bx0) / BLOCK - w / 2), by: Math.round((p.y - L.by0) / BLOCK - hh / 2) };
}
function updateGhost() {
  if (!placing) return;
  if (placing.item) {
    const p = pointer ?? lastPlaceAt ?? { x: world.layout.bx0 + world.layout.bw * BLOCK / 2, y: world.layout.by0 + world.layout.bh * BLOCK / 2 };
    const bx = Math.floor((p.x - world.layout.bx0) / BLOCK), by = Math.floor((p.y - world.layout.by0) / BLOCK);
    field.ghost = { cells: [[bx, by]], ok: canPlaceItem(save, placing.uid, bx, by) };
    return;
  }
  const c = cardById(save, placing.uid);
  if (c?.kind !== 'pen') { endPlace(); return; }
  const cells = rotateCells(penPiece(c).cells, placing.rot);
  const p = pointer ?? lastPlaceAt ?? { x: world.layout.bx0 + world.layout.bw * BLOCK / 2, y: world.layout.by0 + world.layout.bh * BLOCK / 2 };
  const { bx, by } = blockAt(p, cells);
  field.ghost = { cells: cells.map(([x, y]) => [x + bx, y + by]), ok: canPlacePen(save, placing.uid, bx, by, placing.rot) };
}
function tryPlace(p: { x: number; y: number }) {
  if (!placing) return;
  lastPlaceAt = p;
  if (placing.item) {
    const bx = Math.floor((p.x - world.layout.bx0) / BLOCK), by = Math.floor((p.y - world.layout.by0) / BLOCK);
    if (placeItem(save, placing.uid, bx, by)) { audio.sfx('buy'); world.sync(); persist(); toast('놓았어요', 'good'); endPlace(); }
    else { audio.sfx('deny'); updateGhost(); toast('빈 칸에만 놓을 수 있어요', 'bad', 1600); }
    return;
  }
  const c = cardById(save, placing.uid);
  if (c?.kind !== 'pen') { endPlace(); return; }
  const cells = rotateCells(penPiece(c).cells, placing.rot);
  const { bx, by } = blockAt(p, cells);
  if (placePen(save, placing.uid, bx, by, placing.rot)) {
    audio.sfx('buy');
    world.relayout(); autoPlace(save); world.sync(); persist();
    toast('우리를 놓았어요. 빈 칸에 동물을 넣었어요', 'good');
    endPlace();
  } else { audio.sfx('deny'); updateGhost(); toast('겹치거나 부지 밖이에요. 다른 자리를 눌러요', 'bad', 1600); }
}

const reports: DayReport[] = [];
// (시안 ?loop) 뽑기 게이지 · 콤보 표시
const gaugeFill = h('i', {}), gaugeText = h('b', {}), gaugeCoins = h('b', { class: 'gg-coins' });
const gauge = h('button', { class: 'gacha-gauge hidden', title: '뽑기', onclick: () => { audio.sfx('click'); panel.openTab(0); layout(); } },
  hasPng('v2_gm_spring_0') ? iconSlot('v2_gm_spring_0', 30) : null, hasPng('v2_ui_coin') ? iconSlot('v2_ui_coin', 16) : null, gaugeCoins, h('span', { class: 'gg-bar' }, gaugeFill), gaugeText);
const comboEl = h('div', { class: 'combo-pop hidden' });
/** 폰 세로: 가로로 돌려 달라는 안내 · PC 마우스 말풍선 */
const rotateNote = h('div', { class: 'rotate-note hidden' }, h('div', { class: 'rot-ico' }, '📱↻'), h('b', {}, '가로로 돌려 주세요'), h('span', {}, '뽑ZOO는 가로 화면에서 즐길 수 있어요'));
const tip = h('div', { class: 'hover-tip hidden' });
const panel = new Panel({ save, world, persist, overlayRoot: ui, startPlace, startPlaceItem, reports });
ui.append(hud, hint, eventBanner, openBtn, placeBar, panel.el, rotateNote, tip, comboEl);
if (LOOP) { world.loop = true; hud.insertBefore(gauge, hud.children[2] ?? null); gauge.classList.remove('hidden'); }
// HUD 높이가 바뀌면(줄바꿈) 필드 자리를 다시 잡는다
new ResizeObserver(() => layout()).observe(hud);
panel.onOpenChange = () => layout();

/** 화면 크기에 맞춘 UI 배율 (1280×720 기준: 1080p ≈ 1.2배, 1440p ≈ 1.45배, 가로 폰 0.85배) */
let uiScale = 1;
const upx = (v: number) => `${v / uiScale}px`;
function layout() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  // 가로 화면이 기본. 좁은 세로 화면(폰 세로)은 돌려 달라는 안내
  const landscape = W > H * 1.05 || W >= 900;
  document.body.classList.toggle('landscape', landscape);
  rotateNote.classList.toggle('hidden', landscape);
  uiScale = H < 500 ? 0.85 : H <= 800 ? 1 : Math.min(1.45, 1 + (H - 800) / 1300);
  ui.style.setProperty('zoom', String(uiScale));
  document.body.classList.toggle('compact', H < 500);
  const hudH = hud.getBoundingClientRect().height || 44;
  if (landscape) {
    // 오른쪽 패널 (접으면 탭 줄만 세로로)
    const open = panel.isOpen;
    const pw = open ? Math.min(400 * uiScale, Math.max(280 * uiScale, W * 0.34)) : 58 * uiScale;
    fieldRect = { x: 8, y: hudH + 8, w: W - pw - 16, h: H - hudH - 16 };
    panel.el.style.cssText = `width:${pw / uiScale}px`;
    document.body.style.setProperty('--pw', `${pw / uiScale}px`);
  } else {
    const tabsH = (panel.el.querySelector('.ptabs') as HTMLElement | null)?.getBoundingClientRect().height || 40;
    fieldRect = { x: 4, y: hudH + 4, w: W - 8, h: H - hudH - tabsH - 8 };
    panel.el.style.cssText = '';
    document.body.style.setProperty('--pw', '0px');
  }
  const handle = panel.el.querySelector('.drawer-close'); if (handle) handle.textContent = landscape ? '▶' : '▼';
  world.relayout(fieldRect.w / fieldRect.h);
}
window.addEventListener('resize', layout);

// ── 입력 ──
// 손가락 하나: 관객 길(동전 있는 곳)에서 시작하면 동전 쓸어 담기, 우리 · 잔디에서 시작하면 화면 이동(확대했을 때). 짧게 누르면 우리 자세히
// 두 번 톡톡 = 그 자리 확대 / 전체 보기, 두 손가락 = 확대 · 이동, 휠 = 확대. 끌다 놓으면 살짝 미끄러진다
const MAX_ZOOM = 4;
function toLocal(e: PointerEvent | WheelEvent) { const r = canvas.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; }
let downAt: { sx: number; sy: number; t: number } | null = null;
const touches = new Map<number, { sx: number; sy: number }>();
let pinch: { d: number; cx: number; cy: number } | null = null;
let dragging = false;
/** 이번 손가락이 화면 이동용인지 (관객 길 밖에서 시작) · 마지막 위치 · 속도(px/ms) */
let panMode = false;
let lastMove: { sx: number; sy: number; t: number } | null = null;
let vel = { x: 0, y: 0 };
let fling: { vx: number; vy: number } | null = null;
let lastTap: { sx: number; sy: number; t: number } | null = null;
let tapTimer = 0;
canvas.addEventListener('pointermove', (e) => {
  const p = toLocal(e);
  if (touches.has(e.pointerId)) touches.set(e.pointerId, p);
  if (touches.size >= 2) {
    const [a, b] = [...touches.values()];
    const d = Math.hypot(a.sx - b.sx, a.sy - b.sy), cx = (a.sx + b.sx) / 2, cy = (a.sy + b.sy) / 2;
    if (pinch) { field.zoomAt(cx, cy, d / pinch.d); field.panBy(cx - pinch.cx, cy - pinch.cy); }
    pinch = { d, cx, cy }; pointer = null; downAt = null; zoomAnim = null;
    return;
  }
  const pressed = e.pointerType === 'mouse' ? (e.buttons & 1) === 1 : touches.has(e.pointerId);
  if (pressed && downAt && panMode && field.userZoom > 1 && !placing) {
    if (dragging || Math.hypot(p.sx - downAt.sx, p.sy - downAt.sy) > 6) {
      dragging = true;
      const now = performance.now();
      if (lastMove) {
        const dx = p.sx - lastMove.sx, dy = p.sy - lastMove.sy, dtm = Math.max(1, now - lastMove.t);
        field.panBy(dx, dy);
        vel = { x: vel.x * 0.6 + (dx / dtm) * 0.4, y: vel.y * 0.6 + (dy / dtm) * 0.4 };
      }
      lastMove = { ...p, t: now };
      pointer = null; // 끄는 중엔 동전을 쓸지 않는다
      return;
    }
  }
  pointer = field.toWorld(p.sx, p.sy);
  if (placing) updateGhost();
});
canvas.addEventListener('pointerleave', () => { pointer = null; });
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (panel.isOpen && !document.body.classList.contains('landscape')) { panel.setOpen(false); panel.render(true); }
  const p = toLocal(e);
  if (e.pointerType !== 'mouse') touches.set(e.pointerId, p);
  if (touches.size >= 2) { pinch = null; return; }
  downAt = { ...p, t: performance.now() }; dragging = false; fling = null; zoomAnim = null;
  lastMove = { ...p, t: performance.now() }; vel = { x: 0, y: 0 };
  pointer = field.toWorld(p.sx, p.sy);
  panMode = pointer.y > ZONE_H; // 관객존(길) 밖에서 시작하면 화면 이동
  if (placing) { lastPlaceAt = pointer; updateGhost(); return; }
  if (panMode) return;
  // 누른 자리의 동전 줍기 (주웠으면 우리 창은 열지 않는다)
  if (world.clickAt(pointer.x, pointer.y) > 0) downAt = null;
});
const endTouch = (e: PointerEvent) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
canvas.addEventListener('pointercancel', (e) => { endTouch(e); downAt = null; dragging = false; });
canvas.addEventListener('pointerup', (e) => {
  const p = toLocal(e);
  const wasMulti = touches.size >= 2;
  endTouch(e);
  if (e.pointerType !== 'mouse') pointer = null;
  if (dragging) {
    // 놓으면 그 속도로 살짝 미끄러진다 (멈춰서 놓았으면 그대로)
    if (lastMove && performance.now() - lastMove.t < 80 && Math.hypot(vel.x, vel.y) > 0.15) fling = { vx: vel.x * 1000, vy: vel.y * 1000 };
    downAt = null; dragging = false; return;
  }
  if (wasMulti || !downAt || Math.hypot(p.sx - downAt.sx, p.sy - downAt.sy) > 8 || performance.now() - downAt.t > 400) { downAt = null; return; }
  downAt = null;
  const wp = field.toWorld(p.sx, p.sy);
  if (placing) { tryPlace(wp); return; }
  // 두 번 톡톡: 그 자리 확대 · 확대 중이면 전체 보기 (손가락만. 첫 번째 톡은 잠깐 기다렸다 처리)
  if (e.pointerType !== 'mouse') {
    const now = performance.now();
    if (lastTap && now - lastTap.t < 300 && Math.hypot(p.sx - lastTap.sx, p.sy - lastTap.sy) < 36) {
      clearTimeout(tapTimer); lastTap = null;
      if (field.userZoom > 1.3) { zoomAnim = null; field.resetZoom(); } else zoomTo(2.5, p);
      return;
    }
    lastTap = { ...p, t: now };
    clearTimeout(tapTimer);
    tapTimer = window.setTimeout(() => { lastTap = null; tapAt(wp); }, 260);
    return;
  }
  tapAt(wp);
});
/** 짧게 누른 곳: 시설 · 소품이면 치우기 창, 우리면 우리 창 */
function tapAt(wp: { x: number; y: number }) {
  if (placing) return;
  // 시설 · 소품을 누르면 치우기
  const ibx = Math.floor((wp.x - world.layout.bx0) / BLOCK), iby = Math.floor((wp.y - world.layout.by0) / BLOCK);
  const it = wp.y > world.layout.by0 ? itemAt(save, ibx, iby) : undefined;
  if (it && !penSheetOpen) {
    audio.sfx('click');
    const back = h('div', { class: 'overlay', onclick: (e: Event) => { if (e.target === back) back.remove(); } },
      h('div', { class: 'sheet' }, h('div', { class: 'sheet-head' }, h('b', {}, itemName(it.type))),
        h('p', { class: 'hint' }, '치우면 보관함으로 가요. 동물원 > 시설 · 꾸미기에서 다시 놓을 수 있어요.'),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn small danger', onclick: () => { removeItem(save, it.uid); world.sync(); persist(); panel.render(true); back.remove(); toast('보관함으로 옮겼어요', 'info'); } }, '치우기'),
          h('button', { class: 'btn small', onclick: () => back.remove() }, '닫기'))));
    ui.append(back);
    return;
  }
  const i = world.layout.pens.findIndex((r) => wp.x >= r.x && wp.x <= r.x + r.w && wp.y >= r.y && wp.y <= r.y + r.h);
  if (i >= 0 && !penSheetOpen) {
    audio.sfx('click');
    field.selectedPen = i; penSheetOpen = true;
    openPenSheet({ save, world, persist, overlayRoot: ui }, i, () => { penSheetOpen = false; field.selectedPen = -1; panel.render(true); });
  }
}
/** 매 프레임: 미끄러짐 · 버튼/두 번 톡 확대를 부드럽게 */
function stepCamera(dt: number) {
  if (fling) {
    field.panBy(fling.vx * dt, fling.vy * dt);
    const k = Math.exp(-dt * 5); fling.vx *= k; fling.vy *= k;
    if (Math.hypot(fling.vx, fling.vy) < 20 || field.userZoom <= 1) fling = null;
  }
  if (zoomAnim) {
    const cur = field.userZoom, to = zoomAnim.to;
    const next = Math.abs(to - cur) < 0.01 ? to : cur * Math.pow(to / cur, Math.min(1, dt * 12));
    field.zoomAt(zoomAnim.sx, zoomAnim.sy, next / cur);
    if (next === to || Math.abs(field.userZoom - to) < 0.01) zoomAnim = null;
  }
}
canvas.addEventListener('wheel', (e) => { e.preventDefault(); const p = toLocal(e); field.zoomAt(p.sx, p.sy, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });

// ── PC: 단축키 · 마우스 말풍선 ──
// 1~5 탭 · Tab 패널 열고 닫기 · + / − 확대 · 0 전체 보기 · Esc 창 닫기
window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
  const overlays = ui.querySelectorAll('.overlay');
  if (e.key === 'Escape') { if (overlays.length) { overlays[overlays.length - 1].remove(); e.preventDefault(); } else if (placing) { endPlace(); } return; }
  if (overlays.length) return;
  if (e.key >= '1' && e.key <= '5') { panel.openTab(Number(e.key) - 1); layout(); e.preventDefault(); return; }
  if (e.key === 'Tab') { panel.setOpen(!panel.isOpen); panel.render(true); layout(); e.preventDefault(); return; }
  if (e.key === '+' || e.key === '=') { zoomTo(field.userZoom * 1.5); e.preventDefault(); return; }
  if (e.key === '-' || e.key === '_') { zoomTo(field.userZoom / 1.5); e.preventDefault(); return; }
  if (e.key === '0') { zoomAnim = null; fling = null; field.resetZoom(); e.preventDefault(); }
});
/** 마우스를 올린 우리 · 관객 건물 이름과 핵심 수치 (마우스일 때만) */
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons || placing) { tip.classList.add('hidden'); return; }
  const p = toLocal(e), wp = field.toWorld(p.sx, p.sy);
  let text = '';
  const i = world.layout.pens.findIndex((r) => wp.x >= r.x && wp.x <= r.x + r.w && wp.y >= r.y && wp.y <= r.y + r.h);
  if (i >= 0 && world.geo[i]?.mask[Math.floor((wp.y - world.geo[i].gy) / TILE)]?.[Math.floor((wp.x - world.geo[i].gx) / TILE)]) {
    const pc = penCardAt(save, i);
    text = `${pc ? penPiece(pc).name : '우리'} · ♥${fmt(Math.round(penAttract(save, i)))} · ${save.pens[i]?.length ?? 0}마리`;
  } else if (wp.y < PATH_Y0 && wp.y > PATH_Y0 - 24) {
    const z = zoneRow(world.layout.w, save.facLv).find((z) => z.kind === 'bld' && Math.abs(z.x - wp.x) < 8);
    if (z && z.kind === 'bld') { const d = facilityDef(z.type), lv = save.facLv[z.type] ?? 0; text = lv ? `${d.name} ${lv}단계 · ${d.desc(facLevelValue(z.type, lv))}` : `${d.name} · 아직 없어요 (밤에 동물원 > 시설에서 지어요)`; }
  }
  tip.classList.toggle('hidden', !text);
  if (text) { tip.textContent = text; tip.style.left = upx(e.clientX + 14); tip.style.top = upx(e.clientY + 16); }
});
canvas.addEventListener('pointerleave', () => tip.classList.add('hidden'));

// ── 설정: 소리 · 저장 코드 · 초기화 ──
/** 크레딧 · 라이선스: 글꼴(OFL)은 저작권 표시와 라이선스 전문을 함께 보여 준다 */
function openCredits() {
  audio.sfx('click');
  const lic = (title: string, text: string) => h('details', { class: 'lic' }, h('summary', {}, title), h('pre', { class: 'lic-text' }, text));
  const back = h('div', { class: 'overlay', onclick: (e: Event) => { if (e.target === back) back.remove(); } },
    h('div', { class: 'sheet settings credits' },
      h('div', { class: 'sheet-head' }, h('b', {}, '크레딧 · 라이선스'), h('button', { class: 'btn small', onclick: () => back.remove() }, '닫기')),
      h('div', { class: 'section-title' }, '뽑ZOO'),
      h('p', { class: 'sub' }, '기획 · 개발 · 그림 편집: 뽑ZOO 개발팀'),
      h('p', { class: 'sub' }, '그림: AI 이미지 생성 도구로 만든 원본을 개발팀이 잘라 내고 다듬어 사용했어요. 게임 중에 새로 만들어지는 AI 콘텐츠는 없어요.'),
      h('p', { class: 'sub' }, '소리: 게임이 실행 중에 직접 합성해요.'),
      h('div', { class: 'section-title' }, '글꼴'),
      h('p', { class: 'sub' }, '주아 (BM JUA) · © 2018 The BM JUA Project Authors · SIL Open Font License 1.1'),
      h('p', { class: 'sub' }, '고운돋움 (Gowun Dodum) · © 2021 The Gowun Dodum Project Authors · SIL Open Font License 1.1'),
      lic('주아 라이선스 전문', juaLicense), lic('고운돋움 라이선스 전문', gowunLicense)));
  ui.append(back);
}

function openSettings() {
  audio.sfx('click');
  const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round(audio.volume * 100), id: 'vol' }) as HTMLInputElement;
  vol.addEventListener('input', () => audio.setSettings({ volume: Number(vol.value) / 100 }));
  const mute = h('button', { class: 'btn small ghost' }, audio.muted ? '소리 켜기' : '소리 끄기') as HTMLButtonElement;
  mute.addEventListener('click', () => { audio.setSettings({ muted: !audio.muted }); mute.textContent = audio.muted ? '소리 켜기' : '소리 끄기'; });
  const fxBtn = h('button', { class: 'btn small ghost' }, motion.reduce ? '연출 줄이기: 켬' : '연출 줄이기: 끔') as HTMLButtonElement;
  fxBtn.addEventListener('click', () => { motion.set(!motion.reduce); fxBtn.textContent = motion.reduce ? '연출 줄이기: 켬' : '연출 줄이기: 끔'; });
  const area = h('textarea', { class: 'code', placeholder: 'ZOO- 로 시작하는 저장 코드', spellcheck: 'false' }) as HTMLTextAreaElement;
  const msg = h('div', { class: 'sub' });
  const copy = h('button', { class: 'btn small', onclick: () => {
    persist(); const code = exportCode(save); area.value = code;
    try { navigator.clipboard.writeText(code).then(() => { msg.textContent = '복사했어요. 메모장에 붙여 두세요.'; }, () => { area.select(); msg.textContent = '코드를 선택해 뒀어요. 길게 눌러 복사하세요.'; }); } catch { area.select(); }
  } }, '저장 코드 복사');
  let pending: ReturnType<typeof importCode> | null = null;
  const load = h('button', { class: 'btn small ghost' }, '코드 불러오기') as HTMLButtonElement;
  load.addEventListener('click', () => {
    if (pending && pending.ok) { replaceSave(pending.save); back.remove(); toast('불러왔어요', 'good'); return; }
    pending = importCode(area.value);
    if (!pending.ok) { msg.textContent = pending.error; return; }
    msg.textContent = `돈 ${fmt(pending.save.coins)} · 카드 ${pending.save.cards.length}장 · ${pending.save.stage}단계. 지금 진행을 이 코드로 바꿀까요?`;
    load.textContent = '바꾸기 (지금 진행은 사라짐)';
  });
  let armed = false;
  const reset = h('button', { class: 'btn small danger' }, '저장 초기화') as HTMLButtonElement;
  reset.addEventListener('click', () => {
    if (!armed) { armed = true; reset.textContent = '정말 초기화 (되돌릴 수 없음)'; msg.textContent = '모든 카드·돈·코인·업그레이드가 지워져요. 먼저 저장 코드를 복사해 두세요.'; return; }
    replaceSave(defaultSave()); back.remove(); toast('처음부터 시작해요', 'gold');
  });
  const back = h('div', { class: 'overlay', onclick: (e: Event) => { if (e.target === back) back.remove(); } },
    h('div', { class: 'sheet settings' },
      h('div', { class: 'sheet-head' }, h('b', {}, '설정'), h('button', { class: 'btn small', onclick: () => back.remove() }, '닫기')),
      h('div', { class: 'section-title' }, '소리'), h('div', { class: 'row-btns' }, h('label', { for: 'vol' }, '효과음'), vol, mute),
      h('div', { class: 'section-title' }, '연출'), h('div', { class: 'row-btns' }, h('span', { class: 'sub' }, '흔들림 · 날아가는 효과를 줄여요'), fxBtn),
      h('div', { class: 'section-title' }, '저장 코드 (다른 기기로 옮기기)'), area, h('div', { class: 'row-btns' }, copy, load),
      h('div', { class: 'section-title' }, '초기화'), h('div', { class: 'row-btns' }, reset), msg,
      h('div', { class: 'section-title' }, '정보'), h('div', { class: 'row-btns' }, h('button', { class: 'btn small ghost', onclick: openCredits }, '크레딧 · 라이선스')),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn small ghost', onclick: () => { back.remove(); showTitle(); } }, '처음 화면 보기'))));
  ui.append(back);
}

/** 저장 데이터를 통째로 바꾼다 (불러오기·초기화): 새로 고침해서 모든 화면을 새 데이터로 */
function replaceSave(next: ReturnType<typeof defaultSave>) {
  replacing = true;
  writeSave({ ...next, lastSeen: Date.now() });
  location.reload();
}

// ── 타이틀 ──
function showTitle(onStart?: () => void) {
  const parade = h('div', { class: 'parade' }, ...[0, 30, 56, 78, 92, 95, 5, 60].map((id, i) => h('span', { style: `--i:${i}` }, pix(`animal_${String(id).padStart(3, '0')}`, 40))));
  const first = !save.freeDrawUsed;
  const back = h('div', { class: 'overlay title' },
    h('div', { class: 'title-box' },
      h('div', { class: 'title-logo' }, '뽑', h('span', {}, 'ZOO')),
      h('div', { class: 'title-sub' }, '동물 카드를 뽑고 합성해서 나만의 동물원을 키워요'),
      parade,
      h('button', { class: 'btn big', onclick: () => { audio.unlock(); audio.sfx('draw'); back.remove(); onStart?.(); } }, first ? '시작하기' : '이어하기'),
      h('div', { class: 'sub' }, 'PC: 커서로 동전 쓸어 담기 · 휠로 확대 / 폰: 손가락으로 쓸기 · 두 손가락 확대')));
  ui.append(back);
}

// ── 하루 정산 ──
function showReport(r: import('./game/world').DayReport) {
  const ahead = r.mine >= r.rival;
  const left = SEASON.days - r.seasonDay;
  const missions = r.missions.map((m) => h('div', { class: `mrow${m.progress >= m.target ? ' ok' : ''}` },
    h('span', {}, `${m.progress >= m.target ? '✔' : '✘'} ${missionText(m.kind, m.target)}`), h('small', {}, `${fmt(m.progress)} / ${fmt(m.target)}`)));
  const close = () => { back.remove(); if (r.season) showSeason(r); };
  const back = h('div', { class: 'overlay', onclick: (e: Event) => { if (e.target === back) close(); } },
    h('div', { class: 'fuse-result' },
      h('div', { class: 'reveal-title' }, `${r.day}일째 영업 끝!`),
      h('div', { class: 'report' },
        h('div', { class: 'wide money' },
          h('div', {}, h('span', {}, '수입'), h('b', { class: 'plus' }, `+${fmt(r.income)}`)),
          r.stolen ? h('div', {}, h('span', {}, '소매치기'), h('b', { class: 'minus' }, `-${fmt(r.stolen)}`)) : null,
          h('div', {}, h('span', {}, '직원 월급'), h('b', { class: 'minus' }, `-${fmt(r.costs.salary)}`)),
          h('div', {}, h('span', {}, '우리 유지비 · 사료비'), h('b', { class: 'minus' }, `-${fmt(r.costs.pens + r.costs.food)}`)),
          r.costs.climate ? h('div', {}, h('span', {}, r.costs.climateName), h('b', { class: 'minus' }, `-${fmt(r.costs.climate)}`)) : null,
          r.costs.facility ? h('div', {}, h('span', {}, '시설 유지비'), h('b', { class: 'minus' }, `-${fmt(r.costs.facility)}`)) : null,
          h('div', { class: 'net' }, h('span', {}, '오늘 순이익'), h('b', { class: r.net >= 0 ? 'plus' : 'minus' }, `${r.net >= 0 ? '+' : ''}${fmt(r.net)}`)),
          h('div', { class: 'after' }, h('span', {}, '남은 돈'), h('b', { class: r.coinsAfter >= 0 ? '' : 'minus' }, fmt(r.coinsAfter)))),
        h('div', {}, h('b', {}, fmt(r.visitors)), h('span', {}, '다녀간 관람객')),
        h('div', {}, h('b', {}, fmt(r.coins)), h('span', {}, '주운 동전')),
        h('div', {}, h('b', {}, fmt(r.bonus + r.janitor)), h('span', {}, '줍기 보너스')),
        h('div', { class: 'wide' }, h('b', {}, `우리 ${r.topPen + 1} · ♥${fmt(r.topAttract)}`), h('span', {}, '오늘의 인기 우리')),
        r.janitor ? h('div', { class: 'wide' }, h('b', {}, `+${fmt(r.janitor)}`), h('span', {}, '관리인이 폐장 후 주운 동전 (수입에 포함)')) : null,
        r.lost ? h('div', { class: 'wide' }, h('b', {}, `-${fmt(r.lost)}`), h('span', {}, '못 주워서 사라진 동전 (관리인이 있으면 일부를 주워요)')) : null,
        h('div', { class: `wide vs${ahead ? ' ahead' : ' behind'}` },
          h('b', {}, `규모 ${fmt(r.mine)} vs ${r.rivalName} ${fmt(r.rival)}`),
          h('span', {}, r.season ? '시즌 마지막 날 결과는…' : `${ahead ? `${fmt(r.mine - r.rival)} 앞서는 중` : `${fmt(r.rival - r.mine)} 뒤지는 중`} · 시즌 ${r.seasonDay}/${SEASON.days}일`))),
      !r.season && !ahead && left === 1 ? h('div', { class: 'warn' }, '⚠ 내일이 마지막 날! 규모가 작으면 동물원이 문을 닫아요') : null,
      r.coinsAfter < 0 ? h('div', { class: 'warn' }, r.strikeNext ? `⚠ 빚이 ${r.debtDays}일째! 내일 직원들이 파업해요` : `⚠ 빚 ${fmt(-r.coinsAfter)}코인 · 갚기 전엔 뽑기·공사 불가, 3일 이어지면 파업 (${r.debtDays}일째)`) : null,
      missions.length ? h('div', { class: 'mlist' }, h('div', { class: 'section-title' }, `영업 미션 ${r.missionTickets ? `· 뽑기권 +${r.missionTickets}` : ''}`), ...missions) : null,
      h('button', { class: 'btn', onclick: close }, r.season ? '결과 보기' : '밤 정비 시작')));
  ui.append(back);
}

// ── 시즌 결과: 승리 / 폐원 ──
function showSeason(r: import('./game/world').DayReport) {
  const se = r.season!;
  if (se.result === 'win') {
    audio.sfx('legend');
    const next = rivalOf(se.n + 1);
    const back = h('div', { class: 'overlay' },
      h('div', { class: 'fuse-result win' },
        h('div', { class: 'reveal-title' }, se.year ? `🎂 ${se.year}주년! 1년을 버텼어요` : `${seasonOf(se.n).icon} ${seasonOf(se.n).name} 시즌 승리!`),
        h('div', { class: 'sub' }, `${r.rivalName}을(를) 규모 ${fmt(r.mine - r.rival)} 차이로 이겼어요`),
        h('div', { class: 'offline-amount' }, `+${fmt(se.coins)} · 뽑기권 +${se.tickets}`),
        h('div', { class: 'sub' }, `다음 계절 ${seasonOf(se.n + 1).icon}${seasonOf(se.n + 1).name} · 라이벌 ${next.name} (${next.owner}) · 더 강해졌어요`),
        h('button', { class: 'btn big', onclick: () => { back.remove(); panel.render(true); } }, '좋아!')));
    ui.append(back);
  } else showClosure();
}

function showClosure() {
  audio.sfx('fuseFail');
  const rc = save.records;
  const back = h('div', { class: 'overlay closure' },
    h('div', { class: 'fuse-result' },
      h('div', { class: 'reveal-title' }, '동물원 폐원…'),
      h('div', { class: 'sub' }, `${rivalOf(save.season.n).name}에게 손님을 빼앗겼어요 (규모 ${fmt(save.season.mine)} vs ${fmt(save.season.rival)})`),
      h('div', { class: 'report' },
        h('div', {}, h('b', {}, `${save.day}일`), h('span', {}, '버틴 날')),
        h('div', {}, h('b', {}, `${save.season.n - 1}번 · ${Math.floor((save.season.n - 1) / 4)}년`), h('span', {}, '이긴 라이벌 · 버틴 해')),
        h('div', {}, h('b', {}, `${Math.max(rc.bestDay, save.day)}일`), h('span', {}, '최고 기록')),
        h('div', {}, h('b', {}, `${save.dex.filter(Boolean).length}종`), h('span', {}, '도감 (그대로 남아요)'))),
      h('div', { class: 'sub' }, '동물원·돈·코인·카드는 처음부터 다시 시작해요. 도감과 기록은 남아요.'),
      h('button', { class: 'btn big', onclick: () => replaceSave(closeZoo(save)) }, '새 동물원 열기')));
  ui.append(back);
}

// ── 자리 비움 수익 ──
function showOffline() {
  const r = offlineEarnings(save);
  save.lastSeen = Date.now();
  if (!r || r.amount <= 0) return;
  const hrs = Math.floor(r.minutes / 60), mins = Math.floor(r.minutes % 60);
  const take = () => { save.coins += r.amount; save.stats.coinsEarned += r.amount; persist(); audio.sfx('buy'); back.remove(); toast(`자리 비움 수익 +${fmt(r.amount)}`, 'gold'); };
  const back = h('div', { class: 'overlay' },
    h('div', { class: 'fuse-result win' },
      h('div', { class: 'reveal-title' }, '어서 오세요!'),
      h('div', { class: 'sub' }, `자리를 비운 ${hrs ? `${hrs}시간 ` : ''}${mins}분 동안 관람객이 다녀갔어요 (최대 8시간, 평소의 30%)`),
      h('div', { class: 'offline-amount' }, hasPng('v2_ui_coin') ? pix('v2_ui_coin', 28) : null, `+${fmt(r.amount)}`),
      h('button', { class: 'btn big', onclick: take }, '받기')));
  ui.append(back);
}

// ── 루프 ──
let last = performance.now(), hudAcc = 0, saveAcc = 0;
function frame(now: number) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  world.relayout(fieldRect.w / fieldRect.h);
  world.sync();
  stepCamera(dt);
  world.update(dt, pointer);
  for (const ev of world.events) {
    if (ev.type === 'night') { reports.push(ev.report); if (reports.length > 14) reports.shift(); audio.sfx('fuseWin'); showReport(ev.report); persist(); panel.render(true); }
    else if (ev.type === 'morning') {
      const sd = world.seasonDay;
      if (sd === 1) {
        const se = seasonOf(save.season.n);
        toast(`${se.icon} ${yearOf(save.season.n)}년 ${se.name}이 왔어요! ${habitatKo[se.strong]} 동물 +20%${se.weak ? ` · ${habitatKo[se.weak]} −15%` : ''}${se.climate ? ` · ${se.climateName}` : ''}`, 'gold', 3600);
        window.setTimeout(() => toast(`새 라이벌 '${rivalOf(save.season.n).name}' 등장! ${SEASON.days}일째 밤에 규모로 겨뤄요`, 'gold', 3200), 1400);
      }
      else if (sd === SEASON.days) toast(`${ev.day}일째 아침 · 시즌 마지막 날! 오늘 결판나요`, 'bad', 3000);
      else toast(`${ev.day}일째 아침! 동물원 문을 열었어요`, 'gold', 2200);
      if (ev.strike) window.setTimeout(() => toast('빚이 3일 넘게 밀려서 오늘은 직원들이 파업해요!', 'bad', 3200), 800);
      persist(); panel.render(true);
    }
    else if (ev.type === 'pickup' && ev.by === 'hand') { if (LOOP) { audio.coinCombo(ev.combo ?? 0); if (ev.lucky) audio.sfx('rare'); } else audio.sfx('coin'); }
    else if (ev.type === 'combo') { audio.sfx('buy'); comboEl.textContent = `콤보 ×${ev.n} 끝! 보너스 +${fmt(ev.bonus)}`; comboEl.classList.remove('hidden'); comboEl.classList.add('end'); window.setTimeout(() => { comboEl.classList.add('hidden'); comboEl.classList.remove('end'); }, 1300); }
    else if (ev.type === 'eventStart') { audio.sfx('event'); const d = eventDef(ev.id); toast(`${d.name}! ${d.desc}`, 'gold', 2600); }
    else if (ev.type === 'eventEnd') toast(`${eventDef(ev.id).name} 끝`, 'info');
    else if (ev.type === 'synergy') { audio.sfx('rare'); toast(`✨ 시너지 발견! ${ev.name} · ${ev.desc}`, 'gold', 3000); panel.render(true); }
    else if (ev.type === 'incident') {
      if (ev.kind === 'thief') toast(ev.blocked ? '경비원이 소매치기를 잡았어요!' : `소매치기! 오늘 수입 중 ${fmt(ev.loss)}돈을 잃었어요 (경비원이 막아요)`, ev.blocked ? 'good' : 'bad', 2800);
      else toast(ev.blocked ? '수의사가 동물 감기를 미리 막았어요!' : `우리 ${ev.pen + 1} 동물들이 감기에 걸렸어요. 오늘 매력 −40% (수의사가 막아요)`, ev.blocked ? 'good' : 'bad', 2800);
      audio.sfx(ev.blocked ? 'buy' : 'deny');
    }
    else if (ev.type === 'vip') { audio.sfx('rare'); toast(`VIP 손님이 큰 동전(${fmt(ev.amount)})을 떨어뜨렸어요! 주워요`, 'gold', 2200); }
  }
  world.events.length = 0;
  field.draw(world, save, fieldRect, dpr, pointer);
  hudAcc += dt; saveAcc += dt;
  if (hudAcc > 0.25) { hudAcc = 0; updateHud(); panel.render(); }
  if (saveAcc > 15) { saveAcc = 0; persist(); }
  requestAnimationFrame(frame);
}

function updateHud() {
  const inc = world.incomePerMin();
  hudCoins.textContent = fmt(save.coins);
  if (LOOP) {
    // 동전이 날아갈 곳 = 코인 칸 · 뽑기 게이지 (다음 1회 / 10회)
    const r = gaugeCoins.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    field.hudTarget = { x: (r.left + r.width / 2) * 1 - cr.left, y: r.top + r.height / 2 - cr.top };
    const price = drawPrice(save), ten = price * 10, coins = Math.max(0, save.tokens ?? 0);
    gaugeCoins.textContent = fmt(coins);
    const ready10 = coins >= ten, ready = coins >= price;
    gaugeFill.style.width = `${Math.min(100, ready ? (coins / ten) * 100 : (coins / price) * 100)}%`;
    gauge.classList.toggle('ready', ready && !ready10); gauge.classList.toggle('ready10', ready10);
    gaugeText.textContent = ready10 ? '10회 뽑기 가능!' : ready ? `뽑기 ${Math.floor(coins / price)}회 가능` : `다음 뽑기 ${Math.floor((coins / price) * 100)}%`;
    const cb = world.combo;
    if (cb.n >= 2 && cb.t > 0) { comboEl.textContent = `콤보 ×${cb.n}`; comboEl.classList.remove('hidden', 'end'); comboEl.style.left = upx(fieldRect.x + fieldRect.w / 2); comboEl.style.top = upx(fieldRect.y + 40); comboEl.style.setProperty('--s', String(1 + Math.min(0.6, cb.n * 0.02))); }
    else if (!comboEl.classList.contains('end')) comboEl.classList.add('hidden');
  }
  hudCoins.parentElement!.classList.toggle('debt', save.coins < 0);
  hudIncome.textContent = `+${fmt(inc.base)}돈 · +${fmt(inc.bonus)}코인 /분`;
  strikeTag.classList.toggle('hidden', !save.strike);
  placeBar.style.top = upx(fieldRect.y + 6); placeBar.style.left = upx(fieldRect.x + fieldRect.w / 2);
  // 이벤트 띠 · 확대 해제 버튼
  if (world.event) { const d = eventDef(world.event.id); eventBanner.textContent = `${d.name} · ${Math.ceil(world.event.left)}초`; eventBanner.classList.remove('hidden'); }
  else eventBanner.classList.add('hidden');
  eventBanner.style.top = upx(fieldRect.y + 30); eventBanner.style.left = upx(fieldRect.x + fieldRect.w / 2);
  zoomReset.classList.toggle('zoomed', field.userZoom > 1);
  // 폰 세로: 패널이 열려 있으면 확대 버튼 · 안내를 숨긴다 (패널 위에 겹치지 않게)
  const panelOver = panel.isOpen && !document.body.classList.contains('landscape');
  zoomReset.classList.toggle('hidden', panelOver || !document.body.classList.contains('landscape'));
  // 하루 시계 · 개장하기
  const night = world.isNight;
  clock.classList.toggle('night', night);
  const left = night ? 0 : Math.max(0, Math.ceil(world.phaseLeft));
  const sea = seasonOf(save.season.n);
  const when = `${yearOf(save.season.n)}년 ${sea.icon}${sea.name} ${world.seasonDay}일째`;
  clockText.textContent = night ? `${when} · 🌙 밤 정비 중` : `${when} · ${world.phase === 'dusk' ? '🌇 저녁' : '☀ 낮'} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  document.body.dataset.season = sea.key;
  clockFill.parentElement!.classList.toggle('hidden', night);
  clockFill.style.width = `${(world.phaseT / 180) * 100}%`;
  openBtn.classList.toggle('hidden', !night || !!save.season.lost);
  // 라이벌
  const mine = world.scale, rv = world.rivalNow, dleft = SEASON.days - world.seasonDay;
  rivalChip.classList.toggle('losing', mine < rv);
  rivalText.textContent = `🏆 규모 ${fmt(mine)} vs ${rivalOf(save.season.n).name} ${fmt(rv)} · ${dleft <= 0 ? '마지막 날' : `D-${dleft}`}`;
  rivalFill.style.width = `${Math.round((mine / Math.max(1, mine + rv)) * 100)}%`;
  const pr = panel.el.getBoundingClientRect();
  // 세로 화면 서랍이 필드를 덮을 때만 서랍 위로
  const openBottom = pr.left < fieldRect.x + fieldRect.w && pr.top > fieldRect.y ? Math.min(fieldRect.y + fieldRect.h, pr.top) : fieldRect.y + fieldRect.h;
  const tight = openBottom - fieldRect.y < 150;
  openBtn.classList.toggle('tight', tight);
  openBtn.style.top = upx(openBottom - (tight ? 58 : 86) * uiScale); openBtn.style.left = upx(fieldRect.x + fieldRect.w / 2);
  // 안내: 처음 몇 단계
  const msg = !save.freeDrawUsed ? '뽑기 탭에서 무료 뽑기를 눌러 보세요'
    : placedAnimals(save) === 0 ? '보관함에서 동물을 우리에 배치해요'
    : save.stats.coinsPicked === 0 ? '관객 길의 동전을 쓸어 담아 코인을 모아요 · 코인으로 뽑기!'
    : '';
  hint.textContent = msg;
  hint.classList.toggle('hidden', !msg || night || !!placing || (panel.isOpen && !document.body.classList.contains('landscape')));
  hint.style.top = upx(fieldRect.y + 4); hint.style.left = upx(fieldRect.x + fieldRect.w / 2);
  void ZONE_H; void totalAttract;
}

document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
window.addEventListener('pagehide', persist);

async function boot() {
  try {
    // 글꼴: 제목 · 숫자 · 버튼 = 주아, 본문 = 고운돋움 (둘 다 OFL). 영문 · 숫자는 latin 파일에서
    const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
    const faces = [new FontFace('Jua', `url(${juaLa})`, { unicodeRange: LATIN }), new FontFace('Jua', `url(${juaKo})`), new FontFace('Gowun Dodum', `url(${gowunLa})`, { unicodeRange: LATIN }), new FontFace('Gowun Dodum', `url(${gowunKo})`)];
    await Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff)).catch(() => undefined)));
  } catch { /* 글꼴 없이도 동작 */ }
  await preloadPngs();
  fillIcons();
  layout();
  world.sync();
  if (!save.freeDrawUsed || (document.body.classList.contains('landscape') && W >= 1100)) panel.setOpen(true);
  layout();
  ensureMissions(save);
  panel.render(true);
  updateHud();
  requestAnimationFrame((t) => { last = t; frame(t); });
  showTitle(() => { if (save.season.lost) showClosure(); else showOffline(); });
  // 개발·검증용 핸들 (?debug)
  if (new URLSearchParams(location.search).has('debug')) (window as unknown as Record<string, unknown>).__zoo = { get save() { return save; }, set save(v) { save = v; }, world, panel, persist, field };
}
boot();
