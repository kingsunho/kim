# A — 3D 마스터의 미술 제작 경로 재검토

결론: **v3의 3D/42본/동일 모델 재사용 기반은 보존한다. 같은 자동 단면·국소 변위 방식으로 얼굴 v4를 만드는 작업은 중단한다.** 현재 도구로 Blender 데이터를 편집·검사·내보내는 것은 가능하지만, 목표 수준의 직접 조형 능력이 입증된 것은 아니다. 새로운 얼굴·모션·게임 적용은 만들지 않았다.

기준 모델: `32438e06bdc581756f1ec54a304beb5db715f896`의 `visual/player3d-study/assets/kwak-source.blend` 및 `kwak-v1.glb`. 게임 관련 판단 기준은 별도 B 브랜치의 최신 v5.175.3이며 A에 최신 게임 코드를 병합할 이유는 없다. A 브랜치에는 검토 문서·읽기 전용 검사 결과만 추가한다.

## 1. 실제로 보존할 것과 미완성인 것

Blender4.3.2 background로 원본을 읽기만 했으며 저장하지 않았다. `asset-inspection.json` 참고.

| 자산 | 현재 사실 | 후속 작업 원칙 |
|---|---|---|
| `.blend`·GLB | 실제 메시, 33스킨 메시, 16재질, HQ92,072tri | v3를 원본 체크포인트로 보존. 변경 아트는 별도 파일에서 제작 |
| 몸 골격 | 42본, root/pelvis/spine/chest/neck/head/쇄골/사지/눈/손가락 계층 | 공통 몸 골격의 이름·부모·rest matrix·단위·축 유지. 리그를 새로 만들지 않음 |
| 정체성 | `identityKey=kbo:68220`, 외형버전 v3 | 키와 외형 버전을 분리. 모델 제작자가 선수 ID를 임의 변경하지 않음 |
| 게임 ID 연결 | `identity.json`에 **gameIdBinding not attempted** | 실제 게임 ID에 통합됐다고 주장하지 않음. 향후 별도 매핑표 검증 필요 |
| 초상화 | 같은 GLB의 정면/3/4 PNG 생성과 provenance 있음 | 새 GLB 해시가 바뀌면 정적 초상화 재생성. 기존 서비스 초상화는 지금 교체하지 않음 |
| 애니메이션·표정 | actions0, shape-key objects0 | 투구·주루·수비/표정이 준비됐다는 뜻 아님. 얼굴 표정은 향후 shape key 등 별도 설계 |
| LOD·다인 성능 | 현재 HQ 한 종류 | 9/18명 실기기 성능 검증 전 공용 경기 렌더러로 승인하지 않음 |

기존42본을 유지하면서도 얼굴/셔츠의 정점 수와 토폴로지는 바꿀 수 있다. 다만 새 정점에는 다시 웨이트가 필요하고, 이전 맵/가림/번호가 자동으로 유지되지는 않는다. 단순히 새 메시를 armature parent로 붙이는 것으로 완료 처리하지 않는다.

## 2. 지금 환경에서의 실행 가능성

**가능하고 실제로 수행한 것:** Blender4.3.2에서 `.blend` 열기, 메시·본·웨이트·UV·재질 검사, 버전/해시 확인, GLB 내보내기, Chromium WebGL 검수, 동일 모델 초상화 출력, 데이터 보존 검사.

**가능하지만 품질 미입증:** 코드로 정점/edge flow를 편집하고 remesh/retopology·weight transfer·bake 기능을 구동하는 것. Blender가 해당 기능을 지원한다는 사실이 이 환경에서 좋은 얼굴·의복을 만들 수 있다는 증거는 아니다.

**현재 확보하지 못한 것:** 아티스트가 DCC 화면에서 여러 방향의 실루엣을 보며 눈확·광대·턱의 면을 직접 잡고, 암홀/소매 패턴에 맞는 topology를 조형하는 작업의 품질. 현재 세션은 background Python/렌더 캡처 중심이고, 미술가의 직접 sculpt/retopo 작업이 수행됐다고 보고할 근거가 없다. 이전 v3 결과도 목표 컨셉과 격차가 남았으므로 같은 알고리즘을 한 번 더 실행하는 것을 해결책으로 삼지 않는다.

## 3. 현재 자동 방식의 구체적 한계

- 얼굴 단면/국소 깊이 함수는 연속 표면과 치수 제어에 유리하지만 눈확→광대→입술→턱의 면 흐름과 표정용 edge loop를 설계하기 어렵다.
- loft·voxel union 의복은 몸통을 덮는 데는 쓸 수 있지만 목둘레·암홀·소매가 실제 천 패턴과 두께를 갖는 구조가 아니다.
- cylindrical UV는 조형 검수용 원단 표현에는 쓸 수 있지만 겨드랑이/소매의 늘어남을 해결하는 최종 의복 UV가 아니다.
- 수식 주름·미세 normal map으로는 의도적인 큰 접힘, 원단이 눌리고 당겨지는 방향과 재단 실루엣을 대신할 수 없다.
- 기존 근접 거리 기반 max4 웨이트는 정규화됐다는 사실만 검증했다. 좋은 shoulder deformation이나 표정 topology가 확보됐다는 뜻이 아니다.

따라서 다음 품질 관문은 폴리곤 증가·감소가 아니라 **작가가 직접 설계한 얼굴 면과 의복 topology**다.

## 4. 권장 DCC 제작 파이프라인

1. **원본 인계:** v3 `.blend`/GLB/42본 rest/identity manifest/컨셉/기존 중립 WebGL 화면을 읽기 전용 기준으로 제공한다. reference 사진은 관찰용으로 구분하며 모델에 붙이지 않는다.
2. **얼굴 sculpt:** 동일 머리 위치/전체 SD 비율을 기준으로 눈확·광대·콧대·입 주변·턱 면을 여러 방향에서 직접 조형한다. 눈·치아·입 내부/표정 요구는 현재 neutral scope와 구분. 피부 사실성보다 화풍 일관성 우선.
3. **얼굴 retopology:** 눈·입의 loop와 턱/귀 연결, 극점 위치를 설계한 quad cage로 정리한다. subdivision/smooth 결과와 실제 export topology 모두 확인한다.
4. **의복 재제작:** 몸통을 또 voxel union하지 않고 목둘레·암홀·소매 끝·옆선에 맞는 edge flow를 만든다. 두께·안쪽 겹침/보이지 않는 면 처리·정자세 암홀 silhouette를 확인한다. 셔츠와 내피가 서로 뚫리지 않게 맞춘다.
5. **UV·bake:** 의복 패널별 UV와 일정한 texel density. 큰 주름은 실제 형상, 작은 주름·봉제·원단은 공유 normal/base/roughness로 bake. 얼굴 사진/카메라별 렌더를 텍스처로 붙이지 않는다. 동일 조명에서 맵 ON/OFF로 기여도 확인.
6. **동일 골격 바인딩:** source와 새 메시의 축/scale/rest pose를 먼저 맞춘다. 공통 골격을 복제 재생성하지 않고 새 메시만 같은 armature에 연결한다. body→cloth weight transfer는 출발점이고, 겨드랑이/쇄골/목/소매는 직접 weight paint로 확인한다. max4/합1/미할당0과 실제 변형 검수는 별개다.
7. **출력:** 중립·생성 애니메이션 없는 art GLB 먼저. material slots/skin/inverse bind/identity/축/단위/texture embedding 검사. 기존 뷰어에 새 GLB와 정확한 해시만 넣어 전후 동일 카메라·광원 비교한다.
8. **외형 승인:** 정면·3/4·측면·후면, 얼굴/목/어깨/상의 확대, 컨셉 비교, 실제 표시 크기. 미승인 상태에서 긴 모션으로 넘어가지 않는다.
9. **승인 후 별도 관문:** 작은 관절→7종 큰 동작→연속 회전→모바일 다인/LOD→기존 모션 retarget. 리플레이 좌표·시각 문제는 별도 B에서 먼저 진단한다.

Blender 내부에서 보기 좋다는 것만으로 승인하지 않는다. 실제 glTF의 normal/tangent/재질 결과를 동일 WebGL 뷰어에서 확인해야 한다. source subdivision만 보고 모바일 export 결과를 생략하지 않는다.

## 5. 수백 명 확장 설계(이번에는 구현하지 않음)

- **RigContract:** 공통42본·rest·축·단위·semantic joint map. 근거리 얼굴 표정은 body rig와 분리한 morph 표준을 검토한다.
- **BodyArchetype:** 소수의 직접 제작한 체형 master와 호환 topology/weight. 키·어깨·사지 비례의 허용 범위와 distortion 한계를 명시한다.
- **PlayerIdentity:** 기존 게임 ID를 유지한 채 외부 source ID, 얼굴형/morph, 머리/귀/피부 톤, 체형, 고유 실루엣을 별도 자산 manifest로 연결한다. 모든 선수를 같은 얼굴에 이름만 바꾸는 방식은 금지한다. 특징적인 선수는 별도 sculpt variant와 시각 검수 필요.
- **TeamKit:** 셔츠/바지/모자 공통 UV와 material slot. 팀 색·마크·등번호/이름은 독립 overlay/atlas 입력. 선수마다 전체 uniform texture를 복제하지 않는다.
- **AnimationClip:** identity/kit와 독립된 motion library. 골격 호환만으로 모든 체형의 접지/그립이 자동 보장되는 것은 아니므로 retarget 후 검수한다.
- **RenderProfile:** HQ 근거리 / 실제 경기 중거리 / 원거리·도열 LOD. topology와 texture를 공유 가능한 단위로 관리. 화면마다 별도 WebGL renderer를 만들지 않음.
- **PortraitBake:** player appearance hash +kit hash +camera/light preset hash로 PNG를 생성/캐시. 오프닝/카드/경기가 같은 외형 버전을 참조하게 한다.
- **AssetCache:** 현재 보이는 선수/다음 교체 자원 위주 로딩, 제한된 decoded texture/mesh budget, 퇴장 시 release. 선수마다 독립 HQ 아틀라스 상주 방식은 채택하지 않음.

새로운 gamePlayerId를 만들어 세이브를 갈아끼우지 않는다. 모델의 `kbo:68220`와 실제 game ID의 대응·연도·팀 변경은 별도 resolver에서 검증하고 저장 데이터를 수정하지 않는 방식으로 설계한다.

## 6. 품질 확보의 현실적 선택지

**추천:** 먼저 곽빈 한 명의 얼굴·상의만 직접 sculpt/retopo할 수 있는 숙련 3D 아티스트 작업을 확보하고, 현재 툴은 인계·검증·내보내기·동일 뷰어 비교에 사용한다. 결과물을 새로운 공통 master로 승인하기 전 위8번 관문을 통과시킨다. 단발 예쁜 렌더보다 `.blend` topology·UV·weights·export GLB를 납품받는다.

직접 작업 가능한 아티스트가 확보되지 않으면 v3는 **미승인 연구 자산으로 동결**하고, 기존 서비스 캐릭터를 유지하는 것이 현실적이다. 이미지 생성 결과를 사용해 미술 완료로 포장하거나 새 유료 서비스가 자동으로 해결할 것이라고 가정하지 않는다.

외부 제작은 선택지일 뿐 이번에 계약·구매·서비스 가입·파일 외부 업로드·작업 의뢰를 하지 않았다. 금액·일정은 견적이 없어 확인 불가이며 임의 수치를 제시하지 않는다.

구체적 [인계·납품 검수 기준](DELIVERY-CONTRACT.md)을 함께 작성했다. 새 얼굴 v4/애니메이션/게임 적용은 만들지 않았다.

재개 후 확인(2026-10-29): A는84041af의 기존 검사 결과를 보존했고 모델을 다시 검사·생성하지 않았다. B의 최신 재현은 서비스v5.175.3/Claude a525d7a 기준으로 별도 수행했다. A의 3D 자산·게임 소스는 원래32438e0 체크포인트에서 변경하지 않았다.
