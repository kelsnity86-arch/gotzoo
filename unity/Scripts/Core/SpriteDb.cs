// 게임 안 그림 이름(key) → Sprite. 웹판 src/render/sprites.ts 의 byName 과 같은 이름을 쓴다 (예: "a16/rabbit", "v2/v2_gate").
// 그림은 Assets/Resources/sprites16/ 아래에 그대로 복사 (Resources.Load 경로 = "sprites16/" + key).
using System.Collections.Generic;
using UnityEngine;

namespace BbopZoo.Core
{
    public static class SpriteDb
    {
        static readonly Dictionary<string, Sprite> cache = new Dictionary<string, Sprite>();
        public static Sprite Get(string key)
        {
            if (cache.TryGetValue(key, out var sp)) return sp;
            sp = Resources.Load<Sprite>("sprites16/" + key);
            if (sp == null) Debug.LogWarning("그림 없음: " + key);
            cache[key] = sp;
            return sp;
        }
    }
}
