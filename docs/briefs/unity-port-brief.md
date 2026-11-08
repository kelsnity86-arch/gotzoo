# 뽑ZOO Unity 이식 명령서 (v1)

이 문서는 사람 개발자나 AI 코딩 에이전트가 그대로 따라 하도록 쓴 작업 지시서입니다.
계획과 배경은 `docs/bbopzoo_unity_plan_v1.pdf`, 게임 기획 전체는 `docs/bbopzoo_gdd_v0.5.pdf`를 봅니다.

---

## 0. 반드시 지킬 것

1. **웹판이 정답입니다.** `src/` (TypeScript)의 규칙과 숫자를 바꾸지 않고 C#으로 옮깁니다. 웹판과 다르게 동작하면 C#이 틀린 것입니다.
2. **숫자를 코드에 박지 않습니다.** 밸런스 값은 전부 `unity/Data/*.json`에서 읽습니다. JSON에 없는 값이 필요하면 `tools/export-unity.ts`에 추가해서 다시 내보냅니다.
3. **규칙 코드(Core · Sim)는 UnityEngine을 쓰지 않습니다.** Unity 없이 `.NET 8`로 컴파일하고 테스트할 수 있어야 합니다.
4. **함수마다 웹판 대조 테스트를 붙입니다.** 씨앗 난수(mulberry32)로 웹판과 C#을 같은 입력으로 돌려 결과가 같아야 완료입니다. 테스트 없이 "옮겼다"고 하지 않습니다.
5. **난수 순서를 지킵니다.** 웹판에서 `rng()`를 부르는 순서·횟수와 같아야 같은 결과가 나옵니다. 인자 평가 순서(왼쪽부터)도 그대로 따릅니다.
6. **JS 숫자 규칙을 맞춥니다.** `Math.round`는 `Math.Floor(x + 0.5)`, 소수는 `double`(float 금지), 정수 나눗셈 주의.
7. **연출 기본값은 전부 켜짐**입니다. 줄이기는 설정에서만 하고, OS 설정을 따르지 않습니다.
8. **실제 돈 결제는 없습니다.**
9. 저장 JSON의 필드 이름은 웹판과 같게 유지합니다 (웹판 저장 코드를 그대로 불러올 수 있어야 함).

## 1. 준비

```
git clone (gotzoo 저장소) && cd gotzoo
npm install
npx vitest run                          # 웹판 테스트 (76개 통과해야 함)
npx vite-node tools/export-unity.ts     # 데이터 JSON → unity/Data
npx vite-node tools/unity-fixtures.ts   # 웹판 기준값 → unity/Tests/fixtures.json
dotnet run --project unity/Tests        # C# 대조 테스트 (실패 0)
```

- .NET 8 SDK, Node 20+, Unity 2022.3 LTS(2D URP).
- 이미 있는 C#: `unity/Scripts/Data/GameData.cs`, `unity/Scripts/Core/{Cards,Gacha,Olympus,RivalLuck,Carry,ZooScale,SpriteDb}.cs`, `unity/Scripts/Editor/BbopZooSpriteImporter.cs`.
- 대조 테스트 방식은 `tools/unity-fixtures.ts`와 `unity/Tests/Program.cs`를 보고 똑같이 늘립니다.

## 2. 작업 순서와 완료 기준

각 단계가 끝나면 커밋하고, 대조 테스트 결과(통과 수 · 실패 0)를 커밋 메시지에 적습니다.

### P1. 나머지 규칙 → `unity/Scripts/Core/Rules/*.cs`

웹판 `src/game/rules.ts`의 함수를 아래 묶음별 파일로 옮깁니다. 함수 이름은 PascalCase로 같게 합니다 (`penDetail` → `PenDetail`).

| 파일 | 옮길 함수 (rules.ts) |
|---|---|
| `Board.cs` | upValue(SaveData.UpValue 이미 있음), boardDims, penCount, penCardAt, penPiece, penCells, capOfCells, penCap, totalCap, penOpt, boardGrid, canPlacePen, placePen, removePen, autoArrangePens, rotateCells(data/pieces.ts), penMask/isEdge(data/shapes.ts) |
| `Placement.cs` | placedSet, placedAnimals, placeAnimal, unplace, autoPlace, optimizePlacement, syncSlots, staffSlotCount, cardById |
| `Attract.cs` | penSets, penTheme, penDetail, penAttract, totalAttract, zoneTipBonus, discoverSynergies, habitatDexBonus, dexTipBonus, curSeason |
| `Fusion.cs` | fusionChance, fusionCandidates, autoFusionPick, fuse, penFusionCandidates, fusePens, freeDraw, ticketDraw |
| `Staff.cs` | staffDrawPrice, staffDraw, fireStaff, fireRefund, costUnit, staffPay, assignStaff, placedStaffCards(Olympus.PlacedStaff 이미 있음), staffSum, optSum, staffTipMul, coinLifeBonus, closingShare, visitorMul, feedBonus, eventGapMul, eventExtraSec, vipMul, staffSpeed |
| `Facility.cs` | facCount, facSum, facPrice, buyFacility, decorPrice, buyItem, canPlaceItem, placeItem, removeItem, itemAt, placedItems, penItemBonus, facLevelValue(data/facilities.ts) |
| `Economy.cs` | upgradeCost, upgradeLockedBy, buyUpgrade, dailyCosts, zooScale, stageTipMul, gateCapOf, overflowMulOf, offlineEarnings, drawPrice |
| `Progress.cs` | stageReq, expandCost, canPromote, promote, stageName, evaluateYear, starVisitorMul, dexSetDone, claimDexSet, ensureMissions, bumpMission, settleMissions, missionText, claimMission, claimMissionBonus, finishLegacy |

- `ZooScale.cs`의 기존 함수는 `Progress.cs`/`Economy.cs`로 옮기고 지웁니다.
- `SaveData`(Cards.cs)에 웹판 `state.ts`의 나머지 필드를 추가합니다: items, facLv, missions, dexClaimed, synergyFound, penTheme, lockedSpecies, debtDays, atNight, dayT, lastSeen, yearStats 등. 이름 · 기본값은 `defaultSave()`와 같게.
- **완료 기준**: `tools/unity-fixtures.ts`에 함수마다 기준값을 추가하고(여러 저장 상태: 빈 동물원 / 중반 / 후반 저장을 시뮬레이션 봇으로 만들어 JSON으로 저장), `dotnet run --project unity/Tests` 실패 0.

### P2. 필드 시뮬레이션 → `unity/Scripts/Sim/World.cs` (+ 엔티티 파일)

웹판 `src/game/world.ts`의 `World` 클래스를 옮깁니다.

- 고정 dt(웹판과 같은 값)로 `Update(dt, pointer)`를 진행합니다. 화면 좌표 대신 월드 좌표를 그대로 씁니다 (`TILE`, `PATH_Y0`, `ZONE_H`, `zoneRow`, `gateX` 같은 배치 상수도 옮김).
- 이벤트는 `List<WorldEvent>`에 쌓고, 화면 쪽이 읽고 비웁니다 (웹판 `events` 배열과 같은 종류: tip, pickup, combo, fever, rivalNews, lastStand, feed, eventStart/End, vip, synergy, incident, night(DayReport), morning…).
- 손님 · 동물 · 직원 · 동전 · 떠오르는 글자 · 감정 아이콘 엔티티 구조를 같게 유지합니다.
- `closePark`의 시즌 판정은 이미 있는 `RivalLuck.Resolve`를 쓰지 말고 웹판 `closePark` 전체(1주년 보너스 · 1년 평가 · 리포트)를 옮긴 뒤, `RivalLuck.Resolve`는 그 안에서 같은 결과가 나오는지 테스트로만 남깁니다.
- **완료 기준**:
  1. 같은 씨앗 · 같은 줍기 입력(웹판에서 줍기 좌표를 기록한 파일)으로 3일을 돌렸을 때 날마다의 `DayReport`가 웹판과 같다.
  2. `tools/sim/economy.sim.ts`(경제 봇)를 C#으로 옮겨 10판 돌렸을 때 세계 동물원 도달 시간 · 90분 보유 돈 · 운별 승률이 웹판 봇 결과 범위 안 (기획서 v0.5 12장 표).

### P3. 저장 → `unity/Scripts/Core/Save.cs`

- 웹판 `state.ts`의 `normalize`(옛 저장 고치기)와 `savecode.ts`(저장 코드 내보내기/가져오기)를 옮깁니다.
- 저장 위치: `Application.persistentDataPath/save.json` (Steam 클라우드 대상 파일 하나). 쓰기는 임시 파일 → 바꾸기.
- **완료 기준**: 웹판에서 만든 저장 코드 5개(초반 · 중반 · 후반 · 최후의 기회 중 · 신 보유)를 불러와 다시 내보낸 JSON이 웹판 normalize 결과와 같다.

### P4. 필드 화면 → `unity/Scripts/View/Field/*.cs`

웹판 `src/render/field.ts`, `src/render/sprites.ts`를 기준으로 합니다.

- 카메라: Pixel Perfect Camera (Assets PPU 16), 정수 배율. 드래그 이동 · 휠/핀치 확대 · "전체" 버튼.
- 바닥 · 길 · 우리 바닥 · 울타리: Tilemap. 웹판 `autotile` 규칙(길 이음, 울타리 꾸미기 4단계)을 그대로.
- 물체: SpriteRenderer + `sortingOrder = -y` (SortingGroup). 기준점은 `unity/Data/sprites.json`의 pivot(발밑 가운데).
- 그릴 것(웹판 순서): 잔디 → 바깥 숲 · 담장 → 관객 길 · 입구 광장 → 건물 줄(zoneRow: 시설 단계 그림, 4 · 5단계는 별) → 입구(꾸미기 단계 4종, 올림푸스 완성이면 신전 입구 · 대리석 매표소 · 월계관 깃발 · 올리브 기둥, 지붕 간판에 동물원 이름 · 별) → 생울타리 → 우리(바닥 · 소품 · 울타리) → 동물(등급 크기, 반짝이 반짝임, 신: 구름 받침 · 금빛 원 · 이름표 · 후광) → 손님(계절 옷 · 자세 · VIP) → 직원(영웅 이름표) → 동전 · 떠오르는 글자 · 감정 아이콘 → 날씨 · 계절 색 · 피버 화면 효과.
- **완료 기준**: P3의 저장 5개를 웹판과 Unity에서 같은 확대로 띄운 스크린샷을 나란히 붙여 커밋 (`reports/unity_field_compare/`). 배치 · 크기 · 겹침 순서가 같아야 함.

### P5. UI → `unity/Scripts/UI/*.cs` + `unity/UI/*.uxml/.uss` (UI Toolkit)

웹판 `src/ui/panel.ts`, `src/main.ts`, `src/ui/styles.css`, `src/ui/cardview.ts` 기준.

- 정보 줄, 오른쪽 패널(탭 5: 홈 · 동물원 · 카드 · 운영 · 기록, 하위 탭), 패널 접기 + 미션 칩, 토스트.
- 창: 하루 정산, 시즌 결과(아치 VS · 색 바꾼 라이벌 아치), 1년 평가, 하트 깨짐, 막판 대목 시작, 폐원(데려가기 고르기), 동물원 이름 짓기, 설정(연출 줄이기 · 음량 · 이름 바꾸기 · 저장 코드), 자리 비움 수익, 뽑기 결과, 확률 보기.
- 카드 모양: 프레임 그림(`v2_card_*`) · 등급 글자 · 반짝이 · 신화 테두리.
- 글꼴: Jua(제목) · Gowun Dodum(본문), OFL — `licenses/` 포함.
- 좁은 화면 규칙(정보 줄이 줄어드는 순서)도 웹판 `hud-s/xs/xxs`와 같게.
- **완료 기준**: 모든 창 · 탭을 웹판 스크린샷과 나란히 비교해 커밋 (`reports/unity_ui_compare/`).

### P6. 연출 → `unity/Scripts/View/Fx/*.cs`

웹판 `src/ui/reveal.ts`의 타이밍(ms)을 표로 옮겨 같은 순서로 재생합니다.

- 뽑기: 기계 조립(몸통 · 돔 속 캡슐 · 유리 돔 · 장식 · 손잡이 4각도 · 출구 뚜껑) → 움츠림 → 흔들림이 점점 세짐(손잡이 회전 · 캡슐 달그락) → 덜컹(직원/우리가 섞이면 기계 변신) → 캡슐이 튀어나와 통통 → 다가가 흔들 · 금 · 펑 → 등급 빛기둥 · 광선 · 조각 → 카드 뒤집기. 기계 등급(은 · 금 · 무지개) 후광 · 태그.
- 영웅 · 전설 컷인 띠, **신화 컷인**(하늘 갈라짐 · 대리석 기둥 · 초상 · 칭호 · 이름 · 각성이면 무지개로 한 번 더).
- 피버 · 하트 깨짐 · 막판 대목 · 확장 · 시즌 결과 연출.
- 설정의 "연출 줄이기"가 켜지면 웹판처럼 흔들림 폭과 시간을 줄입니다 (기본은 꺼짐 = 전부 재생).
- **완료 기준**: 웹판과 Unity 연출을 같은 길이로 녹화해 나란히 비교한 영상 또는 프레임 시트.

### P7. 소리

- 웹판 `src/ui/audio.ts`의 효과음 이름 목록(draw, reveal, rare, legend, fuseWin, fuseFail, buy, click, coin, coinCombo, event, crank, rattle, clunk 등)을 AudioClip으로 만들고 같은 이름으로 연결합니다.
- 추가: 신화 컷인 · 하트 깨짐 · 막판 대목 전용 소리, 배경음악(계절 4 + 밤).
- 음량 분리(배경음 · 효과음), 설정에 저장.

### P8. Steam

- Steamworks.NET, 업적(예: 첫 신화 · 12신 완성 · 세계 동물원 · ★5 · 최후의 기회 역전), 클라우드 저장(save.json), 해상도 · 전체화면 · 키 설정, 영어 번역(문구를 표로 분리).

## 3. 하지 말 것

- 밸런스 숫자 · 확률을 "더 좋아 보여서" 바꾸기 (바꿀 일이 있으면 웹판에서 먼저 바꾸고 시뮬레이션으로 확인한 뒤 내보냄)
- 테스트를 끄거나 건너뛰어 통과시키기
- UnityEngine을 Core/Sim에 끌어들이기
- 그림을 다시 그리거나 크기를 임의로 늘리기 (도트가 깨짐). 필요한 그림은 목록으로 보고
- 웹판 저장과 호환되지 않게 필드 이름 바꾸기

## 4. 보고 형식

단계마다 아래를 남깁니다.

1. 옮긴 함수 · 클래스 목록과 웹판 파일 위치
2. 대조 테스트 결과 (통과 수 · 실패 0)
3. 웹판과 다르게 한 곳이 있으면 이유 (원칙적으로 없어야 함)
4. 스크린샷 비교 (P4~P6)
5. 다음 단계에서 막힐 것 같은 점
