// 경제 시뮬레이션: SIM=economy npm run sim
// 봇이 뽑기(코인)·합성·최대 수익 배치·업그레이드와 관객 건물(돈)·승급을 하고, 바닥 동전(코인)의 70%를 손으로 줍는다고 가정한다.
import { it } from 'vitest';
import { defaultSave } from '../../src/game/state';
import { World } from '../../src/game/world';
import { UPGRADES } from '../../src/data/balance';
import { FACILITIES } from '../../src/data/facilities';
import {
  assignStaff, autoFusionPick, canPromote, draw, drawPrice, freeDraw, fuse, fusionCandidates, optimizePlacement, placedAnimals,
  promote, totalAttract, upgradeCost, upgradeLockedBy, buyUpgrade, autoArrangePens, penFusionCandidates, fusePens, buyFacility, facPrice, dailyCosts,
} from '../../src/game/rules';
import type { Grade } from '../../src/data/grades';

const MIN = Number(process.env.SIM_MIN ?? 60);
const PICK = Number(process.env.SIM_PICK ?? 0.7);

it('경제 곡선', () => {
  const s = defaultSave();
  const w = new World(s, Math.random);
  w.relayout(1.6);
  const log: string[] = [];
  const dayLog: string[] = [];
  let t = 0, draws = 0, secondDraw = -1, lastStage = 1, think = 0, pickAcc = 0;
  freeDraw(s); optimizePlacement(s); w.sync();
  const dt = 0.1;
  const mark: Record<number, string> = {};
  while (t < MIN * 60) {
    t += dt;
    w.relayout(1.6); w.sync();
    w.update(dt, null);
    for (const e of w.events) if (e.type === 'night') { const r = e.report; dayLog.push(`${r.day}일 ${(t/60).toFixed(1)}분 단계${s.stage}: 수입 ${r.income} · 비용 ${r.costs.total}(월급 ${r.costs.salary} 우리 ${r.costs.pens} 사료 ${r.costs.food}) · 순 ${r.net} · 돈 ${r.coinsAfter} · 규모 ${r.mine} vs ${r.rival}${r.season ? ` → ${r.season.result}` : ''}`); if (r.season?.result === 'lose') t = MIN * 60; }
    w.events.length = 0;
    // 손으로 줍기: 초당 바닥 동전의 PICK 비율
    pickAcc += dt;
    if (pickAcc >= 1) { pickAcc = 0; for (const c of w.coins) if (c.z === 0 && Math.random() < PICK) w.pick(c, 'hand'); }
    think += dt;
    if (think < 2) continue;
    think = 0;
    // 합성: 10장 모이면 100%
    for (const g of [0, 1, 2, 3] as Grade[]) if (fusionCandidates(s, g).length >= 10) fuse(s, autoFusionPick(s, g, 10));
    if (canPromote(s)) promote(s);
    // 업그레이드: 5회 뽑기 값보다 싸면 가장 싼 것부터
    const price = drawPrice(s);
    // 돈(입장료): 밤에 하루 비용 2일치를 남기고 업그레이드 · 관객 건물을 싼 것부터
    const landBefore = s.upgrades.land;
    if (w.isNight) {
      const reserve = dailyCosts(s).total * 2;
      for (let k = 0; k < 12; k++) {
        const opts: { cost: number; buy: () => void }[] = [
          ...UPGRADES.map((u) => ({ cost: upgradeLockedBy(s, u.id) === null ? upgradeCost(s, u.id) : null, buy: () => buyUpgrade(s, u.id) })),
          ...FACILITIES.map((f) => ({ cost: facPrice(s, f.type), buy: () => buyFacility(s, f.type) })),
        ].filter((o): o is { cost: number; buy: () => void } => o.cost !== null && o.cost + reserve <= s.coins);
        if (!opts.length) break;
        opts.sort((a, b) => a.cost - b.cost)[0].buy();
      }
      for (const g of [0, 1, 2, 3] as Grade[]) { const c = penFusionCandidates(s, g); if (c.length >= 10) fusePens(s, c.slice(0, 10).map((x) => x.uid)); }
      autoArrangePens(s);
      void landBefore;
      w.openPark();
    } else if ((s.tokens ?? 0) >= price * 10) { draw(s, 10); draws += 10; }
    else if ((s.tokens ?? 0) >= price && placedAnimals(s) < 6) { draw(s, 1); draws++; if (secondDraw < 0) secondDraw = t; }
    for (const c of s.cards) if (c.kind === 'staff') assignStaff(s, c.uid);
    optimizePlacement(s);
    if (s.stage !== lastStage) { lastStage = s.stage; log.push(`${(t / 60).toFixed(1)}분: ${s.stage}단계`); }
    for (const m of [5, 10, 20, 30, 45, 60, 90, 120]) if (t >= m * 60 && !mark[m]) {
      const inc = w.incomePerMin();
      mark[m] = `${m}분: 돈 ${Math.round(s.coins)} · 코인 ${Math.round(s.tokens)} · 입장료 ${inc.base}/분 · 코인 ${inc.bonus}/분 · 건물 ${Object.values(s.facLv).reduce((a, b) => a + b, 0)} · 전시 ${placedAnimals(s)} · 매력 ${totalAttract(s)} · 카드 ${s.cards.length} · 단계 ${s.stage} · 뽑기 ${draws}장 · 도감 ${s.dex.filter(Boolean).length}`;
      log.push(mark[m]);
    }
  }
  console.log(`두 번째 뽑기: ${secondDraw >= 0 ? `${secondDraw.toFixed(0)}초` : '없음'}`);
  console.log(log.join('\n'));
  console.log(dayLog.join('\n'));
}, 600_000);
