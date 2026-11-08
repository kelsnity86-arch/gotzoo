// 폐원하고 새 동물원 (src/game/rules.ts: CARRY · carrySlots · carryCost · closeZoo 이식)
using System;
using System.Collections.Generic;
using BbopZoo.Data;

namespace BbopZoo.Core
{
    public static class Carry
    {
        /// <summary>데려갈 수 있는 동물 칸: base + 지나온 시즌 perSeasons번마다 1 (최대 max)</summary>
        public static int Slots(SaveData s) { var c = GameData.Luck.carry; return Math.Min(c.max, c.@base + (s.season.n - 1) / c.perSeasons); }
        /// <summary>칸 비용: 등급별 · 신화(네임드) · 반짝이 +1</summary>
        public static int Cost(Card c) { var k = GameData.Luck.carry; return (c.god != null ? k.named : k.grade[GameData.Animals.animals[c.animal].grade]) + (c.shiny ? k.shiny : 0); }

        /// <summary>
        /// 새 동물원: 도감 · 기록 · 신전 · 이름은 남고, 고른 동물(칸 안, 고른 순서대로)과 직원 1명(첫 슬롯)을 데려간다.
        /// 데려간 동물은 웹판처럼 빈 칸에 자동 배치(autoPlace)해야 한다 — 배치 규칙 이식 전까지는 보관함에 둔다.
        /// </summary>
        public static SaveData CloseZoo(SaveData s, IEnumerable<int> animals, int? staff)
        {
            var n = SaveData.Default();
            int room = Slots(s);
            foreach (var uid in animals)
            {
                var c = s.CardById(uid);
                if (c == null || c.kind != "animal") continue;
                int cost = Cost(c); if (cost > room) continue;
                room -= cost;
                var nc = c.Clone(); nc.uid = n.nextUid++; n.cards.Add(nc);
            }
            var st = staff != null ? s.CardById(staff.Value) : null;
            if (st != null && st.kind == "staff") { var nc = st.Clone(); nc.uid = n.nextUid++; n.cards.Add(nc); n.staffSlots[0] = nc.uid; }
            n.dex = (bool[])s.dex.Clone(); n.shinyDex = (bool[])s.shinyDex.Clone();
            n.records = new Records { bestSeasons = s.records.bestSeasons, bestDay = Math.Max(s.records.bestDay, s.day), closures = s.records.closures + 1, bestYears = s.records.bestYears };
            n.godDex = (int[])s.godDex.Clone(); n.heroDex = (int[])s.heroDex.Clone();
            n.zooName = s.zooName; n.zooNameAsked = s.zooNameAsked;
            return n;
        }
    }
}
