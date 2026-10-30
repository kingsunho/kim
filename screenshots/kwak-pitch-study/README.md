# 곽빈(47) Canvas 전신 투구 — 분석 및 검수용 시제품

2026-10-30 (Asia/Seoul). 별도 브랜치 `prototype/kwak-canvas-pitch`. 기준70315a7, 기존 조건부 승인37573d1/타격 후보 보존. 작업 시작·종료 시 최신 Claude `a525d7ad8afaa2a55d85cbcd29f4ed6146e399da`, 실제 서비스 v5.175.3 / Pages main `25205ece2dbbeda02c5ee81e728a4a575f7bf744`를 조회했다.

**이번 결과는 기존 투구 분석과 곽빈 한 명의 실행 가능한 Canvas 시제품까지다. 외형/동작 최종 승인, 실제 게임 통합, 리플레이 전면 교체, 배포가 아니다.** index.html·승인 타격·C1·RECOVERY·구장 캐시·ABS/삼진·판정/물리/기록/저장은 변경하지 않았다. 새 파일은 visual/kwak-pitch-study 및 gpt-review/kwak-pitch-study에만 있다.

## 1. 기존 구현에서 확인한 것

현재 투구는 이미 `sdPitchPose`/`sdMotionValue` 연속 보간을 사용한다. 단순히 세 정지 포즈를 교체하는 구버전이라고 설명하면 부정확하다.

| 구간/구조 | 현재 코드에서 확인한 상태 | 시제품의 접근 |
|---|---|---|
| 준비/세트 | SD_FRONT의2D 화면 점, idle 호흡,130~170+extra 구간 | 같은 게임 얼굴/유니폼, 오른발로 모이는 골반 이동 |
| 다리 들기/지지발 | hip/L/R/fL/fR를 별도로 보간, 일부 발을 구간별 고정 | 좌우 다리 ID 및3D hips→knees→ankles→heel/toe |
| 스트라이드/착지 | 258+extra의 cock 및 fR 고정 조건 | 왼발이 +Y 포수 방향으로 이동,245+extra부터 접지 |
| 골반/흉곽 | lean과2D 몸통 변환, 독립적인 yaw 축 없음 | 골반/흉곽 yaw 분리, 골반 선행→어깨 추종 |
| 어깨/팔 | 몸통의 화면 어깨 기준과 thr/glv 점을 연결 | 어깨 부모축에 팔꿈치/손목2-bone IK, 고정 관절 길이 |
| 릴리스 | windup callback300+extra, sdFrontPoint helper 존재 | 같은 예정 시각 유지, 실제 표시된 릴리스 pose를 source로 공유 |
| 팔로스루/회복 | follow/idle 좌표로980+extra까지 복귀 | 전방 기울기·몸통 회전·오른발 피벗/이동·양발 회복을 연결 |
| 카메라 | front/back의 flip/back 표현,3D 측면 골격 없음 | 같은 월드 pose를 정면/측면/후면/타격 카메라로 투영 |

기존 화면 좌표에서 상완 길이4.67~30.81, 전완6.31~26.60 SD 범위가 관측됐다(audit.json). 이2D 투영 길이를 새3D 길이(m)와 직접 비교하거나 투영 길이 변화만으로 오류라고 단정하지 않는다. 다만 기존 골격에는 고정된3D 관절/길이 제약이 없다는 구조적 차이가 있다.690→691ms 발 좌표는 이번 실제 코드에서 거의 연속이었으며, 큰 순간이동을 재현했다고 주장하지 않는다.

### 일반 타석 공 출발 경로의 차이

실제 수동 타석의 `acpBallScr`는 `acpGeo.rx/ry`를 출발점으로 쓰고, acpGeo는 `mvCamGeom`의 마운드 기준을 읽는다. 별도 `throwBall`의 mvPitchRelease 경로 및 이미 개선한 ABS/삼진 replay helper와 동일하지 않다. 따라서 새 손 모양만 그리면 일반 타석의 공이 새 손에서 나가지 않는다.

시제품의 검수용 메모리 어댑터는 **시제품 손→같은 카메라→acpGeo의 시각적 출발점**을 연결한다. G.at, apPitchAt, pitch T/slow, 판정·입력 시점은 건드리지 않는다. 정규화된 비행 중 공 물리를 통째로 새로운3D 물리로 바꾼 것이 아니다.

## 2. 시제품 구조와 적용 범위

- `visual/kwak-pitch-study/rig.js`: +X 해부학적 오른쪽, +Y 포수/홈, +Z 위. SD 비례의 월드 좌표이며 곽빈 신체를 실측한 치수가 아니다.
- 골반→흉곽→어깨 및 hips→knees→ankles, shoulders→elbows→hands. 몸통 yaw/기울기와 손의 흉곽 로컬 경로를 연결한다. 월드에서 같은 골격을 각 카메라에 투영한다.
- 오른다리=지지축, 왼다리=리드. 들어 올린 순간 골반의 수직 투영이 오른발 범위에 놓인다.245ms 착지 후 왼발 고정, 오른발은 toe를 지지하며 heel lift/pivot 후 이동한다.
- 골반 회전은190ms부터, 어깨는228ms부터 진행한다. 릴리스300ms에서 골반 약12.9°, 흉곽 약−12.9°이며 이후 같은 회전 방향의 FOLLOW와650~980ms 상체 회복이 이어진다. 이 각도는 시제품 설계값이며 곽빈 실측값이 아니다.
- 원본 game face/cap/글러브/가슴 인쇄·번호·바지/팔다리 도구를 재사용한다. 새 얼굴 컨셉·사진·GLB·동결3D 연구 모델은 사용하지 않는다.
- 승인 타격 renderer의 소프트웨어 깊이 래스터/Canvas readback을 복제하지 않는다. Canvas path와 가벼운 mesh/painter 정렬을 사용한다.
- fixture는 실제 게임 로스터 `p_dsn_p0`, 곽빈47·우완만 선택한다. 다른 투수에게 자동 적용하지 않는다. 실제 fixture에서 김택연으로 바꿔 그린 음성(negative) 검사에서도 시제품 호출이 늘지 않았다(scope.json).

### 실제 게임 소스와 검수용 어댑터의 구분

`fixture.js`는 격리된 로컬 브라우저에서만 원래 함수를 감싸 새 투수 draw와 시각적 release anchor를 시험한다. iframe gallery도 같은 로컬 파일을 사용한다. 이 스크립트를 서비스 index.html에서 불러오지 않는다. 별도 HTML을 Pages로 배포하지 않았다. 일반 서비스 사용자의 저장 데이터로 실행하지 않고, 검증은 모두 Playwright의 새 isolated context에서 수행했다.

실행 진입점: `visual/kwak-pitch-study/index.html`. 정면/측면/후면을 같은 pose clock으로 정상속도1회 또는1/3배속1회 재생한다. 실제 게임 화면의 타자/구장/UI는 원본이며 타자 모션 파일을 바꾸지 않는다.

## 3. 릴리스와 연속성 검사

예정 릴리스는 기존 `300+extra ms`, 종료는 `980+extra ms`다. 첫 시작부터 긴 실제 와인드업을 새로 넣으면서 기존 입력·릴리스 사건을 지연시키지 않았다. 따라서 준비→릴리스가300ms인 게임의 빠른 시간 제약은 남는다. 1/3배속 영상으로 이 제한을 숨기지 않는다.

원래 windup callback은 RAF가300+extra를 처음 넘는 프레임에서 실행되므로 예정 시각보다 늦게 관측될 수 있다. 검수 어댑터는 그 이벤트에 대응하여 실제 그린 pose 시각을 source anchor로 보존한다. 원래 callback을 늦추거나 물리 도착 시각을 변경하지 않는다.

- 0~980ms를1ms 간격으로 검사: 최대 관절 길이 오차 약3.4e−16 월드 단위, 도달 불가능한 wrist/ankle target 없음.
- 앞발245~690ms 접지, 뒷발 toe0~340ms 지지 위치 이동 오차0. heel lift와 실제 step은 별도 움직임이다.
- 시작/회복 종료 pelvis·hand·feet 위치 동일. 동일 투수로 실제 두 공을 진행한 recovery→다음 windup→release 검사도 통과했다(continuity.json). 관절별1ms 최대 이동과 전체 trajectory는 audit.json에 저장했다. 수치가 연속이라고 자연스러운 동작 승인으로 해석하지 않는다.
- 팔 capsule/머리 sphere의 보수적 근사 검사에서 최소 여유 약2.8cm. 헤어·모자·셔츠 아트의 정밀 메시 충돌/모든 self-intersection을 전수 검사한 것은 아니다.
- 4카메라×extra0/260의 held-ball 실제 draw 관측: 릴리스 순간 helper까지 최대 약0.000006px. 같은 계산만 반복한 비교가 아니라 held-ball painter observer와 release pose의 투영을 비교했다.
- 실제 타격 화면의 투수 Canvas transform과 일반 공 API 시작점 비교: 모바일·PC 모두 약0~0.000014 CSS px 범위(live-release.json). actual event pose/카메라/Canvas·DOM 사각형을 포함한다. 이 작은 수치가 미술 완성도를 보증하지 않는다.

리플레이의 source clock은 릴리스 사건 기준 상대 시각이므로 향후 `pose(releasePoseMs + source, extra)`로 연결할 수 있다. 스케줄300ms와 실제 표시 pose 시각을 구분해 전달해야 한다. **이번에 기존 ABS/삼진 renderer를 새 투수로 교체한 것은 아니며**, 실제 replay retarget은 사용자 시각 승인 이후 별도 작업이다.

## 4. 성능 및 보호

[MEASUREMENTS.md](MEASUREMENTS.md): 모바일390×844와PC1280×720, 기존/시제품 각5회, 총20회. 같은 실제 곽빈·타자·구종·코스의 조기헛스윙 고정 fixture이며 모든 조건에서 기존 approved batting supported 경로가 선택됐다. 녹화/프로파일링과 동시 실행하지 않았다.

투수 actor 비용은 기존보다 증가한다. 전체 RAF P95가 같아도 추가 부담이 없다는 뜻이 아니다. 기존 약33ms 타격 문제를 해결하지 않았고, 성능 최종 승인·60fps 또는 실제 iPhone Safari 검증을 주장하지 않는다. 다인 투수/야수 전체 적용 성능도 검증하지 않았다.

integrity.json으로 index.html 및 visual/batting의 기준70315a7 대비 바이트 동일성을 확인했다. 원본 게임 코드가 통째로 같으므로 판정/물리/기록/저장/리그/승인5포즈/C1/RECOVERY/캐시/ABS clear 기본값을 바꾸지 않았다. 실서비스 저장에 쓰지 않는 새 browser context에서 실제 플레이만 관측했다.

## 5. 시각 검수와 남은 제한

1. 이번 시제품은 곽빈 ID로 한정했지만 **실제 경기 연속 영상 기반의 고유 투구 폼 정밀 재현은 미검증**이다. 공식 KBO 프로필로47번/우투/187cm·95kg는 확인했다. 영상 접근 제한으로 특정 경기의 팔 각도/개인 타이밍을 계측했다고 주장하지 않는다. REFERENCES.md 참조.
2. 예정300ms까지 압축된 준비/스트라이드가 빠르게 보일 수 있다. 더쇼/프로스피 수준의 긴 와인드업·개인별 템포를 완성했다고 볼 수 없다. 시간 제약 변경은 이번에 하지 않았다.
3. 동일3D 골격으로 여러 시점을 계산하지만 얼굴/모자 아트는 기존 Canvas decal, 몸체 가림은 부분 painter sort다. 측면 얼굴 디테일과 복잡한 가림은 근거리 최종 미술 검수 대상이다. 물리3D/정밀 skin mesh 시스템이 아니다.
4. body의 새 silhouette와 원본 의복 연결 차이가 있다. 현재 얼굴/유니폼을 재사용했다는 사실이 외형 최종 승인을 대신하지 않는다.
5. 실기기 iPhone Safari·장시간 경기/모든 투수/모든 구종/자유 카메라 전수 검사는 하지 않았다.

다음 단계는 이 정상속도 시제품의 사용자 시각 검수다. 다른 투수·선수 전체 적용, 실제 게임 통합, 새 투수 리플레이 적용, claude/next 병합·Pages 배포는 하지 않는다. 곽빈3D 미술 연구는 동결 상태다.

## 바로 보는 자료

- [기존 실제 타격 화면 투구](before-mobile.mp4) / [곽빈 시제품 실제 타격 화면 투구](prototype-mobile.mp4)
- [정면·측면·후면 정상속도](three-view-normal.mp4) / [1/3배속](three-view-slow.mp4)
- [기존/시제품 시간순 비교](before-after-sheet.png)
- [릴리스3시점 비교](release-views.png) / [관절 오버레이](skeleton-views.png)
- [성능표](MEASUREMENTS.md) / [원시 RAF 자료](bench.json) / [릴리스 실제 화면 검사](live-release.json)

공개 공유는 실제 캡처·측정·보고서만이다. 실행 HTML/게임 소스/fixture는 별도 비공개 소스 브랜치에만 보존했다. 영상은 무음이며, 비디오 인코딩 FPS를 실제 RAF 성능으로 사용하지 않는다.
