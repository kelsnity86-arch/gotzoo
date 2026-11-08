// 뽑기 연출: 뽑기 기계가 흔들리고 → 등급 색 캡슐이 열리고 → 카드가 펼쳐진다. 건너뛰기 가능.
import { GRADES } from '../data/grades';
import type { Card } from '../game/state';
import { audio } from './audio';
import { cardBack, cardEl, cardGrade } from './cardview';
import { staffFrame } from '../render/sprites';
import { pieceArt } from './pieceart';
import { h, pix } from './dom';
import { hasPng, sprite } from '../render/sprites';

import { motion } from './motion';
import { STAFF } from '../data/staff';
import { lastTier } from '../game/rules';

/** 그림 도트 4배 (기계 부품 · 등급 기계를 같은 굵기로) */
const K = 4;
const px4 = (key: string) => { const s = sprite(key); return pix(key, Math.max(s.width, s.height) * K, 'pix gs-p'); };
type Machine = { el: HTMLElement; crank: HTMLElement[]; caps: HTMLElement[]; flap: [HTMLElement | null, HTMLElement | null]; frames: HTMLElement[] };
/** 기계 하나: 부품 그림이 있으면 몸통 · 돔 속 캡슐 · 유리 돔 · 장식 · 손잡이 · 출구 뚜껑으로 조립, 없으면 통 그림 3장 */
function buildMachine(kind: string, tier: number): Machine {
  const tierKey = ['', 'silver', 'gold', 'rainbow'][tier];
  if (tier && hasPng(`v2_mt_${tierKey}_0`)) {
    const frames = [0, 1, 2].map((i) => px4(`v2_mt_${tierKey}_${i}`));
    frames.forEach((f, i) => { f.style.opacity = i ? '0' : '1'; f.classList.add('gs-f'); });
    return { el: h('div', { class: 'gs-asm' }, ...frames), crank: [], caps: [], flap: [null, null], frames };
  }
  const k = (n: string) => `v2_mp_${kind}_${n}`;
  if (!hasPng(k('body')) || !hasPng(k('dome'))) {
    const frames = [0, 1, 2].map((i) => pix(`v2_gm_${kind}_${i}`, 210, 'pix gs-f'));
    frames.forEach((f, i) => { f.style.opacity = i ? '0' : '1'; });
    return { el: h('div', { class: 'gs-asm' }, ...frames), crank: [], caps: [], flap: [null, null], frames };
  }
  const S = (n: string) => sprite(k(n));
  const body = S('body'), dome = S('dome'), top = hasPng(k('top')) ? S('top') : null;
  // 바닥 가운데 = (0, 0), 위로 갈수록 음수 (도트 단위)
  const bodyTop = -body.height, domeTop = bodyTop + 2 - dome.height, topTop = top ? domeTop + 3 - top.height : domeTop;
  const W = Math.max(body.width, dome.width) + 14, Hh = -topTop;
  const el = h('div', { class: 'gs-asm parts', style: `width:${W * K}px;height:${Hh * K}px` });
  const place = (node: HTMLElement, x: number, y: number) => { node.style.left = `${(W / 2 + x) * K}px`; node.style.top = `${(Hh + y) * K}px`; el.append(node); return node; };
  // 돔 속 작은 캡슐 (유리 뒤): 바닥에 쌓인 모양
  const colors = ['gray', 'green', 'blue', 'purple', 'gold', 'gray', 'green', 'blue', 'rainbow'].filter((c) => hasPng(`v2_mc_${c}`));
  const caps: HTMLElement[] = [];
  const inner = dome.width - 10, rows = [[0, 1, 2, 3], [0.5, 1.5, 2.5]];
  let ci = 0;
  rows.forEach((row, ri) => row.forEach((cx) => {
    if (ci >= colors.length) return;
    const c = px4(`v2_mc_${colors[ci++]}`);
    caps.push(place(c, -inner / 2 + 1 + cx * (inner - 10) / 3, bodyTop + 1 - 11 - ri * 7));
  }));
  place(px4(k('body')), -body.width / 2, bodyTop);
  place(px4(k('dome')), -dome.width / 2, domeTop);
  if (top) place(px4(k('top')), -top.width / 2, topTop);
  // 손잡이: 몸통 오른쪽, 축이 같은 자리에 오게 4각도
  const pivot = { x: body.width / 2 - 1, y: bodyTop + body.height * 0.5 };
  const crank = [0, 1, 2, 3].filter((i) => hasPng(k(`crank${i}`))).map((i) => {
    const c = S(`crank${i}`), n = px4(k(`crank${i}`));
    const ax = i === 1 ? 0 : i === 3 ? c.width : c.width / 2, ay = i === 0 ? c.height : i === 2 ? 0 : c.height / 2;
    place(n, pivot.x - ax, pivot.y - ay); n.style.opacity = i ? '0' : '1'; return n;
  });
  const flap: [HTMLElement | null, HTMLElement | null] = [null, null];
  if (hasPng(k('flap0'))) { const f = S('flap0'); flap[0] = place(px4(k('flap0')), -f.width / 2, -f.height - 1); }
  if (hasPng(k('flap1'))) { const f = S('flap1'); flap[1] = place(px4(k('flap1')), -f.width / 2, -f.height + 1); flap[1].style.opacity = '0'; }
  return { el, crank, caps, flap, frames: [] };
}

/** 등급 키 (캡슐 · 빛 효과 그림 이름). 반짝이 동물이 있으면 무지개 */
const GKEY = ['common', 'uncommon', 'rare', 'epic', 'legend'] as const;

/** newSpecies: 이번에 처음 얻은 종 uid 목록 (NEW 표시) · season: 계절 뽑기 기계 모양 */
export function showReveal(root: HTMLElement, cards: Card[], newUids: Set<number>, onClose: () => void, season = 'spring') {
  const best = Math.max(...cards.map(cardGrade));
  const shiny = cards.some((c) => c.kind === 'animal' && c.shiny);
  const gk = shiny ? 'shiny' : GKEY[Math.max(0, best)];
  // 새 뽑기 그림: 기계(계절 · 직원 · 우리) 대기 → 흔들림 → 캡슐 나옴, 캡슐 닫힘 → 흔들림 → 금 → 열림, 등급 빛기둥 · 터짐
  const kind = cards[0]?.kind === 'staff' ? 'staff' : cards[0]?.kind === 'pen' ? 'pen' : season;
  const v3 = hasPng(`v2_gm_${kind}_0`) && hasPng(`v2_gc_${gk}_0`);
  const useArt = hasPng('gacha_01');
  const capIdx = Math.max(0, best);
  let machine: HTMLElement;
  // 연출용 요소 (한 장면): 뒤 후광 → 기계(흔들림 · 덜컹) → 출구에서 튀어나와 통통 구르는 캡슐 → 다가가서 흔들 · 금 · 펑
  const tier = lastTier;
  const switchKind: string | null = cards.some((c) => c.kind === 'staff') ? 'staff' : cards.some((c) => c.kind === 'pen') ? 'pen' : null;
  let gs: { box: HTMLElement; mach: HTMLElement; frames: HTMLElement[]; alt: HTMLElement[]; cap: HTMLElement; caps: HTMLElement[]; fx: HTMLElement[]; aura: HTMLElement; tag: HTMLElement; main: Machine; altM: Machine | null } | null = null;
  if (v3) {
    const main = buildMachine(kind, tier);
    const altM = switchKind ? buildMachine(switchKind, 0) : null;
    if (altM) altM.el.style.opacity = '0';
    const frames = main.frames, alt = altM ? altM.frames : [];
    const mach = h('div', { class: 'gs-mach' }, main.el, altM ? altM.el : null);
    const caps = [0, 1, 2, 3].map((i) => pix(`v2_gc_${gk}_${i}`, i === 3 ? 120 : 88, 'pix gs-c'));
    const cap = h('div', { class: 'gs-cap' }, ...caps);
    const fx = [
      hasPng(`v2_gf_pillar_${gk}`) ? pix(`v2_gf_pillar_${gk}`, 320, 'pix gs-pillar') : null,
      hasPng('v2_gf_rays') && best >= 2 ? pix('v2_gf_rays', 320, 'pix gs-rays') : null,
      hasPng(`v2_gf_burst_${gk}`) ? pix(`v2_gf_burst_${gk}`, 260, 'pix gs-burst') : null,
      ...(best >= 2 ? Array.from({ length: best >= 3 ? 16 : 9 }, (_, i) => { const k = i % 3 === 0 && hasPng('v2_gf_confetti') ? 'v2_gf_confetti' : i % 3 === 1 && hasPng('v2_gf_star') ? 'v2_gf_star' : hasPng('v2_gf_sparkle') ? 'v2_gf_sparkle' : null; return k ? pix(k, 30 + (i % 2) * 14, 'pix gs-spark') : null; }) : []),
    ].filter((x): x is HTMLCanvasElement => !!x);
    const auraKey = `v2_mt_${['', 'silver', 'gold', 'rainbow'][tier]}_aura`;
    const aura = h('div', { class: `gs-aura t${tier}${tier && hasPng(auraKey) ? ' art' : ''}` }, tier && hasPng(auraKey) ? pix(auraKey, 290) : null);
    const tag = h('div', { class: `gs-tag t${tier}` }, tier ? `${['', '은빛', '금빛', '무지개'][tier]} 기계!` : '');
    const box = h('div', { class: 'machine v4' }, aura, mach, h('div', { class: 'gs-fx' }, ...fx), cap, tag);
    caps.forEach((c) => { c.style.opacity = '0'; });
    fx.forEach((f) => { f.style.opacity = '0'; });
    gs = { box, mach, frames, alt, cap, caps, fx, aura, tag, main, altM };
    machine = box;
  } else machine = useArt
    ? h('div', { class: 'machine art' }, pix('gacha_01', 128, 'pix m-idle'), pix('gacha_02', 128, 'pix m-shake'), pix(`gacha_${String(3 + capIdx).padStart(2, '0')}`, 40, 'pix cap-closed'), pix(`gacha_${String(8 + capIdx).padStart(2, '0')}`, 40, 'pix cap-open'))
    : h('div', { class: 'machine' }, h('div', { class: 'dome' }, ...Array.from({ length: 9 }, (_, i) => h('i', { style: `--k:${i}` }))), h('div', { class: 'body' }, h('b', {})));
  const grid = h('div', { class: `reveal-grid n${cards.length}` });
  const skip = h('button', { class: 'btn ghost' }, '모두 보기');
  const close = h('button', { class: 'btn', style: 'display:none' }, '확인');
  const back = h('div', { class: 'overlay reveal' },
    h('div', { class: 'reveal-box' }, h('div', { class: 'reveal-title' }, `카드 ${cards.length}장`), machine, grid, h('div', { class: 'row-btns' }, skip, close)));
  root.append(back);
  audio.sfx('draw');
  // 영웅 · 전설: 화면을 가로지르는 띠(컷인) 위로 큰 그림
  const star = cards.find((c) => cardGrade(c) === 4) ?? cards.find((c) => cardGrade(c) === 3);
  const showStar = () => {
    if (!star) return;
    const g = cardGrade(star), legend = g === 4;
    const art = star.kind === 'animal' ? pix(`animal_${String(star.animal).padStart(3, '0')}`, 176) : star.kind === 'staff' ? pix(hasPng(`v2_sw_${String(STAFF.findIndex((d) => d.kind === star.staff)).padStart(2, '0')}_f0`) ? `v2_sw_${String(STAFF.findIndex((d) => d.kind === star.staff)).padStart(2, '0')}_f0` : staffFrame(star.staff, 0), 150) : pix(pieceArt(star, 0, 32), 176);
    const banner = hasPng(`v2_cutin_${legend ? 'legend' : 'epic'}`) ? pix(`v2_cutin_${legend ? 'legend' : 'epic'}`, 1200, 'pix cutin-band') : null;
    const word = legend ? (star.kind === 'animal' ? '전설 등장!' : star.kind === 'staff' ? '전설 직원 합류!' : '전설 우리 완성!') : (star.kind === 'animal' ? '영웅 등장!' : star.kind === 'staff' ? '영웅 직원 합류!' : '영웅 우리!');
    const show = banner
      ? h('div', { class: `cutin ${legend ? 'legend' : 'epic'}` }, banner, h('div', { class: 'cutin-art' }, art), h('div', { class: 'legend-text' }, word))
      : h('div', { class: 'legend-burst' }, h('div', { class: 'rays' }), art, h('div', { class: 'legend-text' }, word));
    back.append(show);
    audio.sfx('legend');
    show.addEventListener('click', (e) => { e.stopPropagation(); show.remove(); });
    window.setTimeout(() => show.remove(), legend ? 3000 : 2200);
  };
  let shown = 0, timer = 0, closed = false;
  const backPx = cards.length > 5 ? 110 : 150;
  const showOne = () => {
    if (shown >= cards.length) { finish(); return; }
    const c = cards[shown++];
    const g = cardGrade(c);
    const front = cardEl(c, { isNew: newUids.has(c.uid), size: cards.length > 5 ? 'r' : 'l' });
    const bk = cardBack(backPx);
    const wrap = h('div', { class: `reveal-cell${g >= 2 ? ' shine' : ''}${bk ? ' has-back' : ''}`, style: g >= 0 ? `--glow:${GRADES[g].color}` : '--glow:#ef7d32' }, bk ? h('div', { class: 'cell-back' }, bk) : null, h('div', { class: 'cell-front' }, front));
    grid.append(wrap);
    if (bk) window.setTimeout(() => wrap.classList.add('flipped'), motion.reduce ? 0 : 160);
    audio.sfx(g >= 2 ? 'rare' : 'reveal');
    timer = window.setTimeout(showOne, motion.reduce ? 0 : cards.length > 1 ? 240 : 0);
  };
  const finish = () => { clearTimeout(timer); while (shown < cards.length) { grid.append(h('div', { class: 'reveal-cell' }, cardEl(cards[shown], { isNew: newUids.has(cards[shown].uid), size: cards.length > 5 ? 'r' : 'l' }))); shown++; } skip.style.display = 'none'; close.style.display = ''; machine.classList.add('done'); };
  if (v3 && gs) {
    const G = gs, R = motion.reduce, amp = R ? 0.35 : 1;
    const show = (els: HTMLElement[], i: number) => els.forEach((e, k) => { e.style.opacity = k === i ? '1' : '0'; });
    const anim = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => el.animate(kf, { fill: 'forwards', ...o });
    const at = (ms: number, fn: () => void) => { const id = window.setTimeout(() => { if (!closed && !G.box.classList.contains('done')) fn(); }, ms); timers.push(id); };
    const timers: number[] = [];
    // 0: 움츠림 (힘 모으기)
    if (tier) anim(G.aura, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
    anim(G.mach, [{ transform: 'scale(1,1)' }, { transform: `scale(${1 + 0.07 * amp},${1 - 0.1 * amp}) translateY(${6 * amp}px)` }, { transform: 'scale(1,1)' }], { duration: 260, easing: 'ease-in-out' });
    audio.fx('crank');
    // 260~1150: 흔들림이 점점 빨라지고 세진다 (손잡이 드르륵 · 캡슐 달그락)
    at(260, () => {
      show(G.frames, 1);
      // 손잡이가 돈다 · 돔 속 캡슐이 와르르
      const M = G.main;
      for (let i = 0; i < 12 && M.crank.length; i++) at(i * 75, () => show(M.crank, i % M.crank.length));
      M.caps.forEach((c, i) => anim(c, Array.from({ length: 9 }, (_, j) => ({ transform: j === 8 ? 'none' : `translate(${(Math.random() - 0.5) * 7 * amp}px, ${-Math.random() * 12 * amp}px) rotate(${(Math.random() - 0.5) * 60}deg)` })), { duration: 860, delay: i * 20, easing: 'linear' }));
      const kf: Keyframe[] = [];
      for (let i = 0; i <= 16; i++) { const k = i / 16, a = (2 + k * 9) * amp * (i % 2 ? 1 : -1); kf.push({ transform: `rotate(${a}deg) translateX(${a * 0.6}px)`, offset: k }); }
      kf[kf.length - 1] = { transform: 'rotate(0deg)', offset: 1 };
      anim(G.mach, kf, { duration: 890, easing: 'ease-in' });
      for (let i = 0; i < 9; i++) at(i * 95, () => audio.fx(i % 3 === 0 ? 'crank' : 'rattle', i));
    });
    // 1150: 덜컹! (직원 · 우리가 섞였으면 기계가 바뀐다) → 출구에서 캡슐이 튀어나와 통통
    at(1150, () => {
      audio.fx('clunk');
      anim(G.mach, [{ transform: 'translateY(0)' }, { transform: `translateY(${8 * amp}px) scale(1.03,0.95)` }, { transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
      if (G.altM) {
        const fl = h('div', { class: 'gs-flash' }); G.box.append(fl); window.setTimeout(() => fl.remove(), 500);
        show(G.frames, -1); show(G.alt, 1); audio.sfx('event');
        G.main.el.style.opacity = '0'; if (G.altM) { G.altM.el.style.opacity = '1'; if (G.altM.flap[1]) { G.altM.flap[0] && (G.altM.flap[0].style.opacity = '0'); G.altM.flap[1].style.opacity = '1'; } else if (G.altM.flap[0]) G.altM.flap[0].style.opacity = '0'; }
        G.tag.textContent = switchKind === 'staff' ? '직원 기계로 변신!' : '우리 기계로 변신!'; G.tag.className = 'gs-tag sw';
        anim(G.tag, [{ opacity: 0, transform: 'translateY(8px) scale(0.8)' }, { opacity: 1, transform: 'none' }], { duration: 250 });
      } else {
        show(G.frames, 2);
        const [f0, f1] = G.main.flap; if (f0) f0.style.opacity = '0'; if (f1) { f1.style.opacity = '1'; anim(f1, [{ transform: 'scaleY(0.3)' }, { transform: 'scaleY(1.1)' }, { transform: 'none' }], { duration: 200 }); }
      }
      show(G.caps, 0);
      // 출구(기계 아래 가운데) → 앞으로 포물선 · 두 번 튕김 (떨어질 때 납작)
      anim(G.cap, [
        { transform: 'translate(-50%, -95px) scale(0.3)', offset: 0 },
        { transform: 'translate(-50%, -125px) scale(0.6)', offset: 0.22 },
        { transform: 'translate(-50%, 0) scale(1.15,0.8)', offset: 0.5 },
        { transform: 'translate(-50%, -34px) scale(0.95,1.05)', offset: 0.68 },
        { transform: 'translate(-50%, 0) scale(1.08,0.9)', offset: 0.84 },
        { transform: 'translate(-50%, -8px) scale(1)', offset: 0.92 },
        { transform: 'translate(-50%, 0) scale(1)', offset: 1 },
      ], { duration: 760, easing: 'ease-in-out' });
      at(380, () => audio.fx('bounce', 0)); at(640, () => audio.fx('bounce', 1));
    });
    // 2000: 카메라가 캡슐로 (기계는 뒤로 흐려짐)
    at(2000, () => {
      audio.fx('whoosh');
      anim(G.mach, [{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0.18, filter: 'blur(2px)', transform: 'translateY(-24px) scale(0.82)' }], { duration: 380, easing: 'ease-out' });
      anim(G.aura, [{ opacity: tier ? 1 : 0 }, { opacity: tier ? 0.4 : 0 }], { duration: 380 });
      anim(G.cap, [{ transform: 'translate(-50%, 0) scale(1)' }, { transform: 'translate(-50%, -110px) scale(1.5)' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)' });
    });
    // 2400~3000: 흔들 → 금이 가며 등급 빛이 샌다
    const col = shiny ? '#f08cbe' : GRADES[Math.max(0, best)].color;
    at(2400, () => {
      show(G.caps, 1);
      anim(G.caps[1], [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ transform: `rotate(${(i % 2 ? 1 : -1) * (6 + i * 1.5) * amp}deg)` })), { duration: 520, easing: 'linear' });
      for (let i = 0; i < 4; i++) at(i * 130, () => audio.fx('rattle', i + 4));
    });
    at(2920, () => {
      show(G.caps, 2); audio.fx('crack', 0); at(160, () => audio.fx('crack', 1)); at(300, () => audio.fx('crack', 2));
      anim(G.caps[2], [{ filter: `drop-shadow(0 0 0 ${col})`, transform: 'translateX(0)' }, { filter: `drop-shadow(0 0 ${best >= 3 ? 26 : 16}px ${col})`, transform: `translateX(${3 * amp}px)` }, { filter: `drop-shadow(0 0 ${best >= 3 ? 34 : 20}px ${col})`, transform: `translateX(${-3 * amp}px)` }], { duration: 480, easing: 'ease-in', iterations: 1 });
    });
    // 3420: 펑! 빛기둥 · 터지는 빛 · 반짝이, 화면 흔들림 (영웅 이상은 번쩍)
    at(3420, () => {
      show(G.caps, 3); audio.sfx(best >= 2 ? 'rare' : 'reveal');
      anim(G.caps[3], [{ transform: 'scale(0.7)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
      const [pillar, rays, burst] = [G.fx.find((f) => f.classList.contains('gs-pillar')), G.fx.find((f) => f.classList.contains('gs-rays')), G.fx.find((f) => f.classList.contains('gs-burst'))];
      if (pillar) anim(pillar, [{ opacity: 0, transform: 'translate(-50%, -100%) scaleY(0.1)' }, { opacity: 1, transform: 'translate(-50%, -100%) scaleY(1.1)', offset: 0.4 }, { opacity: 0.85, transform: 'translate(-50%, -100%) scaleY(1)' }], { duration: 700, easing: 'ease-out' });
      if (rays) anim(rays, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.4) rotate(0)' }, { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1.2) rotate(40deg)', offset: 0.35 }, { opacity: 0.6, transform: 'translate(-50%, -50%) scale(1.35) rotate(90deg)' }], { duration: 1800, easing: 'linear' });
      if (burst) anim(burst, [{ opacity: 1, transform: 'translate(-50%, -50%) scale(0.3)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(1.6)' }], { duration: 650, easing: 'ease-out' });
      G.fx.filter((f) => f.classList.contains('gs-spark')).forEach((sp, i, arr) => {
        const a = (i / arr.length) * Math.PI * 2 + Math.random() * 0.3, r = (130 + (i % 3) * 40) * (R ? 0.6 : 1);
        anim(sp, [{ opacity: 1, transform: 'translate(-50%, -50%) scale(0.3)' }, { opacity: 1, transform: `translate(calc(-50% + ${Math.cos(a) * r * 0.7}px), calc(-50% + ${Math.sin(a) * r * 0.6 - 20}px)) scale(1)`, offset: 0.5 }, { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r * 0.8 + 30}px)) scale(0.8)` }], { duration: 1000 + (i % 4) * 120, easing: 'ease-out' });
      });
      const box = back.querySelector('.reveal-box');
      const sh = (best >= 3 ? 10 : best >= 2 ? 6 : 3) * amp;
      if (box) box.animate([0, 1, 2, 3, 4, 5].map((i) => ({ transform: i === 5 ? 'none' : `translate(${(i % 2 ? 1 : -1) * sh}px, ${(i % 3 - 1) * sh * 0.6}px)` })), { duration: 320 });
      if (best >= 3) { const fl = h('div', { class: `reveal-flash g${best}` }); back.append(fl); window.setTimeout(() => fl.remove(), 700); }
      at(best >= 2 ? 1150 : 800, () => { showStar(); timer = window.setTimeout(showOne, star ? 400 : 0); });
    });
  } else {
    machine.classList.add('shake');
    if (best >= 0) machine.style.setProperty('--cap', GRADES[best].color);
    timer = window.setTimeout(() => { machine.classList.add('open'); showStar(); timer = window.setTimeout(showOne, motion.reduce ? 0 : 350); }, motion.reduce ? 0 : 700);
  }
  const closeAll = () => { if (closed) return; closed = true; audio.sfx('click'); back.remove(); onClose(); };
  skip.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('click'); finish(); });
  close.addEventListener('click', (e) => { e.stopPropagation(); closeAll(); });
  // 아무 곳이나 누르면: 공개 중이면 모두 보기, 다 보였으면 확인
  back.addEventListener('click', () => { if (close.style.display === 'none') finish(); else closeAll(); });
}
