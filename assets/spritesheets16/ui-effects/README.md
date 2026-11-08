# BbopZOO 가챠·카드·아이콘·효과 6장

사용자가 지정한 여섯 시트를 순서대로 이미지 생성 도구로 제작한 **생성 원본**입니다. 네이티브 픽셀 규격을 만족하는 게임용 완성본은 아닙니다. 별도 후처리 없이 최종 생성 PNG를 그대로 저장했습니다.

| 파일 | 분류·요청 배치 | 실제 크기 | 요청 크기 |
| --- | --- | --- | --- |
| [gacha16.png](gacha/gacha16.png) | 계절 기계 4+4, 캡슐 6+6 | 1536×1024 | 1536×1024 |
| [staffgacha16.png](hiring/staffgacha16.png) | 채용 소품·인장·도장 5×3 | 1536×1024 | 1536×1024 |
| [cards16.png](cards/cards16.png) | 카드 7×2, 아래 6번째는 빈칸 | 1536×1024 | 1536×1024 |
| [icons16.png](icons/icons16.png) | UI 아이콘 8×5 | 1448×1086 | 1024×768 |
| [fx16.png](effects/fx16.png) | 소형 효과 6×5 | 1374×1145 | 1536×1280 |
| [fxbig16.png](effects/fxbig16.png) | 대형 효과·계절 리본 5+3+4 | 1536×1024 | 1536×1024 |

총 131개 요청 칸 중 130개는 그림, 1개는 의도된 빈칸입니다. 카드 시트의 2행 6열은 누락이 아닙니다. [요청 순서·목표 크기·SHA-256 카탈로그](../../catalog16_ui.json)는 추출 좌표표가 아니므로 균등 분할하여 게임에 바로 넣으면 안 됩니다.

**정확한 네이티브 격자, 지정 38색, 단색 #FF00FF 배경, 1픽셀 외곽선은 HOLD입니다.** 생성된 이미지에는 중간색과 미세한 색 변화가 있습니다. 카드의 20×20 창·2픽셀 테두리와 흔들림/개봉/효과 애니메이션도 실제 게임에서 검증하지 않았습니다. 무지개 카드는 불투명 원본이며 실제 오버레이로 사용하려면 별도 마스킹이 필요합니다.

- [입력 명세](../../../docs/briefs/uifx16-spec.json)
- [기본 제작 문구](../../../art-source/uifx16/prompts/)
- [파일 검사](../../../reports/UIFX16_SOURCE_AUDIT.json)
- [직접 확인한 내용과 남은 작업](../../../reports/UIFX16_SOURCE_REVIEW.md)
- [이번 6장 ZIP](https://raw.githubusercontent.com/kelsnity86-arch/gotzoo/main/downloads/gotzoo-uifx16-sources.zip)
- [동물·환경·UI 전체 31장 ZIP](https://raw.githubusercontent.com/kelsnity86-arch/gotzoo/main/downloads/gotzoo-all31-sources.zip)
