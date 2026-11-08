# 뽑ZOO → Unity 이식 키트

웹판(Vite + TypeScript + Canvas)을 Unity로 옮길 때 쓰는 **재료 묶음**입니다.
이 폴더만 넣는다고 게임이 돌아가지는 않습니다. 데이터·그림·핵심 규칙 일부가 C#으로 준비돼 있고,
나머지(필드 시뮬레이션·화면·연출)는 아래 표를 보고 옮겨야 합니다.

## 들어 있는 것

| 경로 | 내용 | 상태 |
|---|---|---|
| `Data/*.json` | 동물 300종, 등급, 직원, 우리 조각, 시설 12종, 업그레이드, 밸런스 숫자, 이벤트, 계절, 시너지, 라이벌, 도감, 미션 | 완료 (웹판과 같은 값) |
| `Data/sprites.json` | 그림 1,645장 목록: 이름(key)·파일·크기·기준점 | 완료 |
| `Scripts/Data/GameData.cs` | JSON 모델 + 불러오기 | 완료 |
| `Scripts/Core/Gacha.cs` | 뽑기: 기계 등급, 동물 90 / 직원 5 / 우리 5, 등급, 특수옵션, 계절 한정 | 완료 (웹판과 난수 순서 같음) |
| `Scripts/Core/ZooScale.cs` | 규모 확장(작은→세계 동물원), 공사비, 부지, 별 계산 | 핵심만 |
| `Scripts/Core/Cards.cs` | 카드·저장 데이터 모델 (웹판 저장 JSON과 같은 모양) | 일부 필드 |
| `Scripts/Core/SpriteDb.cs` | 그림 이름 → Sprite | 완료 |
| `Scripts/Editor/BbopZooSpriteImporter.cs` | 픽셀 아트 자동 설정 (점 필터, PPU 16, 압축 없음, 발밑 기준점) | 완료 |

그림 파일 자체는 저장소의 `assets/sprites16/` 입니다 (전달 묶음에는 함께 들어 있음).

## 설치 순서

1. Unity 2022.3 LTS 이상, 2D(URP) 프로젝트를 만든다.
2. 패키지 관리자 → *Add package by name* → `com.unity.nuget.newtonsoft-json`.
3. 복사:
   - `Data/*.json` → `Assets/StreamingAssets/Data/`
   - `assets/sprites16/` 폴더 통째로 → `Assets/Resources/sprites16/` (가져오는 순간 픽셀 설정이 자동 적용됨)
   - `Scripts/Data`, `Scripts/Core` → `Assets/Scripts/`
   - `Scripts/Editor` → `Assets/Editor/`
4. 아무 오브젝트에 `GameData.Load();` 를 부르는 시작 스크립트를 붙인다.
5. 확인: `Gacha.Draw(save, 10, () => rng.NextDouble(), 0, 0.01, "spring", 0.3)` 가 카드 10장을 돌려주면 연결 성공.

카메라는 Pixel Perfect Camera(Assets PPU 16, 기준 해상도 640×360 정도)를 권장합니다.

## 웹판 → Unity 대응표

| 웹판 파일 (줄 수) | 하는 일 | Unity에서 |
|---|---|---|
| `src/data/*.ts` | 모든 표·숫자 | `Data/*.json` (다시 뽑기: `npx vite-node tools/export-unity.ts`) |
| `src/game/rules.ts` (900) | 뽑기, 합성, 배치, 업그레이드, 시설, 확장, 1년 평가, 미션 | `Core/` 정적 클래스들. 뽑기·확장은 이식됨, 나머지는 함수 단위로 그대로 옮기면 됨 (DOM 없음, 순수 함수) |
| `src/game/state.ts` (219) | 저장 데이터 모양, 옛 저장 고치기(normalize) | `Cards.cs` 의 `SaveData` 확장 + 불러온 뒤 같은 보정 |
| `src/game/world.ts` (899) | 하루 흐름(낮/밤), 손님 생성·이동·표정, 동전, 콤보·피버, 사건, 하루 결산, 시즌 승패 | `ZooWorld : MonoBehaviour` 의 `Update(dt)`. 손님·동물·직원은 오브젝트 풀 |
| `src/render/field.ts` (759) | 필드 그리기: 타일, 우리, 울타리, 게이트(간판 이름·별), 건물 줄, 손님, 날씨 | Tilemap(바닥·울타리) + SpriteRenderer(건물·사람) + 정렬 순서 = y |
| `src/render/sprites.ts` (311) | 그림 이름 표, 애니메이션 프레임 | `SpriteDb` + `sprites.json` |
| `src/ui/panel.ts` (750) | 탭 5개: 홈(뽑기·확장·배치·미션)·동물원·카드·운영·기록 | UI Toolkit 또는 uGUI. 탭별 화면 하나씩 |
| `src/ui/reveal.ts` (243) | 뽑기 연출: 기계 조립, 크랭크, 캡슐, 컷인, 빛기둥 | Timeline 또는 DOTween 시퀀스. 기계 부품 그림은 `v2/` 아래 |
| `src/main.ts` (736) | 시작 화면, 정보 줄, 결과 창(라이벌 아치·1년 평가), 이름 짓기, 설정 | 씬 관리 + UI |
| `src/ui/audio.ts` | 효과음(코드로 합성) | AudioClip으로 녹음해서 교체 |

## 주의

- **확률은 바꾸지 말 것**: `balance.json` 의 `drawKind`, `machineTiers`, `grades.json` 의 `chance` 가 게임 표시 확률과 같다(확률 공개용).
- 실제 돈 결제는 없다. 코인·돈은 게임 안 재화뿐.
- 연출 기본값은 **전부 켜짐**. 줄이기는 설정에서만.
- 화면은 PC 가로, 폰도 가로 고정.
- `GameData.Load()` 는 `File.ReadAllText` 를 쓴다. WebGL·안드로이드 빌드면 `UnityWebRequest` 로 바꿀 것.
- C# 코드는 이 환경에 Unity가 없어 컴파일 확인을 못 했다. 처음 넣을 때 콘솔 오류를 확인할 것.
