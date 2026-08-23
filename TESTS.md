# 테스트

전부 [jsdom](https://github.com/jsdom/jsdom) 위에서 실제 화면을 띄워 검사한다.
빌드가 없으므로 `index.html` 을 그대로 읽어 돌린다.

```bash
npm install          # jsdom 한 번만
node lintcheck.js    # 정적 점검 (선언 사라진 함수 · 중복 CSS · 중복 키 · 용량)
node verify.js index.html   # 엔진 캘리브레이션 6개 지표
node soaktest.js     # 풀 시즌을 실제 UI 경로로 완주 — 가장 중요한 통합 테스트
```

## 전부 돌리기

```bash
for f in lintcheck verify vernotetest mgrtest kakaotest careertest nametest \
         awardtest kingtest savediet loadtest sorttest phototest bgmtest \
         iostest galaxytest compattest boxtest pcardtest feattest \
         unhappytest hometest namecheck smoketest fixtest recruittest \
         traintest2 vartest wltest advtest dectest2 subtest resumetest ruletest pitchbug deptest pitchtest playtest swaptest vartest2 rottest qualtest; do
  printf "%-13s " $f
  if [ "$f" = "verify" ]; then node verify.js index.html >/dev/null 2>&1 && echo OK || echo FAIL
  else node $f.js >/dev/null 2>&1 && echo OK || echo FAIL; fi
done
node soaktest.js
```

## 무엇을 보는지

| 파일 | 검사 대상 |
|---|---|
| `lintcheck` | 선언이 사라진 채 호출되는 함수 · 중복 CSS 셀렉터 · 객체 중복 키 · 용량 |
| `verify` | 엔진 캘리브레이션 — K% · BB% · BABIP · 2루타 · 3루타 · 홈런 비율 |
| `soaktest` | 풀 시즌 완주(주 시작 → 우천 → 용병 → 경기 → 확정) · 세이브 왕복 · 새 시즌 이월 |
| `compattest` | 구버전 세이브 호환 · 인원 부족 · 0 나눗셈 · 플레이오프 |
| `smoketest` | UI 3경기 + 전 화면 훑기 |
| `boxtest` | 박스스코어 — 선발 + 대타 전원 기록 |
| `pcardtest` | 선수 카드 (타자/투수 구분) |
| `feattest` | 진기록 16종 판정 · 보관 |
| `awardtest` `kingtest` | 구간 시상 · 시즌 종합왕 · 포디움 |
| `dectest2` | 직접 지휘 — 지시없음이 판단 횟수를 안 먹는지 · 투수 교체 상시 버튼 |
| `subtest` | 투수 교체 시 타순·수비 정리 · 지명타자 소멸 (지타 유무 모두) |
| `resumetest` | 경기 중 다른 탭 갔다 와도 이어서 진행 · 재굴림 차단 |
| `swaptest` | 두 번 눌러 타순·포지션 교체 (명단/야구장) |
| `vartest2` | 불참 사유·또래 잡담 확장 · 한 시즌 대사 중복도 |
| `playtest` | 직접 플레이 — 타이밍 스윙 · 코스 선택 · 모드별 노출 빈도 · 보정 폭 |
| `qualtest` | 규정이닝(경기당 1이닝) 시상 기준 · 타석·마운드 얼굴 |
| `rottest` | 로테이션 회전 · 한 시즌 투수 분산 · 선발 한계 이닝 |
| `pitchtest` | 등판 성장·사기·불씨 해소 · 미등판 불만 누적 · 사람별 말버릇 |
| `deptest` | 야구장 그림 라인업 · 포지션별 뎁스차트 · 주포지션 1순위 중복 방지 |
| `pitchbug` | 교체 아웃된 선수의 투수 복귀 차단 · 등판 예정 투수/주전 보호 |
| `ruletest` | 교체 복귀 금지 · 결장자 차단 · 승계주자 자책 · 콜드/마지막이닝 말 스킵 · 이탈자 영구 제외 |
| `careertest` | 통산 연도별/총합 · 시즌 로그 |
| `sorttest` | 표 정렬 · 구단 통산 1위 |
| `unhappytest` | 불만 규칙 (등판 면제 · 본인 면제 · 라이벌) |
| `nametest` | 화면별 선수 이름 클릭 |
| `mgrtest` | 감독 액션 · 물통 자해 · 상황별 답변 |
| `kakaotest` | 단톡 대사 다양도 측정 |
| `vernotetest` | 튜토리얼 · 업데이트 안내 모달 |
| `bgmtest` `iostest` | 사운드 · 아이폰 해금 경로 |
| `galaxytest` | 갤럭시(삼성인터넷) 대응 |
| `loadtest` | 대기화면 |
| `phototest` | 선수 사진 |
| `hometest` | 홈/원정 · 라인스코어 정합성 |
| `namecheck` | AI 투수 이름 생성 |
| `savediet` | 세이브 감량이 무손실인지 |
| `perftest` | 화면 렌더 · 경기 시뮬 속도 (참고용) |
| `wintest` | 승리·패전투수 판정 (결승점 기준) |
| `dectest` | 직접 지휘 판단창 — 오늘 기록 표시 · 상황별 지시 |
| `scouttest` | 스카우트 투수 · 선수 카드 몸값 |
| `begtest` | 인원 부족 대응 — 사정하기 확률·순서 · 라인업 보존 |
| `itptest` | 그라운드 홈런 — 주력 조건 · 리그 비율 |
| `postest` | 라인업 수비 자리 무결성 — 투수 두 명 · 빈 자리 · 마운드 교환 |
| `hoftest` | 전시장 통산 타격·투구 · 명예의 전당(단일시즌 최고·헌액자·연표) |
| `scenetest` | 2D 그라운드 장면(장면 기술서·좌표·발동 조건) · 경기 전 리그 랭킹 |
| `slidetest` | 구종 궤적 — 도착점이 미트·판정과 일치하는지 · 좌우 맞대결별 휘는 방향 |

## 가끔 실패하는 것

확률 기반 단정문이 들어 있어 간헐적으로 실패한다. **3회 재실행해서 판단한다.**

`advtest` `traintest2` `wltest` `recruittest` `fintest` `awardtest` `mgrtest` `dectest2` `hltest`

`dectest2` 의 '수비 판단창이 여러 번' 은 판단 발생이 확률이라 절반쯤 걸린다.
`hltest` 의 '박스스코어 대조' 도 교체가 끼면 어긋나서 자주 걸린다.

## 구버전 테스트

`finaltest` `hltest` `fintest` 는 v1.5.1 의 '라인업 발표' 게이트를 안 타서
한동안 깨져 있었다. 지금은 고쳐서 다 돈다.
`enterGame()` 헬퍼로 경기 화면을 거쳐서 시작한다.

## 경기 시작 버튼을 누르는 테스트

v2.19.0 부터 **경기 시작 전에 리그 랭킹 화면이 먼저 뜬다.**
`직접 지휘` / `자동 진행` 을 누른 뒤에는 `passRank()` 를 불러서 넘겨야
경기가 시작된다. 해당 테스트에는 헬퍼가 이미 들어 있다.
