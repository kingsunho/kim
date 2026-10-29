# 타격 복귀·ABS/삼진 리플레이 수정 후보 — 미배포

2026-10-29. 브랜치 `fix/batting-recovery-replay`. 현재 실서비스 v5.175.3, Pages main `25205ece2dbbeda02c5ee81e728a4a575f7bf744`, 최신 claude/next `a525d7ad8afaa2a55d85cbcd29f4ed6146e399da`. 작업 종료 직전 원격 ref를 다시 조회했으며 두 ref 모두 동일했다. 게임 버전은 올리지 않았고 병합·Pages 배포도 하지 않았다. 곽빈 3D 연구는 변경하지 않았다.

## 1. FINISH → READY 순간이동

실제 동일 타자 헛스윙 후 다음 투구에서 재현했다. 원인은 승인 시계가 1750에서 멈추고 mvSwing RAF가 종료된 뒤 FINISH 상태를 계속 보존하다가 다음 prepare에서 새 READY 시계를 만드는 것이었다. 마지막 표시 프레임에서 다음 준비 프레임으로 그립 30.1886 SD, 어깨 2.899rad가 불연속적으로 바뀌었다.

별도 RECOVERY 계층으로 FINISH 이후 650ms 동안 몸통·골반을 되돌리고 발을 회복하며 그립과 관절 길이를 유지한다. 원본 공격 모션을 역재생하거나 alpha로 포즈를 교체하지 않는다. 다음 준비가 빨리 시작되면 남은 회복을 최대 240ms 이내로 연결하되 입력·판정·릴리스 시각은 미루지 않는다. 새 타자 ID로 표현 상태 소유권을 구분한다. moundView의 필드 복사에서 batId가 누락되던 점도 수정했다.

최종 실측 다음 prepare 전후 그립·어깨 변화는 0이다(`reset-comparison.json`). FINISH/READY 끝점은 원본과 동일하고 101개 중간 자세의 팔다리·배트 길이 오차는 3e-14 SD 미만이다. 빠른 다음 준비와 새 타자 초기화도 별도 검사했다. 공을 지켜본 경우 기존에 유지되던 PLANT도 별도 PLANT→READY 회복을 한다. 숫자 검사는 미술 승인과 구분한다.

1차 복귀 체크포인트는 `d4e7a2e`; 이후 리플레이와 실제 타자 교체 경로를 순서대로 수정했다. RECOVERY-CHECKPOINT.md의 당시 미완료 항목은 이 최종 보고서와 최종 검사 자료로 갱신된다.

## 2. 리플레이 수정 범위

- 공 출발점: 독립 rel 비율 상수를 제거하고 실제 sdPitchPose와 sdFrontPoint의 손에 쥔 공 기준점을 재사용한다. 실제 기존 renderer가 그리는 공과 비교한 18개 크기/우좌투/폼 조합의 최대 차이는 0.001131 CSS px였다. 이 값은 릴리스 직전 0.001ms와 릴리스 순간 사이의 움직임을 포함한다(`anchor-clock.json`). 전체 체형 조합을 전수 검증한 것은 아니다.
- 공통 사건 시계: 실제 릴리스, 투구 비행 시간, 실제 입력 시각, 기존 C1의 from/startRate/contactDelay를 transient replay context로 전달한다. 느리게 재생해도 입력과 공 도착의 상대 순서를 보존한다. 이전 305ms는 고정 replay phase 간 명목 차이였으며 충돌 오류 실측값이 아니었다.
- 실제 빠른 입력/늦은 입력 두 타석도 캡처했다(`replay-summary.json`). 새 시계는 두 타석을 동일 시각 스윙으로 덮어쓰지 않는다. 수학적 event contract와 실제 경기 캡처는 분리되어 있다.
- 투수: cock/release/follow 고정 자세 교체 대신 기존 연속 sdPitchPose 시계와 phase별 가림 순서를 사용한다. 투구 원본/물리는 그대로다.
- 우타 지원 코스: 원본 ApprovedBattingFactory의 같은 골격·표면 renderer를 DOM 독립 replay adapter로 그린다. 카메라 반대편 투영과 깊이 스케일을 adapter에서 계산한다. 앞뒤 UV를 강제 교체하거나 등번호를 숨기지 않는다. 실제 approvedFrames 호출은 trace의 replayAdapter에 기록했다.
- 좌타/미지원 코스: 검증된 기존 표현을 유지한다. 다만 legacy 표현 시계를 기존 100ms 판정 사건에 맞추는 표시 계층을 추가했다. 기본 220ms 표시와 수동 100ms 표시 모두 contact source를 맞추며 원본 C1·입력·판정은 변경하지 않는다. 좌타에도 새 승인 모션이 적용됐다고 주장하지 않는다.
- ABS 판정 결과는 바꾸지 않았다. 홈런 슬로 리플레이 자체는 이번 개편 대상이 아니다.

캡처의 legacyAnchorComparator는 옛 고정 rel 포즈를 기준으로 하는 참고 진단이다. 새 연속 포즈의 실제 오차 자료로 사용하면 안 된다. primary 검사는 실제 held-ball draw를 관측하는 anchor-clock.json이다.

## 3. 실제 경기 검증

- 우타/좌타 × 우투/좌투 삼진 4개, 우우/좌좌 ABS 2개: 최신 코드 브라우저 캡처 6조건, JavaScript 오류 없음.
- 헛스윙→다음 공, 파울→다음 공, 삼진 전체 리플레이→다음 타자, taken ABS 전체→같은 타자 다음 공: 4개 E2E 통과. e2e-media의 complete-mobile.mp4는 overlay 시작까지만이 아니라 다음 경기 화면까지 담았다.
- 엔진 기반 헛스윙/파울/안타/홈런/삼진/좌타 결과 검사 통과. 안타/홈런 기존 수비·주루 전환 유지.
- 1타석 결과 일회 반영: PA 0→1, 안타 1, 결과 중복 적용 없음. 저장/불러오기 후 player/round 유지.
- 3×3 코스: 기존 5 supported / 4 reach fallback 유지. 좌타 fallback 유지. 이는 코스 지원 지오메트리 검사이며 모든 코스를 모든 수비 결과와 조합한 E2E 전수 검사라는 뜻은 아니다.
- 승인 5포즈는 86369a5와 SHA256/바이트 동일. structure.js·원본 renderer 동일. C1 sample/속도 연결 검사 통과. 판정·공 물리·기록·저장·리그·성장 등 20개 주요 함수는 최신 Claude와 동일(`regression/isolation.json`). 구장 캐시 설정을 변경하지 않았다.
- 문법/정적 검사와 기존 smoke 검사 통과. 전체 시즌 장시간 진행·모든 선수 체형 전수 검사는 수행하지 않았다.

## 4. 성능 — 합격으로 보고하지 않음

동일 headless Chromium, 390×844 viewport, 영상 기록 없이 실제 RAF를 수집했다. 실제 iPhone Safari가 아니다. supported/fallback 각각 before/after 2회로 표본이 작다.

| 조건 | 기존 RAF P95 | 후보 RAF P95 |
| --- | --- | --- |
| supported 실행 1 | 33.4ms | 49.9ms |
| supported 실행 2 | 33.4ms | 33.4ms |
| 좌타 legacy fallback | 약 16.8ms | 약 16.8ms |

supported paint P95는 기존 20.7/22.3ms, 후보 24.4/21.2ms였다. 후보에는 FINISH에서 정지하던 기존 버전보다 650ms의 실제 회복 렌더링이 추가된다. 환경 변동과 더해 후보의 49.9ms 지연을 숨겨서는 안 된다. 모든 외곽 fallback의 성능을 측정한 결과가 아니라 좌타 fallback 대표 측정이다.

별도 전체 삼진 replay 1회 비교: RAF P95 33.3→33.4ms, P99 66.6→50.1ms, 최대 66.8→83.4ms. replay draw P95는 2.0→9.8ms로 증가했다. 같은 approved 표면 renderer가 재생되므로 비용 증가가 있으며, 평균 FPS나 짧은 영상만으로 60fps 복구를 주장할 수 없다. 원시 자료는 perf.json/replay-perf.json에 보존했다.

따라서 이 후보는 연결 오류의 기능 검수용이며 성능·미술 최종 합격이나 배포 준비 완료가 아니다. 불필요한 추가 GPU/Worker 개발은 하지 않았다.

## 5. 남은 제한 / 다음 판단

1. 사용자가 실제 정상속도 영상으로 RECOVERY와 반대편 replay의 몸 방향·그립·유니폼·시점 가독성을 승인해야 한다. 위치 연속성이 곧 자연스러운 동작을 보증하지 않는다.
2. supported/새 replay의 프레임 지연과 렌더 비용은 남는다. 서비스 배포 전 성능 검수 필요.
3. 실제 iPhone Safari 미검증. 390×844는 desktop Chromium viewport이다.
4. 좌타와 외곽 fallback의 구형 미술 표현, 홈런 replay 자체, 기존 모바일 여백은 남는다.
5. 승인 모션 220ms를 100ms 입력창으로 맞추는 C1 시간 압축은 이번에 재설계하지 않았다. C2 미채택 유지.
6. 입력/판정 시각·공 물리·저장 스키마를 바꾸지 않았다. 새 3D 모델·국가연주·오프닝·주루/수비 엔진은 수정하지 않았다.

이번 후보를 claude/next 또는 Pages에 병합·배포하지 않는다. 검수 영상 공개와 실서비스 배포는 별개다.
