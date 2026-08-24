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
| `uitest` | 짧아진 튜토리얼 · 화면 첫 진입 안내 · ? 도움말 · 구장 그림·전광판 |
| `bdaytest` | 생일 이벤트 — 진짜 달력 기준 · 홈 카드 · 축하 릴레이 · 당일 버프 |
| `rottest2` | 구속(실제 스피드건 기준·랜덤) · 로테이션 터치 변경 · 라인업 동기화 · 홈런 비거리 |
| `umptest` | 심판 오심·항의 · 유인구 · 구종별 타격 · 타자 정보 · 하이라이트 상한 |
| `wiftest` | 만약에 순수 시뮬레이션(세이브 무영향·원본 능력치) · 홈 진입 · 스프라이트 뼈 방향 · 공마다 노림수 시간 |

## 가끔 실패하는 것

확률 기반 단정문이 들어 있어 간헐적으로 실패한다. **3회 재실행해서 판단한다.**

`advtest` `traintest2` `wltest` `recruittest` `fintest` `awardtest` `mgrtest` `dectest2` `hltest` `subtest`

`dectest2` 의 '수비 판단창이 여러 번' 은 판단 발생이 확률이라 절반쯤 걸린다.
`hltest` 의 '박스스코어 대조' 도 교체가 끼면 어긋나서 자주 걸린다.
`subtest` 의 '지명타자 상태' 는 자동 교체가 확률이라 12회 중 3회쯤 걸린다.

## 구버전 테스트

`finaltest` `hltest` `fintest` 는 v1.5.1 의 '라인업 발표' 게이트를 안 타서
한동안 깨져 있었다. 지금은 고쳐서 다 돈다.
`enterGame()` 헬퍼로 경기 화면을 거쳐서 시작한다.

## 경기 시작 버튼을 누르는 테스트

v2.19.0 부터 **경기 시작 전에 리그 랭킹 화면이 먼저 뜬다.**
`직접 지휘` / `자동 진행` 을 누른 뒤에는 `passRank()` 를 불러서 넘겨야
경기가 시작된다. 해당 테스트에는 헬퍼가 이미 들어 있다.

## 캔버스를 쓰는 화면

v2.20.0 부터 구장 그림(`.mv-cv`)과 2D 장면이 캔버스다. jsdom 은 `getContext`
가 없어서 **`Not implemented: HTMLCanvasElement.prototype.getContext`** 경고를
낸다. 게임은 이 경우 그림만 건너뛰고 정상 동작한다.
테스트의 `jsdomError` 필터에 `not implemented` 를 넣어야 오탐이 안 잡힌다.

## 생일 테스트

`bdaytest` 는 실제 실행일과 무관하게 돌아야 해서 `todayMD()` 를 덮어써서
날짜를 고정한다. 새 생일을 `BIRTHDAY` 에 추가할 때는 `'MM-DD'` 형식만
지키면 되고 테스트는 손댈 필요 없다.

## 만약에 (순수 시뮬레이션)

v2.28.0 부터 `만약에` 는 지금 세이브와 **완전히 분리된 판**이다.
`whatIfRoster()` 가 `WWZW` 상수(2026 실제 기록에서 뽑은 원본 능력치)를
로스터에 덮어씌우고, 컨디션·사기·피로·부상·결장·장비·작전을 전부 뺀다.

그래서 `whatIfRun()` 은 **같은 시드면 세이브가 어떤 상태든 같은 결과**가
나와야 한다. `wiftest` 가 이걸 검사한다 — 능력치를 올려놓거나 컨디션을
10 으로 떨어뜨려도 점수가 안 바뀌어야 한다.
돌린 뒤 `ST.bat` `ST.pit` `ST.stand` `ST.cond` `ST.chat` 이 한 글자도
안 바뀌는지도 같이 본다.

라인업은 `whatIfBest(선발id)` 로 짠다. 선발 투수를 야수 자리에서 빼는 게
중요하다 — 우리 팀은 다들 포지션이 여러 개라, 안 빼면 송승민이 던지면서
포수까지 보는 라인업이 나온다.
