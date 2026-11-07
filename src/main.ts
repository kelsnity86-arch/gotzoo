// 뽑ZOO: 시작 · 화면 배치 · 입력 · 루프 · 자동 저장
import './ui/styles.css';
import font11 from 'galmuri/dist/Galmuri11.woff2?url';
import font14 from 'galmuri/dist/Galmuri14.woff2?url';
import { loadSave, writeSave } from './game/state';
import { World, ZONE_H } from './game/world';
import { syncSlots, totalAttract, placedAnimals, penCount, penSize } from './game/rules';
import { FieldRenderer } from './render/field';
import { preloadPngs } from './render/sprites';
import { Panel, openPenSheet } from './ui/panel';
import { audio } from './ui/audio';
import { fmt, h, toast } from './ui/dom';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const ui = document.getElementById('ui')!;
const ctx = canvas.getContext('2d', { alpha: false })!;

let save = loadSave();
syncSlots(save);
const world = new World(save);
const field = new FieldRenderer(ctx);
let dpr = 1, W = 0, H = 0;
let fieldRect = { x: 0, y: 0, w: 1, h: 1 };
let pointer: { x: number; y: number } | null = null;
let penSheetOpen = false;

function persist() { if (!writeSave(save)) toast('저장에 실패했어요 (브라우저 저장소 확인)', 'bad'); }

// ── HUD ──
const hudCoins = h('b', {}), hudIncome = h('span', {}), hudAttract = h('span', {}), hudStage = h('span', {}), hudAnimals = h('span', {});
const logo = h('div', { class: 'logo' }, '뽑', h('span', {}, 'ZOO'));
const hud = h('div', { class: 'hud' }, logo,
  h('div', { class: 'hud-coins' }, h('i', { class: 'coin-ico' }), hudCoins),
  h('div', { class: 'hud-stats' }, hudIncome, hudAttract, hudAnimals, hudStage));
const hint = h('div', { class: 'field-hint' });

const panel = new Panel({ save, world, persist, overlayRoot: ui });
ui.append(hud, hint, panel.el);
// HUD 높이가 바뀌면(줄바꿈) 필드 자리를 다시 잡는다
new ResizeObserver(() => layout()).observe(hud);

function layout() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  const landscape = W >= 760 && W > H * 1.05;
  document.body.classList.toggle('landscape', landscape);
  const hudH = hud.offsetHeight || 44;
  if (landscape) {
    const pw = Math.min(400, Math.max(320, W * 0.34));
    fieldRect = { x: 8, y: hudH + 8, w: W - pw - 16, h: H - hudH - 16 };
    panel.el.style.cssText = `width:${pw}px`;
    document.body.style.setProperty('--pw', `${pw}px`);
  } else {
    // 세로 화면: 동물원이 아래 화면 전체를 쓰고, 패널은 아래 탭에서 여는 서랍
    const tabsH = (panel.el.querySelector('.ptabs') as HTMLElement | null)?.offsetHeight || 40;
    fieldRect = { x: 4, y: hudH + 4, w: W - 8, h: H - hudH - tabsH - 8 };
    panel.el.style.cssText = '';
    document.body.style.setProperty('--pw', '0px');
  }
  world.relayout(fieldRect.w / fieldRect.h);
}
window.addEventListener('resize', layout);

// ── 입력: 커서로 동전 쓸어 담기, 우리 눌러서 자세히 ──
function toLocal(e: PointerEvent) { const r = canvas.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; }
let downAt: { sx: number; sy: number; t: number } | null = null;
canvas.addEventListener('pointermove', (e) => { const { sx, sy } = toLocal(e); pointer = field.toWorld(sx, sy); });
canvas.addEventListener('pointerleave', () => { pointer = null; });
canvas.addEventListener('pointerdown', (e) => { audio.unlock();
  if (panel.isOpen && !document.body.classList.contains('landscape')) { panel.setOpen(false); panel.render(true); } const p = toLocal(e); downAt = { ...p, t: performance.now() }; pointer = field.toWorld(p.sx, p.sy); });
canvas.addEventListener('pointerup', (e) => {
  const p = toLocal(e);
  if (e.pointerType !== 'mouse') pointer = null;
  if (!downAt || Math.hypot(p.sx - downAt.sx, p.sy - downAt.sy) > 8 || performance.now() - downAt.t > 400) { downAt = null; return; }
  downAt = null;
  const wp = field.toWorld(p.sx, p.sy);
  const i = world.layout.pens.findIndex((r) => wp.x >= r.x && wp.x <= r.x + r.w && wp.y >= r.y && wp.y <= r.y + r.h);
  if (i >= 0 && !penSheetOpen) {
    audio.sfx('click');
    field.selectedPen = i; penSheetOpen = true;
    openPenSheet({ save, world, persist, overlayRoot: ui }, i, () => { penSheetOpen = false; field.selectedPen = -1; panel.render(true); });
  }
});

// ── 루프 ──
let last = performance.now(), hudAcc = 0, saveAcc = 0;
function frame(now: number) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  world.relayout(fieldRect.w / fieldRect.h);
  world.sync();
  world.update(dt, pointer);
  for (const ev of world.events) if (ev.type === 'pickup' && ev.by === 'hand') audio.sfx('coin');
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
  hudIncome.textContent = `수입 ${fmt(inc.base)}/분 · 줍기 +${fmt(inc.bonus)}`;
  hudAttract.textContent = `♥ ${fmt(world.attract)}`;
  hudAnimals.textContent = `🐾 ${placedAnimals(save)}/${penCount(save) * penSize(save)}`;
  hudStage.textContent = `${save.stage}단계`;
  // 안내: 처음 몇 단계
  const msg = !save.freeDrawUsed ? '뽑기 탭에서 무료 뽑기를 눌러 보세요'
    : placedAnimals(save) === 0 ? '보관함에서 동물을 우리에 배치해요'
    : save.stats.coinsPicked === 0 ? '바닥 동전을 커서(손가락)로 쓸어 담으면 보너스!'
    : '';
  hint.textContent = msg;
  hint.classList.toggle('hidden', !msg);
  hint.style.top = `${fieldRect.y + 4}px`; hint.style.left = `${fieldRect.x + fieldRect.w / 2}px`;
  void ZONE_H; void totalAttract;
}

document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
window.addEventListener('pagehide', persist);

async function boot() {
  try {
    const faces = [new FontFace('Galmuri11', `url(${font11})`), new FontFace('Galmuri14', `url(${font14})`)];
    await Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff)).catch(() => undefined)));
  } catch { /* 글꼴 없이도 동작 */ }
  await preloadPngs();
  layout();
  world.sync();
  if (!save.freeDrawUsed || document.body.classList.contains('landscape')) panel.setOpen(true);
  panel.render(true);
  updateHud();
  requestAnimationFrame((t) => { last = t; frame(t); });
  // 개발·검증용 핸들 (?debug)
  if (new URLSearchParams(location.search).has('debug')) (window as unknown as Record<string, unknown>).__zoo = { get save() { return save; }, set save(v) { save = v; }, world, panel, persist };
}
boot();
