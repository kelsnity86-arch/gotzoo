// 카드 · 저장 데이터 (src/game/state.ts). 필드 이름을 웹판 저장 JSON과 똑같이 맞춰서, 웹판 저장(설정 > 저장 코드)을 그대로 불러올 수 있다.
using System;
using System.Collections.Generic;
using System.Linq;
using BbopZoo.Data;
using Newtonsoft.Json;

namespace BbopZoo.Core
{
    [Serializable] public class OptValue { public string id; public double v; }

    /// <summary>kind: "animal" | "staff" | "pen". 웹판처럼 한 클래스에 필드를 같이 둔다 (JSON 호환).</summary>
    [Serializable] public class Card
    {
        public int uid; public string kind;
        // animal
        public int animal; public bool shiny;
        /// <summary>올림푸스 12지신 번호 (네임드 동물). shiny = 각성</summary>
        public int? god;
        // staff
        public string staff; public double pay;
        /// <summary>신화 영웅 번호 (네임드 직원) · 각성</summary>
        public int? hero; public bool awake;
        // pen
        public string piece, habitat;
        /// <summary>직원 · 우리 등급 (동물은 종에서 나온다: AnimalGrade)</summary>
        public int grade; public List<OptValue> opts = new List<OptValue>();

        public bool IsNamed => (kind == "animal" && god != null) || (kind == "staff" && hero != null);
        /// <summary>동물 등급: 신은 전설(4)로 친다</summary>
        public int AnimalGrade() => god != null ? 4 : GameData.Animals.animals[animal].grade;
        public Card Clone() { var c = (Card)MemberwiseClone(); c.opts = opts.Select(o => new OptValue { id = o.id, v = o.v }).ToList(); return c; }
    }

    [Serializable] public class Stats { public int draws; }
    [Serializable] public class Records { public int bestSeasons, bestDay, closures, bestYears; }
    [Serializable] public class BoardPiece { public int uid, x, y, rot; }
    [Serializable] public class RivalNews { public string text; public double mul; }

    /// <summary>이번 시즌: 몇 번째 · 시작한 날 · 라이벌 컨디션 · 소식 배율 · 막판 대목 · 응원 점수</summary>
    [Serializable] public class SeasonState
    {
        public int n = 1, start = 1; public double mine, rival; public bool lost;
        public int cond; public double rmul = 1; public RivalNews rev; public bool stand; public double cheer;
    }

    [Serializable] public class SaveData
    {
        public int stage = 1;            // 1~8: 작은 → 세계 동물원
        public bool bigLand;             // ★3 이후 마지막 24×6 확장
        public int stars;                // 0~5, 올라가기만
        public double coins;             // 돈 (입장료) — 건물 · 확장 · 업그레이드 · 월급
        public double tokens;            // 코인 (바닥 동전) — 뽑기 전용
        public int tickets;
        public int nextUid = 1;
        public string zooName;           // 비면 "뽑ZOO"
        public bool zooNameAsked;
        public Dictionary<string, int> upgrades = new Dictionary<string, int>();
        public List<Card> cards = new List<Card>();
        public List<BoardPiece> board = new List<BoardPiece>();
        /// <summary>우리마다 들어 있는 동물 uid</summary>
        public List<List<int>> pens = new List<List<int>>();
        public List<int?> staffSlots = new List<int?> { null };
        public Stats stats = new Stats();
        public Records records = new Records();
        public SeasonState season = new SeasonState();
        public int day = 1;
        public bool strike, freeDrawUsed;
        public bool[] dex = new bool[0], shinyDex = new bool[0];
        /// <summary>평판 하트를 잃었는지: 한 번 지면 최후의 기회, 또 지면 폐원</summary>
        public bool lastChance;
        /// <summary>올림푸스 신전 (폐원해도 남는다): 신 12 · 영웅 6, 0 없음 · 1 만남 · 2 각성</summary>
        public int[] godDex = new int[12], heroDex = new int[6];

        public Card CardById(int uid) => cards.Find(c => c.uid == uid);
        public int Up(string id) => upgrades.TryGetValue(id, out var lv) ? lv : 0;
        /// <summary>업그레이드 현재 값 (웹판 upValue)</summary>
        public double UpValue(string id) { var u = GameData.Upgrade(id); return u.values[Math.Min(Up(id), u.values.Length - 1)]; }
        public int PenCount => board.Count;

        /// <summary>새 저장 (웹판 defaultSave 중 이 키트가 쓰는 부분)</summary>
        public static SaveData Default()
        {
            var s = new SaveData();
            foreach (var u in GameData.Upgrades.upgrades) s.upgrades[u.id] = 0;
            int n = GameData.Animals.animals.Count; s.dex = new bool[n]; s.shinyDex = new bool[n];
            // 처음 우리 4개: 네모 우리(일반) · 풀밭 · 물가 · 풀밭 · 사막
            string[] hab = { "grass", "water", "grass", "sand" };
            for (int i = 0; i < 4; i++)
            {
                s.cards.Add(new Card { uid = 900001 + i, kind = "pen", piece = "O", grade = 0, habitat = hab[i] });
                s.board.Add(new BoardPiece { uid = 900001 + i, x = i * 2, y = 1 }); s.pens.Add(new List<int>());
            }
            return s;
        }

        public static readonly JsonSerializerSettings Json = new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore };
        public string ToJson() => JsonConvert.SerializeObject(this, Json);
        public static SaveData FromJson(string json) => JsonConvert.DeserializeObject<SaveData>(json, Json);
    }
}
