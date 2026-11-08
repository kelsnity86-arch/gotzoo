// sprites16 폴더 PNG 를 픽셀 아트 설정으로 자동 가져오기: 점 필터 · 압축 없음 · PPU 16 · 발밑 가운데 기준점
// 위치: Assets/Editor/ (Editor 폴더 안이어야 한다)
using UnityEditor;
using UnityEngine;

public class BbopZooSpriteImporter : AssetPostprocessor
{
    void OnPreprocessTexture()
    {
        if (!assetPath.Replace('\\', '/').Contains("/sprites16/")) return;
        var ti = (TextureImporter)assetImporter;
        ti.textureType = TextureImporterType.Sprite;
        ti.spriteImportMode = SpriteImportMode.Single;
        ti.spritePixelsPerUnit = 16;
        ti.filterMode = FilterMode.Point;
        ti.textureCompression = TextureImporterCompression.Uncompressed;
        ti.mipmapEnabled = false;
        ti.alphaIsTransparency = true;
        ti.wrapMode = TextureWrapMode.Clamp;
        var st = new TextureImporterSettings();
        ti.ReadTextureSettings(st);
        st.spriteAlignment = (int)SpriteAlignment.BottomCenter;
        st.spriteMeshType = SpriteMeshType.FullRect;
        ti.SetTextureSettings(st);
    }
}
