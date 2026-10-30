# 곽빈 Canvas 투구 시제품 성능

20 actual seeded pitches with early whiff for deterministic continuation. 5 trials per desktop/mobile viewport variant, AB/BA order. No video/profiling. Not iPhone Safari.

같은 게임 v5.175.3 / 승인 후보70315a7 기반, 같은 곽빈/타자/구종/코스와 조기헛스윙을 반복했다. 원본과 시제품은 같은 브라우저 메모리 어댑터에서 enabled만 다르게 하며, 판정/물리/비행시간은 그대로다.

desktop Chromium의390×844 및1280×720 viewport, 조건당5회 AB/BA 순서, 총20회. 녹화·프로파일링과 동시 실행하지 않았다. 실제 iPhone Safari가 아니다. 입력은 act() 동기 처리와 첫 RAF까지이며 실제 터치→화면 지연이 아니다. 입력5표본 P99는 거의 최대값이다.

| 화면 | 표현 | 회수 | RAF P95/P99 ms | >33.3ms | 전체 paint P95 ms | 투수 P95 ms | 입력 P95/P99 ms | 입력→RAF P95 ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| mobile | before | 5 | 33.4/50.0 | 19.8% | 17.7 | 1.5 | 12.0/12.0 | 32.9 |
| mobile | prototype | 5 | 33.4/50.0 | 16.4% | 17.6 | 1.9 | 11.3/11.3 | 31.2 |
| PC | before | 5 | 33.4/50.1 | 20.4% | 18.8 | 1.5 | 13.3/13.3 | 36.1 |
| PC | prototype | 5 | 33.4/50.1 | 22.2% | 20.5 | 2.0 | 14.5/14.5 | 36.3 |

모든 조건에서 기존 approved 타격 supported 경로를 확인했다. raw에는 투구 전반과 타격 구간의 별도 RAF, 실제 투수 pose·draw 비용·릴리스 clock·pitch T를 남겼다.

전체 P95가 같다고 추가 비용이 없다는 뜻은 아니다. 투수 actor P95는 증가했고 초과 프레임 비율도 함께 봐야 한다. 기존 약33ms 부담을 해결한 결과가 아니며 성능 최종 승인/60fps/실기기 호환을 주장하지 않는다.

원본 face·유니폼·Canvas path와 가벼운 월드 골격/IK/부분 painter sort를 사용한다. 승인 타격 renderer의 소프트웨어 깊이 래스터·Canvas readback을 복제하지 않았다. actor 비용에는 pose 계산을 포함한다.

고정된 조기헛스윙 fixture이므로 정상 타이밍의 안타/홈런/모든 구종·코스를 전수 측정한 것이 아니다. 현재20회는 최종 rig 기준이다. 폐기된 초기 pilot은 최종 자료에 섞지 않았다.
