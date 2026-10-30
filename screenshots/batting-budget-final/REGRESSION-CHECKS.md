# 고정 회귀 검사

검수 기준은 37573d1 후보다. 실서비스 배포용 테스트 서버가 아니라 localhost에 보관된 실제 소스를 브라우저로 실행한다. 데이터는 Playwright의 격리 context에만 만든다.

- `e2e.cjs`: 실제 controller 헛스윙·파울→다음 공, 삼진 전체 replay→새 타자, ABS 전체→같은 타자 다음 공. 게임 결과 함수를 교체하지 않는다.
- `verify.cjs`: 승인5포즈의86369a5 SHA256/바이트, 기존9코스5 supported/4 reach fallback, 목표 좌표·관절·C1·좌타 fallback 검사.
- `isolation.cjs`: 최신 Claude의20개 판정/물리/투수/기록/저장/리그/성장 함수 동일성 검사.
- `scenarios.cjs`: 실제 엔진 헛스윙·파울·안타·홈런·삼진·좌타와 기존 필드 전환.
- `result-flow.cjs`: 결과 일회 반영, PA/안타 수, 저장/로드·선수 ID·라운드.
- `pixels-expanded.cjs`: 실험 shader와37573d1 동일 actor 렌더393조건 RGBA 비교. 최종 채택 여부와 별개인 실험 품질 검사.
- `framing.cjs`, `proposal-video.cjs`: 동일 실제 ABS 좌표의 baseline/clear 표시 비교. proposal만 runtime에서 켜며 기본값은 baseline이다.

CPU/RAF 벤치마크와 녹화·프로파일링·위 검사를 동시에 실행하지 않는다. 기존6조건 좌우 타자/투수 캡처는37573d1의 gpt-review/replay-polish/replays에 유지한다. 동일 코드 경로의 기존 완료 자료를 새로운 실기기 검증으로 보고하지 않는다.
