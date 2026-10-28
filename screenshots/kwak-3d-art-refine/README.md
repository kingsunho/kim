# 곽빈 실제 3D 외형 수정 — 사용자 외형 검수 대기

범위: 곽빈 한 명의 HQ 아트 마스터 수정. 실제 GLB/Blender 원본/42본/스킨. 게임 적용, 실제 투구, 전체 스트레스 테스트, LOD 제작 없음. 실서비스·Claude 코드·승인 타격 모션은 변경하지 않음.

## 먼저 볼 이미지

- [4방향 기존/개선](before-after.png)
- [어깨·허리 연결 확대](connections.png)
- [컨셉과 실제 출력](concept-vs-3d.png)
- [얼굴·손·신발](face-hands-shoes.png)
- [이름·번호·팀 문자 숨긴 외형](no-identity.png)
- [어깨 −10/0/+10°](small-shoulder-check.png)
- [동일 모델 오프닝/국가연주/중거리 정적 구도](scene-reuse.png)
- [프로필 정면 PNG](after/kwak-front.png), [3/4 PNG](after/kwak-quarter.png), [얼굴 PNG](after/kwak-face.png)

컨셉 패널만 기존 생성 이미지. 나머지는 실제 GLB를 Three.js WebGL에서 캡처. 색 보정/생성형 재그리기/얼굴 합성 없음. 비교 자료의 문자·배치는 스크린샷을 HTML로 나열한 것. 기존 10개 카메라 프리셋·광원·노출·톤매핑 그대로이며, 확대 프리셋은 양쪽에 같은 값으로 적용. 컨셉 전신은 비슷한 크기로 발췌했지만 실제 3D와 자세/조형은 여전히 차이 남음.

## 실제 원인과 수정

**어깨:** 기존 신체·셔츠·언더슬리브는 닫힌 메시였고 signed volume 양수, boundary/non-manifold edge 0. 구멍 난 topology나 뒤집힌 전체 면보다 **피부/의복의 맞음새와 소매 단면 방향**이 문제였다. 기존 소매 중심경로가 수평에 가까워 단면이 위로 돌아가 어깨 피부 일부를 덮지 못했다. 중립 자세에는 본 변형 자체가 없어 그 결함을 웨이트 때문이라고 판단하지 않았다.

소매를 해부학적 수평 단면 loft로 다시 구성하고 쇄골/삼각근 덮임 및 내부 상완 크기를 맞춤. 피부를 숨기거나 검수용으로 팔을 앞으로 강제 렌더하지 않음. 흉곽·허리 곡면, 상완/전완 볼륨과 소매 끝단 보강. 문자는 가슴 표면 식에 맞춰 붙는 얇은 스킨 메시로 유지; 돌출된 금속 문자 같은 extrusion 제거.

**얼굴/머리:** 컨셉을 기준으로 아래 얼굴 폭·턱·눈꺼풀·눈썹·코·입 비례 조정. 옆/뒤머리 덩어리를 더 얇고 분리된 락으로 구성하고 귀 접속 위치 조정. 새 사진 기반 계측이나 선수 유사성 블라인드 검증을 완료한 것은 아니다. 이름/번호를 가린 비교를 별도 제공하며, 곽빈으로 읽히는지는 사용자 미술 검수 필요.

**손/하체:** 벌어진 손가락을 더 두껍고 짧게 굽히고 손바닥 연결 유지. 바지 무릎/허벅지/밑단 주름과 신발 외피·밑창·끈·스티치 추가. 실제 공 그립, 투구 시 손 변형은 아직 검사하지 않았다.

## 어깨 소범위 검사

정면/후면에서 x 1cm, z 1cm 간격으로 피부·의복 교차 깊이를 검사. 외측 어깨 ROI |x|≥0.14m, z1.04~1.27m 내 skin-first ray 수:

| 어깨 local Z | 기존 정면/후면 | 개선 정면/후면 |
|---|---:|---:|
| 0° | 14 / 8 | 0 / 0 |
| −10° | 12 / 10 | 0 / 0 |
| +10° | 11 / 9 | 0 / 0 |

목둘레의 정상 피부 노출은 별도 분류. 이 표는 표본 광선에서의 덮임 검사이며 모든 연속 표면·큰 동작 무결성 보장은 아님. 실제 ±10° WebGL 캡처도 제공. 전체 7종/투구 테스트는 승인 전 미실시.

## 기하 예산 및 통합

| 항목 | 기존 | 개선 마스터 |
|---|---:|---:|
| GLB 삼각형 | 115,615 | 85,920 |
| GLB 정점(분리 노멀/UV 포함) | 63,823 | 46,885 |
| 스킨 메시 | 77 | 31 |
| 본 / 스킨 / 재질 | 42 / 1 / 14 | 42 / 1 / 14 |
| GLB bytes | 3,657,176 | 2,715,252 |
| 정면 WebGL render calls(바닥 포함) | 78 | 32 |

약 25.7% 삼각형 감소. 기존 얇은 곡선/봉제선/눈꺼풀 등에서 36,210삼각형을 사용: 곡선의 과한 샘플·원형 단면 분할과 인쇄 글자 돌출을 줄였다. 디테일을 덧붙인 수정 원본 93메시를 같은 재질·의미 영역별로 31메시에 묶음. face/hair/body/hands/cloth/prints는 분리 유지. 재질14개를 한 아틀라스로 통합한 것은 아님. 큰 비용은 현재도 얼굴23,020tri·머리10,396tri·바지8,764tri·상의7,778tri. HQ 마스터이며 18명 모바일 실시간 적합성 승인 아님. 중/원거리 LOD는 추후 별도 제작 필요.

병합은 weld/remesh/웨이트 재계산 없이 join. rest/±10°에서 월드 변형 정점 좌표를 6소수점 정밀도로 비교해 일치. 병합 전후 실제 WebGL 13개 캡처가 RGBA 완전 일치(0 changed pixels); `merge-pixel-check.json`. 작은 관절 검사 결과가 모든 포즈에 대한 보장은 아님.

## 실제 출력 증거

- `after/glb-validation.json`: 실제 바이너리 파싱. 42본, 1스킨, 최대4영향, unweighted0, 정규화 오차≤1.42e−7. 내장 사진/이미지0, 애니메이션0.
- `after/model-audit.json`: 개별 메시·재질·정점, 병합 전후 변형 해시, 소스 묶음.
- `capture-qa.json`: 실제 로드 GLB SHA, 카메라별 메시 UUID와 draw calls. JS 오류 없음.
- `after/runtime-inspection.json`: 오프닝/국가연주/프로필 등 동일 메시 인스턴스·identity·SHA 확인.
- `after/provenance.json`: 초상화도 같은 GLB에서 투명 PNG 출력.
- `before/diagnosis.json`, `after/diagnosis.json`, 양쪽 `shoulder-probe.json`: 원인/깊이 검사.
- `preservation.json`: 기준 커밋과 실제 서비스 index/package, 렌더 광원 prefix 보존 검사.

현재 GLB SHA256: `c0c293aa8f190bfa3623c0900b1cba29f0dc15b2e48f1d3c124dfbc28c641bf4`.

## 재현

저장소 루트에서 Blender4.3.2:

```
blender --background --python visual/player3d-study/build_model.py
blender --background --python visual/player3d-study/consolidate_model.py
blender --background --python visual/player3d-study/inspect_shoulder_coverage.py -- visual/player3d-study/assets/kwak-source.blend /tmp/shoulder.json
```

기존 `.blend`를 덮어쓰므로 빌드는 별도 checkout에서 실행. 생성 후 초상화·매니페스트 해시도 갱신해야 함. `visual/player3d-study/`의 격리된 뷰어로 실제 모델 확인. 전체 게임에 import하지 않음.

## 남은 한계와 다음 승인

외형 후보이며 최종 승인 요청 단계. 컨셉의 섬세한 옷 주름·머리·표정과 아직 차이가 있고 선수 유사성도 미확정. 큰 어깨 회전·겨드랑이 변형, 공 그립, 포즈 전체, 애니메이션, 모바일 GPU 실측 및 실제 iPhone Safari는 미검증. FPS 개선을 주장하지 않음.

사용자가 외형을 승인하기 전까지 긴 모션·다른 선수·게임 적용으로 넘어가지 않음. ABS/슬로 리플레이 문제는 `FOLLOWUP-ABS-REPLAY-2026-10-28.md`에 별도 조사 항목으로 기록했으며 이번에 수정하지 않음. 기존 타격·구장캐시·C1·판정·주루·수비·저장·Claude 코드 변경 없음. 병합·Pages 배포 없음.
