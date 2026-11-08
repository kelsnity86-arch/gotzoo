# BbopZOO 확대 건물 — buildings_big16.png

[PNG 원본](buildings_big16.png) · [이 시트 ZIP](https://raw.githubusercontent.com/kelsnity86-arch/gotzoo/main/downloads/gotzoo-buildings-big16-source.zip)

6열×3행, 총 18칸입니다. 열 순서는 매점·화장실·곰 포토존·분수 광장·퍼골라 쉼터·동물 진료소입니다. 행은 소형·중형·대형입니다. 기존 `world-life/buildings/buildings16.png`를 직접 참조해 빨강/크림 차양, 초록 지붕, 곰 판넬, 석재 분수, 목재 퍼골라, 초록 십자 진료소의 특징을 유지했습니다.

첫 출력의 가로 비율과 작은 구조를 수정해 정사각형 배치, 측벽·창문·기단, 넓어진 퍼골라 입구를 표현했습니다. 기존 원본은 유지하고 새 경로에 저장했습니다.

**생성 원본이며 게임용 픽셀 완성본 판정은 HOLD입니다.**

- 실제 PNG는 **1254×1254**입니다. 요청한 1536×1536과 다릅니다.
- 48×48 / 64×64 / 80×80 네이티브 격자, 동일 픽셀 크기, 1픽셀 외곽선은 미확정입니다.
- 지정 팔레트 외의 중간색이 있으며, 마젠타 배경도 정확한 단색이 아닙니다. 평면 두 톤 규칙을 충족했다고 판정하지 않았습니다.
- 26픽셀 관람객과의 실제 게임 크기 비교 및 행별 정확한 문 높이는 미검증입니다. 대형 행의 가로 간격은 좁아 추출 전 개별 실루엣 경계를 확인해야 합니다.
- PNG는 생성 도구 최종 출력 그대로이며 코드로 축소·재색칠·분할하지 않았습니다.

[18칸 목록](../../catalog16_buildings_big.json) · [입력 명세](../../../docs/briefs/buildings-big16-spec.json) · [검사 결과](../../../reports/BUILDINGS_BIG16_SOURCE_AUDIT.json) · [시각 검토](../../../reports/BUILDINGS_BIG16_SOURCE_REVIEW.md)

읽기 전용 이미지 검사: `python tools/audit_buildings_big16_source.py`
