# 발주서: 벌꿀색 나무 UI 부품 (ui-wood16) 납품본

보낸 곳: 조립 담당(Claude)
받는 곳: 부품 제작 담당
기준 원본: `assets/spritesheets16/ui-wood/` 의 생성 원본 3장 (커밋 a93803f). 모양과 색감은 이 원본을 그대로 따릅니다. 새로 디자인하지 말고, 아래 규격으로 "정리된 부품"을 만들어 주세요.

## 1. 납품 방식

- 부품 하나 = PNG 파일 하나.
- **원래 크기(네이티브) 그대로**: 도트 1칸 = 1픽셀. 확대하지 않습니다.
- 바탕은 **투명**(알파 0). 마젠타 남기지 않기. 반투명 픽셀 없음(알파는 0 또는 255만).
- 색은 아래 색표에 있는 색만. 한 픽셀이라도 벗어나면 불합격.
- 흐림, 그라데이션, 얼룩, 테두리 번짐 없음.
- 저장 위치: `assets/sprites16/ui-wood/` (원본 시트 폴더와 따로)
- 함께 낼 것: `assets/sprites16/ui-wood/parts.json` (부품마다 파일명, 크기, 9조각/3조각 여백, 이어 붙이기 여부)

색표:
```
나무  #5d3a24 #8a5a3b #b9773f #d39a5c #e8b47a #f6d3a3
종이  #fffaf0 #f6e6c8 #e8c39e
분홍  #f08cbe #ff8fb8 #ffb7d0 #ffc8dd
노랑  #e0a526 #f7c948 #fff3a3
민트  #45b57e #7fd6a8 #c9f0d8
하늘  #7fb5d6 #a9d4ff #e9f3ff
보라  #8e6fd0 #c9b6f0 #ece4ff
코랄  #d83a3a #ff9a9a
어둠  #2b1d14 #1a1c2c   흰색 #f4f4f4
```

## 2. 부품 목록과 크기

| 파일명 | 크기(W×H) | 원본 위치 | 조건 |
|---|---|---|---|
| panel_frame.png | 48×48 | wood 1번 | 9조각. 여백 12. 네 변 가운데는 장식 없이 고르게 |
| panel_note.png | 48×48 | wood 2번 | 9조각. 여백 10 |
| slot_number.png | 48×16 | wood 3번 | 3조각(좌우). 여백 10 |
| wall_h.png | 48×48 | wood 4번 | 상하좌우 이어 붙이기. 이음매 안 보이게 |
| wall_v.png | 48×48 | wood 5번 | 상하좌우 이어 붙이기 |
| beam.png | 48×10 | wood 6번 | 좌우 이어 붙이기 |
| trim_awning.png | 48×16 | wood 7번 | 좌우 이어 붙이기 |
| trim_bunting.png | 48×16 | wood 8번 | 좌우 이어 붙이기 |
| trim_vine.png | 48×16 | wood 9번 | 좌우 이어 붙이기 |
| trim_rope.png | 48×8 | wood 10번 | 좌우 이어 붙이기 |
| btn_{pink,honey,mint,wood}_{normal,pressed,disabled}.png | 48×22 | buttons 1~3줄 | 3조각. 여백 10. 12장 모두 같은 캔버스 크기 |
| btn_square_{normal,pressed}.png | 22×22 | buttons 4줄 1~2번 | 9조각. 여백 6 |
| tab_{normal,selected}.png | 28×32 | buttons 4줄 3~4번 | 9조각. 여백 8 |
| badge_{pink,mint,sky,honey,lavender}.png | 16×16 | buttons 4줄 동그라미 | |
| badge_alert.png | 12×12 | buttons 4줄 빨간 점 | |
| gauge_frame.png | 64×10 | bits 1번 | 3조각. 여백 8 |
| gauge_fill_{pink,honey,mint,coral}.png | 16×6 | bits 2번 | 좌우 이어 붙이기 |
| gauge_cap_{pink,honey,mint,coral}.png | 6×6 | bits 2번 끝마개 | |
| rival_marker.png | 7×18 | bits 3번 | |
| bubble_toast.png | 64×22 | bits 4번 | 3조각. 여백 14. 꼬리는 왼쪽 아래 여백 안에 |
| chip.png | 40×14 | bits 5번 | 3조각. 여백 8 |
| dot_{empty,mint,pink}.png | 8×8 | bits 6번 | |
| corner_flower_{tl,tr,bl,br}.png | 12×12 | bits 7번 | 네 방향 |
| nail.png | 4×4 | bits 8번 | |
| icon_heart.png 7×6, icon_star.png 7×7, icon_paw.png 8×8, icon_sparkle.png 5×5 | | bits 9번 | |
| sign_hanging.png | 40×28 | bits 10번 | 밧줄 포함. 간판 면은 비워 둠 |

## 3. 원본에서 고칠 것

1. **네모 버튼과 탭 색**: 원본은 노란 버튼색입니다. 나무색으로 바꿔 주세요. 몸통 #e8b47a, 윗줄 #f6d3a3, 아랫입술 #b9773f, 외곽선 #5d3a24.
2. **눌림 버튼**: 원본은 색만 진해졌습니다. 같은 캔버스 안에서 그림 전체를 **2칸 아래로** 내리고, 아랫입술(3칸)을 1칸으로 줄여 주세요. 평소 버튼과 겹쳐 놓았을 때 위치 차이가 정확히 2칸이어야 합니다.
3. **꺼짐 버튼**: 4색 모두 같은 베이지여도 됩니다. 파일은 색 이름별로 4장 그대로 내 주세요.
4. **이어 붙이기 부품**: 원본은 이음매가 맞지 않습니다. 왼쪽 끝과 오른쪽 끝(벽은 위아래도)이 이어지도록 다듬어 주세요.
5. **9조각/3조각 부품**: 위 표의 여백 바깥 가운데 구간은 늘려도 모양이 깨지지 않게 단색 또는 반복 무늬로만.

## 4. 합격 기준 (받으면 제가 이대로 검사합니다)

- 파일명과 크기가 표와 정확히 일치
- 색표 밖 픽셀 0개, 반투명 픽셀 0개
- 이어 붙이기 부품을 3×3으로 깔았을 때 이음매 없음
- 9조각/3조각 부품을 2배·4배로 늘렸을 때 모서리 모양 유지
- 평소·눌림 버튼의 위치 차이가 정확히 2칸
- `parts.json` 내용과 실제 파일 일치

## 5. 하지 않을 것

- 게임 코드 수정
- 원본 시트(`assets/spritesheets16/ui-wood/`) 수정이나 삭제
- 글자, 숫자, 아이콘을 부품에 넣기
