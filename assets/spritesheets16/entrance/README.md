# BbopZOO 입구 게이트 — 생성 원본 3장

기존 WORLD 건물과 울타리를 직접 확인한 뒤 갈색 외곽선·좌상단 조명·따뜻한 재질을 기준으로 제작했습니다. 기존 자산과 다른 경로에 보존한 이미지 생성 원본입니다.

| 파일 | 요청 배치 | 실제 크기 | 요청 크기 |
| --- | --- | --- | --- |
| [gate16.png](gates/gate16.png) | 2×2, 입구 4단계 | 1254×1254 | 1536×1536 |
| [gate_parts16.png](parts/gate_parts16.png) | 5×4, 부속품 20칸 | 1373×1145 | 1536×1280 |
| [gate_season16.png](seasonal/gate_season16.png) | 4×2, 계절 장식 8칸 | 1774×887 | 1536×768 |

계절 시트의 아래 4칸은 각각 기둥 양쪽에 놓는 장식 한 쌍입니다. 총 요청 칸 수는 32이며 개별 구성물 수와 구분합니다.

- [이번 3장 ZIP](https://raw.githubusercontent.com/kelsnity86-arch/gotzoo/main/downloads/gotzoo-gate16-sources.zip)
- [순서·목표 크기·SHA-256 카탈로그](../../catalog16_gate.json)
- [명령서 원문](../../../docs/briefs/gate16-original-request.txt) · [구조화 명세](../../../docs/briefs/gate16-spec.json)
- [제작 문구](../../../art-source/gate16/prompts/)
- [파일 검사](../../../reports/GATE16_SOURCE_AUDIT.json) · [시각 검수와 미완료 사항](../../../reports/GATE16_SOURCE_REVIEW.md)

**픽셀·런타임 판정은 HOLD입니다.** 세 장 모두 요청 캔버스와 다릅니다. 네이티브 격자·38색·균일한 마젠타·1픽셀 갈색 외곽선은 미충족이며, 단계별 통로 폭·교체 피벗·벽 이음매·계절 장식 합성은 검증하지 않았습니다. 생성 PNG를 임의로 축소하거나 색상 보정하지 않았습니다.
