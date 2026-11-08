// 올림푸스 12지신 · 신화 영웅 (src/data/olympus.ts · src/game/rules.ts: activeGods · godVal · heroVal · gainGod · gainHero · templeDone 이식)
// 능력은 전시(우리에 배치)한 신 · 배치한 영웅만 켜진다. 각성(신은 shiny, 영웅은 awake)이면 수치 ×awakeMul.
using System;
using System.Collections.Generic;
using System.Linq;
using BbopZoo.Data;

namespace BbopZoo.Core
{
    public static class Olympus
    {
        public static List<GodDef> GodsOfSeason(string season) => GameData.Olympus.gods.FindAll(g => g.season == season);

        /// <summary>전시 중인 신 (놓인 우리 안만)</summary>
        public static IEnumerable<(GodDef def, double mul, int pen)> ActiveGods(SaveData s)
        {
            for (int i = 0; i < Math.Min(s.pens.Count, s.PenCount); i++)
                foreach (var u in s.pens[i])
                {
                    var c = s.CardById(u);
                    if (c != null && c.kind == "animal" && c.god != null)
                        yield return (GameData.Olympus.gods[c.god.Value], c.shiny ? GameData.Olympus.named.awakeMul : 1, i);
                }
        }
        /// <summary>능력 합: penAttract · feverTime · hotCut · gateCap · sadCut · feverCharge · shinyMul · machineLuck · tipMul · buildCut · feed · lastStand</summary>
        public static double GodVal(SaveData s, string ability) => ActiveGods(s).Where(g => g.def.ability == ability).Sum(g => g.def.value * g.mul);

        /// <summary>배치된 직원 카드 (슬롯 수 안, 파업 중이면 '충성' 옵션만) — 웹판 placedStaffCards</summary>
        public static IEnumerable<Card> PlacedStaff(SaveData s, bool working = true)
        {
            int slots = (int)s.UpValue("staff");
            for (int i = 0; i < s.staffSlots.Count && i < slots; i++)
            {
                var u = s.staffSlots[i]; if (u == null) continue;
                var c = s.CardById(u.Value); if (c == null || c.kind != "staff") continue;
                if (working && s.strike && !c.opts.Any(o => o.id == "loyal")) continue;
                yield return c;
            }
        }
        public static IEnumerable<(HeroDef def, double mul)> ActiveHeroes(SaveData s) =>
            PlacedStaff(s).Where(c => c.hero != null).Select(c => (GameData.Olympus.heroes[c.hero.Value], c.awake ? GameData.Olympus.named.awakeMul : 1));
        /// <summary>영웅 능력 합: guardAll · stage · vetAll · lucky · tipMul · upkeepCut</summary>
        public static double HeroVal(SaveData s, string ability) => ActiveHeroes(s).Where(h => h.def.ability == ability).Sum(h => h.def.value * h.mul);
        public static bool HasHero(SaveData s, string ability) => ActiveHeroes(s).Any(h => h.def.ability == ability);

        /// <summary>12신을 다 모았는지 (올림푸스 완성: 손님 +templeVisitors, 신전 입구)</summary>
        public static bool TempleDone(SaveData s) => s.godDex.Count(x => x > 0) >= GameData.Olympus.gods.Count;

        /// <summary>뽑기로 들어온 신: 신전 기록 → 처음이면 카드, 일반을 가진 채 각성이 나오면 각성으로, 그 밖의 중복은 코인</summary>
        public static DrawResult GainGod(SaveData s, int id, bool awake)
        {
            s.godDex[id] = Math.Max(s.godDex[id], awake ? 2 : 1);
            var own = s.cards.Find(c => c.kind == "animal" && c.god == id);
            if (own != null)
            {
                if (awake && !own.shiny) { own.shiny = true; return new DrawResult(own, 0, true); }
                double dup = Gacha.DrawPrice(s) * GameData.Olympus.named.dupDraws; s.tokens += dup;
                // 연출용: 뽑힌 그대로(각성 여부 포함)를 보여준다. 보관함 카드는 늘지 않는다
                return new DrawResult(new Card { kind = "animal", animal = GameData.Olympus.gods[id].@base, god = id, shiny = awake, uid = own.uid }, dup);
            }
            return new DrawResult(Gacha.AddCard(s, new Card { kind = "animal", animal = GameData.Olympus.gods[id].@base, god = id, shiny = awake }));
        }

        public static DrawResult GainHero(SaveData s, int id, bool awake)
        {
            s.heroDex[id] = Math.Max(s.heroDex[id], awake ? 2 : 1);
            var own = s.cards.Find(c => c.kind == "staff" && c.hero == id);
            if (own != null)
            {
                if (awake && !own.awake) { own.awake = true; return new DrawResult(own, 0, true); }
                double dup = Gacha.DrawPrice(s) * GameData.Olympus.named.dupDraws; s.tokens += dup;
                return new DrawResult(own, dup);
            }
            var c = Gacha.RollStaff(() => 0.5, 4, GameData.Olympus.heroes[id].staff);
            c.hero = id; c.awake = awake; c.pay = GameData.Staff.pay[4][1] * 1.2;
            return new DrawResult(Gacha.AddCard(s, c));
        }

        // ── 능력을 쓰는 곳 (웹판 rules.ts와 같은 식) ──
        /// <summary>공사 할인 (업그레이드 + 헤파찍, 최대 50%)</summary>
        public static double BuildCut(SaveData s) => Math.Min(0.5, s.UpValue("buildCut") + GodVal(s, "buildCut"));
        public static double FeverTime(SaveData s) => s.UpValue("feverTime") + GodVal(s, "feverTime");
        public static double FeverCharge(SaveData s) => s.UpValue("feverCharge") * (1 + GodVal(s, "feverCharge"));
        /// <summary>실망 손님 줄이기 (0~0.8)</summary>
        public static double SadCut(SaveData s) => Math.Min(0.8, GodVal(s, "sadCut") + HeroVal(s, "stage"));
    }
}
