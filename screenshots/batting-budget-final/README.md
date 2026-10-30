# 일반 타격의 마지막 제한 실험 — 미채택, 최적화 반복 종료

2026-10-30 (Asia/Seoul). 브랜치 `investigate/batting-final-budget`. 기존 조건부 승인 후보 `37573d1`을 보존했다. 최신 Claude는 `a525d7ad8afaa2a55d85cbcd29f4ed6146e399da`, 실서비스는 v5.175.3 / Pages main `25205ece2dbbeda02c5ee81e728a4a575f7bf744`이며 시작 시 원격을 다시 확인했다. 같은 최신 코드에서 기존/실험을 비교했으며 다른 Claude 변경은 덮어쓰지 않았다.

**결론: 일반 타격에 유의미하고 일관된 추가 성능 개선을 입증하지 못했다. 실험을 원복했고 이번 최적화를 종료한다.** ABS 가독성은 별도 비교안으로만 남겼으며 기본값은 기존37573d1 화면이다. 병합/Pages 배포하지 않았다.

## 1. 무엇을 측정하고 바꿨나

실제 supported 타격을 입력 전후/CONTACT/EXTENSION/FOLLOW/650ms RECOVERY/READY로 나눴다. profile.json에서 model lookup·scene 생성보다 실제 그리기/가림 처리의 비용이 컸다. 기존 구장 캐시·버퍼 재사용·불투명 리플레이 뒤 중복 그리기 제거는 그대로 유지했다.

한 차례만 팔/손 mask의 거리 계산을 실험했다. 기존 `hypot`으로 길이를 계산한 뒤 즉시 제곱하던 부분을 제곱거리로 계산했다. 기하 구조, 판정 시계, 해상도, 레이어, 가림 기준은 바꾸지 않았다. 정방향/반대편/RECOVERY393개 실제 actor 렌더가 기존과 RGBA 완전 일치했다. 이는 검사 표본의 결과이며 모든 브라우저/모든 포즈의 전수 증명은 아니다.

별도 actor-only 비용 비교는 일부 FOLLOW/RECOVERY에서 작은 감소가 있었지만 CONTACT 평균/P95는 일관되게 좋아지지 않았다. 실제 타격80회 비교에서도 RAF P95가 내려가지 않았다. 입력·프레임 초과 비율도 혼재했다.

| supported 조건 | 기존37573d1 P95 | 실험 P95 | >33.3ms 기존→실험 |
|---|---:|---:|---:|
| 모바일 첫 타격 | 33.4ms | 33.4ms | 24.7→24.2% |
| 모바일 연속 타격 | 33.4ms | 33.4ms | 17.7→19.6% |
| PC 첫 타격 | 33.4ms | 33.4ms | 27.7→28.4% |
| PC 연속 타격 | 33.4ms | 33.4ms | 26.2→25.1% |

전체 P95/P99·초과 비율·paint·입력 비용·입력→RAF, CONTACT 전후와 FOLLOW/RECOVERY의 비용 및 표본 수는 [MEASUREMENTS.md](MEASUREMENTS.md)와 bench-summary.json에 있다. bench.json에는 원시 RAF 시각과 개별 paint 비용을 보존했다.

전후 순서를 교대한5쌍, 모바일390×844 및 PC1280×720, supported/실제 외곽reach fallback, 첫/연속 타격을 분리한 총80회다. 녹화·프로파일링과 동시 실행하지 않았다. 실제 iPhone Safari가 아닌 desktop Chromium viewport이며, 입력 시간은 act() 처리와 첫 RAF까지의 측정이다. 실제 터치→화면 지연이 아니다. 입력 표본5개의 P99는 사실상 최대값이다.

fallback에서도 타이밍 변동이 있어 모든 차이를 shader 식의 효과라고 단정하지 않는다. 성능 악화가 통계적으로 확정됐다는 뜻이 아니라, 채택할 안정적인 개선 근거가 부족하다는 뜻이다.

## 2. 최종 원복과 보존

실험 전후 표의 “after/실험”은 **미채택 실험본**이다. 최종 기본 renderer에 그 식은 없다. 실험은 experiment.patch / experiment-optimize.cjs / experiment-source.json에 별도 보존했다.

원복 후 생성된 APPROVED-BATTING runtime snapshot은37573d1과 바이트 단위로 동일하다(final-integrity.json). optimize.cjs·build.cjs·승인5포즈·C1 adapter·RECOVERY·구장 캐시 파일도 동일하다. 따라서 효과가 없는데 다른 이름의 곡선/캐시/GPU/Worker 실험을 추가하지 않았다. 원복 후80회를 불필요하게 다시 측정하거나 원복본이 개선됐다고 보고하지 않는다.

## 3. ABS 가독성 비교안 — 기본 적용 안 함

카메라, 선수 위치·크기, 존 위치·크기, 공 좌표·사건 시계를 유지한다. 첫 장면에 다음만 선택적으로 추가한 `clear` 시안이다.

- 밝고 대비가 높은 존 테두리와 짧은 존 표기
- 현재 공 위치를 표시하는 링
- 기존에 계산한 과거28개 궤적 점을 연결한 대비선

공과 궤적은 기존 `pos()`가 반환한 같은 점을 사용한다. 별도의 출발점/공 좌표계를 만들지 않는다. 링은 가독성 표식이며 실제 공의 물리 반경을 바꾸지 않는다. 확대나 새로운 투구 모션도 없다.

ReplayPresentation.readability 기본값은 `baseline`이다. 로컬 검수 fixture에서만 `clear`를 켰다. 사용자의 화면 승인 전에는 기본 적용하지 않는다. actual ABS closure를 동일 k=.25/.5/.82/.95에서 비교한 프레임과 정상속도 실제 경기 영상이 있다. 이름/유니폼/배경을 이미지 생성으로 미화하지 않았다.

## 4. 최종 회귀 검사

- e2e.json: 헛스윙·파울→다음 투구, 삼진 전체 replay→새 타자, ABS 전체→같은 타자 다음 공,4흐름 통과. JavaScript 오류 없음.
- proposal-e2e.json: clear 시안의 실제 ABS 전체→다음 공 통과. 결과/타자 소유권 유지.
- geometry.json: 승인5포즈86369a5 SHA256/바이트,9코스5 supported/4 reach fallback, C1·관절/목표 투영·좌타 fallback 통과.
- scenarios.json: 실제 헛스윙·파울·안타·홈런·삼진·좌타와 기존 필드 전환 통과.
- result-flow.json: 결과 PA0→1, 안타1, 일회 소비, 저장/로드와 선수·round 유지.
- isolation.json: 최신 Claude의20개 판정/물리/기록/저장/리그/성장/기존 투수·캐릭터 함수 동일.
- 문법/초기 로드 검사 통과. 전체 시즌 장시간 진행 및 모든 선수 체형 조합의 전수 검사는 아니다.

현재 RECOVERY·삼진·ABS 정상 경로를 REGRESSION-CHECKS.md와 실행 스크립트로 고정했다. 기존6조건 좌우 타자/투수 캡처는37573d1 자료를 보존하며 이번 결과를 새로운6조건 실기기 검사로 부르지 않는다.

## 5. 남은 사항과 작업 종료

일반 supported 타격의 약33ms 프레임은 남는다. 승인 모션220ms를 입력100ms에 맞추는 C1의 시간 압축도 그대로다. 미술적으로 기계적인 투구/복귀 인상이 이번 shader 실험으로 해결됐다고 판단하지 않는다.

기계적인 투수 모션은 FOLLOWUP.md의 별도 공통 투구 애니메이션 과제로 기록했으며 이번에 새 키포즈나 원본을 만들지 않았다. 곽빈3D 연구는 계속 동결했고 주루/수비/오프닝/국가연주/초상화도 수정하지 않았다.

실제 iPhone Safari는 미검증이다. 기존37573d1 후보의 기능·화면 구도에 대한 조건부 승인을 보존하고, 일반 타격 성능과 최종 배포는 보류한다. 추가 타격 최적화 반복은 여기서 끝낸다.

## 바로 보는 검수 자료

- [ABS 기존/강조안 비교 이미지](ABS-readability-comparison.png)
- [현재 기본 ABS → 다음 공](current-ABS-through-next-pitch.mp4) / [선택 강조안 ABS → 다음 공](optional-clear-ABS-through-next-pitch.mp4)
- [현재 RECOVERY → 다음 공](current-recovery-through-next-pitch.mp4)
- [현재 삼진 → 다음 타자](current-strikeout-through-next-batter.mp4)
- [미채택 실험의 정상속도 영상](rejected-experiment-recovery.mp4) — 최종 renderer에 포함되지 않는다.
- [원시 RAF/paint 자료](bench.json) / [구간별 집계](bench-summary.json)

영상의 인코딩 FPS를 실제 RAF 성능으로 사용하지 않는다. 기본 영상은 원복 후 회귀 확인이며 새 동작을 만든 결과가 아니다. 공개 폴더에는 보고서/영상/측정 자료만 공유하고 게임 소스/fixture/비공개 데이터는 올리지 않았다.
