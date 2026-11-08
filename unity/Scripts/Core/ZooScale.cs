// 규모 확장 · 별 등급 (src/game/rules.ts: expandCost · canPromote · promote · stageName 일부 이식)
using System;
using BbopZoo.Data;

namespace BbopZoo.Core
{
    public static class ZooScale
    {
        public static string StageName(SaveData s) => GameData.Balance.stageNames[Math.Min(s.stage, GameData.Balance.stageNames.Length) - 1];

        /// <summary>지금 부지 (가로, 세로). land = 단계-1 + (특별 확장)</summary>
        public static (int w, int h) Board(SaveData s)
        {
            var b = GameData.Pieces.board; int i = Math.Min(s.stage - 1 + (s.bigLand ? 1 : 0), b.Length - 1);
            return (b[i][0], b[i][1]);
        }

        /// <summary>다음 확장 공사비. 더 못 넓히면 -1</summary>
        public static int ExpandCost(SaveData s)
        {
            var c = GameData.Balance.expandCost;
            double cut = Olympus.BuildCut(s); // 업그레이드 + 헤파찍
            int baseCost;
            if (s.stage < GameData.Balance.maxStage) baseCost = c[s.stage - 1];
            else if (!s.bigLand && s.stars >= 3) baseCost = c[c.Length - 1];
            else return -1;
            return (int)Math.Floor(baseCost * (1 - cut) + 0.5);
        }

        /// <summary>조건: 전시 동물 수 · 총 매력도 (STAGE_REQ) + 공사비 + 밤. displayed/attract 는 필드 계산 결과를 넘긴다.</summary>
        public static bool CanPromote(SaveData s, int displayed, double attract, bool night)
        {
            int cost = ExpandCost(s); if (cost < 0 || !night || s.coins < cost) return false;
            if (s.stage >= GameData.Balance.maxStage) return true;
            var req = GameData.Balance.stageReq[s.stage - 1];
            return displayed >= req[0] && attract >= req[1];
        }

        public static void Promote(SaveData s)
        {
            s.coins -= ExpandCost(s);
            if (s.stage < GameData.Balance.maxStage) s.stage++; else s.bigLand = true;
            s.upgrades["land"] = s.stage - 1 + (s.bigLand ? 1 : 0);
            // 웹판: 일반 우리 하나 선물 · 직원 칸 다시 맞추기 (syncSlots) — 이식 때 같이 옮길 것
        }

        /// <summary>1년 평가 합계(0~100) → 별. 별은 올라가기만 한다.</summary>
        public static int StarsFor(int total, int current)
        {
            var need = GameData.Balance.starNeed; int st = 0;
            for (int i = 0; i < need.Length; i++) if (total >= need[i]) st = i + 1;
            return Math.Max(current, st);
        }
    }
}
