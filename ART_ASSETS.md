# GOTZOO · 픽셀 동물원 스프라이트

첨부한 제작 지시문을 기준으로 분류한 **19개 시트 / 개별 스프라이트 197개**입니다. 동물 100종, 사람 12명, 타일·소품 24개, 효과 18프레임, 아이콘 16개, 카드 7개, 가챠 12프레임, UI 8개를 포함합니다.

이 문서는 동물원 프로젝트의 아트 자료를 안내합니다. 현재 게임 렌더러와의 연결 여부는 [README](README.md)를 참고하세요.

## 파일 분류

| 분류 | 시트 | 개수 |
|---|---|---:|
| [일반 동물](assets/spritesheets/animals/common/) | animals_01–03.png | 30 |
| [고급 동물](assets/spritesheets/animals/uncommon/) | animals_04–06.png | 26 |
| [희귀 동물](assets/spritesheets/animals/rare/) | animals_07–09.png | 22 |
| [영웅 동물](assets/spritesheets/animals/epic/) | animals_10–11.png | 14 |
| [전설 동물](assets/spritesheets/animals/legendary/) | animals_12.png | 8 |
| [사람](assets/spritesheets/people/people.png) | people.png | 12 |
| [타일·소품](assets/spritesheets/tiles/tiles.png) | tiles.png | 24 |
| [효과](assets/spritesheets/effects/fx.png) | fx.png | 18 |
| [아이콘](assets/spritesheets/icons/icons.png) | icons.png | 16 |
| [카드](assets/spritesheets/cards/cards.png) | cards.png | 7 |
| [가챠](assets/spritesheets/gacha/gacha.png) | gacha.png | 12 |
| [UI](assets/spritesheets/ui/ui9.png) | ui9.png | 8 |

- `assets/spritesheets/`: 요청한 파일명의 1536×1024 PNG 시트 19장. PNG 안에는 제목·번호·설명문을 넣지 않았습니다.
- `assets/sprites/`: 실제 게임에 넣을 원본 픽셀 크기의 개별 PNG. 같은 분류 아래 시트명·순번·영문 이름으로 구분합니다.
- [assets/catalog.json](assets/catalog.json): 각 PNG의 원본 크기, 확대 배율, 시트에서의 정확한 잘라내기 좌표와 색상 팔레트.
- `docs/briefs/`: 사용자 지시문 원문과 시트별 명세.
- `tools/build_sprites.py`: 픽셀 좌표와 색상으로 작성한 재현 가능한 아트 원본.
- [검수 결과](reports/ASSET_VALIDATION.json) / [제작·검수 설명](reports/ART_NOTES.md).

## 규격

동물·타일·효과·아이콘·캡슐은 **8×8**, 사람은 **8×12**, 카드는 **24×32**, 가챠 기계는 **32×32**, UI는 **16×16**입니다. 시트는 모두 **1536×1024**입니다. 팔레트 30색과 배경색 `#FF00FF`만 사용합니다. 게임에서 배경색을 컬러 키로 제거하고 텍스처 필터는 **Nearest**로 설정하세요.

기본 확대는 24배입니다. 8열 아이콘은 16배, 카드는 12배, 가챠 기계는 12배, UI는 16배로 배치했습니다. 이 예외는 지정 캔버스 안에 원래 격자 크기와 넉넉한 간격을 함께 유지하기 위한 것입니다. 가챠 시트 안에서도 캡슐은 24배입니다. 정확한 값은 카탈로그에 있습니다.

바닥 타일 10종은 8×8 전체를 채우고 외곽선을 넣지 않습니다. 카드 앞면 6종에는 **16×16 빈 창**과 빈 이름 칸이 있으며, UI의 9-slice 모서리는 **4px**입니다. 나머지 부분은 원본 픽셀로 늘리거나 반복해서 사용합니다.

## 재생성·검증

Python 3와 Pillow가 필요합니다.

```sh
python -m pip install -r requirements.txt
python tools/build_sprites.py
python tools/validate_assets.py
```

처음 이미지 생성 도구로 만든 시안은 8×8 격자와 제한 팔레트를 지키지 못해 `art-source/rejected-concepts/`에 분리했습니다. 배포용 PNG는 이 시안을 축소·보정한 것이 아니라, 정수 픽셀 좌표로 새로 작성한 별도 원본입니다.

8×8에서 종과 소품은 핵심 특징을 남긴 작은 기호로 표현됩니다. 픽셀·배치 규격 검증은 사용자 아트 승인이나 동물 식별성 평가를 대신하지 않습니다.
