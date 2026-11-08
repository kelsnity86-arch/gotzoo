# BbopZOO 기계 부품·업그레이드 생성 원본

[이번 건물 1장 + 기계 2장 ZIP](https://raw.githubusercontent.com/kelsnity86-arch/gotzoo/main/downloads/gotzoo-buildings-new-and-machine16-sources.zip)

| 파일 | 구성 | 실제 크기 | 요청 크기 |
| --- | --- | --- | --- |
| [machine_parts16.png](parts/machine_parts16.png) | 기계 6종 × 부품 8칸 | 1448×1086 | 1536×1152 |
| [machine_tiers16.png](tiers/machine_tiers16.png) | 등급 3종 × 4칸 + 작은 소품 8칸 | 1254×1254 | 1024×1024 |

**두 파일은 생성 원본입니다. 특히 부품 시트는 정합 실패 시안이며 게임용 분리 레이어로 사용할 수 없습니다.**

부품은 봄·여름·가을·겨울·직원 채용·우리 설계도 기계 순서입니다. 몸체, 빈 유리 돔, 위/오른쪽/아래/왼쪽 크랭크, 닫힌/열린 배출구 덮개를 요청했습니다. 돔 내부는 마젠타이며 캡슐을 비웠지만, 몸체와 돔의 높이 및 크랭크 회전축이 동일 셀 좌표에 맞지 않습니다. 정렬 수정에서도 돔이 몸체 영역으로 내려와 개선되지 않아 해당 수정본은 채택하지 않았습니다. 최초 출력을 **부품 디자인 참고용**으로만 보관했습니다.

업그레이드는 은색·금색·무지개 기계를 대기/흔들림/배출/오라 순서로 배치하고, 마지막 줄에 회색·초록·파랑·보라·금·무지개 캡슐과 흰색/금색 반짝임을 놓았습니다. 오라는 가운데가 빈 띠 형태입니다. 실제 재생 및 같은 축을 기준으로 한 프레임 정합은 검증하지 않았습니다.

정확한 네이티브 격자·1픽셀 외곽선·38색 팔레트·평면 채움·균일한 마젠타 배경을 충족하지 못해 판정은 **HOLD**입니다. 목록의 행/열은 요청 칸이며 추출 좌표가 아닙니다. 기존 기계나 게임 코드는 수정하지 않았습니다.

[68칸 목록](../../catalog16_machine_animation.json) · [원문 명령서](../../../docs/briefs/machine-animation16-original-request.txt) · [명세](../../../docs/briefs/machine-animation16-spec.json) · [검사 결과](../../../reports/MACHINE_ANIMATION16_SOURCE_AUDIT.json) · [생성 기록](../../../art-source/machine-animation16/final-source-map.json)

PNG 읽기 전용 검사: `python tools/audit_machine_animation16_sources.py`
