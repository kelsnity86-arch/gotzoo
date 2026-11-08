// 오른쪽(가로 화면) / 아래쪽(세로 화면) 패널: 큰 탭 5개(뽑기 · 동물원 · 카드 · 운영 · 기록), 안에 작은 탭
import { ANIMALS, HABITAT_NAMES } from '../data/animals';
import { DEX_SETS, dexSetMembers } from '../data/dex';
import { MISSION_BONUS, MISSION_REWARD } from '../data/missions';
import { GRADES, type Grade } from '../data/grades';
import { STAFF, staffDef, staffOptDef, STAFF_DRAW_MUL } from '../data/staff';
import { FUSION_MAX, FUSION_MIN, GACHA, MAX_STAGE, STAGE_TIP_MUL, UPGRADES } from '../data/balance';
import type { Card, SaveData } from '../game/state';
import type { World } from '../game/world';
import {
  assignStaff, staffSum, curSeason, penDetail, dailyCosts, buyItem, costUnit, decorPrice, buyFacility, facCount, facPrice, fireRefund, fireStaff, staffDraw, staffDrawPrice, staffPay, autoFusionPick, autoPlace, optimizePlacement, claimDexSet, claimMission, claimMissionBonus, dexSetDone, ensureMissions, missionText, ticketDraw, buyUpgrade, canPromote, draw, drawPrice, freeDraw, fuse, fusionCandidates, fusionChance,
  penCap, totalCap, boardDims, penCardAt, removePen, autoArrangePens, penDraw, penDrawPrice, penFusionCandidates, fusePens, placeAnimal, placedAnimals, placedSet, promote, stageReq, staffSlotCount, totalAttract, unplace, upgradeCost, upgradeLockedBy, upValue,
} from '../game/rules';
import { animalFrame, hasPng, shinyOf, staff16, staffFrame } from '../render/sprites';
import { SEASONS, SEASON_FX, yearOf } from '../data/seasons';
import { SYNERGY_SETS } from '../data/synergy';
import { PEN_DRAW_MUL, PEN_THEME_BONUS, penOptDef, pieceDef } from '../data/pieces';
import { DECO_TIERS, DECOR, DECOR_FX, FACILITIES, FAC_MAX_LV, facLevelValue, itemName, itemSprite, type FacilityType } from '../data/facilities';
import { pieceArt } from './pieceart';
import type { DayReport } from '../game/world';
import { audio } from './audio';
import { cardEl } from './cardview';
import { fmt, h, iconSlot, pix, toast } from './dom';
import { showReveal } from './reveal';

export interface PanelCtx { save: SaveData; world: World; persist: () => void; overlayRoot: HTMLElement; startPlace?: (uid: number) => void; startPlaceItem?: (uid: number) => void; reports?: DayReport[] }
type Tab = 'gacha' | 'zoo' | 'cards' | 'manage' | 'log';
const TABS: [Tab, string][] = [['gacha', '뽑기'], ['zoo', '동물원'], ['cards', '카드'], ['manage', '운영'], ['log', '기록']];
const TAB_ICON: Record<Tab, string> = { gacha: 'icons_12', zoo: 'icons_05', cards: 'icons_10', manage: 'icons_13', log: 'icons_15' };
/** 큰 탭 안의 작은 탭 */
const SUBS: Record<Tab, [string, string][]> = {
  gacha: [['animal', '동물'], ['staff', '직원'], ['pen', '우리']],
  zoo: [['board', '부지'], ['fac', '시설'], ['deco', '꾸미기']],
  cards: [['animal', '동물'], ['staff', '직원'], ['pen', '우리']],
  manage: [['up', '업그레이드'], ['slots', '직원 배치'], ['money', '돈']],
  log: [['mission', '미션'], ['dex', '도감'], ['syn', '시너지'], ['record', '라이벌']],
};
const UP_ICON: Record<string, string> = { land: 'icons_05', quality: 'icons_06', gate: 'icons_03', staff: 'icons_07', pickup: 'icons_08' };

/** 직원 효과 한 줄 (카드에 크게) */
function staffShort(kind: string, v: number): string {
  const p = (x: number) => `${Math.round(x * 100)}%`;
  switch (kind) {
    case 'collector': return `동전 줍기 ×${v}`;
    case 'keeper': return `먹이 주기 ×${v}`;
    case 'guide': return `투척액 +${p(v)}`;
    case 'janitor': return `바닥 동전 +${v}초`;
    case 'ticket': return `입장료 ${p(v)}`;
    case 'cleaner': return `유지비 −${p(v)}`;
    case 'guard': return `소매치기 ${p(v)} 막기`;
    case 'vet': return `감기 ${p(v)} 막기`;
    case 'promoter': return `관람객 +${p(v)}`;
    case 'performer': return `이벤트 간격 −${p(v)}`;
    default: return '';
  }
}

export class Panel {
  readonly el: HTMLElement;
  private body = h('div', { class: 'panel-body' });
  private tabBtns: HTMLButtonElement[];
  tab: Tab = 'gacha';
  sub: Record<Tab, string> = { gacha: 'animal', zoo: 'board', cards: 'animal', manage: 'up', log: 'mission' };
  /** 카드 > 동물: 보관함 / 합성 */
  private cardMode: 'list' | 'fuse' = 'list';
  private penFuseGrade: Grade = 0;
  private penSel: number[] = [];
  private fuseGrade: Grade = 0;
  private fuseSel: number[] = [];
  private invGrade = -1;
  private lastKey = '';

  constructor(private ctx: PanelCtx) {
    this.tabBtns = TABS.map(([t, name]) => h('button', { class: 'ptab', onclick: () => {
      audio.sfx('click');
      // 세로 화면: 탭을 누르면 서랍이 열리고, 같은 탭을 다시 누르면 닫힌다
      if (this.tab === t && this.isOpen && !document.body.classList.contains('landscape')) { this.setOpen(false); return; }
      this.tab = t; this.setOpen(true); this.render(true);
    } }, hasPng(TAB_ICON[t]) ? iconSlot(TAB_ICON[t], 14) : null, h('span', {}, name), h('i', { class: 'dot' })));
    const handle = h('button', { class: 'drawer-close', title: '닫기', onclick: () => this.setOpen(false) }, '▼');
    this.el = h('aside', { class: 'panel closed' }, h('nav', { class: 'ptabs' }, ...this.tabBtns, handle), this.body);
  }

  isOpen = false;
  setOpen(v: boolean) { this.isOpen = v; this.el.classList.toggle('closed', !v); }

  /** 코인 등이 바뀌면 다시 그린다 (같은 내용이면 건너뜀) */
  render(force = false) {
    const s = this.ctx.save;
    const key = `${this.tab}:${this.sub[this.tab]}:${this.cardMode}:${this.penSel.length}:${this.penFuseGrade}:${s.board.map((b) => b.uid).join(',')}:${s.items.map((it) => `${it.uid}${it.x}`).join(',')}:${this.fireArm}|${Math.floor(s.coins)}|${s.cards.length}|${s.pens.flat().length}|${s.staffSlots.join()}|${s.stage}|${Object.values(s.upgrades).join()}|${this.fuseGrade}|${this.fuseSel.length}|${this.invGrade}|${s.lockedSpecies.length}|${s.tickets}|${JSON.stringify(s.missions?.list.map((m) => [m.progress, m.claimed]))}|${s.dexClaimed.length}|${s.dex.filter(Boolean).length}|${s.season.n}|${s.synergyFound.length}|${s.shinyDex.filter(Boolean).length}|${this.ctx.world.phase}`;
    if (!force && key === this.lastKey) return;
    // 코인만 바뀐 경우 버튼 상태만 고친다 (스크롤·입력 유지)
    const onlyCoins = !force && this.lastKey && key.split('|').slice(2).join() === this.lastKey.split('|').slice(2).join() && key.split('|')[0] === this.lastKey.split('|')[0];
    this.lastKey = key;
    this.tabBtns.forEach((b, i) => b.classList.toggle('on', TABS[i][0] === this.tab && (this.isOpen || document.body.classList.contains('landscape'))));
    // 받을 게 있는 탭에 빨간 점
    const dots = this.badges();
    this.tabBtns.forEach((b, i) => b.classList.toggle('has-dot', dots[TABS[i][0]]));
    if (onlyCoins) { this.updateAffordable(); return; }
    const top = this.body.scrollTop;
    const sub = this.sub[this.tab];
    const views: Record<string, () => HTMLElement> = {
      'gacha:animal': () => this.gacha(), 'gacha:staff': () => this.staffGacha(), 'gacha:pen': () => this.penGacha(),
      'zoo:board': () => this.boardView(), 'zoo:fac': () => this.facView(), 'zoo:deco': () => this.decoView(),
      'cards:animal': () => (this.cardMode === 'fuse' ? this.fusion() : this.inventory()), 'cards:staff': () => this.staffCards(), 'cards:pen': () => this.penCards(),
      'manage:up': () => this.upgrades(), 'manage:slots': () => this.staffSlots(), 'manage:money': () => this.money(),
      'log:mission': () => this.missions(), 'log:dex': () => this.dex(), 'log:syn': () => this.synergyDex(), 'log:record': () => this.records(),
    };
    const subBar = SUBS[this.tab].length ? h('div', { class: 'subtabs' }, ...SUBS[this.tab].map(([k, name]) => h('button', { class: `subtab${sub === k ? ' on' : ''}`, onclick: () => { audio.sfx('click'); this.sub[this.tab] = k; this.render(true); } }, name))) : null;
    this.body.replaceChildren(...[subBar, (views[`${this.tab}:${sub}`] ?? views['gacha:animal'])()].filter((x): x is HTMLElement => !!x));
    this.body.scrollTop = top;
  }

  /** 탭 빨간 점: 공짜 뽑기 · 뽑기권 / 놓지 않은 우리 / 합성 가능 / 밤에 살 수 있는 업그레이드 / 받을 미션 · 도감 보상 */
  private badges(): Record<Tab, boolean> {
    const s = this.ctx.save;
    const ms = s.missions;
    return {
      gacha: !s.freeDrawUsed || (s.tickets > 0 && s.coins >= 0),
      zoo: s.cards.some((c) => c.kind === 'pen' && !s.board.some((b) => b.uid === c.uid)) || (placedAnimals(s) < totalCap(s) && s.cards.some((c) => c.kind === 'animal' && !s.pens.flat().includes(c.uid))),
      cards: ([0, 1, 2, 3] as Grade[]).some((g) => fusionCandidates(s, g).length >= FUSION_MAX),
      manage: this.ctx.world.isNight && UPGRADES.some((u) => { const c = upgradeCost(s, u.id); return c !== null && c <= s.coins && upgradeLockedBy(s, u.id) === null; }),
      log: !!ms && ms.list.some((m) => !m.claimed && m.progress >= m.target) || DEX_SETS.some((st) => !s.dexClaimed.includes(st.id) && dexSetDone(s, st.id)),
    };
  }

  /** data-cost가 있는 버튼은 코인이 모자라면 꺼 둔다 */
  private updateAffordable() {
    for (const b of this.body.querySelectorAll<HTMLButtonElement>('button[data-cost]')) b.disabled = this.ctx.save.coins < Number(b.dataset.cost) || b.dataset.lock === '1';
  }
  private costBtn(label: Node | string, cost: number, onclick: () => void, extraClass = '', locked = false) {
    const b = h('button', { class: `btn ${extraClass}`, 'data-cost': cost, 'data-lock': locked ? '1' : '0', onclick }, label) as HTMLButtonElement;
    b.disabled = this.ctx.save.coins < cost || locked;
    return b;
  }
  private fireArm = '';
  private changed() { this.ctx.persist(); this.ctx.world.sync(); this.render(true); }

  // ── 뽑기 ──
  private gacha() {
    const s = this.ctx.save;
    const price = drawPrice(s);
    const doDraw = (n: number) => {
      const beforeDex = s.dex.slice();
      const out = draw(s, n);
      if (!out) { audio.sfx('deny'); toast('코인이 모자라요', 'bad'); return; }
      this.reveal(out, beforeDex);
    };
    const free = !s.freeDrawUsed ? h('button', { class: 'btn big pulse', onclick: () => { const before = s.dex.slice(); const c = freeDraw(s); if (c) this.reveal([c], before); } }, '무료 뽑기! (일반 동물 확정)') : null;
    const grid = h('div', { class: 'odds' }, ...GRADES.map((g) => h('div', { class: `odd g-${g.key}` }, h('b', {}, g.name), `${(g.chance * 100).toFixed(0)}%`)));
    return h('div', { class: 'tab-gacha' },
      h('div', { class: 'gacha-hero' }, h('div', { class: 'mini-machine' }, h('i', {}), h('i', {}), h('i', {})),
        h('div', {}, h('div', { class: 'title' }, '동물 카드 뽑기'), h('div', { class: 'sub' }, `진행 ${s.stage}단계 · 1장 ${fmt(price)}코인`))),
      free,
      this.seasonBanner(),
      s.coins < 0 ? h('div', { class: 'debt-note' }, `빚 ${fmt(-s.coins)}코인 · 갚기 전엔 뽑기·공사를 못 해요`) : null,
      h('div', { class: 'draw-btns' },
        this.costBtn(h('span', {}, '1회', h('small', {}, `${fmt(price)}`)), price, () => doDraw(1)),
        this.costBtn(h('span', {}, '5회', h('small', {}, `${fmt(price * 5)}`)), price * 5, () => doDraw(5)),
        this.costBtn(h('span', {}, '10회', h('small', {}, `${fmt(price * 10)}`)), price * 10, () => doDraw(10))),
      s.tickets > 0 ? h('button', { class: 'btn big ticket', onclick: () => { const before = s.dex.slice(); const out = ticketDraw(s); if (out) this.reveal(out, before); } }, `무료 뽑기권 사용 (${s.tickets}장 남음)`) : null,
      h('details', { class: 'odds-box' }, h('summary', {}, '확률 보기'), grid),
      h('p', { class: 'hint' }, '같은 등급 카드를 2~10장 모아 합성하면 다음 등급을 노릴 수 있어요. 많이 넣을수록 성공 확률이 올라가요. 직원은 직원 탭에서 따로 뽑아요.'));
  }

  /** 계절 픽업 배너: 이 계절 한정 동물 (고급 이상을 뽑으면 일정 확률로) */
  private seasonBanner() {
    const s = this.ctx.save, se = curSeason(s);
    const lim = ANIMALS.filter((a) => a.season === se.key).sort((a, b) => b.grade - a.grade);
    return h('div', { class: `season-banner s-${se.key}` },
      h('div', { class: 'sb-head' }, h('b', {}, `${se.icon} ${yearOf(s.season.n)}년 ${se.name} 한정 동물 ${lim.length}종`), h('span', { class: 'sub' }, `고급 이상이 나오면 ${Math.round(SEASON_FX.limitedShare * 100)}% 확률로 계절 한정 · 제철엔 매력 2배`)),
      h('div', { class: 'sb-list' }, ...lim.slice(0, 6).map((a) => h('span', { class: `sb-a g-${GRADES[a.grade].key}${s.dex[a.id] ? '' : ' unknown'}`, title: s.dex[a.id] ? a.name : '???' }, pix(animalFrame(a.id, 0), 24)))),
      h('div', { class: 'sub' }, `반짝이 변종 ${Math.round(1)}% · 매력 1.5배`));
  }

  /** 오늘 영업 미션: 하나 = 뽑기권 1장, 셋 다 = 보너스 2장 (영업이 끝나면 자동 정산) */
  private missions() {
    const s = this.ctx.save;
    const ms = ensureMissions(s);
    const rows = ms.list.map((m, i) => {
      const done = m.progress >= m.target;
      const b = h('button', { class: 'btn small', onclick: () => { if (claimMission(s, i)) { audio.sfx('buy'); toast(`뽑기권 +${MISSION_REWARD}`, 'gold'); this.changed(); } } }, m.claimed ? '받음' : `뽑기권 ${MISSION_REWARD}`) as HTMLButtonElement;
      b.disabled = m.claimed || !done;
      return h('div', { class: `mission${m.claimed ? ' claimed' : ''}` },
        h('div', { class: 'm-info' }, h('div', {}, missionText(m.kind, m.target)), this.bar(`${m.progress} / ${m.target}`, m.progress / m.target)), b);
    });
    const bonus = h('button', { class: 'btn small', onclick: () => { if (claimMissionBonus(s)) { audio.sfx('fuseWin'); toast(`영업 미션 완료! 뽑기권 +${MISSION_BONUS}`, 'gold', 2400); this.changed(); } } }, ms.bonusClaimed ? '받음' : `보너스 ${MISSION_BONUS}장`) as HTMLButtonElement;
    bonus.disabled = ms.bonusClaimed || !ms.list.every((m) => m.claimed);
    const night = this.ctx.world.isNight;
    return h('div', {}, h('div', { class: 'section-title' }, `오늘 영업 미션 · ${ms.day}일째`), ...rows,
      h('div', { class: 'mission bonus' }, h('div', { class: 'm-info' }, '3개 모두 받으면'), bonus),
      h('p', { class: 'hint' }, night ? '오늘 영업은 끝났어요. 개장하면 새 미션이 나와요.' : '낮 동안 한 일만 세요. 영업이 끝나면 달성한 미션은 자동으로 받고, 못 한 미션은 사라져요.'));
  }

  private reveal(cards: Card[], beforeDex: boolean[]) {
    const s = this.ctx.save;
    const newUids = new Set<number>();
    const seen = new Set<number>();
    for (const c of cards) if (c.kind === 'animal' && !beforeDex[c.animal] && !seen.has(c.animal)) { newUids.add(c.uid); seen.add(c.animal); }
    this.ctx.persist();
    showReveal(this.ctx.overlayRoot, cards, newUids, () => {
      // 빈 칸이 있으면 바로 채우기를 권한다
      const free = totalCap(s) - placedAnimals(s);
      if (free > 0 && cards.some((c) => c.kind === 'animal')) { const n = autoPlace(s); if (n) toast(`빈 우리에 ${n}마리 배치했어요`, 'good'); }
      // 새 직원: 빈 슬롯에 등급 높은 순으로 배치
      const newStaff = cards.filter((c): c is Extract<Card, { kind: 'staff' }> => c.kind === 'staff').sort((a, b) => b.grade - a.grade);
      const hired = newStaff.filter((c) => s.staffSlots.some((u, i) => u === null && i < staffSlotCount(s)) && assignStaff(s, c.uid));
      if (hired.length) toast(`${hired.map((c) => staffDef(c.staff).name).join(', ')} 배치!`, 'gold');
      this.changed();
    });
  }

  // ── 보관함 ──
  private inventory() {
    const s = this.ctx.save;
    const placed = placedSet(s);
    const groups = new Map<number, { all: number; free: number[]; placed: number; shiny: number }>();
    for (const c of s.cards) {
      if (c.kind !== 'animal') continue;
      if (this.invGrade >= 0 && ANIMALS[c.animal].grade !== this.invGrade) continue;
      const g = groups.get(c.animal) ?? { all: 0, free: [], placed: 0, shiny: 0 };
      g.all++; if (c.shiny) g.shiny++;
      if (placed.has(c.uid)) g.placed++; else if (c.shiny) g.free.unshift(c.uid); else g.free.push(c.uid);
      groups.set(c.animal, g);
    }
    const capLeft = totalCap(s) - placedAnimals(s);
    const rows = [...groups.entries()].sort((a, b) => ANIMALS[b[0]].grade - ANIMALS[a[0]].grade || a[0] - b[0]).map(([id, g]) => {
      const a = ANIMALS[id], gr = GRADES[a.grade];
      const locked = s.lockedSpecies.includes(id);
      return h('div', { class: `inv-row g-${gr.key}` },
        h('div', { class: 'inv-art' }, pix(g.shiny ? shinyOf(animalFrame(id, 0)) : animalFrame(id, 0), 32)),
        h('div', { class: 'inv-info' }, h('div', { class: 'inv-name' }, a.name, h('span', { class: 'gtag' }, gr.name), a.season ? h('span', { class: `gtag s-${a.season}` }, SEASONS.find((x) => x.key === a.season)!.name) : null, g.shiny ? h('span', { class: 'gtag shiny' }, `반짝이 ${g.shiny}`) : null),
          h('div', { class: 'inv-sub' }, `보유 ${g.all} · 전시 ${g.placed} · ♥${gr.attract} · ${HABITAT_NAMES[a.habitat]}`)),
        h('div', { class: 'inv-act' },
          h('button', { class: `icon ${locked ? 'on' : ''}`, title: locked ? '잠금 해제' : '합성 재료에서 빼기(잠금)', onclick: () => { s.lockedSpecies = locked ? s.lockedSpecies.filter((x) => x !== id) : [...s.lockedSpecies, id]; this.changed(); } }, locked ? '🔒' : '🔓'),
          (() => { const b = h('button', { class: 'btn small', onclick: () => { if (placeAnimal(s, g.free[0])) { audio.sfx('click'); this.changed(); } } }, '배치') as HTMLButtonElement; b.disabled = !g.free.length || capLeft <= 0; return b; })()));
    });
    const staffCards = s.cards.filter((c) => c.kind === 'staff');
    const chips = h('div', { class: 'chips' }, ...[-1, 0, 1, 2, 3, 4].map((g) => h('button', { class: `chip${this.invGrade === g ? ' on' : ''}`, onclick: () => { this.invGrade = g; this.render(true); } }, g < 0 ? '전체' : GRADES[g].name)));
    return h('div', {},
      this.modeBar(),
      h('div', { class: 'inv-head' }, h('div', {}, h('b', {}, `전시 ${placedAnimals(s)} / ${totalCap(s)}`), h('span', { class: 'sub' }, ` · 동물 카드 ${s.cards.filter((c) => c.kind === 'animal').length}장`)),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn small ghost', onclick: () => { const n = autoPlace(s); toast(n ? `${n}마리 배치` : '빈 칸이 없거나 남은 카드가 없어요', n ? 'good' : 'info'); this.changed(); } }, '빈 칸 채우기'),
          h('button', { class: 'btn small', onclick: () => {
            const before = totalAttract(s);
            const after = optimizePlacement(s);
            audio.sfx('buy');
            toast(after > before ? `최대 수익 배치! 매력도 ${fmt(before)} → ${fmt(after)}` : `이미 최고 배치예요 (매력도 ${fmt(after)})`, after > before ? 'gold' : 'info', 2400);
            this.changed();
          } }, '최대 수익 배치'))),
      chips,
      rows.length ? h('div', { class: 'inv-list' }, ...rows) : h('p', { class: 'hint' }, '아직 동물 카드가 없어요. 뽑기 탭에서 뽑아 보세요.'),
      staffCards.length ? h('div', { class: 'section-title' }, `직원 카드 ${staffCards.length}장 (직원 탭에서 배치)`) : null);
  }

  // ── 합성 ──
  /** 카드 > 동물: 보관함 / 합성 전환 */
  private modeBar() {
    return h('div', { class: 'seg' },
      h('button', { class: `seg-b${this.cardMode === 'list' ? ' on' : ''}`, onclick: () => { this.cardMode = 'list'; this.render(true); } }, '보관함'),
      h('button', { class: `seg-b${this.cardMode === 'fuse' ? ' on' : ''}`, onclick: () => { this.cardMode = 'fuse'; this.render(true); } }, '합성하기'));
  }
  private fusion() {
    const s = this.ctx.save;
    const cands = fusionCandidates(s, this.fuseGrade);
    const candSet = new Set(cands.map((c) => c.uid));
    this.fuseSel = this.fuseSel.filter((u) => candSet.has(u));
    const n = this.fuseSel.length, chance = fusionChance(n);
    const bySpecies = new Map<number, number[]>();
    for (const c of cands) if (c.kind === 'animal') bySpecies.set(c.animal, [...(bySpecies.get(c.animal) ?? []), c.uid]);
    const chips = h('div', { class: 'chips' }, ...[0, 1, 2, 3].map((g) => h('button', { class: `chip g-${GRADES[g].key}${this.fuseGrade === g ? ' on' : ''}`, onclick: () => { this.fuseGrade = g as Grade; this.fuseSel = []; this.render(true); } }, `${GRADES[g].name} → ${GRADES[g + 1].name}`)));
    const rows = [...bySpecies.entries()].map(([id, uids]) => {
      const inSel = uids.filter((u) => this.fuseSel.includes(u)).length;
      const minus = h('button', { class: 'icon', onclick: () => { const u = uids.find((x) => this.fuseSel.includes(x)); if (u !== undefined) { this.fuseSel = this.fuseSel.filter((x) => x !== u); this.render(true); } } }, '−') as HTMLButtonElement;
      const plus = h('button', { class: 'icon', onclick: () => { const u = uids.find((x) => !this.fuseSel.includes(x)); if (u !== undefined && this.fuseSel.length < FUSION_MAX) { this.fuseSel.push(u); audio.sfx('click'); this.render(true); } } }, '+') as HTMLButtonElement;
      minus.disabled = !inSel; plus.disabled = inSel >= uids.length || n >= FUSION_MAX;
      return h('div', { class: `fuse-row${inSel ? ' sel' : ''}` }, pix(animalFrame(id, 0), 24), h('span', { class: 'fuse-name' }, ANIMALS[id].name), h('span', { class: 'sub' }, `${uids.length}장`),
        h('div', { class: 'stepper' }, minus, h('b', {}, inSel), plus));
    });
    const gauge = h('div', { class: 'gauge' }, h('i', { style: `width:${chance * 100}%` }), h('span', {}, n < FUSION_MIN ? `${FUSION_MIN}장부터 합성할 수 있어요` : `성공 확률 ${Math.round(chance * 100)}%`));
    const go = h('button', { class: 'btn big', onclick: () => this.doFuse() }, `${n}장 합성하기`) as HTMLButtonElement;
    go.disabled = n < FUSION_MIN;
    return h('div', {},
      this.modeBar(),
      chips,
      h('div', { class: 'fuse-slots' }, ...Array.from({ length: FUSION_MAX }, (_, i) => {
        const u = this.fuseSel[i];
        const c = u !== undefined ? s.cards.find((x) => x.uid === u) : undefined;
        return h('div', { class: `slot${c ? ' full' : ''}` }, c && c.kind === 'animal' ? pix(animalFrame(c.animal, 0), 20) : null);
      })),
      gauge,
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn small ghost', onclick: () => { this.fuseSel = autoFusionPick(s, this.fuseGrade, FUSION_MAX); this.render(true); } }, '자동으로 채우기'),
        h('button', { class: 'btn small ghost', onclick: () => { this.fuseSel = []; this.render(true); } }, '비우기'), go),
      h('p', { class: 'hint' }, '실패해도 넣은 카드 중 1장은 돌려받아요. 전시 중인 카드와 잠근 종은 들어가지 않아요.'),
      rows.length ? h('div', { class: 'fuse-list' }, ...rows) : h('p', { class: 'hint' }, `넣을 수 있는 ${GRADES[this.fuseGrade].name} 카드가 없어요.`));
  }

  private doFuse() {
    const s = this.ctx.save;
    const n = this.fuseSel.length;
    const r = fuse(s, this.fuseSel);
    if (!r.ok) { toast(r.reason, 'bad'); return; }
    this.fuseSel = [];
    this.ctx.persist();
    // 캡슐이 흔들리다가 열린다 (재료 등급 색)
    const g = r.card.kind === 'animal' ? ANIMALS[r.card.animal].grade - (r.success ? 1 : 0) : 0;
    if (hasPng('gacha_03')) {
      const cap = h('div', { class: 'overlay' }, h('div', { class: 'fuse-capsule' }, pix(`gacha_${String(3 + Math.max(0, g)).padStart(2, '0')}`, 96), h('div', { class: 'reveal-title', style: 'color:#fff' }, `${n}장 합성 중… ${Math.round(r.chance * 100)}%`)));
      this.ctx.overlayRoot.append(cap);
      audio.sfx('draw');
      window.setTimeout(() => { cap.remove(); this.fuseResult(r, n); }, 1100);
      return;
    }
    this.fuseResult(r, n);
  }

  private fuseResult(r: Extract<ReturnType<typeof fuse>, { ok: true }>, n: number) {
    audio.sfx(r.success ? 'fuseWin' : 'fuseFail');
    const back = h('div', { class: 'overlay' },
      h('div', { class: `fuse-result ${r.success ? 'win' : 'lose'}` },
        h('div', { class: 'reveal-title' }, r.success ? '합성 성공!' : '합성 실패…'),
        h('div', { class: 'sub' }, `${n}장 · 확률 ${Math.round(r.chance * 100)}%`),
        cardEl(r.card, { size: 'l' }),
        h('div', { class: 'sub' }, r.success ? '다음 등급 카드를 얻었어요' : '넣은 카드 중 1장을 돌려받았어요'),
        h('button', { class: 'btn', onclick: () => { back.remove(); this.changed(); } }, '확인')));
    this.ctx.overlayRoot.append(back);
  }

  // ── 업그레이드 ──
  private upgrades() {
    const s = this.ctx.save;
    const req = stageReq(s);
    const stageBox = h('div', { class: 'stage-box' },
      h('div', { class: 'stage-head' }, h('b', {}, `진행 ${s.stage}단계`), h('span', { class: 'sub' }, `뽑기 1장 ${fmt(drawPrice(s))} · 투척액 ×${Math.pow(STAGE_TIP_MUL, s.stage - 1).toFixed(2)}`)),
      req ? h('div', {},
        this.bar(`전시 동물 ${placedAnimals(s)} / ${req[0]}`, placedAnimals(s) / req[0]),
        this.bar(`총 매력도 ${fmt(totalAttract(s))} / ${fmt(req[1])}`, totalAttract(s) / req[1]),
        (() => { const b = h('button', { class: 'btn', onclick: () => { if (promote(s)) { audio.sfx('fuseWin'); toast(`${s.stage}단계 승급! 투척액이 올라가고 새 업그레이드가 열려요`, 'gold', 2600); this.changed(); } } }, `${s.stage + 1}단계 승급 (뽑기 1장 ${fmt(GACHA.price[s.stage])})`) as HTMLButtonElement; b.disabled = !canPromote(s); return b; })())
        : h('div', { class: 'sub' }, `최고 단계(${MAX_STAGE})예요!`));
    const rows = UPGRADES.map((u) => {
      const cost = upgradeCost(s, u.id), lock = upgradeLockedBy(s, u.id);
      const lv = s.upgrades[u.id];
      return h('div', { class: 'up-row' },
        h('div', { class: 'up-info' }, h('div', { class: 'up-name' }, hasPng(UP_ICON[u.id]) ? pix(UP_ICON[u.id], 16) : null, u.name, h('span', { class: 'sub' }, ` Lv.${lv + 1}/${u.values.length}`)),
          h('div', { class: 'sub' }, cost === null ? u.describe(u.values[lv]) : `${u.describe(u.values[lv])} → ${u.describe(u.values[lv + 1])}`),
          lock ? h('div', { class: 'lock' }, `${lock}단계부터`) : null),
        cost === null ? h('span', { class: 'max' }, '최고')
          : !this.ctx.world.isNight ? h('span', { class: 'night-only' }, '🌙 밤에 공사', h('small', {}, fmt(cost)))
          : this.costBtn(`${fmt(cost)}`, cost, () => { if (buyUpgrade(s, u.id)) { audio.sfx('buy'); this.ctx.world.relayout(-1); this.changed(); } }, 'small', !!lock));
    });
    const note = this.ctx.world.isNight ? h('p', { class: 'hint night-on' }, '🌙 밤 정비 시간이에요. 지금 업그레이드할 수 있어요.') : h('p', { class: 'hint' }, '시설 공사는 동물원이 문을 닫은 밤에만 할 수 있어요. 뽑기·배치·합성은 언제나 돼요.');
    return h('div', {}, stageBox, note, h('div', { class: 'up-list' }, ...rows));
  }
  private bar(label: string, k: number) {
    return h('div', { class: 'pbar' }, h('i', { style: `width:${Math.min(100, k * 100)}%` }), h('span', {}, label));
  }

  // ── 직원 ──
  /** 직원 한 명 줄: 그림 · 이름 · 등급 · 효과 · 옵션 · 월급 · 버튼들 */
  private staffRow(c: Extract<Card, { kind: 'staff' }>, inSlot: boolean) {
    const s = this.ctx.save;
    const d = staffDef(c.staff), g = GRADES[c.grade];
    const fireKey = `fire-${c.uid}`;
    const arming = this.fireArm === fireKey;
    const fire = h('button', { class: `btn small ${arming ? 'danger' : 'ghost'}`, onclick: () => {
      if (!arming) { this.fireArm = fireKey; this.render(true); return; }
      const r = fireStaff(s, c.uid); this.fireArm = '';
      if (r >= 0) { audio.sfx('click'); toast(`${d.name} 해고 · +${fmt(r)}코인`, 'info'); this.changed(); }
    } }, arming ? `정말 해고? +${fmt(fireRefund(s, c))}` : '해고');
    const act = inSlot
      ? h('button', { class: 'btn small ghost', onclick: () => { unplace(s, c.uid); this.changed(); } }, '빼기')
      : h('button', { class: 'btn small', onclick: () => { if (assignStaff(s, c.uid)) { audio.sfx('click'); this.changed(); } else toast('빈 직원 슬롯이 없어요 (운영 > 업그레이드에서 늘려요)', 'info'); } }, '배치');
    return h('div', { class: `row g-${g.key}` }, h('div', { class: 'row-art' }, pix(staffFrame(c.staff, 0), 28)),
      h('div', { class: 'row-info' },
        h('div', { class: 'row-name' }, d.name, h('span', { class: `gtag g-${g.key}` }, g.name), inSlot && s.strike && !c.opts.some((o) => o.id === 'loyal') ? h('span', { class: 'gtag strike' }, '파업') : null),
        h('div', { class: 'sub' }, d.desc(d.values[c.grade])),
        c.opts.length ? h('div', { class: 'opts' }, ...c.opts.map((o) => h('span', { class: 'opt' }, `★ ${staffOptDef(o.id).name} · ${staffOptDef(o.id).desc(o.v)}`))) : null,
        h('div', { class: 'sub pay' }, `월급 ${fmt(staffPay(s, c))}/일${inSlot ? '' : ' (배치해야 줘요)'}`)),
      h('div', { class: 'row-btns-col' }, act, fire));
  }
  private debtNote() {
    const s = this.ctx.save;
    return s.coins < 0 ? h('div', { class: 'debt-note' }, `빚 ${fmt(-s.coins)}코인 · ${s.strike ? '오늘 직원 파업 중!' : `빚인 날이 3일 이어지면 파업해요 (지금 ${s.debtDays}일)`}`) : null;
  }
  // ── 뽑기 > 직원 ──
  private staffGacha() {
    const s = this.ctx.save;
    const price = staffDrawPrice(s);
    const doDraw = (n: number) => {
      const out = staffDraw(s, n);
      if (!out) { audio.sfx('deny'); toast(s.coins < 0 ? '빚이 있으면 직원을 뽑을 수 없어요' : '코인이 모자라요', 'bad'); return; }
      this.reveal(out, s.dex.slice());
    };
    return h('div', {},
      h('div', { class: 'hero' }, h('div', { class: 'title' }, '직원 뽑기'), h('div', { class: 'sub' }, `1명 ${fmt(price)}코인 (동물 뽑기 ×${STAFF_DRAW_MUL}) · 영웅은 특수옵션 1개, 전설은 2개 · 월급은 뽑을 때 정해져요`)),
      this.debtNote(),
      h('div', { class: 'draw-btns two' },
        this.costBtn(h('span', {}, '1명', h('small', {}, fmt(price))), price, () => doDraw(1)),
        this.costBtn(h('span', {}, '5명', h('small', {}, fmt(price * 5))), price * 5, () => doDraw(5))),
      h('p', { class: 'hint' }, '뽑은 직원은 빈 슬롯에 자동으로 배치돼요. 카드 > 직원에서 바꾸거나 해고할 수 있어요.'));
  }
  // ── 카드 > 직원 ──
  private staffCards() {
    const s = this.ctx.save;
    const placed = placedSet(s);
    const all = s.cards.filter((c): c is Extract<Card, { kind: 'staff' }> => c.kind === 'staff').sort((a, b) => Number(placed.has(b.uid)) - Number(placed.has(a.uid)) || b.grade - a.grade || a.pay - b.pay);
    return h('div', {},
      h('div', { class: 'section-title' }, `직원 ${all.length}명 · 배치 ${all.filter((c) => placed.has(c.uid)).length} / ${staffSlotCount(s)}`),
      all.length ? h('div', { class: 'list' }, ...all.map((c) => this.staffRow(c, placed.has(c.uid)))) : h('p', { class: 'hint' }, '직원이 없어요. 뽑기 > 직원에서 뽑아요.'),
      h('p', { class: 'hint' }, '해고하면 직원 뽑기 가격의 10~25%(등급이 높을수록 많이)를 돌려받아요.'));
  }
  // ── 운영 > 직원 배치 (카드) ──
  /** 직원 카드 한 장: 등급 색 테두리 · 큰 그림 · 이름 · 핵심 효과 한 줄 · 옵션 별 · 월급 */
  private staffCard(c: Extract<Card, { kind: 'staff' }>, inSlot: boolean) {
    const s = this.ctx.save;
    const d = staffDef(c.staff), g = GRADES[c.grade];
    const art = staff16(c.staff, 0) ?? staffFrame(c.staff, 0);
    const strike = inSlot && s.strike && !c.opts.some((o) => o.id === 'loyal');
    const act = inSlot
      ? h('button', { class: 'btn small ghost', onclick: () => { audio.sfx('click'); unplace(s, c.uid); this.changed(); } }, '빼기')
      : h('button', { class: 'btn small', onclick: () => { if (assignStaff(s, c.uid)) { audio.sfx('click'); this.changed(); } else toast('빈 슬롯이 없어요. 먼저 한 명을 빼거나 운영 > 업그레이드에서 슬롯을 늘려요', 'info'); } }, '배치');
    return h('div', { class: `staff-card g-${g.key}${strike ? ' striking' : ''}` },
      h('div', { class: 'sc-top' }, h('span', { class: `gtag g-${g.key}` }, g.name), strike ? h('span', { class: 'gtag strike' }, '파업') : null),
      h('div', { class: 'sc-art' }, pix(art, 44)),
      h('div', { class: 'sc-name' }, d.name),
      h('div', { class: 'sc-fx' }, staffShort(c.staff, d.values[c.grade])),
      c.opts.length ? h('div', { class: 'sc-opts' }, ...c.opts.map((o) => h('span', { class: 'opt', title: staffOptDef(o.id).desc(o.v) }, `★ ${staffOptDef(o.id).name}`))) : null,
      h('div', { class: 'sc-pay' }, `월급 ${fmt(staffPay(s, c))}`),
      act);
  }
  private staffSlots() {
    const s = this.ctx.save;
    const costs = dailyCosts(s);
    const n = staffSlotCount(s);
    const placed = placedSet(s);
    const slotCards = Array.from({ length: n }, (_, i) => {
      const u = s.staffSlots[i];
      const c = u !== null && u !== undefined ? s.cards.find((x) => x.uid === u) : undefined;
      if (!c || c.kind !== 'staff') return h('div', { class: 'staff-card empty' }, h('div', { class: 'sc-plus' }, '+'), h('div', { class: 'sc-name' }, `빈 슬롯 ${i + 1}`), h('div', { class: 'sc-pay' }, '아래 대기 직원을 배치해요'));
      return this.staffCard(c, true);
    });
    const waiting = s.cards.filter((c): c is Extract<Card, { kind: 'staff' }> => c.kind === 'staff' && !placed.has(c.uid)).sort((a, b) => b.grade - a.grade || a.pay - b.pay);
    // 팀 효과 요약: 배치된 직원 종류별 합
    const team = STAFF.filter((d) => d.kind !== 'collector' && d.kind !== 'keeper').map((d) => ({ d, v: staffSum(s, d.kind) })).filter((x) => x.v > 0);
    return h('div', {}, this.debtNote(),
      h('div', { class: 'staff-sum' },
        h('div', {}, h('span', {}, '배치'), h('b', {}, `${s.staffSlots.filter((u, i) => u !== null && i < n).length} / ${n}`)),
        h('div', {}, h('span', {}, '하루 월급'), h('b', {}, fmt(costs.salary))),
        h('div', {}, h('span', {}, '하루 총비용'), h('b', {}, fmt(costs.total)))),
      team.length ? h('div', { class: 'team-fx' }, ...team.map(({ d, v }) => h('span', { class: 'chip-fx' }, `${d.name} ${staffShort(d.kind, v)}`))) : null,
      h('div', { class: 'section-title' }, '일하는 직원'),
      h('div', { class: 'staff-grid' }, ...slotCards),
      h('div', { class: 'section-title' }, `대기 중 ${waiting.length}명 (월급 안 나가요)`),
      waiting.length ? h('div', { class: 'staff-grid' }, ...waiting.map((c) => this.staffCard(c, false))) : h('p', { class: 'hint' }, '대기 중인 직원이 없어요. 뽑기 > 직원에서 뽑아요.'),
      h('p', { class: 'hint' }, '해고는 카드 > 직원에서 할 수 있어요.'));
  }
  // ── 운영 > 돈 ──
  private money() {
    const s = this.ctx.save;
    const c = dailyCosts(s);
    const reps = (this.ctx.reports ?? []).slice(-7).reverse();
    return h('div', {}, this.debtNote(),
      h('div', { class: 'section-title' }, '오늘 영업이 끝나면 나가는 돈'),
      h('div', { class: 'money-list' },
        h('div', {}, h('span', {}, '직원 월급'), h('b', {}, fmt(c.salary))),
        h('div', {}, h('span', {}, `우리 유지비 (${s.board.length}개)`), h('b', {}, fmt(c.pens))),
        h('div', {}, h('span', {}, `사료비 (${placedAnimals(s)}마리)`), h('b', {}, fmt(c.food))),
        c.climate ? h('div', {}, h('span', {}, c.climateName), h('b', {}, fmt(c.climate))) : null,
        h('div', { class: 'total' }, h('span', {}, '합계'), h('b', {}, fmt(c.total)))),
      h('div', { class: 'section-title' }, '지난 정산'),
      reps.length ? h('div', { class: 'money-list' }, ...reps.map((r) => h('div', {}, h('span', {}, `${r.day}일째 · 수입 ${fmt(r.income)} − 비용 ${fmt(r.costs.total)}`), h('b', { class: r.net >= 0 ? 'plus' : 'minus' }, `${r.net >= 0 ? '+' : ''}${fmt(r.net)}`)))) : h('p', { class: 'hint' }, '아직 정산 기록이 없어요. 하루 영업이 끝나면 쌓여요.'));
  }

  // ── 도감 ──
  private dex() {
    const s = this.ctx.save;
    const found = s.dex.filter(Boolean).length;
    const sets = DEX_SETS.map((set) => {
      const mem = dexSetMembers(set), got = mem.filter((a) => s.dex[a.id]).length;
      const claimed = s.dexClaimed.includes(set.id), ready = !claimed && dexSetDone(s, set.id);
      const b = h('button', { class: 'btn small', onclick: () => { const r = claimDexSet(s, set.id); if (r) { audio.sfx('fuseWin'); toast(`도감 보상! +${fmt(r)}코인 · ${set.desc}`, 'gold', 2600); this.changed(); } } }, claimed ? '받음' : `+${fmt(set.reward)}`) as HTMLButtonElement;
      b.disabled = !ready;
      return h('div', { class: `mission${claimed ? ' claimed' : ready ? ' ready' : ''}` },
        h('div', { class: 'm-info' }, h('div', {}, set.name, h('span', { class: 'sub' }, ` · ${set.desc}`)), this.bar(`${got} / ${mem.length}`, got / mem.length)), b);
    });
    return h('div', {},
      h('div', { class: 'section-title' }, '도감 보상 (모으면 영구 보너스)'), ...sets,
      h('div', { class: 'inv-head', style: 'margin-top:12px' }, h('b', {}, `도감 ${found} / ${ANIMALS.length}`), h('span', { class: 'sub' }, GRADES.map((g) => `${g.name} ${ANIMALS.filter((a, i) => a.grade === g.id && s.dex[i]).length}/${ANIMALS.filter((a) => a.grade === g.id).length}`).join(' · '))),
      h('div', { class: 'sub' }, `반짝이 ${s.shinyDex.filter(Boolean).length} / ${ANIMALS.length} · 조합 시너지 ${s.synergyFound.length} / ${SYNERGY_SETS.length}`),
      ...GRADES.map((g) => this.dexGrid(`section-title g-${g.key}`, g.name, ANIMALS.filter((a) => a.grade === g.id && !a.season))),
      ...SEASONS.map((se) => this.dexGrid(`section-title s-${se.key}`, `${se.icon} ${se.name} 한정`, ANIMALS.filter((a) => a.season === se.key))));
  }

  // ── 기록 > 시너지 ──
  private synergyDex() {
    const s = this.ctx.save;
    return h('div', {},
      h('div', { class: 'section-title' }, `조합 시너지 ${s.synergyFound.length} / ${SYNERGY_SETS.length} (같은 우리에 모두 모으면 발동)`),
      h('div', { class: 'syn-list' }, ...SYNERGY_SETS.map((st) => {
        const f = s.synergyFound.includes(st.id);
        return h('div', { class: `syn-row${f ? '' : ' unknown'}` },
          h('div', { class: 'syn-art' }, ...st.members.map((m) => (f || s.dex[m] ? pix(animalFrame(m, 0), 20) : h('span', { class: 'q' }, '?')))),
          h('div', {}, h('b', {}, f ? st.name : '???'), h('div', { class: 'sub' }, f ? `${st.members.map((m) => ANIMALS[m].name).join(' + ')} · 매력 +${Math.round(st.attract * 100)}%${st.season ? ` (${SEASONS.find((x) => x.key === st.season)!.name} 2배)` : ''}${st.tip ? ` · 투척액 +${Math.round(st.tip * 100)}%` : ''}${st.feedCut ? ` · 사료비 −${Math.round(st.feedCut * 100)}%` : ''}` : `${st.members.length}마리 조합 · 같은 우리에 모아 보세요`)));
      })),
      h('div', { class: 'section-title' }, '그 밖의 시너지 (자동)'),
      h('div', { class: 'money-list' },
        h('div', {}, h('span', {}, '같은 서식지 3 / 6 / 10마리'), h('b', {}, '+10 / 20 / 35%')),
        h('div', {}, h('span', {}, '무지개 (일반~전설 한 마리씩)'), h('b', {}, '+30%')),
        h('div', {}, h('span', {}, '동급 무리 (모두 같은 등급, 일반이면 +25%)'), h('b', {}, '+15%')),
        h('div', {}, h('span', {}, '왕의 무리 (전설과 같은 서식지 일반·고급)'), h('b', {}, '+20%')),
        h('div', {}, h('span', {}, '우리 서식지와 같은 동물 (우리 등급별)'), h('b', {}, '+10~40%')),
        h('div', {}, h('span', {}, '우리 하나당 최대'), h('b', {}, '+150%'))));
  }

  // ── 뽑기 > 우리 ──
  private penGacha() {
    const s = this.ctx.save;
    const price = penDrawPrice(s);
    const doDraw = (n: number) => {
      const out = penDraw(s, n);
      if (!out) { audio.sfx('deny'); toast(s.coins < 0 ? '빚이 있으면 우리를 뽑을 수 없어요' : '코인이 모자라요', 'bad'); return; }
      this.ctx.persist();
      showReveal(this.ctx.overlayRoot, out, new Set(), () => { this.sub.zoo = 'board'; toast('동물원 탭에서 부지에 놓아요 (자동 배치도 있어요)', 'info', 2400); this.changed(); });
    };
    return h('div', {},
      h('div', { class: 'hero' }, h('div', { class: 'title' }, '우리 뽑기'), h('div', { class: 'sub' }, `1개 ${fmt(price)}코인 (동물 뽑기 ×${PEN_DRAW_MUL}) · 등급이 높을수록 크고 특이한 모양 · 서식지는 카드에 정해져요`)),
      this.debtNote(),
      h('div', { class: 'draw-btns two' },
        this.costBtn(h('span', {}, '1개', h('small', {}, fmt(price))), price, () => doDraw(1)),
        this.costBtn(h('span', {}, '5개', h('small', {}, fmt(price * 5))), price * 5, () => doDraw(5))),
      h('div', { class: 'money-list' }, ...GRADES.map((g) => h('div', {}, h('span', {}, `${g.name} ${(g.chance * 100).toFixed(0)}% · ${['4칸 테트리스 모양', '5~6칸', '6~9칸 · 연못 · 팔각', '8~12칸 · 옵션 1개', '12칸 이상 · 무대 · 옵션 2개'][g.id]}`), h('b', {}, `서식지 +${Math.round(PEN_THEME_BONUS[g.id] * 100)}%`)))),
      h('p', { class: 'hint' }, '우리 크기가 곧 수용 마릿수예요 (1칸 = 1.6마리). 큰 우리는 유지비도 칸 수만큼 더 들어요.'));
  }

  // ── 동물원 (부지) ──
  private boardView() {
    const s = this.ctx.save;
    const [bw, bh] = boardDims(s);
    const used = s.board.reduce((t, _, i) => t + pieceDef(penCardAt(s, i)!.piece).cells.length, 0);
    const tray = s.cards.filter((c): c is Extract<Card, { kind: 'pen' }> => c.kind === 'pen' && !s.board.some((b) => b.uid === c.uid)).sort((a, b) => b.grade - a.grade || pieceDef(b.piece).cells.length - pieceDef(a.piece).cells.length);
    const penRow = (c: Extract<Card, { kind: 'pen' }>, placedIdx: number) => {
      const pd = pieceDef(c.piece), g = GRADES[c.grade];
      return h('div', { class: `row g-${g.key}` }, h('div', { class: 'row-art' }, pix(pieceArt(c), 32)),
        h('div', { class: 'row-info' },
          h('div', { class: 'row-name' }, pd.name, h('span', { class: `gtag g-${g.key}` }, g.name), h('span', { class: `gtag hab-${c.habitat}` }, HABITAT_NAMES[c.habitat])),
          h('div', { class: 'sub' }, placedIdx >= 0 ? `${s.pens[placedIdx]?.length ?? 0} / ${penCap(s, placedIdx)}마리 · ${pd.cells.length}칸` : `${pd.cells.length}칸 · ${Math.round(pd.cells.length * 1.6)}마리 · ${HABITAT_NAMES[c.habitat]} +${Math.round(PEN_THEME_BONUS[c.grade] * 100)}%`),
          c.opts.length ? h('div', { class: 'opts' }, ...c.opts.map((o) => h('span', { class: 'opt' }, `★ ${penOptDef(o.id).name}`))) : null),
        placedIdx >= 0
          ? h('button', { class: 'btn small danger-ghost', onclick: () => { removePen(s, placedIdx); this.ctx.world.relayout(); this.changed(); } }, '치우기')
          : h('button', { class: 'btn small', onclick: () => { audio.sfx('click'); this.ctx.startPlace?.(c.uid); } }, '놓기'));
    };
    return h('div', {},
      h('div', { class: 'hero' }, h('div', { class: 'title' }, `부지 ${bw}×${bh}칸`), h('div', { class: 'sub' }, `우리 ${s.board.length}개 · ${used} / ${bw * bh}칸 사용 · 동물 ${placedAnimals(s)} / ${totalCap(s)}마리`)),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', onclick: () => {
          const before = totalAttract(s);
          const n = autoArrangePens(s);
          audio.sfx('buy'); this.ctx.world.relayout();
          toast(`우리 ${n}개를 가장 효율 좋게 배치했어요 · 매력도 ${fmt(before)} → ${fmt(totalAttract(s))}`, 'gold', 2600);
          this.changed();
        } }, '자동 배치 (가장 효율 좋게)'),
        h('button', { class: 'btn ghost', onclick: () => { const n = autoPlace(s); toast(n ? `${n}마리 배치` : '빈 칸이 없거나 남은 동물이 없어요', n ? 'good' : 'info'); this.changed(); } }, '동물 빈 칸 채우기')),
      h('div', { class: 'section-title' }, `놓지 않은 우리 ${tray.length}개`),
      tray.length ? h('div', { class: 'list' }, ...tray.map((c) => penRow(c, -1))) : h('p', { class: 'hint' }, '남은 우리 조각이 없어요. 뽑기 > 우리에서 뽑아요.'),
      h('div', { class: 'section-title' }, `놓은 우리 ${s.board.length}개`),
      h('div', { class: 'list' }, ...s.board.map((_, i) => penRow(penCardAt(s, i)!, i))),
      h('p', { class: 'hint' }, '놓기를 누르고 부지를 누르면 그 자리에 놓여요 (회전 버튼으로 돌리기). 우리를 눌러도 치울 수 있어요. 부지는 운영 > 업그레이드의 "부지 넓히기"로 커져요.'));
  }

  /** 보관함에 있는 시설 · 소품 줄 */
  private storedItems(filter: (t: string) => boolean) {
    const s = this.ctx.save;
    const stored = s.items.filter((it) => it.x < 0 && filter(it.type));
    if (!stored.length) return null;
    return h('div', {}, h('div', { class: 'section-title' }, `보관함 ${stored.length}개`),
      h('div', { class: 'list' }, ...stored.map((it) => h('div', { class: 'row' },
        h('div', { class: 'row-art' }, hasPng(itemSprite(it.type)) ? pix(itemSprite(it.type), 32) : null),
        h('div', { class: 'row-info' }, h('div', { class: 'row-name' }, itemName(it.type))),
        h('button', { class: 'btn small', onclick: () => { audio.sfx('click'); this.ctx.startPlaceItem?.(it.uid); } }, '놓기')))));
  }
  private nightBuy(cost: number, onBuy: () => void) {
    return !this.ctx.world.isNight ? h('span', { class: 'night-only' }, '🌙 밤에 공사', h('small', {}, fmt(cost))) : this.costBtn(fmt(cost), cost, onBuy, 'small');
  }
  // ── 동물원 > 시설 (관객존 위 건물 줄, 1~3단계 증축) ──
  private facView() {
    const s = this.ctx.save;
    const val = (t: FacilityType, lv: number) => (t === 'bench' ? `+${facLevelValue(t, lv)}초` : `+${Math.round(facLevelValue(t, lv) * 100)}%`);
    const rows = FACILITIES.map((f) => {
      const lv = facCount(s, f.type), price = facPrice(s, f.type);
      const art = `v2_bld_${f.type}_${Math.max(0, lv - 1)}`;
      return h('div', { class: `row fac-row${lv ? '' : ' off'}` },
        h('div', { class: 'row-art' }, hasPng(art) ? pix(art, 40) : null),
        h('div', { class: 'row-info' },
          h('div', { class: 'row-name' }, f.name, h('span', { class: 'gtag' }, lv ? `${lv}단계` : '없음'), h('span', { class: 'lv-dots' }, ...Array.from({ length: FAC_MAX_LV }, (_, k) => h('i', { class: k < lv ? 'on' : '' })))),
          h('div', { class: 'sub' }, f.desc(facLevelValue(f.type, Math.max(1, lv)))),
          h('div', { class: 'sub pay' }, lv ? `지금 ${val(f.type, lv)}` : '아직 없어요', price !== null ? ` → 다음 ${val(f.type, lv + 1)}` : ' · 최고 단계'),
          h('div', { class: 'sub' }, `하루 유지비 ${fmt(Math.round(f.upkeep * Math.max(1, lv) * costUnit(s)))}${price !== null ? ` → ${fmt(Math.round(f.upkeep * (lv + 1) * costUnit(s)))}` : ''}`)),
        price === null ? h('span', { class: 'max' }, '최고') : this.nightBuy(price, () => { if (buyFacility(s, f.type)) { audio.sfx('buy'); toast(`${f.name} ${facCount(s, f.type)}단계 완공!`, 'good'); this.changed(); } }));
    });
    return h('div', {},
      h('div', { class: 'hero' }, h('div', { class: 'title' }, '관객 건물'), h('div', { class: 'sub' }, '관객존 위 건물 줄에 서요 · 밤에만 공사 · 단계마다 효과 · 유지비 · 규모(+15)가 커져요')),
      this.ctx.world.isNight ? h('p', { class: 'hint night-on' }, '🌙 밤 정비 시간이에요. 지금 증축할 수 있어요.') : null,
      h('div', { class: 'list' }, ...rows));
  }
  // ── 동물원 > 꾸미기 ──
  private decoView() {
    const s = this.ctx.save, se = curSeason(s);
    const tier = s.upgrades.deco ?? 0, cost = upgradeCost(s, 'deco'), lock = upgradeLockedBy(s, 'deco');
    const price = decorPrice(s);
    const owned = (n: number) => s.items.filter((it) => it.type === `deco:${se.key}:${n}`).length;
    return h('div', {},
      h('div', { class: 'hero' }, h('div', { class: 'title' }, `울타리 · 입구 꾸미기 · ${DECO_TIERS[tier]}`), h('div', { class: 'sub' }, `모든 동물 매력 +${tier * 3}% · 울타리와 입구 게이트 모양이 바뀌어요`)),
      h('div', { class: 'row' }, h('div', { class: 'row-art' }, hasPng(`fac_gate${Math.min(3, tier + 1)}`) ? pix(`fac_gate${Math.min(3, tier + 1)}`, 32) : null),
        h('div', { class: 'row-info' }, h('div', { class: 'row-name' }, cost === null ? '최고 단계 (황금)' : `다음: ${DECO_TIERS[tier + 1]} 울타리`), h('div', { class: 'sub' }, cost === null ? '모든 동물 매력 +9%' : `모든 동물 매력 +${(tier + 1) * 3}%`), lock ? h('div', { class: 'lock' }, `${lock}단계부터`) : null),
        cost === null ? h('span', { class: 'max' }, '최고') : lock ? h('span', { class: 'max' }, `${lock}단계`) : this.nightBuy(cost, () => { if (buyUpgrade(s, 'deco')) { audio.sfx('buy'); this.changed(); } })),
      h('div', { class: 'section-title' }, `${se.icon} ${se.name} 소품 (이 계절에만 팔아요)`),
      h('div', { class: 'deco-grid' }, ...DECOR[se.key].map((name, i) => {
        const key = `decor_${se.key}_${i + 1}`;
        const b = this.nightBuy(price, () => { const uid = buyItem(s, `deco:${se.key}:${i + 1}`); if (uid !== null) { audio.sfx('buy'); this.ctx.persist(); this.ctx.startPlaceItem?.(uid); } });
        return h('div', { class: 'deco-cell' }, hasPng(key) ? pix(key, 40) : null, h('span', {}, name), owned(i + 1) ? h('small', {}, `${owned(i + 1)}개`) : null, b);
      })),
      this.storedItems((t) => t.startsWith('deco:')),
      h('p', { class: 'hint' }, `소품은 붙어 있는 우리 동물 매력 +${Math.round(DECOR_FX.attract * 100)}%, 그 계절이면 2배 · 하나당 규모 +5. 계절이 지나도 남아요.`));
  }

  // ── 카드 > 우리 (합성 포함) ──
  private penCards() {
    const s = this.ctx.save;
    const cands = penFusionCandidates(s, this.penFuseGrade);
    const candSet = new Set(cands.map((c) => c.uid));
    this.penSel = this.penSel.filter((u) => candSet.has(u));
    const n = this.penSel.length, chance = fusionChance(n);
    const all = s.cards.filter((c): c is Extract<Card, { kind: 'pen' }> => c.kind === 'pen').sort((a, b) => b.grade - a.grade);
    const go = h('button', { class: 'btn', onclick: () => {
      const r = fusePens(s, this.penSel);
      if (!r.ok) { toast(r.reason, 'bad'); return; }
      this.penSel = []; this.ctx.persist(); this.fuseResult(r, n);
    } }, `${n}개 합성하기 (${Math.round(chance * 100)}%)`) as HTMLButtonElement;
    go.disabled = n < FUSION_MIN;
    return h('div', {},
      h('div', { class: 'section-title' }, `우리 합성 · 놓지 않은 같은 등급 ${FUSION_MIN}~${FUSION_MAX}개 → 다음 등급`),
      h('div', { class: 'chips' }, ...[0, 1, 2, 3].map((g) => h('button', { class: `chip g-${GRADES[g].key}${this.penFuseGrade === g ? ' on' : ''}`, onclick: () => { this.penFuseGrade = g as Grade; this.penSel = []; this.render(true); } }, `${GRADES[g].name} → ${GRADES[g + 1].name}`))),
      h('div', { class: 'list' }, ...(cands.length ? cands.map((c) => {
        const on = this.penSel.includes(c.uid), pd = pieceDef(c.piece);
        return h('button', { class: `row pick${on ? ' on' : ''}`, onclick: () => { this.penSel = on ? this.penSel.filter((u) => u !== c.uid) : this.penSel.length < FUSION_MAX ? [...this.penSel, c.uid] : this.penSel; this.render(true); } },
          h('div', { class: 'row-art' }, pix(pieceArt(c), 28)), h('div', { class: 'row-info' }, h('div', { class: 'row-name' }, pd.name, h('span', { class: `gtag hab-${c.habitat}` }, HABITAT_NAMES[c.habitat])), h('div', { class: 'sub' }, `${pd.cells.length}칸`)), h('b', { class: 'check' }, on ? '✔' : ''));
      }) : [h('p', { class: 'hint' }, `놓지 않은 ${GRADES[this.penFuseGrade].name} 우리가 없어요.`)])),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn small ghost', onclick: () => { this.penSel = cands.slice(0, FUSION_MAX).map((c) => c.uid); this.render(true); } }, '자동으로 채우기'), go),
      h('div', { class: 'section-title' }, `가진 우리 ${all.length}개`),
      h('div', { class: 'list' }, ...all.map((c) => { const pd = pieceDef(c.piece), g = GRADES[c.grade], placed = s.board.some((b) => b.uid === c.uid);
        return h('div', { class: `row g-${g.key}` }, h('div', { class: 'row-art' }, pix(pieceArt(c), 28)), h('div', { class: 'row-info' }, h('div', { class: 'row-name' }, pd.name, h('span', { class: `gtag g-${g.key}` }, g.name), h('span', { class: `gtag hab-${c.habitat}` }, HABITAT_NAMES[c.habitat])), h('div', { class: 'sub' }, `${pd.cells.length}칸 · ${placed ? '부지에 놓음' : '보관 중'}`))); })));
  }

  // ── 기록 > 라이벌 ──
  private records() {
    const s = this.ctx.save, w = this.ctx.world;
    const rc = s.records;
    return h('div', {},
      h('div', { class: 'section-title' }, `이번 계절 · ${yearOf(s.season.n)}년 ${curSeason(s).icon}${curSeason(s).name}`),
      h('div', { class: 'money-list' },
        h('div', {}, h('span', {}, '내 동물원 규모'), h('b', {}, fmt(w.scale))),
        h('div', {}, h('span', {}, '라이벌 규모 (지금)'), h('b', {}, fmt(w.rivalNow))),
        h('div', {}, h('span', {}, '결판까지'), h('b', {}, `${Math.max(0, 7 - w.seasonDay)}일`))),
      h('p', { class: 'hint' }, '규모 = 전시 동물 등급 점수 + 놓은 우리 등급 점수 + 배치 직원 등급 점수 + 업그레이드 레벨 × 10 − 빚 감점'),
      h('div', { class: 'section-title' }, '기록 (폐원해도 남아요)'),
      h('div', { class: 'money-list' },
        h('div', {}, h('span', {}, '이긴 라이벌'), h('b', {}, `${rc.bestSeasons}번`)),
        h('div', {}, h('span', {}, '버틴 해'), h('b', {}, `${rc.bestYears}년`)),
        h('div', {}, h('span', {}, '최고 버틴 날'), h('b', {}, `${Math.max(rc.bestDay, s.day)}일`)),
        h('div', {}, h('span', {}, '폐원'), h('b', {}, `${rc.closures}번`))));
  }

  private dexGrid(cls: string, title: string, list: typeof ANIMALS[number][]) {
    const s = this.ctx.save;
    return h('div', {},
      h('div', { class: cls }, title),
      h('div', { class: 'dex-grid' }, ...list.map((a) => {
        const known = s.dex[a.id], shiny = s.shinyDex[a.id], g = GRADES[a.grade];
        return h('button', { class: `dex-cell${known ? '' : ' unknown'}${shiny ? ' shiny' : ''}`, title: known ? a.name : '???', onclick: () => toast(known ? `${a.name} · ${g.name} · ♥${g.attract} · ${HABITAT_NAMES[a.habitat]}${shiny ? ' · 반짝이 발견!' : ''}` : '아직 못 만난 동물이에요', 'info') },
          pix(shiny ? shinyOf(animalFrame(a.id, 0)) : animalFrame(a.id, 0), 24), h('span', {}, known ? a.name : '???'));
      })));
  }
}

/** 우리를 눌렀을 때: 우리 안 동물, 매력도, 먹이 주기 */
export function openPenSheet(ctx: PanelCtx, pen: number, onClose: () => void) {
  const s = ctx.save, w = ctx.world;
  const back = h('div', { class: 'overlay', onclick: (e: Event) => { if (e.target === back) close(); } });
  const close = () => { back.remove(); onClose(); };
  const render = () => {
    const uids = s.pens[pen] ?? [];
    const groups = new Map<number, number[]>();
    for (const u of uids) { const c = s.cards.find((x) => x.uid === u); if (c?.kind === 'animal') groups.set(c.animal, [...(groups.get(c.animal) ?? []), u]); }
    const feed = h('button', { class: 'btn small', onclick: () => { if (w.feed(pen)) { audio.sfx('feed'); render(); } } }, w.feedCooldown[pen] > 0 ? `먹이 (${Math.ceil(w.feedCooldown[pen])}초)` : '먹이 주기') as HTMLButtonElement;
    feed.disabled = !uids.length || w.feedCooldown[pen] > 0;
    back.replaceChildren(h('div', { class: 'sheet' },
      (() => {
        const pc = penCardAt(s, pen);
        return h('div', { class: 'sheet-head' }, pc ? pix(pieceArt(pc, s.board[pen]?.rot ?? 0), 28) : null,
          h('b', {}, pc ? pieceDef(pc.piece).name : `우리 ${pen + 1}`),
          h('span', { class: 'sub' }, `${pc ? `${GRADES[pc.grade].name} · ${HABITAT_NAMES[pc.habitat]} · ` : ''}${uids.length} / ${penCap(s, pen)}마리 · ♥${fmt(penDetail(s, pen).total)}`), feed);
      })(),
      (() => {
        const pc = penCardAt(s, pen);
        return pc?.opts.length ? h('div', { class: 'opts' }, ...pc.opts.map((o) => h('span', { class: 'opt' }, `★ ${penOptDef(o.id).name} · ${penOptDef(o.id).desc(o.v)}`))) : null;
      })(),
      (() => {
        const d = penDetail(s, pen);
        return d.syn.length || d.near.length ? h('div', { class: 'syn-box' },
          ...d.syn.map((x) => h('div', { class: `syn k-${x.kind}` }, h('b', {}, x.name), h('span', {}, x.desc))),
          ...d.near.map((n) => h('div', { class: 'syn near' }, h('span', {}, `💡 ${n}`)))) : null;
      })(),
      groups.size ? h('div', { class: 'inv-list' }, ...[...groups.entries()].map(([id, list]) => h('div', { class: `inv-row g-${GRADES[ANIMALS[id].grade].key}` },
        h('div', { class: 'inv-art' }, pix(animalFrame(id, 0), 28)),
        h('div', { class: 'inv-info' }, h('div', { class: 'inv-name' }, `${ANIMALS[id].name} ×${list.length}`), h('div', { class: 'inv-sub' }, list.length >= 3 ? `같은 종 보너스 +${list.length >= 10 ? 30 : list.length >= 5 ? 20 : 10}%` : '3마리부터 같은 종 보너스')),
        h('button', { class: 'btn small ghost', onclick: () => { unplace(s, list[0]); ctx.persist(); w.sync(); render(); } }, '빼기')))) : h('p', { class: 'hint' }, '빈 우리예요. 보관함에서 배치하거나 "빈 칸 자동 배치"를 눌러요.'),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn small ghost', onclick: () => { for (const u of [...uids]) unplace(s, u); ctx.persist(); w.sync(); render(); } }, '모두 빼기'),
        h('button', { class: 'btn small danger', onclick: () => { removePen(s, pen); ctx.persist(); w.relayout(); w.sync(); audio.sfx('click'); toast('우리를 치웠어요. 동물은 보관함으로, 조각은 동물원 탭에 남아요', 'info', 2600); close(); } }, '우리 치우기'),
        h('button', { class: 'btn small', onclick: close }, '닫기'))));
  };
  render();
  ctx.overlayRoot.append(back);
  return close;
}

export { upValue };
