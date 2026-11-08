// 뽑기 연출: 뽑기 기계가 흔들리고 → 등급 색 캡슐이 열리고 → 카드가 펼쳐진다. 건너뛰기 가능.
import { GRADES } from '../data/grades';
import type { Card } from '../game/state';
import { audio } from './audio';
import { cardBack, cardEl, cardGrade } from './cardview';
import { staffFrame } from '../render/sprites';
import { pieceArt } from './pieceart';
import { h, pix } from './dom';
import { hasPng } from '../render/sprites';

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const m = h('div', { class: 'gm' }, pix(`v2_gm_${kind}_0`, 150, 'pix gm-0'), pix(`v2_gm_${kind}_1`, 150, 'pix gm-1'), pix(`v2_gm_${kind}_2`, 150, 'pix gm-2'));
    stage = h('div', { class: 'cap-stage' },
      hasPng(`v2_gf_pillar_${gk}`) ? pix(`v2_gf_pillar_${gk}`, 190, 'pix cap-pillar') : null,
      hasPng(`v2_gf_burst_${gk}`) ? pix(`v2_gf_burst_${gk}`, 150, 'pix cap-burst') : null,
      ...[0, 1, 2, 3].map((i) => pix(`v2_gc_${gk}_${i}`, i === 3 ? 120 : 96, `pix cap cap-${i}`)));
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
    if (!star || reduce) return;
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
    if (bk) window.setTimeout(() => wrap.classList.add('flipped'), reduce ? 0 : 160);
    audio.sfx(g >= 2 ? 'rare' : 'reveal');
    timer = window.setTimeout(showOne, reduce ? 0 : cards.length > 1 ? 240 : 0);
  };
  const finish = () => { clearTimeout(timer); while (shown < cards.length) { grid.append(h('div', { class: 'reveal-cell' }, cardEl(cards[shown], { isNew: newUids.has(cards[shown].uid), size: cards.length > 5 ? 'r' : 'l' }))); shown++; } skip.style.display = 'none'; close.style.display = ''; machine.classList.add('done'); };
  if (v3) {
    // 기계 흔들림(0.7초) → 캡슐 나옴 → 캡슐 흔들림 → 금 → 빛기둥과 함께 열림 → (영웅 · 전설 컷인) → 카드
    const T = reduce ? [0, 0, 0, 0, 0] : [700, 450, 450, 420, 650];
    machine.classList.add('st-shake');
    timer = window.setTimeout(() => {
      machine.classList.replace('st-shake', 'st-drop');
      timer = window.setTimeout(() => {
        machine.classList.replace('st-drop', 'st-wobble');
        timer = window.setTimeout(() => {
          machine.classList.replace('st-wobble', 'st-crack');
          timer = window.setTimeout(() => {
            machine.classList.replace('st-crack', 'st-open'); audio.sfx(best >= 2 ? 'rare' : 'reveal');
            timer = window.setTimeout(() => { showStar(); timer = window.setTimeout(showOne, star && !reduce ? 400 : 0); }, T[4]);
          }, T[3]);
        }, T[2]);
      }, T[1]);
    }, T[0]);
  } else {
    machine.classList.add('shake');
    if (best >= 0) machine.style.setProperty('--cap', GRADES[best].color);
    timer = window.setTimeout(() => { machine.classList.add('open'); showStar(); timer = window.setTimeout(showOne, reduce ? 0 : 350); }, reduce ? 0 : 700);
  }
  let closed = false;
  const closeAll = () => { if (closed) return; closed = true; audio.sfx('click'); back.remove(); onClose(); };
  skip.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('click'); finish(); });
  close.addEventListener('click', (e) => { e.stopPropagation(); closeAll(); });
  // 아무 곳이나 누르면: 공개 중이면 모두 보기, 다 보였으면 확인
  back.addEventListener('click', () => { if (close.style.display === 'none') finish(); else closeAll(); });
}
