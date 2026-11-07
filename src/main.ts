// 뽑ZOO: 시작 · 화면 배치 · 입력 · 루프 · 자동 저장
import './ui/styles.css';
import font11 from 'galmuri/dist/Galmuri11.woff2?url';
import font14 from 'galmuri/dist/Galmuri14.woff2?url';
import { defaultSave, loadSave, writeSave } from './game/state';
import { exportCode, importCode } from './game/savecode';
import { eventDef } from './data/events';
import { World, ZONE_H } from './game/world';
import { syncSlots, totalAttract, placedAnimals, penCount, penSize, offlineEarnings, ensureMissions } from './game/rules';
import { FieldRenderer } from './render/field';
import { hasPng, preloadPngs } from './render/sprites';
import { Panel, openPenSheet } from './ui/panel';
import { audio } from './ui/audio';
import { fillIcons, fmt, h, iconSlot, pix, toast } from './ui/dom';

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

let replacing = false;
function persist() { if (replacing) return; save.lastSeen = Date.now(); if (!writeSave(save)) toast('저장에 실패했어요 (브라우저 저장소 확인)', 'bad'); }

// ── HUD ──
const hudCoins = h('b', {}), hudIncome = h('b', {}), hudAttract = h('b', {}), hudStage = h('b', {}), hudAnimals = h('b', {}), hudTickets = h('b', {});
const stat = (icon: string, val: HTMLElement, title: string) => h('span', { class: 'stat', title }, hasPng(icon) ? iconSlot(icon, 14) : null, val);
const ticketChip = stat('icons_12', hudTickets, '무료 뽑기권');
const logo = h('div', { class: 'logo' }, '뽑', h('span', {}, 'ZOO'));
const hud = h('div', { class: 'hud' }, logo,
  h('div', { class: 'hud-coins' }, hasPng('icons_01') ? iconSlot('icons_01', 16) : h('i', { class: 'coin-ico' }), hudCoins),
  h('div', { class: 'hud-stats' }, stat('icons_13', hudIncome, '분당 수입 · 줍기 보너스'), stat('icons_02', hudAttract, '총 매력도'), stat('icons_05', hudAnimals, '전시 / 수용'), stat('icons_04', hudStage, '진행 단계'), ticketChip));
const hint = h('div', { class: 'field-hint' });
const eventBanner = h('div', { class: 'event-banner hidden' });
const zoomReset = h('button', { class: 'zoom-reset hidden', onclick: () => { field.resetZoom(); audio.sfx('click'); } }, '전체 보기');
const settingsBtn = h('button', { class: 'hud-gear', title: '설정', onclick: () => openSettings() }, hasPng('icons_14') ? iconSlot('icons_14', 18) : '⚙');
hud.append(settingsBtn);

const panel = new Panel({ save, world, persist, overlayRoot: ui });
ui.append(hud, hint, eventBanner, zoomReset, panel.el);
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

// ── 입력 ──
// 커서(손가락 하나)로 동전 쓸어 담기 · 우리를 짧게 누르면 자세히
// 확대: 휠 / 두 손가락 벌리기 · 이동: 확대한 상태에서 마우스로 끌기 / 두 손가락으로 끌기
function toLocal(e: PointerEvent | WheelEvent) { const r = canvas.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; }
let downAt: { sx: number; sy: number; t: number } | null = null;
const touches = new Map<number, { sx: number; sy: number }>();
let pinch: { d: number; cx: number; cy: number } | null = null;
let dragging = false;
canvas.addEventListener('pointermove', (e) => {
  const p = toLocal(e);
  if (touches.has(e.pointerId)) touches.set(e.pointerId, p);
  if (touches.size >= 2) {
    const [a, b] = [...touches.values()];
    const d = Math.hypot(a.sx - b.sx, a.sy - b.sy), cx = (a.sx + b.sx) / 2, cy = (a.sy + b.sy) / 2;
    if (pinch) { field.zoomAt(cx, cy, d / pinch.d); field.panBy(cx - pinch.cx, cy - pinch.cy); }
    pinch = { d, cx, cy }; pointer = null; downAt = null;
    return;
  }
  // 마우스로 끌면 화면 이동 (확대했을 때)
  if (e.pointerType === 'mouse' && downAt && (e.buttons & 1) && field.userZoom > 1) {
    if (dragging || Math.hypot(p.sx - downAt.sx, p.sy - downAt.sy) > 6) { dragging = true; field.panBy(e.movementX, e.movementY); }
  }
  pointer = field.toWorld(p.sx, p.sy);
});
canvas.addEventListener('pointerleave', () => { pointer = null; });
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (panel.isOpen && !document.body.classList.contains('landscape')) { panel.setOpen(false); panel.render(true); }
  const p = toLocal(e);
  if (e.pointerType !== 'mouse') touches.set(e.pointerId, p);
  if (touches.size >= 2) { pinch = null; return; }
  downAt = { ...p, t: performance.now() }; dragging = false;
  pointer = field.toWorld(p.sx, p.sy);
});
const endTouch = (e: PointerEvent) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
canvas.addEventListener('pointercancel', endTouch);
canvas.addEventListener('pointerup', (e) => {
  const p = toLocal(e);
  const wasMulti = touches.size >= 2;
  endTouch(e);
  if (e.pointerType !== 'mouse') pointer = null;
  if (wasMulti || dragging || !downAt || Math.hypot(p.sx - downAt.sx, p.sy - downAt.sy) > 8 || performance.now() - downAt.t > 400) { downAt = null; dragging = false; return; }
  downAt = null;
  const wp = field.toWorld(p.sx, p.sy);
  const i = world.layout.pens.findIndex((r) => wp.x >= r.x && wp.x <= r.x + r.w && wp.y >= r.y && wp.y <= r.y + r.h);
  if (i >= 0 && !penSheetOpen) {
    audio.sfx('click');
    field.selectedPen = i; penSheetOpen = true;
    openPenSheet({ save, world, persist, overlayRoot: ui }, i, () => { penSheetOpen = false; field.selectedPen = -1; panel.render(true); });
  }
});
canvas.addEventListener('wheel', (e) => { e.preventDefault(); const p = toLocal(e); field.zoomAt(p.sx, p.sy, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });

// ── 설정: 소리 · 저장 코드 · 초기화 ──
function openSettings() {
  audio.sfx('click');
  const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round(audio.volume * 100), id: 'vol' }) as HTMLInputElement;
  vol.addEventListener('input', () => audio.setSettings({ volume: Number(vol.value) / 100 }));
  const mute = h('button', { class: 'btn small ghost' }, audio.muted ? '소리 켜기' : '소리 끄기') as HTMLButtonElement;
  mute.addEventListener('click', () => { audio.setSettings({ muted: !audio.muted }); mute.textContent = audio.muted ? '소리 켜기' : '소리 끄기'; });
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
    msg.textContent = `코인 ${fmt(pending.save.coins)} · 카드 ${pending.save.cards.length}장 · ${pending.save.stage}단계. 지금 진행을 이 코드로 바꿀까요?`;
    load.textContent = '바꾸기 (지금 진행은 사라짐)';
  });
  let armed = false;
  const reset = h('button', { class: 'btn small danger' }, '저장 초기화') as HTMLButtonElement;
  reset.addEventListener('click', () => {
    if (!armed) { armed = true; reset.textContent = '정말 초기화 (되돌릴 수 없음)'; msg.textContent = '모든 카드·코인·업그레이드가 지워져요. 먼저 저장 코드를 복사해 두세요.'; return; }
    replaceSave(defaultSave()); back.remove(); toast('처음부터 시작해요', 'gold');
  });
  const back = h('div', { class: 'overlay', onclick: (e: Event) => { if (e.target === back) back.remove(); } },
    h('div', { class: 'sheet settings' },
      h('div', { class: 'sheet-head' }, h('b', {}, '설정'), h('button', { class: 'btn small', onclick: () => back.remove() }, '닫기')),
      h('div', { class: 'section-title' }, '소리'), h('div', { class: 'row-btns' }, h('label', { for: 'vol' }, '효과음'), vol, mute),
      h('div', { class: 'section-title' }, '저장 코드 (다른 기기로 옮기기)'), area, h('div', { class: 'row-btns' }, copy, load),
      h('div', { class: 'section-title' }, '초기화'), h('div', { class: 'row-btns' }, reset), msg,
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
      h('div', { class: 'offline-amount' }, hasPng('icons_01') ? pix('icons_01', 24) : null, `+${fmt(r.amount)}`),
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
  world.update(dt, pointer);
  for (const ev of world.events) {
    if (ev.type === 'pickup' && ev.by === 'hand') audio.sfx('coin');
    else if (ev.type === 'eventStart') { audio.sfx('event'); const d = eventDef(ev.id); toast(`${d.name}! ${d.desc}`, 'gold', 2600); }
    else if (ev.type === 'eventEnd') toast(`${eventDef(ev.id).name} 끝`, 'info');
    else if (ev.type === 'vip') { audio.sfx('rare'); toast(`VIP 손님이 ${fmt(ev.amount)}코인을 던졌어요!`, 'gold', 2200); }
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
  hudIncome.textContent = `${fmt(inc.base)}/분 · 줍기 +${fmt(inc.bonus)}`;
  hudAttract.textContent = fmt(world.attract);
  hudAnimals.textContent = `${placedAnimals(save)}/${penCount(save) * penSize(save)}`;
  hudStage.textContent = `${save.stage}단계`;
  // 이벤트 띠 · 확대 해제 버튼
  if (world.event) { const d = eventDef(world.event.id); eventBanner.textContent = `${d.name} · ${Math.ceil(world.event.left)}초`; eventBanner.classList.remove('hidden'); }
  else eventBanner.classList.add('hidden');
  eventBanner.style.top = `${fieldRect.y + 30}px`; eventBanner.style.left = `${fieldRect.x + fieldRect.w / 2}px`;
  zoomReset.classList.toggle('hidden', field.userZoom <= 1);
  zoomReset.style.top = `${fieldRect.y + 6}px`; zoomReset.style.left = `${fieldRect.x + fieldRect.w - 6}px`;
  hudTickets.textContent = `뽑기권 ${save.tickets}`;
  ticketChip.classList.toggle('hidden', save.tickets <= 0);
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
  fillIcons();
  layout();
  world.sync();
  if (!save.freeDrawUsed || document.body.classList.contains('landscape')) panel.setOpen(true);
  ensureMissions(save);
  panel.render(true);
  updateHud();
  requestAnimationFrame((t) => { last = t; frame(t); });
  showTitle(() => showOffline());
  // 개발·검증용 핸들 (?debug)
  if (new URLSearchParams(location.search).has('debug')) (window as unknown as Record<string, unknown>).__zoo = { get save() { return save; }, set save(v) { save = v; }, world, panel, persist };
}
boot();
