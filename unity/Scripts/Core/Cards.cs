// 카드 · 저장 데이터 (src/game/state.ts 의 일부). 저장은 JSON 그대로 — 웹판 저장 코드와 같은 모양.
using System;
using System.Collections.Generic;

namespace BbopZoo.Core
{
    [Serializable] public class OptValue { public string id; public float v; }

    /// <summary>kind: "animal" | "staff" | "pen". 웹판처럼 한 클래스에 필드를 같이 둔다 (JSON 호환).</summary>
    [Serializable] public class Card
    {
        public int uid; public string kind;
        public int animal; public bool shiny;               // animal
        public string staff; public float pay;              // staff
        public string piece, habitat;                       // pen
        public int grade; public List<OptValue> opts = new List<OptValue>();
    }

    [Serializable] public class Stats { public int draws; }

    [Serializable] public class SaveData
    {
        public int stage = 1;            // 1~8: 작은 → 세계 동물원
        public bool bigLand;             // ★3 이후 마지막 24×6 확장
        public int stars;                // 0~5, 올라가기만
        public double coins;             // 돈 (입장료) — 건물 · 확장 · 업그레이드 · 월급
        public double tokens;            // 코인 (바닥 동전) — 뽑기 전용
        public int nextUid = 1;
        public string zooName;           // 비면 "뽑ZOO"
        public Dictionary<string, int> upgrades = new Dictionary<string, int>();
        public List<Card> cards = new List<Card>();
        public Stats stats = new Stats();
        public int day = 1;
    }
}
