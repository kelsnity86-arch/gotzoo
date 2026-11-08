// 오른쪽(가로 화면) / 아래쪽(세로 화면) 패널: 뽑기 · 보관함 · 합성 · 업그레이드 · 직원 · 도감
import { ANIMALS, HABITAT_NAMES } from '../data/animals';
import { DEX_SETS, dexSetMembers } from '../data/dex';
import { MISSION_BONUS, MISSION_REWARD } from '../data/missions';
import { GRADES, type Grade } from '../data/grades';
import { staffDef, staffOptDef, STAFF_DRAW_MUL } from '../data/staff';
import { FUSION_MAX, FUSION_MIN, GACHA, MAX_STAGE, STAGE_TIP_MUL, UPGRADES } from '../data/balance';
import type { Card, SaveData } from '../game/state';
import type { World } from '../game/world';
import {
  assignStaff, curSeason, penDetail, penTheme, dailyCosts, fireRefund, fireStaff, staffDraw, staffDrawPrice, staffPay, autoFusionPick, autoPlace, optimizePlacement, claimDexSet, claimMission, claimMissionBonus, dexSetDone, ensureMissions, missionText, ticketDraw, buyUpgrade, canPromote, draw, drawPrice, freeDraw, fuse, fusionCandidates, fusionChance,
  penCount, penSize, placeAnimal, placedAnimals, placedSet, promote, stageReq, staffSlotCount, totalAttract, unplace, upgradeCost, upgradeLockedBy, upValue,
} from '../game/rules';
import { animalFrame, hasPng, shinyOf, staffFrame } from '../render/sprites';
import { SEASONS, SEASON_FX, yearOf } from '../data/seasons';
import { SYNERGY_SETS } from '../data/synergy';
import { SHAPE_NAME, SHAPE_OF, THEME_BONUS } from '../data/shapes';
import { audio } from './audio';
import { cardEl } from './cardview';
import { fmt, h, iconSlot, pix, toast } from './dom';
import { showReveal } from './reveal';

export interface PanelCtx { save: SaveData; world: World; persist: () => void; overlayRoot: HTMLElement }
type Tab = 'gacha' | 'inv' | 'fuse' | 'up' | 'staff' | 'dex';
const TABS: [Tab, string][] = [['gacha', '뽑기'], ['inv', '보관함'], ['fuse', '합성'], ['up', '업그레이드'], ['staff', '직원'], ['dex', '도감']];
const TAB_ICON: Record<Tab, string> = { gacha: 'icons_12', inv: 'icons_10', fuse: 'icons_09', up: 'icons_13', staff: 'icons_07', dex: 'icons_15' };
const UP_ICON: Record<string, string> = { pens: 'icons_05', size: 'icons_05', quality: 'icons_06', gate: 'icons_03', staff: 'icons_07', pickup: 'icons_08' };

export class Panel {
  readonly el: HTMLElement;
  private body = h('div', { class: 'panel-body' });
  private tabBtns: HTMLButtonElement[];
  tab: Tab = 'gacha';
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
    } }, hasPng(TAB_ICON[t]) ? iconSlot(TAB_ICON[t], 14) : null, h('span', {}, name)));
    const handle = h('button', { class: 'drawer-close', title: '닫기', onclick: () => this.setOpen(false) }, '▼');
    this.el = h('aside', { class: 'panel closed' }, h('nav', { class: 'ptabs' }, ...this.tabBtns, handle), this.body);
  }

  isOpen = false;
  setOpen(v: boolean) { this.isOpen = v; this.el.classList.toggle('closed', !v); }

  /** 코인 등이 바뀌면 다시 그린다 (같은 내용이면 건너뜀) */
  render(force = false) {
    const s = this.ctx.save;
    const key = `${this.tab}|${Math.floor(s.coins)}|${s.cards.length}|${s.pens.flat().length}|${s.staffSlots.join()}|${s.stage}|${Object.values(s.upgrades).join()}|${this.fuseGrade}|${this.fuseSel.length}|${this.invGrade}|${s.lockedSpecies.length}|${s.tickets}|${JSON.stringify(s.missions?.list.map((m) => [m.progress, m.claimed]))}|${s.dexClaimed.length}|${s.dex.filter(Boolean).length}|${s.season.n}|${s.synergyFound.length}|${s.shinyDex.filter(Boolean).length}|${this.ctx.world.phase}`;
    if (!force && key === this.lastKey) return;
    // 코인만 바뀐 경우 버튼 상태만 고친다 (스크롤·입력 유지)
    const onlyCoins = !force && this.lastKey && key.split('|').slice(2).join() === this.lastKey.split('|').slice(2).join() && key.split('|')[0] === this.lastKey.split('|')[0];
    this.lastKey = key;
    this.tabBtns.forEach((b, i) => b.classList.toggle('on', TABS[i][0] === this.tab && (this.isOpen || document.body.classList.contains('landscape'))));
    if (onlyCoins) { this.updateAffordable(); return; }
    const top = this.body.scrollTop;
    const view = { gacha: () => this.gacha(), inv: () => this.inventory(), fuse: () => this.fusion(), up: () => this.upgrades(), staff: () => this.staffTab(), dex: () => this.dex() }[this.tab];
    this.body.replaceChildren(view());
    this.body.scrollTop = top;
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
      this.missions(),
      h('div', { class: 'section-title' }, '나오는 확률'), grid,
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
      const free = penCount(s) * penSize(s) - placedAnimals(s);
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
    const capLeft = penCount(s) * penSize(s) - placedAnimals(s);
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
      h('div', { class: 'inv-head' }, h('div', {}, h('b', {}, `전시 ${placedAnimals(s)} / ${penCount(s) * penSize(s)}`), h('span', { class: 'sub' }, ` · 카드 ${s.cards.length}장`)),
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
  private staffTab() {
    const s = this.ctx.save;
    const placed = placedSet(s);
    const price = staffDrawPrice(s);
    const doDraw = (n: number) => {
      const out = staffDraw(s, n);
      if (!out) { audio.sfx('deny'); toast(s.coins < 0 ? '빚이 있으면 직원을 뽑을 수 없어요' : '코인이 모자라요', 'bad'); return; }
      this.reveal(out, s.dex.slice());
    };
    const costs = dailyCosts(s);
    // 직원 한 명 줄: 그림 · 이름 · 등급 · 효과 · 옵션 · 월급 · 버튼들
    const row = (c: Extract<Card, { kind: 'staff' }>, inSlot: boolean) => {
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
        : (() => { const b = h('button', { class: 'btn small', onclick: () => { if (assignStaff(s, c.uid)) { audio.sfx('click'); this.changed(); } else toast('빈 직원 슬롯이 없어요 (업그레이드에서 늘려요)', 'info'); } }, '배치') as HTMLButtonElement; return b; })();
      return h('div', { class: `staff-slot g-${g.key}` }, pix(staffFrame(c.staff, 0), 28),
        h('div', { class: 'up-info' },
          h('div', {}, h('b', {}, d.name), ' ', h('span', { class: `gtag g-${g.key}` }, g.name), inSlot && s.strike && !c.opts.some((o) => o.id === 'loyal') ? h('span', { class: 'gtag strike' }, '파업') : null),
          h('div', { class: 'sub' }, d.desc(d.values[c.grade])),
          c.opts.length ? h('div', { class: 'opts' }, ...c.opts.map((o) => h('span', { class: 'opt' }, `★ ${staffOptDef(o.id).name} · ${staffOptDef(o.id).desc(o.v)}`))) : null,
          h('div', { class: 'sub pay' }, `월급 ${fmt(staffPay(s, c))}/일${inSlot ? '' : ' (배치해야 줘요)'}`)),
        h('div', { class: 'col-btns' }, act, fire));
    };
    const slots = Array.from({ length: staffSlotCount(s) }, (_, i) => {
      const u = s.staffSlots[i];
      const c = u !== null && u !== undefined ? s.cards.find((x) => x.uid === u) : undefined;
      if (!c || c.kind !== 'staff') return h('div', { class: 'staff-slot empty' }, h('span', { class: 'sub' }, `슬롯 ${i + 1} · 비어 있음`));
      return row(c, true);
    });
    const free = s.cards.filter((c): c is Extract<Card, { kind: 'staff' }> => c.kind === 'staff' && !placed.has(c.uid)).sort((a, b) => b.grade - a.grade || a.pay - b.pay);
    return h('div', {},
      h('div', { class: 'gacha-hero staff-hero' },
        h('div', {}, h('div', { class: 'title' }, '직원 뽑기'), h('div', { class: 'sub' }, `1명 ${fmt(price)}코인 (동물 뽑기 ×${STAFF_DRAW_MUL}) · 영웅은 특수옵션 1개, 전설은 2개`))),
      s.coins < 0 ? h('div', { class: 'debt-note' }, `빚 ${fmt(-s.coins)}코인 · ${s.strike ? '오늘 직원 파업 중!' : `빚인 날이 3일 이어지면 파업해요 (지금 ${s.debtDays}일)`}`) : null,
      h('div', { class: 'draw-btns two' },
        this.costBtn(h('span', {}, '1명', h('small', {}, fmt(price))), price, () => doDraw(1)),
        this.costBtn(h('span', {}, '5명', h('small', {}, fmt(price * 5))), price * 5, () => doDraw(5))),
      h('div', { class: 'cost-box' },
        h('div', {}, h('span', {}, '하루 월급'), h('b', {}, fmt(costs.salary))),
        h('div', {}, h('span', {}, '우리 유지비'), h('b', {}, fmt(costs.pens))),
        h('div', {}, h('span', {}, '사료비'), h('b', {}, fmt(costs.food))),
        h('div', { class: 'total' }, h('span', {}, '영업 끝나면 나가는 돈'), h('b', {}, fmt(costs.total)))),
      h('div', { class: 'section-title' }, `직원 슬롯 ${s.staffSlots.filter((u, i) => u !== null && i < staffSlotCount(s)).length} / ${staffSlotCount(s)}`), ...slots,
      h('div', { class: 'section-title' }, `대기 중인 직원 ${free.length}명`),
      free.length ? h('div', {}, ...free.map((c) => row(c, false))) : h('p', { class: 'hint' }, '대기 중인 직원이 없어요. 대기 중인 직원은 월급을 받지 않아요.'),
      h('p', { class: 'hint' }, '해고하면 직원 뽑기 가격의 10~25%(등급이 높을수록 많이)를 돌려받아요. 먹이는 우리를 눌러 직접 줄 수도 있어요.'));
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
      h('div', { class: 'section-title' }, '조합 시너지 도감 (같은 우리에 모두 모으면 발동)'),
      h('div', { class: 'syn-list' }, ...SYNERGY_SETS.map((st) => {
        const f = s.synergyFound.includes(st.id);
        return h('div', { class: `syn-row${f ? '' : ' unknown'}` },
          h('div', { class: 'syn-art' }, ...st.members.map((m) => (f || s.dex[m] ? pix(animalFrame(m, 0), 20) : h('span', { class: 'q' }, '?')))),
          h('div', {}, h('b', {}, f ? st.name : '???'), h('div', { class: 'sub' }, f ? `${st.members.map((m) => ANIMALS[m].name).join(' + ')} · 매력 +${Math.round(st.attract * 100)}%${st.season ? ` (${SEASONS.find((x) => x.key === st.season)!.name} 2배)` : ''}${st.tip ? ` · 투척액 +${Math.round(st.tip * 100)}%` : ''}${st.feedCut ? ` · 사료비 −${Math.round(st.feedCut * 100)}%` : ''}` : `${st.members.length}마리 조합 · 같은 우리에 모아 보세요`)));
      })),
      ...GRADES.map((g) => this.dexGrid(`section-title g-${g.key}`, g.name, ANIMALS.filter((a) => a.grade === g.id && !a.season))),
      ...SEASONS.map((se) => this.dexGrid(`section-title s-${se.key}`, `${se.icon} ${se.name} 한정`, ANIMALS.filter((a) => a.season === se.key))));
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
      h('div', { class: 'sheet-head' }, h('b', {}, `우리 ${pen + 1}`), h('span', { class: 'sub' }, `${uids.length} / ${penSize(s)}마리 · ♥${fmt(penDetail(s, pen).total)}`), feed),
      (() => {
        // 우리 테마: 바닥 · 모양이 바뀌고, 같은 서식지 동물 매력 +15%
        const cur = s.penTheme[pen] ?? null, eff = penTheme(s, pen);
        const pickTheme = (t: string | null) => { while (s.penTheme.length <= pen) s.penTheme.push(null); s.penTheme[pen] = t; ctx.persist(); w.sync(); audio.sfx('click'); render(); };
        return h('div', { class: 'theme-box' },
          h('div', { class: 'sub' }, `우리 모양 · ${eff ? SHAPE_NAME[SHAPE_OF[eff]] : '사각형'}${eff ? ` (${HABITAT_NAMES[eff]} 동물 +${Math.round(THEME_BONUS * 100)}%)` : ''}`),
          h('div', { class: 'chips' },
            h('button', { class: `chip${cur === null ? ' on' : ''}`, onclick: () => pickTheme(null) }, '자동'),
            ...(['grass', 'sand', 'water', 'snow', 'rock', 'cloud'] as const).map((t) => h('button', { class: `chip${cur === t ? ' on' : ''}`, onclick: () => pickTheme(t) }, HABITAT_NAMES[t]))));
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
        h('button', { class: 'btn small', onclick: close }, '닫기'))));
  };
  render();
  ctx.overlayRoot.append(back);
  return close;
}

export { upValue };
