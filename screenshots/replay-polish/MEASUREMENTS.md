
## 최종 타격 반복 측정

| 화면·코스·타격 | 후보 | 표본 | RAF P95/P99 ms | >33.3ms 비율 | paint P95 ms | 입력 처리 P95/P99 ms | 입력→RAF P95 ms |
|---|---|---:|---:|---:|---:|---:|---:|
| PC / outer-fallback / continuous | after | 5 | 16.8 / 33.3 | 1.5% | 5.8 | 5.3 / 5.3 | 19.7 |
| PC / outer-fallback / continuous | before | 5 | 16.8 / 16.8 | 0.6% | 5.8 | 4.8 / 4.8 | 20.8 |
| PC / outer-fallback / initial | after | 5 | 16.8 / 33.4 | 2.2% | 6.7 | 9.4 / 9.4 | 25.6 |
| PC / outer-fallback / initial | before | 5 | 16.8 / 50.0 | 2.4% | 6.4 | 9.3 / 9.3 | 24.8 |
| PC / supported / continuous | after | 5 | 33.4 / 33.4 | 17.2% | 13.9 | 20.9 / 20.9 | 48.8 |
| PC / supported / continuous | before | 5 | 33.4 / 33.4 | 22.9% | 13.8 | 22.0 / 22.0 | 46.6 |
| PC / supported / initial | after | 5 | 33.4 / 66.6 | 25.4% | 17.5 | 17.9 / 17.9 | 45.0 |
| PC / supported / initial | before | 5 | 33.4 / 66.7 | 24.5% | 17.3 | 21.9 / 21.9 | 52.1 |
| mobile / outer-fallback / continuous | after | 5 | 16.8 / 16.8 | 0.2% | 5.7 | 7.0 / 7.0 | 22.2 |
| mobile / outer-fallback / continuous | before | 5 | 16.8 / 33.3 | 1.1% | 6.6 | 6.2 / 6.2 | 23.9 |
| mobile / outer-fallback / initial | after | 5 | 16.8 / 33.4 | 2.2% | 6.6 | 8.0 / 8.0 | 35.0 |
| mobile / outer-fallback / initial | before | 5 | 16.8 / 33.4 | 3.6% | 8.1 | 14.9 / 14.9 | 28.3 |
| mobile / supported / continuous | after | 5 | 33.4 / 33.4 | 14.1% | 14.9 | 16.9 / 16.9 | 43.8 |
| mobile / supported / continuous | before | 5 | 33.4 / 33.4 | 10.7% | 13.8 | 21.6 / 21.6 | 48.4 |
| mobile / supported / initial | after | 5 | 33.4 / 50.0 | 18.7% | 16.7 | 17.0 / 17.0 | 43.3 |
| mobile / supported / initial | before | 5 | 33.4 / 66.7 | 20.7% | 19.4 | 18.8 / 18.8 | 48.8 |

## 최종 삼진 리플레이 반복 측정

| 화면 | 후보 | 표본 | RAF P95/P99 ms | >33.3ms 비율 | replay draw P95 ms | 가려진 타석 paint 총 ms (5회) |
|---|---|---:|---:|---:|---:|---:|
| PC | after | 5 | 33.3 / 50.1 | 7.6% | 9.3 | 386.1 |
| PC | before | 5 | 50.0 / 66.7 | 17.6% | 9.2 | 1700.6 |
| mobile | after | 5 | 16.8 / 50.0 | 2.4% | 9.0 | 448.7 |
| mobile | before | 5 | 33.4 / 66.6 | 11.8% | 9.2 | 1962.7 |

타격 supported는 안정적 개선으로 판정하지 않는다. 모바일 연속 타격 >33.3ms 비율이 10.7→14.1%로 증가한 조건도 있다. PC 연속 타격에서는 22.9→17.2%로 감소해 효과가 일관되지 않는다. 원시 실행별 수치를 보존했다.

리플레이는 중복 paint 비용 감소로 RAF가 개선됐지만 draw 자체는 모바일 9.2→9.0ms, PC 9.2→9.3ms로 거의 같다. PC P95 약33.3ms와 모바일 P99 50.0ms가 남는다. **일반 타격/PC까지 60fps가 복구됐다고 판정하지 않는다.**

## 상세 비용 진단

components.json은 측정 wrapper를 삽입한 별도 diagnostic이며 RAF 벤치마크와 동시에 실행하지 않았다. 36개 동적 actor에서 총 actor347.3ms 중 sdBattingArms219.2ms, 깊이 triangle24.4ms, getImageData41.4ms, putImageData1.5ms였다. triangle/readback은 arms 안에 포함되므로 수치를 더하면 안 된다. 나머지 arms 비용에는 가림/픽셀 루프와 그리기가 섞여 있다. probe 자체 비용도 포함된다.

Factory 생성5회는 약0.1~0.3ms, mount 약0.7~2.8ms였다. 이는 매 프레임 actor9ms의 주된 원인이라는 근거가 아니다. profiler의 GC와 Canvas backend 비용도 관측됐다. 개별 probe 수치를 실제 장치 성능으로 일반화하지 않는다.
