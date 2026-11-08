// 뽑기 연출: 뽑기 기계가 흔들리고 → 등급 색 캡슐이 열리고 → 카드가 펼쳐진다. 건너뛰기 가능.
import { GRADES } from '../data/grades';
import type { Card } from '../game/state';
import { audio } from './audio';
import { cardBack, cardEl, cardGrade } from './cardview';
import { staffFrame } from '../render/sprites';
import { pieceArt } from './pieceart';
import { h, pix } from './dom';
import { hasPng } from '../render/sprites';

import { motion } from './motion';

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
  let stage: HTMLElement | null = null;
  if (v3) {
    const m = h('div', { class: 'gm' }, pix(`v2_gm_${kind}_0`, 230, 'pix gm-0'), pix(`v2_gm_${kind}_1`, 230, 'pix gm-1'), pix(`v2_gm_${kind}_2`, 230, 'pix gm-2'));
    stage = h('div', { class: 'cap-stage' },
      hasPng(`v2_gf_pillar_${gk}`) ? pix(`v2_gf_pillar_${gk}`, 300, 'pix cap-pillar') : null,
      hasPng(`v2_gf_burst_${gk}`) ? pix(`v2_gf_burst_${gk}`, 240, 'pix cap-burst') : null,
      hasPng('v2_gf_rays') && best >= 2 ? pix('v2_gf_rays', 300, 'pix cap-rays') : null,
      ...[0, 1, 2, 3].map((i) => pix(`v2_gc_${gk}_${i}`, i === 3 ? 180 : 140, `pix cap cap-${i}`)),
      // 희귀 이상: 반짝이 · 색종이가 사방으로
      ...(best >= 2 ? Array.from({ length: best >= 3 ? 14 : 8 }, (_, i) => {
        const k = i % 3 === 0 && hasPng('v2_gf_confetti') ? 'v2_gf_confetti' : hasPng('v2_gf_sparkle') ? (i % 3 === 1 ? 'v2_gf_star' : 'v2_gf_sparkle') : null;
        if (!k) return null;
        return pix(k, 34 + (i % 2) * 14, 'pix cap-spark');
      }).map((el, i, arr) => { if (el) { const a = (i / arr.length) * Math.PI * 2, r = 120 + (i % 3) * 30; el.style.setProperty('--dx', `${Math.cos(a) * r}px`); el.style.setProperty('--dy', `${Math.sin(a) * r * 0.8}px`); el.style.animationDelay = `${(i % 4) * 0.05}s`; } return el; }) : []));
    machine = h('div', { class: 'machine v3' }, m, stage);
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
    const art = star.kind === 'animal' ? pix(`animal_${String(star.animal).padStart(3, '0')}`, 176) : star.kind === 'staff' ? pix(staffFrame(star.staff, 0), 132) : pix(pieceArt(star, 0, 32), 176);
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
  let shown = 0, timer = 0;
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
  if (v3) {
    // 기계 흔들림(0.7초) → 캡슐 나옴 → 캡슐 흔들림 → 금 → 빛기둥과 함께 열림 → (영웅 · 전설 컷인) → 카드
    // 움직임 줄이기 설정이어도 단계는 보여 준다 (흔들림 · 날아감만 빠짐)
    const T = motion.reduce ? [450, 350, 300, 300, 600] : [750, 500, 500, 450, best >= 2 ? 1100 : 800];
    machine.classList.add('st-shake');
    timer = window.setTimeout(() => {
      machine.classList.replace('st-shake', 'st-drop');
      timer = window.setTimeout(() => {
        machine.classList.replace('st-drop', 'st-wobble');
        timer = window.setTimeout(() => {
          machine.classList.replace('st-wobble', 'st-crack');
          timer = window.setTimeout(() => {
            machine.classList.replace('st-crack', 'st-open'); audio.sfx(best >= 2 ? 'rare' : 'reveal');
            if (best >= 3) { const fl = h('div', { class: `reveal-flash g${best}` }); back.append(fl); window.setTimeout(() => fl.remove(), 700); }
            timer = window.setTimeout(() => { showStar(); timer = window.setTimeout(showOne, star ? 400 : 0); }, T[4]);
          }, T[3]);
        }, T[2]);
      }, T[1]);
    }, T[0]);
  } else {
    machine.classList.add('shake');
    if (best >= 0) machine.style.setProperty('--cap', GRADES[best].color);
    timer = window.setTimeout(() => { machine.classList.add('open'); showStar(); timer = window.setTimeout(showOne, motion.reduce ? 0 : 350); }, motion.reduce ? 0 : 700);
  }
  let closed = false;
  const closeAll = () => { if (closed) return; closed = true; audio.sfx('click'); back.remove(); onClose(); };
  skip.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('click'); finish(); });
  close.addEventListener('click', (e) => { e.stopPropagation(); closeAll(); });
  // 아무 곳이나 누르면: 공개 중이면 모두 보기, 다 보였으면 확인
  back.addEventListener('click', () => { if (close.style.display === 'none') finish(); else closeAll(); });
}
