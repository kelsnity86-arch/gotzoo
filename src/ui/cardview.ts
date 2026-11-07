// 카드 한 장 모양 (뽑기 결과·합성 결과). GPT 카드 프레임(24×32, 가운데 16×16 창)이 있으면 그 위에 동물을 2배로 얹는다.
import { ANIMALS, HABITAT_NAMES } from '../data/animals';
import { GRADES } from '../data/grades';
import { staffDef } from '../data/staff';
import type { Card } from '../game/state';
import { animalFrame, hasPng, sprite, staffFrame, type Sprite } from '../render/sprites';
import { h, pix } from './dom';

export function cardGrade(c: Card): number { return c.kind === 'animal' ? ANIMALS[c.animal].grade : -1; }

/** 프레임 + 창 안 그림을 원본 크기(24×32)로 합친다 */
function composite(frameKey: string, art: Sprite): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 24; cv.height = 32;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(sprite(frameKey), 0, 0);
  // 창(4,4)~(19,19): 8×8은 2배, 8×12(사람)는 세로에 맞춰
  if (art.height > art.width) c.drawImage(art, 4 + (16 - art.width * 16 / art.height) / 2, 4, art.width * 16 / art.height, 16);
  else c.drawImage(art, 4, 4, 16, 16);
  return cv;
}

export function cardEl(c: Card, opts: { size?: 'l' | 'r' | 'm'; isNew?: boolean } = {}): HTMLElement {
  // l = 크게(한두 장), r = 뽑기 결과 여러 장, m = 작게
  const big = opts.size === 'l' || opts.size === 'r';
  const isStaff = c.kind === 'staff';
  const g = isStaff ? null : GRADES[ANIMALS[c.animal].grade];
  const key = isStaff ? 'staff' : g!.key;
  const name = isStaff ? staffDef(c.staff).name : ANIMALS[c.animal].name;
  const sub = isStaff ? (opts.size === 'l' ? staffDef(c.staff).desc : '') : `♥${g!.attract} · ${HABITAT_NAMES[ANIMALS[c.animal].habitat]}`;
  const art = isStaff ? staffFrame(c.staff, 0) : animalFrame(c.animal, 0);
  if (hasPng('cards_01')) {
    const frame = `cards_0${isStaff ? 6 : g!.id + 1}`;
    // 여러 장일 때는 화면 폭에 3장이 들어가게
    const rPx = typeof window !== 'undefined' ? Math.min(160, Math.floor((window.innerWidth - 70) / 3.6), Math.floor(window.innerHeight / 4.2)) : 160;
    const px = opts.size === 'l' ? 200 : opts.size === 'r' ? rPx : 96;
    return h('div', { class: `card art g-${key}${big ? ' big' : ''}` },
      h('div', { class: 'card-frame' }, pix(composite(frame, art), px), h('div', { class: `card-name-in${name.length >= 6 ? ' xlong' : name.length >= 4 ? ' long' : ''}` }, name)),
      h('div', { class: 'card-grade' }, isStaff ? '직원' : g!.name),
      sub ? h('div', { class: 'card-sub' }, sub) : null,
      opts.isNew ? h('span', { class: 'card-new' }, 'NEW') : null);
  }
  return h('div', { class: `card g-${key}${big ? ' big' : ''}` },
    h('div', { class: 'card-grade' }, isStaff ? '직원' : g!.name),
    h('div', { class: 'card-art' }, pix(art, big ? 64 : 40)),
    h('div', { class: 'card-name' }, name),
    sub ? h('div', { class: 'card-sub' }, sub) : null,
    opts.isNew ? h('span', { class: 'card-new' }, 'NEW') : null);
}

/** 카드 뒷면 (연출용) */
export function cardBack(px = 72): HTMLElement | null {
  return hasPng('cards_07') ? pix('cards_07', px) : null;
}
