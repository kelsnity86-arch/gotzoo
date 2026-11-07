// 뽑기 연출: 뽑기 기계가 흔들리고 → 등급 색 캡슐이 열리고 → 카드가 펼쳐진다. 건너뛰기 가능.
import { GRADES } from '../data/grades';
import type { Card } from '../game/state';
import { audio } from './audio';
import { cardEl, cardGrade } from './cardview';
import { h, pix } from './dom';
import { hasPng } from '../render/sprites';

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** newSpecies: 이번에 처음 얻은 종 uid 목록 (NEW 표시) */
export function showReveal(root: HTMLElement, cards: Card[], newUids: Set<number>, onClose: () => void) {
  const best = Math.max(...cards.map(cardGrade));
  // GPT 그림(뽑기 기계 2프레임 + 등급 캡슐)이 있으면 그걸 쓴다
  const useArt = hasPng('gacha_01');
  const capIdx = Math.max(0, best);
  const machine = useArt
    ? h('div', { class: 'machine art' }, pix('gacha_01', 128, 'pix m-idle'), pix('gacha_02', 128, 'pix m-shake'), pix(`gacha_${String(3 + capIdx).padStart(2, '0')}`, 40, 'pix cap-closed'), pix(`gacha_${String(8 + capIdx).padStart(2, '0')}`, 40, 'pix cap-open'))
    : h('div', { class: 'machine' }, h('div', { class: 'dome' }, ...Array.from({ length: 9 }, (_, i) => h('i', { style: `--k:${i}` }))), h('div', { class: 'body' }, h('b', {})));
  const grid = h('div', { class: `reveal-grid n${cards.length}` });
  const skip = h('button', { class: 'btn ghost' }, '모두 보기');
  const close = h('button', { class: 'btn', style: 'display:none' }, '확인');
  const back = h('div', { class: 'overlay reveal' },
    h('div', { class: 'reveal-box' }, h('div', { class: 'reveal-title' }, `카드 ${cards.length}장`), machine, grid, h('div', { class: 'row-btns' }, skip, close)));
  root.append(back);
  audio.sfx('draw');
  // 전설: 화면 가득 금빛 연출을 먼저
  const legend = cards.find((c) => c.kind === 'animal' && cardGrade(c) === 4);
  if (legend && legend.kind === 'animal' && !reduce) {
    const show = h('div', { class: 'legend-burst' }, h('div', { class: 'rays' }), pix(`animal_${String(legend.animal).padStart(3, '0')}`, 176), h('div', { class: 'legend-text' }, '전설 등장!'));
    back.append(show);
    window.setTimeout(() => audio.sfx('legend'), 600);
    show.addEventListener('click', () => show.remove());
    window.setTimeout(() => show.remove(), 3200);
  }
  let shown = 0, timer = 0;
  const showOne = () => {
    if (shown >= cards.length) { finish(); return; }
    const c = cards[shown++];
    const g = cardGrade(c);
    const wrap = h('div', { class: `reveal-cell${g >= 2 ? ' shine' : ''}`, style: g >= 0 ? `--glow:${GRADES[g].color}` : '--glow:#ef7d32' }, cardEl(c, { isNew: newUids.has(c.uid), size: cards.length > 5 ? 'r' : 'l' }));
    grid.append(wrap);
    audio.sfx(g >= 2 ? 'rare' : 'reveal');
    timer = window.setTimeout(showOne, reduce ? 0 : cards.length > 1 ? 220 : 0);
  };
  const finish = () => { clearTimeout(timer); while (shown < cards.length) { grid.append(h('div', { class: 'reveal-cell' }, cardEl(cards[shown], { isNew: newUids.has(cards[shown].uid), size: cards.length > 5 ? 'r' : 'l' }))); shown++; } skip.style.display = 'none'; close.style.display = ''; machine.classList.add('done'); };
  // 기계 흔들림 → 캡슐 색(가장 높은 등급) → 카드
  machine.classList.add('shake');
  if (best >= 0) machine.style.setProperty('--cap', GRADES[best].color);
  timer = window.setTimeout(() => { machine.classList.add('open'); timer = window.setTimeout(showOne, reduce ? 0 : 350); }, reduce ? 0 : 700);
  let closed = false;
  const closeAll = () => { if (closed) return; closed = true; audio.sfx('click'); back.remove(); onClose(); };
  skip.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('click'); finish(); });
  close.addEventListener('click', (e) => { e.stopPropagation(); closeAll(); });
  // 아무 곳이나 누르면: 공개 중이면 모두 보기, 다 보였으면 확인
  back.addEventListener('click', () => { if (close.style.display === 'none') finish(); else closeAll(); });
}
