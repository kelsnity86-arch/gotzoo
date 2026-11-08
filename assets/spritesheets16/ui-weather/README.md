# BbopZOO UI 아이콘·날씨 생성 원본 3장

**현재는 생성 원본이며 게임용 픽셀 자산 완성본이 아닙니다. `engine_ready: false`, 엄격 규격 판정 HOLD입니다.**

| 파일 | 구성 | 요청 캔버스 | 실제 PNG |
| --- | --- | --- | --- |
| [icons_ui16_a.png](icons/icons_ui16_a.png) | 8×5, UI 40개 | 1536×960 | 1586×992 |
| [icons_ui16_b.png](icons/icons_ui16_b.png) | 8×4, 추가 UI 32개 | 1536×768 | 1774×887 |
| [weather16.png](weather/weather16.png) | 6×4, 날씨·야간 24개 | 1536×1024 | 1536×1024 |

[3장 ZIP 다운로드](https://raw.githubusercontent.com/kelsnity86-arch/gotzoo/main/downloads/gotzoo-ui-weather16-sources.zip)

요청한 순서대로 96개 칸을 구성했습니다. 기존 아이콘과 생활 효과를 직접 열어 참고했고, 날씨 시트는 한 줄기 빗방울·낮고 넓게 퍼지는 두 번째 물튀김·네 방향 햇빛 반짝임으로 수정했습니다. 광원 효과에는 어두운 외곽선을 생략했습니다. 이 목록은 시각 검토 및 요청 칸의 분류이며 자동 추출 좌표가 아닙니다.

## 남은 작업

- 세 PNG 모두 지정 38색 외의 색과 마젠타 배경의 미세한 색 변화가 있습니다. 정확한 `#FF00FF` 컬러키 처리용으로 사용하면 안 됩니다.
- UI 24×24, 날씨 16×16 및 예외 크기의 네이티브 픽셀 격자와 1픽셀 갈색 외곽선을 확정하지 못했습니다.
- UI 2장 캔버스가 요청 크기와 다르며, 단순 리사이즈로 네이티브 격자 문제까지 해결되지 않습니다.
- 평면 두 톤 영역에도 중간색이 남아 있습니다. 물튀김 기준점·꽃잎 A/B/C 일관성과 실제 게임 재생은 미검증입니다.

기존 아이콘·효과·게임 코드는 변경하지 않았습니다. PNG는 이미지 생성 도구 출력 파일 그대로이며 코드로 보정하거나 잘라내지 않았습니다.

## 기록

- [96칸 목록](../../catalog16_ui_weather.json)
- [입력 명세](../../../docs/briefs/ui-weather16-spec.json)
- [검사 결과](../../../reports/UI_WEATHER16_SOURCE_AUDIT.json)
- [시각 검토](../../../reports/UI_WEATHER16_SOURCE_REVIEW.md)
- [생성 문구와 원본 대응표](../../../art-source/ui-weather16/)

읽기 전용 PNG 검사: `python tools/audit_ui_weather16_sources.py`
