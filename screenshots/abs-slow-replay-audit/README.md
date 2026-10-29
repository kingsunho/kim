# B — ABS·슬로 리플레이 진단 / 수정 설계만

**서비스 v5.175.3에서 6개 조건 재현 완료. 게임 소스·승인 타격·판정·저장·C1·구장 캐시는 수정하지 않았다.** 새 3D 캐릭터와 별개인 기존 Canvas 경로 조사다. 아래 결과는 Chromium 모바일 viewport이며 실제 iPhone Safari 검증은 아니다.

## 현재 코드 및 재개 상태

- Claude 기준: `a525d7ad8afaa2a55d85cbcd29f4ed6146e399da` — v5.175.3.
- Pages main: `25205ece2dbbeda02c5ee81e728a4a575f7bf744`.
- 실제 URL `https://kingsunho.github.io/kim/`의 암호화 index SHA256: `058673fa28bf4aa3cc85a36a14c02c94058e1d25eef14c9f5253fbbf75d93bf2`.
- 기존 환경의 입장 코드를 로그/보고서에 출력하지 않고 로컬 복호화해, 소스 전체가 Claude index와 동일함을 확인. 소스 SHA256: `7c4dd6010823fdb9921bf4665111ed9221f2901f55104236c3a026052f65801d`. 공개 서비스에는 쓰기/플레이/저장 작업을 하지 않음.
- 중단 전 v5.171.3 자료는 `/tmp/replay-audit/v51713-results/`에 보존하고 최종 결과로 섞지 않았다. 서비스가 v5.175.3으로 변경돼 6개 조건만 최신 소스에서 다시 캡처했다. 재개 후 원격 SHA와 실제 HTTP 파일이 그대로여서 추가 재촬영하지 않았다.
- `version-path-comparison.json`: v5.171.3→5.175.3에서 리플레이·렌더·투영·시계의 함수부터 다음 함수 선언 전까지 소스 chunk는 동일. `acpPA` 차이는 MLB 챌린지 빈도/대기 관련으로 확인했으며, 최신 버전에서도 실제 KBO 경로를 다시 검증했다.

`service-verification.json`, `preservation.json`에 근거를 기록했다. 복호화 소스/입장 코드는 공개 검수 저장소에 올리지 않는다.

## 먼저 볼 재현 자료

- [일반 타석·삼진·ABS 화면 비교](same-pitch-comparison.png)
- [손 기준점과 공 출발점 진단](release-anchor-diagnostic.png)
- [우/좌타·우/좌투 4조건](handedness-matrix.png)
- [ABS 두 장면](abs-two-stages.png)
- [일반 타석→삼진 리플레이 실제 390×844 영상](k-RR/actual-mobile.mp4)
- [일반 타석→ABS 실제 390×844 영상](abs-RR/actual-mobile.mp4)
- [좌타·좌투 실제 영상](k-LL/actual-mobile.mp4)

PNG는 실제 게임 renderer의 Canvas 또는 브라우저 원본 캡처다. 비교 보드는 기존 캡처를 HTML로 배치했으며, 파랑/빨강 표시가 있는 한 장만 명시적인 좌표 진단 오버레이다. 새 그림을 생성하거나 캐릭터를 보정하지 않았다. 일반 타석과 replay의 카메라·표시 크기 자체가 다르므로 같은 카메라의 미술 비교라고 주장하지 않는다.

## 재현 방법 및 범위

현재 서비스와 동일한 소스를 **127.0.0.1 전용 로컬 서버**로 실행했다. 새 브라우저 context의 독립 localStorage에서 KBO1군 더미 경기/고정 seed4242를 구성하고, 실제 `LiveGame`·`acpPA`·투구 계획·컨택·판정·리플레이 트리거를 사용했다. 결과/물리 함수의 반환값을 바꾸거나 리플레이 함수를 강제로 호출해 통과시키지 않았다.

K 조건은 실제 엔진에서 미리2스트라이크를 만든 뒤 가운데 조준으로 헛스윙; ABS 조건은 같은 seed 투구를 지켜봤다. 해당 공은 존 가장자리여서 실제 조건문으로 ABS가 발생했다. fixture에서 관찰용 wrapper를 설치하되 원래 함수를 호출하고 그대로 반환한다. 투타 손만 행렬 조건에 맞게 바꾼 통제 실험이며 실제 박찬호/카라스코의 투타 정보가 바뀌었다는 뜻이 아니다. 선수 원본/게임 파일에는 저장하지 않았다.

| 조건 | 일반 타석 경로 | 실제 발생 replay | 입력 후 새 타격 draw | replay 내 새 타격 draw | JS 오류 |
|---|---|---|---:|---:|---:|
| k-RR: 우타·우투 | 지원 중앙 조준 새 모션 | 헛스윙 삼진 | 20 | 0 | 0 |
| k-LR: 좌타·우투 | 기존 fallback | 헛스윙 삼진 | 0 | 0 | 0 |
| k-RL: 우타·좌투 | 지원 중앙 조준 새 모션 | 헛스윙 삼진 | 19 | 0 | 0 |
| k-LL: 좌타·좌투 | 기존 fallback | 헛스윙 삼진 | 0 | 0 | 0 |
| abs-RR: 우타·우투 | 새 준비/착지, 스윙 없음 | ABS | 해당 없음 | 0 | 0 |
| abs-LL: 좌타·좌투 | 기존 fallback, 스윙 없음 | ABS | 해당 없음 | 0 | 0 |

draw 수는 포즈 경로 확인용 관찰 횟수이고 FPS 지표가 아니다. 각 trace의 실제 일반 투구와 replay로 전달된 `type/kmh/T/u/w/bu/bw/late/hand/pid`가6/6 동일했다. 화면 뒤에서 계속 도는 일반 타석 draw와 replay의 draw를 구분해 계수했다. 원본은 조건별 `trace.json`과 PNG, 수치 요약은 `measurements.json`.

**불완전/미검증 자료:** 영상은 진단 관심 구간까지만 기록했다. K는 replay 말미/다음 타석, ABS는 두 번째 장면의 최종 판정 도장·종료까지 포함하지 않는다(두 번째 장면 k≈0.25까지 캡처). 따라서 전체 replay 종료→다음 타석→기록·저장의 E2E 통과 자료가 아니다. 이 작업은 해당 기능을 수정하지 않았고 소스 보존 검사를 했다. 실제 Safari·원래 사용자 아이폰 영상과 동일한 세이브·동일 타석의 재현은 미검증이다. 홈런 슬로는 코드만 확인했고 이번6조건의 브라우저 재현에는 넣지 않았다.

## 실제 코드 경로

아래 위치는 모두 `a525d7a/index.html` 기준이며 [원본 소스](https://github.com/kingsunho/kim-src/blob/a525d7ad8afaa2a55d85cbcd29f4ed6146e399da/index.html)에서 확인한다.

| 경로 | 진입/렌더 | 카메라·좌표 | 타격 원본 사용 여부 |
|---|---|---|---|
| 일반 실제 타석 | `acpPA` L70018 → `mvSwing` L71956 → `mvPaint` L67491 | `acpGeo` L69471 / `mvCamGeom` / `MV_CAMS` / `MV_PORT` | 우타·cam c·.acp·지원 코스만 `ApprovedBatting.paint` L67378 계열 |
| 일반 반대 카메라 | `mvPaint` → `mvPaintRev` L67641 | `C.rev`, 좌우 sg=−1, 별도 actor 배치 | 기존 global `mvSD` L63951. 새 모션 enabled 조건 불충족 |
| ABS 전체 화면 | `acpPA` → `bcAbsReplay` L61138 → `bcPlay` L60335 | W/H 비율로 별도 배치·줌, 공은 별도 rel 식 | 기존 global `mvSD`, 준비 swT=0(지켜본 공) |
| 삼진 슬로 | `pitchTail` → `bcKReplay` L61110 → `bcPlay` | 별도 rel/zone 배치, k 기반 진행 | 기존 global `mvSD`/`sdSwing` |
| 소형 ABS 판 | replay가 꺼지거나 대상이 아니면 `acpAbsShow` L70791 | `acpGeo.sg`를 사용한 존 도식 | 선수 캐릭터 없음; 공/박스 다이어그램 |
| 홈런 슬로(코드만) | `bcHrReplay` L61026 | 별도 backstop/camera와 hitK=.55 | 기존 global `mvSD`; 이번 영상 검증 범위 밖 |

**중요한 스코프 차이:** `mvSD`라는 이름이 두 군데 있지만 동일 함수가 아니다. L66023의 구현은 `ApprovedBattingFactory` L66016 안에 갇힌 내부 함수다. replay는 L63951의 global 함수를 부르므로 승인된5단계 모션이 자동으로 적용되지 않는다. 브라우저 관찰에서도 replay draw 내부의 ApprovedBatting 호출은0이었다.

## 원인 1 — 공의 출발점과 손이 분리됨(확인)

일반 경기에는 `mvPitchRelease` → `sdPitchPose`/`sdFrontPoint`를 이용한 실제 투구 손 기준 계산이 있다. 반면 K/ABS 전체 화면은 다음 독립 비율식을 쓴다.

- `rel.x = px + (left?-1:1)*ph*.12`
- `rel.y = py - ph*.78`

동시에 캐릭터는 기존 SD의 체형·관절 변환을 사용한다. 이 둘은 같은 anchor를 공유하지 않는다. 390×844 fixture에서:

- 우투 손 중심: 약(270.37,546.50) CSS px.
- 손에 쥔 공의 기준점: 약(273.27,534.80) CSS px.
- replay rel: (238.52,638.52) CSS px.
- 공 기준점↔rel 약109.38px, 손 중심↔rel 약97.37px 차이. 좌투는 좌우가 뒤집히지만 거리 차이는 같음. ABS/K 모두 재현.

이는 이미지에서 자동 검출한 거리가 아니라 **실제 renderer의 동일 포즈/체형 변환을 적용한 기준 좌표와 replay 식을 비교한 계산값**이다. `releaseSamples`에 행렬과 결과를 보존했다. 손을 떠난 공이 몸통 부근에서 출발해 보일 수 있는 구체적인 원인이다.

## 원인 2 — 실제 입력/스윙 시각을 재생하지 않음(확인)

K replay의 인수에는 `pl`과 `swing` boolean 등만 있고, 실제 swing input 시각·커서·C1 진행 시계가 없다. 대신4200ms beat에서:

- 공 출발: k=.25 →1050ms.
- 공 존 도착: k=.75 →3150ms.
- 배트 진행: `swT=clamp((k-.45)*2.2)`.
- 기존 `sdBatterContact`가 기준으로 쓰는 swT=.5는 k≈.67727 →2844.55ms.
- 따라서 **기준 스윙 단계가 공 도착보다 약305.45ms 먼저** 온다.

이것은 소스식에서 계산한 **nominal phase 차이**다. 헛스윙 장면이므로 실제 공·배트 충돌이나 물리 오류라고 주장하지 않는다. 문제는 원래 빠르게/늦게 눌렀는지와 무관한 고정 시계로 재생한다는 점이다. 공 물리나 판정 자체가305ms 틀렸다는 뜻은 아니다.

추가로 일반 수동 타격은 `ACP_SWD=.10`으로 판정 시각이 input+100ms인데, 기존 fallback의 `sdSwingClock`은 swT=.5를220ms에 둔다. 승인 새 모션은 C1으로 source1120ms를 input+100ms에 맞추지만 좌타/미지원 등 fallback은 명목상120ms 차이가 남는다. 이것도 원본 pose를 변경한 버그라고 단정하지 않고 **표시 시계의 연결 문제**로 분리한다. fallback 모든 공의 시각적 충돌을 측정한 것은 아니다.

## 원인 3 — 투수 동작은 연속 포즈가 아닌 세 상태 교체(확인)

일반 `windup`은 `pitMix.time`/`sdPitchPose`로 연속 보간한다. 전체 replay는:

- K: k<.18 cock / .18~.32 rel / 이후 follow.
- ABS: k<.12 cock / .12~.24 rel / 이후 follow.

`poseMix`나 `pitMix.time`을 넘기지 않아, `sdFront`에서 정지 포즈가 바뀌는 경로다. 몸/팔이 순간적으로 다른 자세로 바뀌는 인상을 주는 소스 원인이다. 캐릭터 자체의 미술 품질과 별개이며 새3D를 만들어도 자동 해결되지 않는다.

## 좌우·카메라 검사에서 확인한 것 / 확정하지 않은 것

- replay의 우타 배치는 화면 오른쪽, 좌타는 왼쪽, `flip=!batL`, 타자 front:true / 투수 back:true로 전달된다. 이번4조건에서 그 입력 관계는 맞았다.
- `acpPA`는 실제 타석 진입 때 cam c를 명시적으로 설정한다. 이번 p 카메라는 정상 플레이에서 별도로 선택·진행한 타석이 아니라 런타임 정적 진단이다.
- 동일 retained player/pitch로 `cam c/p`를 runtime에서 다시 그린 정적 진단에서 normalized endpoint u 부호가 sg=+1/−1와 일치했다. 다만 새 모션 c와 기존 p는 서로 다른 렌더러이므로 **같은 전신 포즈가 앞뒤에서 정확히 일치했다는 증거는 아니다**. `camera-c/p.png`는 별도 카메라의 정적 진단이며 replay를 자동 진입한 또 다른 타석이 아니다.
- ABS 두 번째 장면의 종료 좌표는 `x=cx-u*zw, y=cy-w*zh`로 투수 뒤 시점의 좌우 규칙과 일치한다. 소형판은 SG를 따로 사용한다.
- 첫 ABS 박스의 +u와 공의 −u 표기는 명칭상 다르지만 박스가 좌우 대칭이므로, 그것만으로 존 전체가 반대로 그려졌다고 단정할 수 없다.
- global renderer는 front 플래그로 배트 깊이/몸통 면을 다루지만 승인된 rear3/4 world rig와 공통 카메라 행렬을 공유하지 않는다. 몸통·팔 방향의 미적 어색함은 이번 좌우 숫자 검사만으로 해소/정상 판정하지 않는다.

즉 **모든 것을 좌우 반전 버그라고 결론 내리지 않았다.** 이번에 수치로 확인한 것은 anchor·시계·분리된 경로이며, 비율/그립/몸통 방향의 설득력은 별도 시각 검수 문제다.

## 최소 수정 계획 — 이번에는 미실행

### 1순위: 기존 replay 안에서 손 기준점 통일

K/ABS의 독립 rel 비율식을 없애고, 같은 투수 포즈·look·flip·화면 변환으로 계산한 손/쥔 공 기준점을 사용한다. `sdFrontPoint` 등 이미 있는 변환을 재사용한다. 조작/판정/투구 계획/기록 함수를 바꾸지 않는다. 우/좌투에서 시작점 차이가 실제 화면1~2px 범위인지 재검증한다. 특정 선수의 ph*.12를 또 조정하는 땜질은 피한다.

### 2순위: replay 전용 공통 사건 시계

현재 controller에 이미 있는 release/input/arrival 시각과 표시 aim을 임시 presentation context로 전달해, 공 진행·투수 pose·스윙 phase를 하나의 clock에서 샘플링한다. transient metadata이며 세이브 스키마/판정 결과를 변경하지 않는다. 헛스윙의 실제 early/late도 보존해야 한다. 원본 승인5포즈와 C1은 동결하고 C2를 도입하지 않는다. K/ABS의 pitMix.time으로 기존 연속 투구 보간을 사용할 수 있는지 좁은 시제품으로 검증한다.

fallback의100/220ms 문제는 별도 표시 어댑터 수정안으로 검수한다. 판정을220ms로 늦추거나 새 pose를 재설계해서 맞추지 않는다. 이번에 시간식을 실제 수정하지 않았다.

### 3순위: 일반·replay 캐릭터 표현 일관화

`ApprovedBatting.paint`를 replay에 단순 호출하는 것은 작동하지 않는다(.acp·cam c·우타 guard, DOM 코스 역투영·원래 카메라 의존성). 기존 world/pose를 읽는 presentation adapter와 replay 카메라 투영을 분리해야 한다. 원본 approved 포즈 파일·C1·캐시는 그대로 두고, 좌/우타 및 front/rear 가림·그립·유니폼 면을 검증한 뒤 적용을 판단한다. 더 큰 범위이므로1/2의 수치 문제 수정과 별도 승인/브랜치로 다룬다. 새3D 모델 도입은 이 계획에 포함하지 않는다.

## 다음 수정 검수 조건

- 같은 pl·입력 시각·손/시선·타구 결과를 snapshot으로 고정하고 before/after 비교.
- 6조건 전체 + 소형 ABS/홈런 replay는 후속 별도 표본.
- 릴리스 첫 공이 손 기준점에 붙는지, pose 전환이 연속인지, replay ball arrival와 지정 phase가 일치하는지 기록.
- 실제 헛스윙의 early/late·커서 미스 이유가 replay에서 보존되는지.
- 끝까지 replay→다음 타석을 재생한 영상 및 판정/기록/저장 회귀 검증. 이번 짧은 진단 영상으로 이를 통과했다고 보고하지 않음.
- 실제 iPhone Safari는 별도 미검증 표기 유지.

## 재현 도구·자료 상태

`fixture.js`는 disposable 테스트 상태와 관찰 wrapper, `capture.cjs`는6조건 실제 브라우저 캡처, `analyze.py`는 **저장된 자료만** 분석한다. `boards.cjs`도 저장 PNG만 배열한다. 테스트 스크립트는 서비스 HTML에서 import하지 않는다. 개발용 Playwright/Chromium과 기존 ffmpeg를 사용했으며 새 유료/외부 서비스를 쓰지 않았다. 임시 서버는127.0.0.1에만 바인딩했고 종료한다.

최종6조건 trace와 MP4는 보존. 처음 재개 때 서버 종료로 발생한 `ERR_EMPTY_RESPONSE`의 짧은 실패 녹화는 최종 검수 자료에서 제외했다. 성공한 캡처에서는 JS 오류0이었다. 예전 v5.171.3 결과와 실패 시도는 성공한 최신 자료인 것처럼 합치지 않았다.

`preservation.json`: 최신 Claude의 index/package 및 추적된 `visual/batting` 파일을 원본 커밋과 비교해 바이트 동일 확인. 수정 대상은 이 보고서 디렉터리뿐이다. 병합·실서비스 Pages 배포·저장 데이터 수정 없음.

A 과제는 별도 `plan/player3d-art-pipeline` 브랜치의 `gpt-review/player3d-art-pipeline/README.md`에 보존했다. 미술 제작 역량/인계 검토와 이번 기존 replay 진단을 합쳐서 모델/게임 통합 작업으로 해석하지 않는다. 공개 검수 사본에는 보고서·요약 수치·선택 영상/PNG만 제공하고, 원본 trace/fixture는 비공개 소스 저장소의 이 브랜치에 보관한다.
