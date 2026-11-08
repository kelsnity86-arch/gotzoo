# BbopZOO WORLD 아트 — 생성 원본 11장

새 WORLD 명령서에 따라 갈색 외곽선 `#2b1d14`, 좌상단 조명, 우하단의 단단한 그림자와 차분한 바닥을 목표로 제작했습니다. 관람객 행동은 정면, 직원 행동은 왼쪽 방향입니다. 기존 시트와 다른 경로에 저장한 **이미지 생성 원본**이며 네이티브 픽셀 자산 완성본은 아닙니다.

| 순서 | 파일 | 요청 배치·칸 수 | 실제 크기 | 요청 크기 |
| --- | --- | --- | --- | --- |
| 1 | [ground16.png](ground/ground16.png) | 계절별 잔디 4×4, 16칸 | 1254×1254 | 1024×1024 |
| 2 | [path16.png](paths/path16.png) | 일반/겨울 사각·도넛 패치 2×2, 4칸 | 1254×1254 | 1024×1024 |
| 3 | [penfloor16.png](floors/penfloor16.png) | 서식지 바닥 4×6, 24칸 | 1024×1536 | 1024×1536 |
| 4 | [fences16_a.png](fences/fences16_a.png) | 목재/돌 사각·십자 울타리 2×2, 4칸 | 1254×1254 | 1024×1024 |
| 5 | [fences16_b.png](fences/fences16_b.png) | 철/금 사각·십자 울타리 2×2, 4칸 | 1254×1254 | 1024×1024 |
| 6 | [penprops16.png](enclosure-props/penprops16.png) | 서식지 행동 소품 6×6, 36칸 | 1254×1254 | 1536×1536 |
| 7 | [parkprops16.png](park-props/parkprops16.png) | 공원 소품 6×3, 18칸 | 1536×1024 | 1536×1152 |
| 8 | [buildings16.png](buildings/buildings16.png) | 시설 6종×3단계, 18칸 | 1536×1024 | 1536×1152 |
| 9 | [visitors_act16.png](visitor-actions/visitors_act16.png) | 관람객 4종×8행동, 32칸 | 1536×1024 | 1536×1024 |
| 10 | [staff_act16.png](staff-actions/staff_act16.png) | 직원 10종×2프레임, 20칸 | 1122×1402 | 1024×1280 |
| 11 | [fx_life16.png](effects/fx_life16.png) | 생활 효과 6×4, 24칸 | 1448×1086 | 1024×768 |

합계 200개 요청 칸에는 패치·소품·행동 프레임이 포함됩니다. 길·울타리 패치는 개별 16×16 타일로 추출하지 않았습니다. 카탈로그는 요청 순서표이며 실제 추출 좌표가 아닙니다.

- [이번 WORLD 11장 ZIP](https://raw.githubusercontent.com/kelsnity86-arch/gotzoo/main/downloads/gotzoo-world-life16-sources.zip)
- [요청 순서·목표 네이티브 크기·SHA-256](../../catalog16_world_life.json)
- [사용자가 제공한 원문](../../../docs/briefs/world-life16-original-request.txt) · [구조화된 명세](../../../docs/briefs/world-life16-spec.json)
- [제작 문구](../../../art-source/world-life16/prompts/)
- [파일 검사](../../../reports/WORLD_LIFE16_SOURCE_AUDIT.json) · [시각 검수·미완료 사항](../../../reports/WORLD_LIFE16_SOURCE_REVIEW.md)

**픽셀·런타임 판정은 HOLD입니다.** 9장의 캔버스가 요청 크기와 다릅니다. 네이티브 격자·38색·균일한 마젠타·정확한 1픽셀 갈색 외곽선은 충족하지 않으며, 타일 이음매·패치 분할·프레임 재생·전체 장면의 픽셀 크기 통일은 미검증입니다. 원본 PNG를 임의 축소/색상 보정하지 않았습니다. 각 칸을 재구성하고 검수한 뒤 게임에 사용해야 합니다.
