# 마지막 제한 실험 측정표 — 실험본 미채택

날짜: 2026-10-30 (Asia/Seoul). 기존 후보37573d1과 거리 계산 실험을 같은 최신 Claude a525d7a / v5.175.3 코드 기반에서 비교했다. 표의 “실험”은 최종 채택본이 아니다. 실험을 원복했으므로 최종 기본 renderer는37573d1과 동일하다. 원복 후80회를 다시 반복하지 않았다.

녹화/프로파일링 없이 headless desktop Chromium에서 총80회(모바일390×844/PC1280×720 × supported/외곽reach fallback × 기존/실험 ×5쌍 ×첫/연속2회)를 측정했다. 실제 iPhone Safari가 아니다. 전후 순서는 쌍마다 교대했다.

| 화면·코스·타격 | 후보 | 회수 | RAF P95/P99 ms | >33.3ms 비율 | paint P95 ms | 입력 처리 P95/P99 ms | 입력→RAF P95 ms |
|---|---|---:|---:|---:|---:|---:|---:|
| PC / outer-fallback / continuous | 실험·미채택 | 5 | 33.3/33.4 | 4.7% | 6.3 | 6.1/6.1 | 21.0 |
| PC / outer-fallback / continuous | 기존37573d1 | 5 | 16.8/33.3 | 1.8% | 5.7 | 5.3/5.3 | 22.0 |
| PC / outer-fallback / initial | 실험·미채택 | 5 | 33.3/49.9 | 4.8% | 6.9 | 8.7/8.7 | 36.1 |
| PC / outer-fallback / initial | 기존37573d1 | 5 | 33.3/49.9 | 5.4% | 7.8 | 10.1/10.1 | 26.0 |
| PC / supported / continuous | 실험·미채택 | 5 | 33.4/50.0 | 25.1% | 16.5 | 24.6/24.6 | 75.5 |
| PC / supported / continuous | 기존37573d1 | 5 | 33.4/50.0 | 26.2% | 15.6 | 21.7/21.7 | 57.6 |
| PC / supported / initial | 실험·미채택 | 5 | 33.4/50.1 | 28.4% | 20.3 | 18.0/18.0 | 48.2 |
| PC / supported / initial | 기존37573d1 | 5 | 33.4/66.6 | 27.7% | 20.1 | 16.3/16.3 | 48.7 |
| mobile / outer-fallback / continuous | 실험·미채택 | 5 | 16.8/33.3 | 1.3% | 6.5 | 5.0/5.0 | 22.0 |
| mobile / outer-fallback / continuous | 기존37573d1 | 5 | 16.7/16.8 | 0.2% | 5.6 | 5.2/5.2 | 20.6 |
| mobile / outer-fallback / initial | 실험·미채택 | 5 | 16.8/33.4 | 2.0% | 6.4 | 7.9/7.9 | 24.3 |
| mobile / outer-fallback / initial | 기존37573d1 | 5 | 16.8/33.4 | 1.6% | 6.5 | 7.5/7.5 | 23.4 |
| mobile / supported / continuous | 실험·미채택 | 5 | 33.4/33.4 | 19.6% | 14.2 | 20.8/20.8 | 49.1 |
| mobile / supported / continuous | 기존37573d1 | 5 | 33.4/33.4 | 17.7% | 13.6 | 32.1/32.1 | 57.5 |
| mobile / supported / initial | 실험·미채택 | 5 | 33.4/66.6 | 24.2% | 18.9 | 18.8/18.8 | 43.7 |
| mobile / supported / initial | 기존37573d1 | 5 | 33.4/66.6 | 24.7% | 17.9 | 17.1/17.1 | 48.6 |

## 기존 모바일 supported의 구간별 비용

구간은 입력 후 시각이며 C1 판정100ms를 기준으로 분류했다. RAF 간격은 끝 시각, paint는 완료 시각으로 분류하므로 경계에 걸친 긴 작업이 다음 구간에 들어갈 수 있다. 이 표는 어느 관절의 오류인지 판정하는 자료가 아니다.

| 첫/연속 | 구간·입력 후 ms | RAF 표본수 | RAF P95/P99 ms | paint 표본수 | paint P95 ms |
|---|---|---:|---:|---:|---:|
| continuous | CONTACT 이전 0~70 | 11 | 33.4/33.4 | 15 | 31.4 |
| continuous | CONTACT 전후 70~140 | 14 | 33.4/33.4 | 15 | 16.4 |
| continuous | EXTENSION 140~250 | 27 | 33.4/33.4 | 27 | 13.2 |
| continuous | FOLLOW 250~730 | 121 | 33.4/33.4 | 122 | 12.1 |
| continuous | RECOVERY 730~1380 | 153 | 33.4/33.4 | 154 | 15.0 |
| continuous | READY 1380 이후 | 64 | 16.7/50.0 | 5 | 26.5 |
| initial | CONTACT 이전 0~70 | 7 | 50.0/50.0 | 12 | 18.8 |
| initial | CONTACT 전후 70~140 | 13 | 33.4/33.4 | 13 | 19.0 |
| initial | EXTENSION 140~250 | 15 | 83.3/83.3 | 13 | 24.3 |
| initial | FOLLOW 250~730 | 98 | 50.0/50.1 | 102 | 16.2 |
| initial | RECOVERY 730~1380 | 144 | 33.4/49.9 | 143 | 17.8 |
| initial | READY 1380 이후 | 67 | 16.8/33.3 | 5 | 10.8 |

PC 및 실험본의 모든 구간 수치는 bench-summary.json의 phases에 보존했다. READY 구간은 스윙 RAF가 끝나 paint 표본이 적을 수 있다. 표본이 작은 구간의 P99는 거의 최대값이며 안정적인 모집단 추정치로 읽으면 안 된다.

입력 처리 시간은 실제 controller act()의 동기 호출 시간, 입력→RAF는 그 호출 후 첫 RAF callback까지다. 실제 손가락 터치→화면 반응이나 iPhone 지연이 아니다.

## 프로파일과 실험 해석

profile.json은 기존 후보의 실제 한 스윙을 관측한 별도 프로파일이다. 준비/CONTACT 전후/FOLLOW/RECOVERY를 나눠 model lookup·scene 계산·approved pipeline·whole frame·get/putImageData를 측정했다. nested 비용은 겹치며 wrapper 비용도 포함된다. 프레임 성능 표와 혼합하지 않는다.

model lookup/create 및 scene 계산보다 pipeline의 raster/가림 처리 비중이 크다. 기존 상세 components 자료에서도 소프트웨어 깊이·readback·팔/손 mask가 큰 부분이었다. 이번에는 그 mask 안의 hypot→제곱 중복만 제거했다.

micro.json은 동일 실제 actor의 CONTACT/FOLLOW/RECOVERY를24장×4묶음씩 AB/BA 순서로 그린 별도 비용 비교다. 미세 비용 감소가 일부 있었지만 CONTACT 평균/P95는 일관되게 좋아지지 않았다. 실제80회 RAF에서도 P95 감소가 없고 입력·초과 비율도 혼재하여 채택하지 않았다.

최적화식이 사용되지 않는 fallback에서도 프레임 분포 차이가 관측됐다. 따라서 모든 전후 차이를 그 식의 영향으로 단정할 수 없다. 이 결과는 성능 악화를 통계적으로 확정한 보고서가 아니라, 채택할 유의미하고 일관된 개선 근거가 부족하다는 판단이다.

기존 구장 캐시·작업 버퍼 재사용·완전 가림 replay 중복 그리기 제거는 그대로 유지했다. 추가 최적화 반복을 종료한다.
