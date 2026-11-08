# BbopZOO 동물 300종 — 이미지 생성 원본

사용자가 제공한 `animals16_01.png`부터 `animals16_12.png`까지의 동물 목록을 기준으로 제작한 시트 12장입니다. 한 장에 5×5 배열로 25종을 넣었습니다. 파일 이름과 목록 순서를 유지했습니다.

**현재 파일은 이미지 생성 도구의 원본입니다. 정확한 16×16 픽셀 자산 완성본으로 판정하지 않았습니다.** 실제 PNG 크기는 모두 1254×1254이며, 요청한 1024×1024와 다릅니다. 지정 38색 밖의 색과 마젠타 배경의 미세한 색 변화가 있습니다. 게임용 16×16 격자와 제한 팔레트로 맞추는 작업이 남아 있습니다. 생성 원본을 코드로 축소하거나 보정하지 않았습니다.

| 시트 | 분류 | 목록 |
| --- | --- | --- |
| [animals16_01.png](animals/permanent/animals16_01.png) | 상시 | 토끼부터 라쿤까지 25종 |
| [animals16_02.png](animals/permanent/animals16_02.png) | 상시 | 금붕어부터 멧돼지까지 25종 |
| [animals16_03.png](animals/permanent/animals16_03.png) | 상시 | 소부터 산양까지 25종 |
| [animals16_04.png](animals/permanent/animals16_04.png) | 상시 | 마멋부터 얼룩말까지 25종 |
| [animals16_05.png](animals/permanent/animals16_05.png) | 상시 | 낙타부터 웜뱃까지 25종 |
| [animals16_06.png](animals/permanent/animals16_06.png) | 상시 | 왈라비부터 기린까지 25종 |
| [animals16_07.png](animals/permanent/animals16_07.png) | 상시 | 코끼리부터 매너티까지 25종 |
| [animals16_08.png](animals/permanent/animals16_08.png) | 상시 | 듀공부터 오릭스까지 25종 |
| [animals16_09.png](animals/permanent/animals16_09.png) | 상시·영웅 | 백호부터 도도새까지 25종 |
| [animals16_10.png](animals/permanent/animals16_10.png) | 상시·영웅/전설 | 매머드부터 이무기까지 25종 |
| [animals16_11.png](animals/seasonal/animals16_11.png) | 봄·여름 한정 | 봄 13종 + 여름 12종 |
| [animals16_12.png](animals/seasonal/animals16_12.png) | 가을·겨울 한정 | 가을 13종 + 겨울 12종 |

정확한 영문 이름·등급·계절·시트의 행/열은 [catalog16.json](../catalog16.json)에 있습니다. 계절 혼합 시트의 순서도 사용자 목록 그대로입니다. 시트당 모든 캐릭터와 전체 5×5 배치, 텍스트와 격자선 유무를 직접 확인했습니다. 일부 캐릭터에는 정면에 가까운 표현이 있어 모든 포즈가 왼쪽 3/4를 엄밀히 충족한다고 보증하지 않습니다.

## 함께 제공하는 자료

- [입력 명세](../../docs/briefs/animals16-spec.json): 300종 순서와 38색 팔레트, 목표 크기.
- [기본 제작 문구](../../art-source/animals16/prompts/): 각 시트의 스타일과 동물 목록.
- [파일 검사 결과](../../reports/ANIMALS16_SOURCE_AUDIT.json): 실제 크기, 색상 수, 원본 상태.
- `tools/audit_animals16_sources.py`: PNG를 변경하지 않고 검사 결과와 순서표를 만드는 도구.

이번 묶음은 사용자가 이번 메시지에서 지정한 **동물 12장**입니다. 전체 명령서의 다른 19장(관람객·직원·타일·시설·UI 등)은 이 ZIP에 포함되지 않습니다. 기존 8×8 자료와 현재 게임 렌더러는 그대로 보존했습니다.

이미지 생성 원본을 개별 동물로 나누기 전에는 시트 전체를 16×16로 축소하면 안 됩니다. 동물별 경계를 확인하고 네이티브 격자와 팔레트를 맞춘 뒤 사용해야 합니다.
