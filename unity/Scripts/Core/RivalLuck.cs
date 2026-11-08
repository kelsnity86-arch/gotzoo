// 라이벌 운 · 평판 하트 · 막판 대목 (src/game/rules.ts: rollRivalCond · startSeason · rivalAt · rollRivalEvent, src/game/world.ts: closePark 시즌 판정 · 응원 점수)
using System;
using BbopZoo.Data;

namespace BbopZoo.Core
{
    public enum SeasonOutcome { None, Win, Survived, Closed }

    public static class RivalLuck
    {
        /// <summary>라이벌 목표 규모: 표 → 표 뒤로는 시즌마다 ×scaleGrowth</summary>
        public static double ScaleTarget(int n)
        {
            var t = GameData.Rivals.scaleTarget;
            if (n <= t.Length) return t[n - 1];
            return Math.Floor(t[t.Length - 1] * Math.Pow(GameData.Rivals.scaleGrowth, n - t.Length) + 0.5);
        }
        /// <summary>시즌 k일째 기본 규모: 목표의 80% → 100%</summary>
        public static double Scale(int k, int n)
        {
            int days = GameData.Rivals.season.days, d = Math.Max(1, Math.Min(days, k));
            return Math.Floor(ScaleTarget(n) * (0.8 + 0.2 * (d - 1) / (days - 1)) + 0.5);
        }
        /// <summary>실제 라이벌 규모 = 기본 × 컨디션 × 소식</summary>
        public static double At(SaveData s, int k) => Math.Floor(Scale(k, s.season.n) * GameData.Luck.rivalCond[s.season.cond].mul * s.season.rmul + 0.5);

        /// <summary>컨디션 뽑기 0 부진 · 1 보통 · 2 절호조. 1시즌은 부진. 아테나가가 절호조 확률을 보통으로 옮긴다</summary>
        public static int RollCond(SaveData s, int n, Rng rng)
        {
            if (n <= 1) return 0;
            var conds = GameData.Luck.rivalCond;
            double[] ch = { conds[0].chance, conds[1].chance, conds[2].chance };
            double cut = Math.Min(ch[2], Olympus.GodVal(s, "hotCut")); ch[2] -= cut; ch[1] += cut;
            double r = rng();
            for (int i = 0; i < ch.Length; i++) { if (r < ch[i]) return i; r -= ch[i]; }
            return 1;
        }

        public static void StartSeason(SaveData s, int n, int start, Rng rng)
        {
            s.season = new SeasonState { n = n, start = start, cond = RollCond(s, n, rng), rmul = 1 };
        }

        /// <summary>아침 라이벌 소식 (시즌 2일째부터). 없으면 null</summary>
        public static RivalNews RollEvent(SaveData s, Rng rng)
        {
            if (rng() >= GameData.Luck.rivalEventChance) return null;
            var evs = GameData.Luck.rivalEvents;
            var ev = evs[Math.Min(evs.Count - 1, (int)Math.Floor(rng() * evs.Count))];
            s.season.rmul *= ev.mul;
            s.season.rev = new RivalNews { text = ev.text, mul = ev.mul };
            return s.season.rev;
        }

        /// <summary>최후의 기회 마지막 날 아침: 지고 있으면 막판 대목을 켠다</summary>
        public static bool CheckLastStand(SaveData s, int seasonDay, double myScale)
        {
            if (!s.lastChance || seasonDay != GameData.Rivals.season.days || myScale >= At(s, seasonDay)) return false;
            s.season.stand = true; return true;
        }
        /// <summary>막판 대목 중 손으로 동전을 주웠을 때 응원 점수 (피버 중 2배, 아레호가 더, 상한 있음)</summary>
        public static void AddCheer(SaveData s, int coinCount, bool feverOn)
        {
            if (!s.season.stand) return;
            var ls = GameData.Luck.lastStand; double ares = Olympus.GodVal(s, "lastStand"), target = ScaleTarget(s.season.n);
            double add = coinCount * ls.cheerPerCoin * target * (feverOn ? 2 : 1) * (1 + ares * 0.5);
            s.season.cheer = Math.Min(ls.cheerMax * target * (1 + ares * 0.5), s.season.cheer + add);
        }
        /// <summary>막판 대목 피버 게이지 배율</summary>
        public static double StandFeverMul(SaveData s) => s.season.stand ? GameData.Luck.lastStand.feverCharge + Olympus.GodVal(s, "lastStand") : 1;

        /// <summary>
        /// 시즌 마지막 날 밤 판정. mine = 동물원 규모(응원 제외), income = 그날 입장료 수입.
        /// 이김 → 보상 · 하트 회복 · 다음 시즌 / 처음 짐 → 하트 깨짐(최후의 기회) · 다음 시즌 / 최후의 기회에서 짐 → 폐원
        /// </summary>
        public static SeasonOutcome Resolve(SaveData s, double mine, double income, Rng rng, out double reward)
        {
            reward = 0;
            int seasonDay = s.day - s.season.start + 1;
            if (seasonDay < GameData.Rivals.season.days) return SeasonOutcome.None;
            double total = mine + Math.Floor(s.season.cheer + 0.5), rival = At(s, seasonDay);
            if (total >= rival)
            {
                reward = Math.Floor(Math.Max(0, income) * GameData.Rivals.season.winDays + 0.5); // 1주년(겨울) 보너스는 웹판 world.ts 참고
                s.coins += reward; s.tickets += GameData.Rivals.season.winTickets;
                s.records.bestSeasons = Math.Max(s.records.bestSeasons, s.season.n);
                s.lastChance = false;
                StartSeason(s, s.season.n + 1, s.day + 1, rng);
                return SeasonOutcome.Win;
            }
            if (!s.lastChance)
            {
                s.lastChance = true;
                StartSeason(s, s.season.n + 1, s.day + 1, rng);
                return SeasonOutcome.Survived;
            }
            s.season.lost = true;
            return SeasonOutcome.Closed;
        }
    }
}
