// 웹판과 대조 테스트: tools/unity-fixtures.ts 가 만든 fixtures.json 과 C# 결과가 같아야 한다.
// 실행 (저장소 맨 위에서): dotnet run --project unity/Tests
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using BbopZoo.Core;
using BbopZoo.Data;
using Newtonsoft.Json.Linq;

static class Program
{
    static int pass, fail;
    static void Check(bool ok, string what) { if (ok) pass++; else { fail++; if (fail <= 25) Console.WriteLine("  ✗ " + what); } }
    static bool Near(double a, double b) => Math.Abs(a - b) < 1e-9;

    static string CardKey(Card c, double dup, bool upgraded)
    {
        var parts = new List<string> { c.kind };
        if (c.kind == "animal") { parts.Add($"a{c.animal}"); parts.Add(c.shiny ? "S" : "-"); if (c.god != null) parts.Add($"g{c.god}"); }
        if (c.kind == "staff") { parts.Add(c.staff); parts.Add($"G{c.grade}"); parts.Add(c.pay.ToString("R")); parts.Add(string.Join(",", c.opts.Select(o => o.id + "=" + o.v.ToString("R")))); if (c.hero != null) { parts.Add($"h{c.hero}"); parts.Add(c.awake ? "A" : "-"); } }
        if (c.kind == "pen") { parts.Add(c.piece); parts.Add($"G{c.grade}"); parts.Add(c.habitat); parts.Add(string.Join(",", c.opts.Select(o => o.id + "=" + o.v.ToString("R")))); }
        if (dup > 0) parts.Add("dup" + dup); if (upgraded) parts.Add("UP");
        return string.Join("|", parts);
    }
    static string JKey(JToken j)
    {
        var parts = new List<string> { (string)j["kind"] };
        string Opts() => string.Join(",", j["opts"].Select(o => (string)o["id"] + "=" + ((double)o["v"]).ToString("R")));
        if ((string)j["kind"] == "animal") { parts.Add($"a{(int)j["animal"]}"); parts.Add((bool)j["shiny"] ? "S" : "-"); if (j["god"] != null) parts.Add($"g{(int)j["god"]}"); }
        if ((string)j["kind"] == "staff") { parts.Add((string)j["staff"]); parts.Add($"G{(int)j["grade"]}"); parts.Add(((double)j["pay"]).ToString("R")); parts.Add(Opts()); if (j["hero"] != null) { parts.Add($"h{(int)j["hero"]}"); parts.Add((bool)j["awake"] ? "A" : "-"); } }
        if ((string)j["kind"] == "pen") { parts.Add((string)j["piece"]); parts.Add($"G{(int)j["grade"]}"); parts.Add((string)j["habitat"]); parts.Add(Opts()); }
        if (j["dup"] != null) parts.Add("dup" + (double)j["dup"]); if (j["upgraded"] != null) parts.Add("UP");
        return string.Join("|", parts);
    }

    static int Main()
    {
        string root = Directory.GetCurrentDirectory();
        while (!Directory.Exists(Path.Combine(root, "unity", "Data")) && Directory.GetParent(root) != null) root = Directory.GetParent(root).FullName;
        GameData.Dir = Path.Combine(root, "unity", "Data");
        GameData.Load();
        var fx = JObject.Parse(File.ReadAllText(Path.Combine(root, "unity", "Tests", "fixtures.json")));

        Console.WriteLine("1. 뽑기 (네임드 · 중복 · 각성 포함)");
        foreach (var dr in fx["draws"])
        {
            var s = SaveData.Default(); s.tokens = 1e12; s.stage = 3;
            if ((bool)dr["withGods"])
            {
                var a = Olympus.GainGod(s, 7, false).card; var b = Olympus.GainGod(s, 8, true).card;
                s.pens[0].Add(a.uid); s.pens[1].Add(b.uid);
            }
            var rng = Seeded.Mulberry32((uint)(int)dr["seed"]);
            int bi = 0;
            foreach (var batch in dr["batches"])
            {
                s.season.n = (int)batch["n"];
                var res = Gacha.Draw(s, 10, rng);
                Check(Gacha.LastTier == (int)batch["tier"], $"기계 등급 batch {bi}: {Gacha.LastTier} vs {(int)batch["tier"]}");
                var cs = batch["cards"].ToList();
                for (int i = 0; i < 10; i++)
                {
                    string a = CardKey(res[i].card, res[i].dup, res[i].upgraded), b = JKey(cs[i]);
                    Check(a == b, $"batch {bi} #{i}: C# {a} / 웹 {b}");
                }
                bi++;
            }
            Check(Near(s.tokens, (double)dr["tokens"]), $"남은 코인 {s.tokens} vs {(double)dr["tokens"]}");
            Check(s.godDex.SequenceEqual(dr["godDex"].Select(x => (int)x)), "신전 신 기록");
            Check(s.heroDex.SequenceEqual(dr["heroDex"].Select(x => (int)x)), "신전 영웅 기록");
            Check(s.nextUid == (int)dr["nextUid"], $"nextUid {s.nextUid} vs {(int)dr["nextUid"]}");
        }

        Console.WriteLine("2. 기계 · 직원 · 우리 낱개");
        {
            var rng = Seeded.Mulberry32(99);
            var m = fx["machine"].Select(x => (int)x).ToList();
            for (int i = 0; i < m.Count; i++) Check(Gacha.RollMachine(rng, 1.5, 0.005, 0.01) == m[i], $"기계 #{i}");
            foreach (var j in fx["staff"]) { var c = Gacha.RollStaff(rng); Check(CardKey(c, 0, false) == JKey(j), $"직원 {CardKey(c, 0, false)} / {JKey(j)}"); }
            foreach (var j in fx["pens"]) { var c = Gacha.RollPen(rng); Check(CardKey(c, 0, false) == JKey(j), $"우리 {CardKey(c, 0, false)} / {JKey(j)}"); }
        }

        Console.WriteLine("3. 라이벌 컨디션 · 규모 · 소식");
        {
            var rv = fx["rival"]; var s = SaveData.Default();
            var rs = rv["rs"].Select(x => (double)x).ToList();
            var plain = rv["plain"].Select(x => (int)x).ToList(); var athena = rv["athena"].Select(x => (int)x).ToList();
            for (int i = 0; i < rs.Count; i++) { double r = rs[i]; Check(RivalLuck.RollCond(s, 2, () => r) == plain[i], $"컨디션 r={r}"); }
            var a = Olympus.GainGod(s, 3, false).card; s.pens[0].Add(a.uid);
            for (int i = 0; i < rs.Count; i++) { double r = rs[i]; Check(RivalLuck.RollCond(s, 2, () => r) == athena[i], $"컨디션(아테나가) r={r}"); }
            foreach (var j in rv["at"])
            {
                s.season.n = (int)j["n"]; s.season.cond = (int)j["cond"]; s.season.rmul = 1.06 * 0.95;
                Check(Near(RivalLuck.At(s, (int)j["k"]), (double)j["v"]), $"라이벌 규모 n{j["n"]} c{j["cond"]} k{j["k"]}: {RivalLuck.At(s, (int)j["k"])} vs {j["v"]}");
                Check(Near(RivalLuck.ScaleTarget((int)j["n"]), (double)j["target"]), $"목표 n{j["n"]}");
            }
            var rng = Seeded.Mulberry32(5); var ev = rv["events"].ToList();
            RivalLuck.StartSeason(s, 3, 15, rng); Check(s.season.cond == (int)ev[0]["cond"], "새 시즌 컨디션");
            for (int i = 1; i < ev.Count; i++)
            {
                var e = RivalLuck.RollEvent(s, rng);
                if (ev[i].Type == JTokenType.Null) Check(e == null, $"소식 #{i} 없음");
                else Check(e != null && e.text == (string)ev[i]["text"] && Near(s.season.rmul, (double)ev[i]["rmul"]), $"소식 #{i}");
            }
        }

        Console.WriteLine("4. 폐원 데려가기 (웹판 저장 JSON을 그대로 불러와서)");
        {
            var cj = fx["carry"];
            var s = SaveData.FromJson((string)cj["save"]);
            Check(Carry.Slots(s) == (int)cj["slots"], $"칸 {Carry.Slots(s)} vs {cj["slots"]}");
            var ids = new[] { s.cards.First(c => c.god == 1).uid, 501, 502, 503, 504 };
            var costs = cj["costs"].Select(x => (int)x).ToList();
            for (int i = 0; i < ids.Length; i++) Check(Carry.Cost(s.CardById(ids[i])) == costs[i], $"칸 비용 #{i}");
            var hero = s.cards.First(c => c.hero == 2).uid;
            var n = Carry.CloseZoo(s, ids, hero);
            var kept = cj["kept"].Select(JKey).ToList();
            var mine = n.cards.Select(c => CardKey(c, 0, false)).ToList();
            Check(mine.SequenceEqual(kept), $"데려간 카드 {string.Join(" ; ", mine)} / {string.Join(" ; ", kept)}");
            Check(n.staffSlots[0] != null, "직원 첫 슬롯");
            Check(n.godDex.SequenceEqual(cj["godDex"].Select(x => (int)x)), "신전 유지");
            Check(n.records.closures == (int)cj["closures"], "폐원 횟수");
        }

        Console.WriteLine("5. 시즌 판정 (하트 → 최후의 기회 → 폐원 · 회복)");
        {
            var s = SaveData.Default(); s.day = 7; s.season = new SeasonState { n = 2, start = 1, cond = 1 };
            var rng = Seeded.Mulberry32(1);
            Check(RivalLuck.Resolve(s, 100, 1000, rng, out _) == SeasonOutcome.Survived && s.lastChance && s.season.n == 3, "처음 지면 하트로 버틴다");
            s.day = s.season.start + 6;
            Check(RivalLuck.CheckLastStand(s, 7, 100) && s.season.stand, "최후의 기회 마지막 날 지고 있으면 막판 대목");
            RivalLuck.AddCheer(s, 100000, true);
            Check(Near(s.season.cheer, GameData.Luck.lastStand.cheerMax * RivalLuck.ScaleTarget(3)), "응원 점수 상한");
            Check(RivalLuck.Resolve(s, 1e9, 1000, rng, out var reward) == SeasonOutcome.Win && !s.lastChance && reward == 1500, "최후의 기회에서 이기면 하트 회복 · 보상");
            s.lastChance = true; s.day = s.season.start + 6;
            Check(RivalLuck.Resolve(s, 0, 0, rng, out _) == SeasonOutcome.Closed && s.season.lost, "최후의 기회에서 또 지면 폐원");
        }

        Console.WriteLine($"\n결과: 통과 {pass} · 실패 {fail}");
        return fail == 0 ? 0 : 1;
    }
}
