// 뽑기 규칙 (src/game/rules.ts: draw · rollMachine · rollGrade · rollCards · rollStaff · rollPen · gainGod · gainHero 이식)
// 확률 · 수치는 전부 GameData(JSON)에서 읽는다. 웹판과 같은 순서로 난수를 쓰므로 같은 씨앗이면 같은 결과 (Tests/ 에서 웹판과 대조).
using System;
using System.Collections.Generic;
using System.Linq;
using BbopZoo.Data;

namespace BbopZoo.Core
{
    /// <summary>0 이상 1 미만 난수. 웹판 Math.random 자리.</summary>
    public delegate double Rng();

    /// <summary>웹판 테스트와 같은 씨앗 난수 (mulberry32)</summary>
    public static class Seeded
    {
        public static Rng Mulberry32(uint seed)
        {
            uint a = seed;
            return () =>
            {
                a += 0x6D2B79F5u;
                uint t = a;
                t = unchecked((t ^ (t >> 15)) * (t | 1u));
                t ^= unchecked(t + (t ^ (t >> 7)) * (t | 61u));
                return ((t ^ (t >> 14)) >> 0) / 4294967296.0;
            };
        }
    }

    public static class Gacha
    {
        public static int LastTier { get; private set; }

        static T Pick<T>(IList<T> list, Rng rng) => list[Math.Min(list.Count - 1, (int)Math.Floor(rng() * list.Count))];
        static double Round3(double v) => JsRound(v * 1000) / 1000;
        /// <summary>JS Math.round (0.5는 위로)</summary>
        static double JsRound(double v) => Math.Floor(v + 0.5);

        public static int DrawPrice(SaveData s) { var p = GameData.Balance.gacha.price; return p[Math.Min(s.stage, GameData.Balance.maxStage) - 1]; }

        /// <summary>기계 등급 0 계절 · 1 은 · 2 금 · 3 무지개. mul = 기계 정비, rainbowPlus = ★4 보상, luckPlus = 아르테멍(은 50% · 금 30% · 무지개 20%로 나눔)</summary>
        public static int RollMachine(Rng rng, double mul = 1, double rainbowPlus = 0, double luckPlus = 0)
        {
            var tiers = GameData.Balance.machineTiers;
            double[] share = { 0, 0.5, 0.3, 0.2 };
            double r = rng();
            for (int i = tiers.Count - 1; i > 0; i--)
            {
                double c = tiers[i].chance * mul + (i == 3 ? rainbowPlus : 0) + luckPlus * share[i];
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

        static List<OptValue> RollOpts(Rng rng, IEnumerable<OptDef> poolSrc, int count, bool round3 = false)
        {
            var pool = poolSrc.ToList(); var opts = new List<OptValue>();
            for (int i = 0; i < count && pool.Count > 0; i++)
            {
                int k = (int)Math.Floor(rng() * pool.Count); var o = pool[k]; pool.RemoveAt(k);
                double step = o.step ?? 0.01;
                double v = JsRound((o.range[0] + rng() * (o.range[1] - o.range[0])) / step) * step;
                opts.Add(new OptValue { id = o.id, v = round3 ? Round3(v) : JsRound(v * 1000) / 1000 });
            }
            return opts;
        }

        /// <summary>직원 하나: 등급 · 종류 · 월급 · 특수옵션 (grade/kind를 주면 그대로)</summary>
        public static Card RollStaff(Rng rng, int? grade = null, string kind = null)
        {
            int g = grade ?? RollGrade(rng);
            var k = kind ?? Pick(GameData.Staff.staff, rng).kind;
            var pay = GameData.Staff.pay[g];
            var opts = RollOpts(rng, GameData.Staff.opts.Where(o => !o.legendOnly || g == 4), GameData.Staff.optCount[g], true);
            return new Card { kind = "staff", staff = k, grade = g, pay = Round3(pay[0] + rng() * (pay[1] - pay[0])), opts = opts };
        }

        public static Card RollPen(Rng rng)
        {
            int grade = RollGrade(rng);
            var piece = Pick(GameData.Pieces.pieces.Where(p => p.grade == grade).ToList(), rng);
            string[] habitats = { "grass", "sand", "water", "snow", "rock", "cloud" };
            var opts = RollOpts(rng, GameData.Pieces.opts, GameData.Pieces.optCount[grade]);
            // 웹판은 옵션을 굴린 뒤 서식지를 고른다 — 순서를 지켜야 같은 씨앗에서 같은 결과
            return new Card { kind = "pen", piece = piece.id, grade = grade, habitat = Pick(habitats, rng), opts = opts };
        }

        static Card Add(SaveData s, Card c)
        {
            c.uid = s.nextUid++;
            s.cards.Add(c);
            if (c.kind == "animal") { s.dex[c.animal] = true; if (c.shiny) s.shinyDex[c.animal] = true; }
            return c;
        }

        static int PickAnimal(SaveData s, int g, Rng rng)
        {
            var lim = GameData.SeasonalOfGrade(g, GameData.SeasonOf(s.season.n).key);
            if (lim.Count > 0 && rng() < s.UpValue("seasonPick")) return Pick(lim, rng).id;
            return Pick(GameData.AnimalsOfGrade(g), rng).id;
        }

        /// <summary>
        /// n장 뽑기 (동물 90% · 직원 5% · 우리 5%, 그 안에 네임드). 코인이 모자라면 null.
        /// extraLuck = 직원 '행운' 옵션 합 + 연구소 효과 (웹판 optSum(luck) + facSum(lab)) — 직원 · 시설 이식 전까지는 밖에서 넘긴다.
        /// 중복 네임드는 카드가 늘지 않고 dup(코인) 또는 upgraded(각성)로 돌아온다.
        /// </summary>
        public static List<DrawResult> Draw(SaveData s, int n, Rng rng, double extraLuck = 0)
        {
            double cost = DrawPrice(s) * n;
            if (s.tokens < cost) return null;
            int tier = RollMachine(rng, s.UpValue("machine"), s.stars >= 4 ? 0.005 : 0, Olympus.GodVal(s, "machineLuck"));
            LastTier = tier;
            s.tokens -= cost; s.stats.draws += n;

            var mt = GameData.Balance.machineTiers[tier]; var dk = GameData.Balance.drawKind; var nm = GameData.Olympus.named;
            var outList = new List<DrawResult>();
            for (int i = 0; i < n; i++)
            {
                double k = rng();
                if (k >= dk.animal + dk.staff) { outList.Add(new DrawResult(Add(s, RollPen(rng)))); continue; }
                if (k >= dk.animal)
                {
                    if (rng() < nm.hero * nm.machineMul[tier]) { int id = (int)Math.Floor(rng() * GameData.Olympus.heroes.Count) % GameData.Olympus.heroes.Count; outList.Add(Olympus.GainHero(s, id, rng() < nm.awake)); continue; }
                    outList.Add(new DrawResult(Add(s, RollStaff(rng)))); continue;
                }
                if (rng() < nm.god * nm.machineMul[tier])
                {
                    var pool = Olympus.GodsOfSeason(GameData.SeasonOf(s.season.n).key);
                    int id = pool[Math.Min(pool.Count - 1, (int)Math.Floor(rng() * pool.Count))].id;
                    outList.Add(Olympus.GainGod(s, id, rng() < nm.awake)); continue;
                }
                int g = RollGrade(rng, extraLuck + mt.luck);
                int a = PickAnimal(s, g, rng);
                bool shiny = rng() < s.UpValue("shiny") * mt.shiny * (1 + Olympus.GodVal(s, "shinyMul"));
                outList.Add(new DrawResult(Add(s, new Card { kind = "animal", animal = a, shiny = shiny })));
            }
            return outList;
        }

        internal static Card AddCard(SaveData s, Card c) => Add(s, c);
    }

    /// <summary>뽑기 결과 한 장: 새 카드, 또는 중복 네임드(dup 코인) · 각성 업그레이드(upgraded)</summary>
    public class DrawResult
    {
        public Card card; public double dup; public bool upgraded;
        public DrawResult(Card c, double dup = 0, bool upgraded = false) { card = c; this.dup = dup; this.upgraded = upgraded; }
    }
}
