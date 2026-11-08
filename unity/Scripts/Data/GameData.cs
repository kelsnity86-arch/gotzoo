// 뽑ZOO 데이터 모델 · 불러오기
// unity/Data/*.json 을 Assets/StreamingAssets/Data/ 에 두고 GameData.Load() 를 부른다.
// JSON 파서: Newtonsoft (패키지 관리자 → com.unity.nuget.newtonsoft-json)
using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace BbopZoo.Data
{
    [Serializable] public class AnimalDef { public int id; public string name, en, habitat, shape, body, accent, season; public int grade; }
    [Serializable] public class AnimalsFile { public Dictionary<string, string> habitatNames; public List<AnimalDef> animals; }

    [Serializable] public class GradeDef { public int id; public string key, name, color; public double attract, chance; }

    /// <summary>값 범위가 있는 특수 옵션 (직원 · 우리 공용)</summary>
    [Serializable] public class OptDef { public string id, name; public double[] range; public double? step; public bool legendOnly; }

    [Serializable] public class StaffDef { public string kind, name, body, accent; public double[] values; public string[] descByGrade; }
    [Serializable] public class StaffFile
    {
        public List<StaffDef> staff; public List<OptDef> opts;
        public Dictionary<int, double[]> pay; public Dictionary<int, int> optCount; public Dictionary<int, double> refund;
        public double drawMul; public object cap;
    }

    [Serializable] public class PieceDef { public string id, name; public int grade; public int[][] cells; public object carve; }
    [Serializable] public class PiecesFile
    {
        /// <summary>단계별 부지 (가로, 세로): 8×4 … 24×6</summary>
        public int[][] board; public double capPerCell; public string[] habitats;
        public List<PieceDef> pieces; public List<OptDef> opts; public Dictionary<int, int> optCount;
    }

    [Serializable] public class FacilityDef { public string type, name, descLv1, descMax; public double value, cap, price, upkeep; }
    [Serializable] public class FacilitiesFile { public int maxLv; public double[] lvPrice; public List<FacilityDef> facilities; public object decor, decoTiers; }

    [Serializable] public class UpgradeDef { public string id, name, icon, group; public double[] values, costs; public int[] need; public string[] descByLevel; }
    [Serializable] public class UpgradesFile { public string[][] groups; public List<UpgradeDef> upgrades; }

    [Serializable] public class MachineTier { public string name, key; public double chance, luck, shiny; }
    [Serializable] public class DrawKind { public double animal, staff, pen; }
    [Serializable] public class GachaCfg { public int[] price; }
    /// <summary>balance.json: 숫자는 대부분 여기. 아직 모델이 없는 묶음은 JObject 로 남겨 두고 필요할 때 옮긴다.</summary>
    [Serializable] public class BalanceFile
    {
        public GachaCfg gacha; public DrawKind drawKind; public List<MachineTier> machineTiers;
        public int[][] stageReq; public int maxStage; public string[] stageNames; public int[] expandCost, starNeed; public double stageTipMul;
        public Newtonsoft.Json.Linq.JObject visitor, coin, feed, staffAi, day, upkeep, scale, debt, incident;
    }

    [Serializable] public class EventDef { public string id, name, desc, season, habitat; public double weight, rateMul, tipMul; public double? allMul, habitatMul; public int? vips; public bool rain, snow; }
    [Serializable] public class SeasonDef { public string key, name, icon, strong, weak, climate, climateName, tint; public string[] particle; }
    [Serializable] public class SeasonsFile { public List<SeasonDef> seasons; public Newtonsoft.Json.Linq.JObject fx; }
    [Serializable] public class RivalDef { public string name, owner; }
    [Serializable] public class SeasonCfg { public int days, winTickets; public double winDays; }
    [Serializable] public class RivalsFile { public SeasonCfg season; public List<RivalDef> rivals; public int[] scaleTarget; public double scaleGrowth; }

    // ── 올림푸스 (olympus.json) ──
    [Serializable] public class GodDef { public int id; public string name, title, god, zodiac, season, ability, color, descNormal, descAwake; public int @base; public double value; }
    [Serializable] public class HeroDef { public int id; public string name, title, staff, ability, color, descNormal, descAwake; public double value; }
    /// <summary>확률: 동물이 나올 때 god, 직원이 나올 때 hero, 기계 등급 배율 machineMul, 각성 awake (능력 ×awakeMul)</summary>
    [Serializable] public class NamedCfg { public double god, hero, awake, awakeMul, attractMul, scaleMul, templeVisitors; public double[] machineMul; public int dupDraws; }
    [Serializable] public class OlympusFile { public NamedCfg named; public List<GodDef> gods; public List<HeroDef> heroes; }

    // ── 운 (luck.json): 라이벌 컨디션 · 소식 · 막판 대목 · 폐원 데려가기 ──
    [Serializable] public class RivalCondDef { public string key, name, icon; public double mul, chance; }
    [Serializable] public class RivalEventDef { public string text; public double mul; }
    [Serializable] public class LastStandCfg { public double feverCharge, rain, cheerPerCoin, cheerMax; }
    [Serializable] public class CarryCfg { public int @base, perSeasons, max, named, shiny; public int[] grade; }
    [Serializable] public class LuckFile { public List<RivalCondDef> rivalCond; public List<RivalEventDef> rivalEvents; public double rivalEventChance; public LastStandCfg lastStand; public CarryCfg carry; }

    [Serializable] public class SpriteEntry { public string key, file; public int w, h; public double[] pivot; }
    [Serializable] public class SpritesFile { public int ppu; public string filter; public List<SpriteEntry> sprites; }

    public static class GameData
    {
        public static AnimalsFile Animals; public static List<GradeDef> Grades; public static StaffFile Staff;
        public static PiecesFile Pieces; public static FacilitiesFile Facilities; public static UpgradesFile Upgrades;
        public static BalanceFile Balance; public static List<EventDef> Events; public static SeasonsFile Seasons; public static RivalsFile Rivals;
        public static SpritesFile Sprites; public static OlympusFile Olympus; public static LuckFile Luck;

        /// <summary>데이터 폴더 (기본: StreamingAssets/Data). 테스트에서는 바꿔 끼운다</summary>
        public static string Dir;
        static T Read<T>(string name)
        {
            var path = Path.Combine(Dir ?? Path.Combine(Application.streamingAssetsPath, "Data"), name + ".json");
            return JsonConvert.DeserializeObject<T>(File.ReadAllText(path));
        }

        /// <summary>게임 시작 때 한 번. (WebGL 빌드라면 File 대신 UnityWebRequest 로 바꿀 것)</summary>
        public static void Load()
        {
            Animals = Read<AnimalsFile>("animals"); Grades = Read<List<GradeDef>>("grades"); Staff = Read<StaffFile>("staff");
            Pieces = Read<PiecesFile>("pieces"); Facilities = Read<FacilitiesFile>("facilities"); Upgrades = Read<UpgradesFile>("upgrades");
            Balance = Read<BalanceFile>("balance"); Events = Read<List<EventDef>>("events"); Seasons = Read<SeasonsFile>("seasons"); Rivals = Read<RivalsFile>("rivals");
            Sprites = Read<SpritesFile>("sprites");
            Olympus = Read<OlympusFile>("olympus"); Luck = Read<LuckFile>("luck");
        }

        /// <summary>시즌 n의 계절 (봄 → 여름 → 가을 → 겨울 반복)</summary>
        public static SeasonDef SeasonOf(int n) => Seasons.seasons[(n - 1) % 4];
        public static UpgradeDef Upgrade(string id) => Upgrades.upgrades.Find(u => u.id == id);
        public static List<AnimalDef> AnimalsOfGrade(int g) => Animals.animals.FindAll(a => a.grade == g && string.IsNullOrEmpty(a.season));
        public static List<AnimalDef> SeasonalOfGrade(int g, string season) => Animals.animals.FindAll(a => a.grade == g && a.season == season);
    }
}
