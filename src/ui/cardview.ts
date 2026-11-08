// 카드 한 장 모양 (뽑기 결과·합성 결과). GPT 카드 프레임(24×32, 가운데 16×16 창)이 있으면 그 위에 동물을 2배로 얹는다.
import { ANIMALS, HABITAT_NAMES } from '../data/animals';
import { GRADES } from '../data/grades';
import { staffDef, staffOptDef } from '../data/staff';
import type { Card } from '../game/state';
import { animalFrame, godFrame, hasPng, heroFrame, shinyOf, sprite, staffFrame, type Sprite } from '../render/sprites';
import { GODS, HEROES } from '../data/olympus';
import { seasonByKey } from '../data/seasons';
import { h, pix } from './dom';

export function cardGrade(c: Card): number { return c.kind === 'animal' ? (c.god !== undefined ? 4 : ANIMALS[c.animal].grade) : c.grade; }
/** 네임드(신 · 영웅)인지 */
export const isNamed = (c: Card) => (c.kind === 'animal' && c.god !== undefined) || (c.kind === 'staff' && c.hero !== undefined);
import { pieceArt } from './pieceart';
import { capOfCells } from '../game/rules';
import { penOptDef, pieceDef, PEN_THEME_BONUS } from '../data/pieces';

/** 프레임 + 창 안 그림을 원본 크기(24×32)로 합친다 */
function composite(frameKey: string, art: Sprite): HTMLCanvasElement {
  // 새 카드 틀(28×44, 창 5,9~23,27)은 4배, 예전 틀(24×32, 창 4,4~19,19)은 3배로. 창 안 그림은 도트가 고르게 정수 배로 키우고,
  // 창보다 크면 창의 정수 배 캔버스에 줄여 넣지 않고 틀 쪽을 키워서 도트를 지킨다
  const v3 = frameKey.startsWith('v2_card_');
  const fw = v3 ? 28 : 24, fh = v3 ? 44 : 32, wx = v3 ? 5 : 4, wy = v3 ? 9 : 4, ws = v3 ? 18 : 16;
  const need = Math.max(art.width, art.height);
  const K = v3 ? Math.max(4, Math.ceil(need / ws)) : 3;
  const cv = document.createElement('canvas');
  cv.width = fw * K; cv.height = fh * K;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(sprite(frameKey), 0, 0, fw * K, fh * K);
  const box = ws * K, bx = wx * K, by = wy * K;
  const sc = (box - (v3 ? 2 * K : 0)) / need;
  const k = sc >= 1 ? Math.floor(sc) : sc;
  const w = art.width * k, h = art.height * k;
  c.drawImage(art, Math.round(bx + (box - w) / 2), Math.round(by + (box - h) / 2), w, h);
  return cv;
}

export function cardEl(c: Card, opts: { size?: 'l' | 'r' | 'm'; isNew?: boolean } = {}): HTMLElement {
  // l = 크게(한두 장), r = 뽑기 결과 여러 장, m = 작게
  const big = opts.size === 'l' || opts.size === 'r';
  const g = GRADES[cardGrade(c)];
  const named = isNamed(c);
  const key = g.key;
  let name: string, gradeLabel: string, sub: string, art: Sprite, shiny = false;
  if (c.kind === 'animal' && c.god !== undefined) {
    const d = GODS[c.god]; shiny = !!c.shiny;
    name = d.name; gradeLabel = `${shiny ? '✦각성 ' : ''}신화 · ${d.title}`;
    sub = big ? `${d.god} × ${d.zodiac} · ${d.desc(d.value * (shiny ? 1.5 : 1))}` : d.title;
    art = godFrame(c.god, shiny, d.base);
  } else if (c.kind === 'staff' && c.hero !== undefined) {
    const d = HEROES[c.hero]; shiny = !!c.awake;
    name = d.name; gradeLabel = `${shiny ? '✦각성 ' : ''}신화 영웅 · ${staffDef(c.staff).name}`;
    sub = big ? `${d.title} · ${d.desc(d.value * (shiny ? 1.5 : 1))}` : d.title;
    art = heroFrame(c.hero, shiny, c.staff, 0);
  } else if (c.kind === 'staff') {
    name = staffDef(c.staff).name; gradeLabel = `${g.name} 직원`;
    // 직원: 효과 + 특수옵션 (큰 카드만 설명까지)
    sub = big ? [staffDef(c.staff).desc(staffDef(c.staff).values[c.grade]), ...c.opts.map((o) => `★ ${staffOptDef(o.id).name}`)].join(' · ') : '';
    art = staffFrame(c.staff, 0);
  } else if (c.kind === 'pen') {
    const pd = pieceDef(c.piece);
    name = pd.name; gradeLabel = `${g.name} 우리 · ${HABITAT_NAMES[c.habitat]}`;
    sub = big ? [`${pd.cells.length}칸 · ${capOfCells(pd.cells.length)}마리`, `${HABITAT_NAMES[c.habitat]} +${Math.round(PEN_THEME_BONUS[c.grade] * 100)}%`, ...c.opts.map((o) => `★ ${penOptDef(o.id).name}`)].join(' · ') : `${pd.cells.length}칸`;
    art = pieceArt(c);
  } else {
    name = ANIMALS[c.animal].name; shiny = !!c.shiny;
    const seasonTag = ANIMALS[c.animal].season ? ` · ${seasonByKey(ANIMALS[c.animal].season!).name} 한정` : '';
    gradeLabel = `${shiny ? '✦반짝이 ' : ''}${g.name}${seasonTag}`;
    sub = `♥${g.attract} · ${HABITAT_NAMES[ANIMALS[c.animal].habitat]}`;
    art = shiny ? shinyOf(animalFrame(c.animal, 0)) : animalFrame(c.animal, 0);
  }
  if (hasPng('cards_01') || hasPng('v2_card_common')) {
    const v3 = hasPng('v2_card_common');
    const frame = v3 ? `v2_card_${named ? 'legend' : c.kind === 'staff' ? 'staff' : c.kind === 'pen' ? 'pen' : key}` : `cards_0${g.id + 1}`;
    // 여러 장일 때는 화면 폭에 3장이 들어가게
    const rPx = typeof window !== 'undefined' ? Math.min(160, Math.floor((window.innerWidth - 70) / 3.6), Math.floor(window.innerHeight / 4.2)) : 160;
    const px = opts.size === 'l' ? 200 : opts.size === 'r' ? rPx : 96;
    return h('div', { class: `card art${v3 ? ' v3' : ''} g-${key}${big ? ' big' : ''}${shiny ? ' shiny' : ''}${named ? ' mythic' : ''}` },
      h('div', { class: 'card-frame' }, pix(composite(frame, art), px), h('div', { class: `card-name-in${name.length >= 6 ? ' xlong' : name.length >= 4 ? ' long' : ''}` }, name)),
      h('div', { class: 'card-grade' }, gradeLabel),
      sub ? h('div', { class: 'card-sub' }, sub) : null,
      opts.isNew ? h('span', { class: 'card-new' }, 'NEW') : null);
  }
  return h('div', { class: `card g-${key}${big ? ' big' : ''}${shiny ? ' shiny' : ''}${named ? ' mythic' : ''}` },
    h('div', { class: 'card-grade' }, gradeLabel),
    h('div', { class: 'card-art' }, pix(art, big ? 64 : 40)),
    h('div', { class: 'card-name' }, name),
    sub ? h('div', { class: 'card-sub' }, sub) : null,
    opts.isNew ? h('span', { class: 'card-new' }, 'NEW') : null);
}

/** 카드 뒷면 (연출용) */
export function cardBack(px = 72): HTMLElement | null {
  return hasPng('v2_card_back') ? pix('v2_card_back', px) : hasPng('cards_07') ? pix('cards_07', px) : null;
}
