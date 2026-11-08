/**
 * Unity 이식용 데이터 내보내기: src/data/* 와 규칙 상수를 JSON으로 쓴다.
 * 실행: npx vite-node tools/export-unity.ts  → unity/Data/*.json
 * 함수(설명 문구)는 실제 수치를 넣어 만든 문장으로 바꿔 담는다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { ANIMALS, HABITAT_NAMES } from '../src/data/animals';
import { GRADES } from '../src/data/grades';
import * as B from '../src/data/balance';
import { STAFF, STAFF_OPTS, STAFF_PAY, STAFF_CAP, STAFF_OPT_COUNT, STAFF_REFUND, STAFF_DRAW_MUL } from '../src/data/staff';
import { PIECES, BOARD, PEN_OPTS, PEN_OPT_COUNT, HABITATS, CAP_PER_CELL } from '../src/data/pieces';
import { FACILITIES, FAC_MAX_LV, FAC_LV_PRICE, DECOR, DECO_TIERS } from '../src/data/facilities';
import { EVENTS } from '../src/data/events';
import { SEASONS, SEASON_FX } from '../src/data/seasons';
import { SYNERGY_SETS, HABITAT_TIERS, GRADE_SYN, SYNERGY_CAP, SHINY } from '../src/data/synergy';
import { RIVALS, SEASON, SCALE_TARGET } from '../src/data/rivals';
import { DEX_SETS } from '../src/data/dex';
import { MISSION_POOL, MISSION_K, MISSION_REWARD } from '../src/data/missions';
import { DRAW_KIND, MACHINE_TIERS, CARRY } from '../src/game/rules';
import { GODS, HEROES, NAMED } from '../src/data/olympus';
import { RIVAL_COND, RIVAL_EVENTS, RIVAL_EVENT_CHANCE, LAST_STAND } from '../src/data/rivals';

const out = new URL('../unity/Data/', import.meta.url);
mkdirSync(out, { recursive: true });
/** 함수는 버리고(JSON 기본), 남는 값만 */
const clean = (v: unknown) => JSON.parse(JSON.stringify(v));
const write = (name: string, data: unknown) => writeFileSync(new URL(name + '.json', out), JSON.stringify(clean(data), null, 1) + '\n');

write('animals', { habitatNames: HABITAT_NAMES, animals: ANIMALS });
write('grades', GRADES);
write('staff', { staff: STAFF.map((s) => ({ ...s, descByGrade: s.values.map((v) => s.desc(v)) })), opts: STAFF_OPTS, pay: STAFF_PAY, cap: STAFF_CAP, optCount: STAFF_OPT_COUNT, refund: STAFF_REFUND, drawMul: STAFF_DRAW_MUL });
write('pieces', { board: BOARD, capPerCell: CAP_PER_CELL, habitats: HABITATS, pieces: PIECES, opts: PEN_OPTS, optCount: PEN_OPT_COUNT });
write('facilities', { maxLv: FAC_MAX_LV, lvPrice: FAC_LV_PRICE, facilities: FACILITIES.map((f) => ({ ...f, descLv1: f.desc(f.value), descMax: f.desc(f.cap) })), decor: DECOR, decoTiers: DECO_TIERS });
write('upgrades', { groups: B.UPGRADE_GROUPS, upgrades: B.UPGRADES.map((u) => ({ ...u, descByLevel: u.values.map((v) => u.describe(v)) })) });
write('balance', {
  gacha: B.GACHA, drawKind: DRAW_KIND, machineTiers: MACHINE_TIERS,
  stageReq: B.STAGE_REQ, maxStage: B.MAX_STAGE, stageNames: B.STAGE_NAMES, expandCost: B.EXPAND_COST, starNeed: B.STAR_NEED, stageTipMul: B.STAGE_TIP_MUL,
  fusionChance: B.FUSION_CHANCE, fusionMin: B.FUSION_MIN, visitor: B.VISITOR, coin: B.COIN,
  sameSpeciesBonus: B.SAME_SPECIES_BONUS, sameHabitatBonus: B.SAME_HABITAT_BONUS, feed: B.FEED, staffAi: B.STAFF_AI,
  day: B.DAY, upkeep: B.UPKEEP, scale: B.SCALE, debt: B.DEBT, incident: B.INCIDENT,
});
write('events', EVENTS);
write('seasons', { seasons: SEASONS, fx: SEASON_FX });
write('synergy', { sets: SYNERGY_SETS, habitatTiers: HABITAT_TIERS, gradeSyn: GRADE_SYN, cap: SYNERGY_CAP, shiny: SHINY });
write('rivals', { season: SEASON, rivals: RIVALS, scaleTarget: SCALE_TARGET });
write('dex', DEX_SETS);
write('olympus', { named: NAMED, gods: GODS.map((g) => ({ ...g, descNormal: g.desc(g.value), descAwake: g.desc(g.value * NAMED.awakeMul) })), heroes: HEROES.map((x) => ({ ...x, descNormal: x.desc(x.value), descAwake: x.desc(x.value * NAMED.awakeMul) })) });
write('luck', { rivalCond: RIVAL_COND, rivalEvents: RIVAL_EVENTS, rivalEventChance: RIVAL_EVENT_CHANCE, lastStand: LAST_STAND, carry: CARRY });
write('missions', { pool: MISSION_POOL, k: MISSION_K, reward: MISSION_REWARD });
console.log('unity/Data 내보내기 완료');
