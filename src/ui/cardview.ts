// 카드 한 장 모양 (뽑기 결과·합성 결과·보관함)
import { ANIMALS, HABITAT_NAMES } from '../data/animals';
import { GRADES } from '../data/grades';
import { staffDef } from '../data/staff';
import type { Card } from '../game/state';
import { animalFrame, staffFrame } from '../render/sprites';
import { h, pix } from './dom';

export function cardGrade(c: Card): number { return c.kind === 'animal' ? ANIMALS[c.animal].grade : -1; }

export function cardEl(c: Card, opts: { size?: 'l' | 'm'; isNew?: boolean } = {}): HTMLElement {
  const big = opts.size === 'l';
  if (c.kind === 'staff') {
    const d = staffDef(c.staff);
    return h('div', { class: `card g-staff${big ? ' big' : ''}` },
      h('div', { class: 'card-grade' }, '직원'),
      h('div', { class: 'card-art' }, pix(staffFrame(c.staff, 0), big ? 72 : 44)),
      h('div', { class: 'card-name' }, d.name),
      big ? h('div', { class: 'card-sub' }, d.desc) : null,
      opts.isNew ? h('span', { class: 'card-new' }, 'NEW') : null);
  }
  const a = ANIMALS[c.animal], g = GRADES[a.grade];
  return h('div', { class: `card g-${g.key}${big ? ' big' : ''}` },
    h('div', { class: 'card-grade' }, g.name),
    h('div', { class: 'card-art' }, pix(animalFrame(a.id, 0), big ? 64 : 40)),
    h('div', { class: 'card-name' }, a.name),
    h('div', { class: 'card-sub' }, `♥${g.attract} · ${HABITAT_NAMES[a.habitat]}`),
    opts.isNew ? h('span', { class: 'card-new' }, 'NEW') : null);
}
