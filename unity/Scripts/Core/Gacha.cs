// 뽑기 규칙 (src/game/rules.ts: draw · rollMachine · rollGrade · rollCards · rollStaff · rollPen 이식)
// 확률 · 수치는 전부 GameData(JSON)에서 읽는다. 웹판과 같은 순서로 난수를 쓰므로 같은 씨앗이면 같은 결과.
using System;
using System.Collections.Generic;
using System.Linq;
using BbopZoo.Data;

namespace BbopZoo.Core
{
    /// <summary>0 이상 1 미만 난수. 웹판 Math.random 자리.</summary>
    public delegate double Rng();

    public static class Gacha
    {
        public static int LastTier { get; private set; }

        static T Pick<T>(IList<T> list, Rng rng) => list[Math.Min(list.Count - 1, (int)Math.Floor(rng() * list.Count))];
        static float Round3(double v) => (float)(Math.Round(v * 1000) / 1000);

        public static int DrawPrice(SaveData s) { var p = GameData.Balance.gacha.price; return p[Math.Min(s.stage, p.Length) - 1]; }

        /// <summary>기계 등급 0 계절 · 1 은 · 2 금 · 3 무지개. mul = 기계 정비 업그레이드 값, rainbowPlus = ★4 보상 0.005</summary>
        public static int RollMachine(Rng rng, double mul = 1, double rainbowPlus = 0)
        {
            var tiers = GameData.Balance.machineTiers;
            double r = rng();
            for (int i = tiers.Count - 1; i > 0; i--)
            {
                double c = tiers[i].chance * mul + (i == 3 ? rainbowPlus : 0);
                if (r < c) return i;
                r -= c;
            }
            return 0;
        }

        /// <summary>등급: luck 만큼 일반에서 빼서 영웅 75% · 전설 25% 로 옮긴다</summary>
        public static int RollGrade(Rng rng, double luck = 0)
        {
            double r = rng();
            var ch = GameData.Grades.Select(g => (double)g.chance).ToArray();
            ch[0] -= luck; ch[3] += luck * 0.75; ch[4] += luck * 0.25;
            for (int i = 0; i < ch.Length; i++) { if (r < ch[i]) return i; r -= ch[i]; }
            return 0;
        }

        static List<OptValue> RollOpts(Rng rng, IEnumerable<OptDef> poolSrc, int count)
        {
            var pool = poolSrc.ToList(); var opts = new List<OptValue>();
            for (int i = 0; i < count && pool.Count > 0; i++)
            {
                int k = (int)Math.Floor(rng() * pool.Count); var o = pool[k]; pool.RemoveAt(k);
                double step = o.step ?? 0.01;
                opts.Add(new OptValue { id = o.id, v = Round3(Math.Round((o.range[0] + rng() * (o.range[1] - o.range[0])) / step) * step) });
            }
            return opts;
        }

        public static Card RollStaff(Rng rng)
        {
            int grade = RollGrade(rng);
            var kind = Pick(GameData.Staff.staff, rng).kind;
            var pay = GameData.Staff.pay[grade];
            var opts = RollOpts(rng, GameData.Staff.opts.Where(o => !o.legendOnly || grade == 4), GameData.Staff.optCount[grade]);
            return new Card { kind = "staff", staff = kind, grade = grade, pay = Round3(pay[0] + rng() * (pay[1] - pay[0])), opts = opts };
        }

        public static Card RollPen(Rng rng)
        {
            int grade = RollGrade(rng);
            var piece = Pick(GameData.Pieces.pieces.Where(p => p.grade == grade).ToList(), rng);
            var opts = RollOpts(rng, GameData.Pieces.opts, GameData.Pieces.optCount[grade]);
            string[] habitats = { "grass", "sand", "water", "snow", "rock", "cloud" };
            // 웹판은 옵션을 굴린 뒤 서식지를 고른다 — 순서를 지켜야 같은 씨앗에서 같은 결과
            return new Card { kind = "pen", piece = piece.id, grade = grade, habitat = Pick(habitats, rng), opts = opts };
        }

        /// <summary>n장 뽑기. 코인이 모자라면 null. luck = 옵션·연구소 합(웹판 optSum + facSum), shinyChance = 반짝이 업그레이드 값, season = 지금 계절 키</summary>
        public static List<Card> Draw(SaveData s, int n, Rng rng, double luck, double shinyChance, string season, double limitedShare)
        {
            double cost = DrawPrice(s) * n;
            if (s.tokens < cost) return null;
            int machineLv = s.upgrades.TryGetValue("machine", out var lv) ? lv : 0;
            var mup = GameData.Upgrades.upgrades.Find(u => u.id == "machine");
            int tier = RollMachine(rng, mup.values[machineLv], s.stars >= 4 ? 0.005 : 0);
            LastTier = tier;
            s.tokens -= cost; s.stats.draws += n;

            var mt = GameData.Balance.machineTiers[tier]; var dk = GameData.Balance.drawKind;
            var outList = new List<Card>();
            for (int i = 0; i < n; i++)
            {
                double k = rng(); Card c;
                if (k >= dk.animal + dk.staff) c = RollPen(rng);
                else if (k >= dk.animal) c = RollStaff(rng);
                else
                {
                    int g = RollGrade(rng, luck + mt.luck);
                    var lim = GameData.SeasonalOfGrade(g, season);
                    int id = lim.Count > 0 && rng() < limitedShare ? Pick(lim, rng).id : Pick(GameData.AnimalsOfGrade(g), rng).id;
                    c = new Card { kind = "animal", animal = id, grade = g, shiny = rng() < shinyChance * mt.shiny };
                }
                c.uid = s.nextUid++; s.cards.Add(c); outList.Add(c);
            }
            return outList;
        }
    }
}
