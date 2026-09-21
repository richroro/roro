# Android 게임 모음 — Sky Dodge · Villain Rush

하나의 Gradle 프로젝트에 두 개의 독립 앱이 들어 있습니다. 둘 다 외부 라이브러리 없이
Kotlin + Android 프레임워크(Canvas)만으로 만들어져 APK 가 매우 작습니다.

| 앱 (모듈) | 장르 | applicationId |
| --- | --- | --- |
| **Sky Dodge · 스카이 닷지** (`:app`) | 떨어지는 블록을 좌우 드래그로 피하고 별을 모으는 한 손 캐주얼 | `com.richroro.skydodge` |
| **Villain Rush · 빌런 러시** (`:crowdrush`) | 동료를 모아 달리며 게이트를 쏴 인원을 불리고, 스테이지마다 현실 빌런(꼰대 부장, 재벌집 사위, 잔소리 이모, 층간소음 윗집)을 물리치는 사격 러너 | `com.richroro.crowdrush` |

| 공통 항목 | 값 |
| --- | --- |
| minSdk / targetSdk / compileSdk | 26 / 36 / 36 |
| 언어 | Kotlin 2.2, AGP 8.13, Gradle 8.14 |
| 권한 | 없음 (인터넷·저장소 등 일절 사용 안 함) |
| 데이터 수집 | 없음 (최고 기록만 기기 내 SharedPreferences 에 저장) |

## 구조

```
android-game/
├─ app/                                # Sky Dodge
│  ├─ src/main/kotlin/com/richroro/skydodge/
│  │  ├─ GameWorld.kt     # 순수 Kotlin 시뮬레이션 (Android 의존성 없음 → JVM 단위 테스트)
│  │  ├─ GameView.kt      # Canvas 렌더링 + Choreographer 프레임 루프 + 터치 입력
│  │  └─ MainActivity.kt  # 전체화면(immersive) Activity
│  └─ src/test/…/GameWorldTest.kt
├─ crowdrush/                          # Villain Rush (모듈/패키지 이름은 초기 이름 crowdrush 유지)
│  ├─ src/main/kotlin/com/richroro/crowdrush/
│  │  ├─ CrowdWorld.kt    # 레인·게이트·적 군단·보스 시뮬레이션, 시드 기반 결정적 레벨 생성
│  │  ├─ CrowdView.kt     # 유사 3D(원근 투영) Canvas 렌더링 + 터치 입력
│  │  └─ MainActivity.kt
│  └─ src/test/…/CrowdWorldTest.kt
├─ tools/generate_sprites.py           # 병사 스프라이트(PNG) 생성기 → crowdrush/src/main/res/drawable-nodpi/
├─ tools/generate_sounds.py            # 효과음(WAV) 합성기 → crowdrush/src/main/res/raw/
└─ store/                              # Play Console 등록용 이미지 + 생성 스크립트
```

Villain Rush 의 캐릭터 이미지는 외부 에셋 없이 `tools/generate_sprites.py` 가 그려서 만든 PNG 입니다
(`ranger_back_0/1.png` = 레인저 뒷모습 걷기 2프레임 / `goblin_front_0/1.png` = 고블린 정면 2프레임, 96×120 / `monster_<종류>_0/1.png` = 괴물 4종 걷기 2프레임, 160×200).
다른 그림으로 바꾸려면 같은 파일 이름으로 `crowdrush/src/main/res/drawable-nodpi/` 에 PNG 를 덮어쓰면 됩니다.
효과음(총성 `sfx_shot`, 피격 `sfx_hit`, 숫자 상승 `sfx_ding`, 손해 `sfx_buzz`, 클리어 `sfx_clear`, 게임 오버 `sfx_over`)도
`tools/generate_sounds.py` 로 합성한 WAV 라서 `crowdrush/src/main/res/raw/` 의 같은 이름 파일로 교체할 수 있습니다.
화면 오른쪽 위 스피커 아이콘으로 소리를 끄고 켤 수 있습니다.

### 스테이지 구성

스테이지마다 레이아웃 프로필이 달라 같은 코스를 반복하지 않습니다. 시작 화면에 "오늘의 코스" 로 요약이 뜹니다.

| 스테이지 | 특징 | 게이트 | 잡몹 | 벽 | 속도 | 중간 빌런 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 사무실 | 게이트 러시 | ×1.35 | ×0.5 | 0 | — | 과장님 |
| 2 동창회 | 벽 구간 | ×0.8 | ×0.5 | 2 | — | 동창회 총무 |
| 3 큰집 | 잔소리 파도 | ×0.7 | ×1.7 | 1 | ×0.95 | 큰어머니 |
| 4 새 아파트 | 빠른 진행 + 벽 | ×1.0 | ×0.8 | 3 | ×1.15 | 관리사무소장 |

- **벽**: 길 절반을 막는 바리케이드. 쏴서 부수거나 열린 쪽으로 피해 갑니다. 그냥 부딪히면 남은 HP 만큼 인원이 줄어듭니다. 폭탄으로도 날릴 수 있습니다.
- **중간 빌런**: 스테이지 60% 지점의 잡몹 무리 하나가 이름표를 달고 1.65배 크기로 커집니다.

### 스테이지 스토리

스테이지마다 "오늘의 빌런" 한 명이 기다리고, 시작·클리어·실패 화면에 짧은 이야기가 붙습니다.
문구는 `crowdrush/src/main/res/values(-ko)/arrays.xml` 의 string-array 로 관리하며 순서대로 반복됩니다(5스테이지부터는 "시즌 2").

| 스테이지 | 장소 | 빌런 | 잡몹 |
| --- | --- | --- | --- |
| 1 | 월요일 오전 9시 · 사무실 | 김부장 ("왕년엔 말이야") | 갑자기 잡힌 회의 |
| 2 | 10년 만의 동창회 · 호텔 뷔페 | 황금수저 (재벌집 사위) | 은근한 자랑 |
| 3 | 추석 당일 · 큰집 거실 | 잔소리 이모 (30년째 같은 질문) | 잔소리 |
| 4 | 이사 첫날 밤 11시 · 새 아파트 | 층간소음 마왕 (윗집) | 쿵쿵 |

### 규칙

- 동료들은 자동으로 전진하며 **자동으로 사격**합니다. 인원(최대 40명)에 비례해 초당 발사 수가 늘어납니다. 좌우 드래그로 길 안에서 이동합니다.
- 게이트는 좌/우 한 쌍으로 나오며 지나간 쪽의 연산이 적용됩니다: `+N`, `×2/×3`(파란색, 이득) / `−N`, `÷2`(빨간색, 손해).
- 총알이 게이트에 맞으면 그 쪽이 좋아집니다: `+N` 은 3발마다 +1, `−N` 은 3발마다 −1 이고 0 이 되면 `+1` 로 뒤집힘, `÷2` 는 15발 맞으면 `+1` 로 뒤집힘, `×N` 은 20발마다 +1.
- 잡몹 무리는 길을 따라 구역별로 하나씩 고르게 배치되고(게이트와 7m 이상 떨어짐, 좌우 번갈아), 뒤로 갈수록 커집니다. 35m 안으로 들어오면 아군 쪽으로 천천히 전진합니다.
- 잡몹은 총알 1발에 1개씩 줄고 0 이면 사라집니다. 부딪히면 남은 숫자만큼 병력이 줄고, 0 이하가 되면 게임 오버입니다.
- 아이템 4종이 레인에 떠 있고 지나가면 획득합니다: ⚡ 연사(6초간 발사 속도 2배), 🛡 방어막(다음 손해 게이트 또는 적 접촉을 무효화, 접촉한 적은 전멸), ✚ 증원(병력 +30%, 최소 3명), 💣 폭탄(40m 안 적 군단 전멸, 보스 10% 감소). 게이트·적 군단과 5m 이상 떨어져 놓입니다.
- 길 끝에는 그 스테이지의 **빌런** 한 명이 기다립니다. 골프채를 든 김부장(벗겨진 정수리와 콧수염), 선글라스와 금목걸이의 황금수저, 국자를 든 뽀글파마 잔소리 이모, 농구공을 든 층간소음 마왕 순으로 바뀝니다. 30m 안에 들어오면 포효하고(화면 흔들림) 천천히 다가옵니다. 사격으로 HP 를 깎을 수 있고, 도달했을 때 남은 HP 보다 인원이 많으면 스테이지 클리어. HP 는 "최선 경로 인원의 60% + 최선 경로 부대가 사거리 안에서 쏠 수 있는 탄수의 50%" 라서 잘 고르고 잘 쏘면 항상 이길 수 있습니다.
- 빌런 뒤에는 **부하 무리 벽**이 관중석처럼 쌓여 있고, 빌런 HP 가 줄어들면 벽도 줄줄이 사라집니다. 화면 위에는 굵은 HP 바가 붙습니다.
- 병사 크기는 화면 원근에만 따르고 인원수와 무관합니다. 군단이 커지면 넓게 퍼질 뿐입니다. 64명이 넘는 적 군단은 남은 비율만큼 그려지는 인원이 줄어듭니다.
- 레벨이 오를수록 속도·레인 길이·게이트 수·적 군단 수가 늘어납니다.

## 로컬 빌드

Android Studio 에서 `android-game/` 폴더를 열거나, 터미널에서:

```bash
cd android-game
./gradlew testDebugUnitTest      # 두 앱의 단위 테스트
./gradlew assembleDebug          # app/build/outputs/apk/debug/app-debug.apk, crowdrush/build/outputs/apk/debug/crowdrush-debug.apk
./gradlew assembleRelease bundleRelease   # 릴리스 APK + AAB (키스토어 env 없으면 디버그 키 서명)
./gradlew :crowdrush:assembleDebug        # 한 앱만 빌드
```

## CI / 배포 파이프라인 (`.github/workflows/android-release.yml`)

두 앱은 **게임별로 따로** 빌드·릴리스됩니다. 태그도 버전도 앱마다 독립입니다.

| 트리거 | 동작 |
| --- | --- |
| PR, `main`/`claude/**` push | 두 앱 각각 단위 테스트 → 릴리스 APK/AAB 빌드 → 아티팩트 업로드 (릴리스는 안 만듦) |
| `skydodge-v*` 태그 push | Sky Dodge 만 빌드하고 그 앱의 GitHub Release 생성 |
| `villainrush-v*` 태그 push | Villain Rush 만 빌드하고 그 앱의 GitHub Release 생성 |
| 수동 실행 (workflow_dispatch) | `app`(both/skydodge/villainrush), `version_name`, `create_github_release`, `play_track` |

```bash
# 게임별 릴리스
git tag villainrush-v1.9.0 && git push origin villainrush-v1.9.0
git tag skydodge-v1.1.0    && git push origin skydodge-v1.1.0
```

`versionCode` 는 워크플로 실행 번호(`github.run_number`)라서 항상 증가합니다. Play Console 에서 두 앱은 별개이므로
각자의 versionCode 수열만 증가하면 되고, 번호가 서로 이어지지 않아도 문제가 없습니다.
`versionName` 은 태그(`villainrush-v1.9.0` → `1.9.0`) 또는 수동 실행 입력값에서 옵니다.

### 1. 업로드 키 만들기 (한 번만)

```bash
keytool -genkeypair -v -keystore skydodge-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 skydodge-upload.jks > skydodge-upload.jks.b64   # macOS: base64 -i skydodge-upload.jks
```

`.jks` 파일은 절대 저장소에 커밋하지 말고 안전한 곳에 백업하세요 (분실 시 앱 업데이트 불가).

### 2. GitHub Secrets 등록

저장소 **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | 값 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `skydodge-upload.jks.b64` 파일 내용 |
| `ANDROID_KEYSTORE_PASSWORD` | 키스토어 비밀번호 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 |
| `PLAY_SERVICE_ACCOUNT_JSON` | (4단계) 서비스 계정 JSON 전체 내용 |

시크릿이 없으면 워크플로는 경고를 내고 디버그 키로 서명합니다. 그 APK 는 설치·테스트는 되지만 Play 업로드는 거부됩니다.

두 앱은 같은 업로드 키스토어로 서명됩니다 (Play Console 에서는 앱마다 별도 등록).

> **빌런 러시 스토어 등록 자료는 [`store/PLAY_STORE.md`](store/PLAY_STORE.md) 에 모두 정리돼 있습니다.**
> 앱 이름·설명 문구, 콘솔 설문 답변, 스크린샷(`store/screenshots/`), 개인정보처리방침 URL 까지 그대로 붙여 넣으면 됩니다.

### 3. Google Play Console 에 앱 만들기 (게임마다 최초 1회, 수동)

Play Console 에서 두 게임은 **완전히 별개의 앱**입니다. 등록정보·스크린샷·콘텐츠 등급·심사·versionCode 가 각각이며,
업로드 키스토어는 공유해도 되지만 Play 앱 서명 키는 앱마다 따로 생성됩니다.

1. https://play.google.com/console 에서 개발자 계정 등록 (1회 등록비 US$25).
2. **앱 만들기** → 이름 `Sky Dodge` 또는 `Villain Rush`, 기본 언어 한국어, 앱/게임 → 게임, 무료.
3. **대시보드**의 설정 항목 완료:
   - 앱 액세스: 특별한 액세스 불필요
   - 광고: 광고 없음
   - 콘텐츠 등급: 설문 작성 (폭력·도박 등 모두 "아니오")
   - 타겟 대상: 13세 이상 권장 (아동 대상으로 하면 추가 정책 적용)
   - 데이터 보안: "데이터를 수집하거나 공유하지 않음"
   - 개인정보처리방침 URL: 데이터 미수집이어도 입력을 요구할 수 있음 → 간단한 페이지(GitHub Pages 등) 링크
4. **스토어 등록정보**: `store/<앱>-icon-512.png`(앱 아이콘), `store/<앱>-feature-graphic-1024x500.png`(그래픽 이미지),
   휴대전화 스크린샷 2장 이상(에뮬레이터/기기에서 캡처), 짧은 설명·자세한 설명.
5. **테스트 → 내부 테스트 → 새 버전 만들기** 에서 Actions 아티팩트(또는 GitHub Release)의 `SkyDodge-*.aab` / `VillainRush-*.aab` 를
   업로드하고 저장. Play 앱 서명 등록을 수락하면 첫 업로드 완료.
   *첫 AAB 는 반드시 콘솔에서 직접 올려야 하며, 그 후부터 API 업로드가 가능합니다.*

### 4. 자동 업로드 연결 (선택)

1. Play Console **설정 → API 액세스** 에서 Google Cloud 프로젝트 연결 → 서비스 계정 생성 → JSON 키 다운로드.
2. Play Console **사용자 및 권한** 에서 그 서비스 계정에 앱 권한(출시 관리) 부여.
3. JSON 내용을 `PLAY_SERVICE_ACCOUNT_JSON` 시크릿으로 등록.
4. **Actions → Android Release → Run workflow** 에서 `app` 으로 게임을 고르고 `play_track=internal` 로 실행 → 그 앱의 내부 테스트 트랙에 자동 업로드.
   검수 후 콘솔에서 프로덕션으로 승급하거나, `play_track=production` 으로 재실행.

### 5. 새 버전 내기

```bash
git tag villainrush-v1.9.0 && git push origin villainrush-v1.9.0
```

태그를 올리면 그 게임만 빌드·서명·GitHub Release 까지 자동으로 진행됩니다.

## Sky Strike (스카이 스트라이크) — `:skystrike`

A vertical scrolling shooter. You fly in a band across the bottom of the screen, the guns fire
on their own, and everything else falls towards you. Four enemy types (straight-flying drones,
weaving light fighters, flak gunners that lead their shots, and divers that accelerate into you),
five power-ups, and a heavy bomber waiting at the end of every stage.

You steer on both axes: sideways between `-PLAYER_LIMIT` and `PLAYER_LIMIT`, and forward and back
between `PLAYER_Y_MIN` (0.50) and `PLAYER_Y_MAX` (0.94). Pushing forward is a real trade -- you
reach the wave and the falling power-ups sooner, with less sky left to dodge in. The front of the
band stops short of the raider's hull so a boss fight can never open with a free ram.

**Eight ways to be in the way.** The first four fall towards you in different lines. The four
added since each ask you to do something you would not otherwise do:

| kind | what it makes you do |
|---|---|
| `SHIELDER` | a plate across its nose turns away anything inside `SHIELD_ARC` of its centre line. Get off the centre line, or spread your fire. |
| `SPLITTER` | dies into two smaller ones. Finish what you started -- and it is two more links on the chain. |
| `TURRET` | comes in, parks at `TURRET_STATION_Y` and owns that patch of sky until you take it away. It gives up after `TURRET_SECONDS` rather than wedging the stage open. |
| `SWARM` | tiny, quick, one hit each, and never fewer than seven. |
| `MINER` | crosses slowly and leaves `MINE`s behind it. |
| `MINE` | not an aircraft: it barely drifts, and it is still there when you come back. |
| `CHARGER` | picks your lane, spends `CHARGE_TELL` telling you about it, then takes it at `CHARGE_SPEED`. |
| `HEALER` | mends the worst-off aircraft within `HEAL_RADIUS` -- and never itself, so it is always the thing to shoot first. |

`halfOf(kind)` gives each one the hitbox it looks like it has, and the renderer scales the sprite
from the same number, so what you see is what you can hit.

**Something to pick between stages.** Clearing a stage lays out `BOONS_OFFERED` boons to choose
from, and the choice is the reason to keep a run alive rather than restart for a better opening.
A pickup lasts a stage; **a boon lasts the run**, so the fourth stage of a good run is flown in a
different aircraft from the fourth stage of a bad one.

Everything that reads a starting value -- hit points, bombs, gun lines, escorts, fire rate, the
chain window and its ceiling, pierce, drop rate, how far forward you may push -- reads it from a
`boonLevel()`-derived function rather than a constant, so a boon is one line rather than a special
case scattered about. Each has its own ceiling in `boonCap()` and drops out of the offer once it is
full, so late in a run you are choosing between the things you have not taken yet.

`frontLimit()` is the one that needs watching: agility buys sky, but it is clamped at
`FRONT_FLOOR`, because "a boss fight can never open with a free ram" is a promise the boons do not
get to break. A test pins it.

**A grade for the stage, not just a clear.** `stageRank()` reads the hits you took and the best
chain you held: flying clean earns the top of it, and holding a chain through a whole stage is
what separates S from A. It resets per stage, so a bad stage does not follow you.

**Chains.** Kills land in chains: each one inside `COMBO_WINDOW` of the last extends it, and every
`COMBO_STEP` kills steps the multiplier up, to `MAX_COMBO_MULT`. The chain pays for every kill in
it, so it is worth far more than the hit points it costs you to hold -- and taking a single hit
drops it to nothing. That is the gamble the whole scoring system is built on, and it is what makes
the forward half of the flight band worth flying in. The meter under the hit points shows the
multiplier and the window you have left; the run's best chain goes on the end-of-stage panel.

**The surge.** Halfway down every stage, `RUSH_FORMATIONS` formations of different kinds arrive
back to back, a third faster than usual, stacked `RUSH_STACK` apart so they land as three pulses
rather than one wall. It is the one place a chain can really run, and the one place the stage
stops feeling like a metronome.

The stack is also what turned up a stage that could never end: a diver accelerates by its own
height, and one stacked far enough above the screen had that term go negative and climbed away
for ever, leaving an aircraft alive that the boss check was waiting on. `DIVE_CRAWL` floors it, so
a diver only ever comes down. Twenty minutes of the autopilot flying found it; a test pins it.

**Three rounds, not one.** The raider changes its mind at `BOSS_PHASE_2` and `BOSS_PHASE_3` of its
health -- the bar carries a tick at each, so you can see them coming. It sweeps faster and wider
each time, and from phase 1 it also picks you out of its own pattern with an aimed shot.

**Six raiders, not four repaints.** Each hull in `BOSS_PROFILES` has its own silhouette *and* its
own `BossStyle`, so what you are looking at tells you what is about to come out of it:

| hull | style | what it does |
|---|---|---|
| four-engine heavy | `FAN` | the plain wide fan everything else is measured against |
| twin boom | `BURST` | three salvos back to back, then long enough to breathe |
| flying wing | `WALL` | a curtain the width of the sky with one gap that walks along it |
| dagger | `DAGGER` | a narrow spike of fire, from a hull that will not hold still |
| armoured barge | `COLUMN` | a tight column straight down its nose; it owns the ground under it |
| the disc | `RING` | an even ring, turned a little further each salvo |

A raider that slides fast does not also get to be a wall, and the one that barely moves pays for it
in health. Six raiders against four stages means the cycles do not line up: fly the coast road a
second time and something else is waiting at the end of it.

**Ten pickups, on five different axes.** More guns (`SPREAD`, `WINGMAN`), a faster gun (`RAPID`),
a gun that behaves differently (`PIERCE`, `HOMING`), staying alive (`SHIELD`, `REPAIR`, `BOMB`),
and the two that look after the chain and the sky around you (`CHARM`, `MAGNET`).

- **`WINGMAN`** puts an escort off your wingtip, up to `MAX_WINGMEN`. They fire when you fire, and
  an escort is the first thing a hit takes -- only once they are gone does a hit cost you a gun.
- **`PIERCE`** lets a round punch through `PIERCE_HITS` hulls instead of stopping at the first. A
  shot remembers what it last hit, so punching through is not the same as hitting one aircraft
  four frames running. Against a `TRAIL` formation it is a whole chain in one round.
- **`HOMING`** lets your rounds lean towards whatever is still ahead of them, at `HOMING_TURN` per
  second, without letting them speed up or slow down.
- **`MAGNET`** reels falling pickups in instead of letting them sail past.
- **`CHARM`** eats one chain break. The hit still lands and still costs a hit point -- the chain
  is what survives it.

- **`SLOW`** puts everything coming at you on a `SLOW_FACTOR` clock -- their aircraft, their fire,
  the raider. Your own rounds keep their speed, so it is a window, not a pause.
- **`ORBIT`** gives you orbs circling the aircraft that eat the fire that runs into them.
- **`VAMPIRE`** puts a hit point back every `VAMP_KILLS` kills, so aggression pays for itself.
- **`MEDAL`** is points on the spot, multiplied by whatever your chain is paying.

`DROP_TABLE` keeps the drop *rate* where it was, so fourteen kinds means more variety per drop
rather than more power: the staples stay common and the exotics stay a treat.

**It will fly itself.** The `AI` pill above the bomb button hands the aircraft to an autopilot
that plays the whole run: it starts the stage, flies it, picks a boon off the clear panel, and
picks the run back up when it falls. A drag takes it straight back -- a tap is for the panels, so
tapping through a clear screen does not cost you the autopilot.

It lives in `SkyWorld` rather than the view, so both ports fly identically and a test can watch it.
`aiTick()` drives the states; `flyAutopilot()` scores a ring of places it could be in a moment and
steps towards the cheapest one. Sampling positions rather than writing steering rules is what lets
one piece of code dodge a curtain, a diver and a rising flare without ever arguing with itself
about which threat to run from.

`aiCost()` is where the judgement is. Staying alive is worth orders of magnitude more than lining
up a shot, so danger is squared and heavy and everything else only breaks ties. Three things it
took measurement to learn:

- **Closest approach, not sampled positions.** Walking each round forward in four steps let a fast
  one pass clean through the gaps between them. Every threat is now judged at the nearest it ever
  comes over `AI_LOOKAHEAD`, solved rather than sampled.
- **Each kind projected the way it actually flies.** `aiSpeedY()` knows a diver is still
  accelerating and a committed charger is the fastest thing in the sky. One speed for all twelve
  is a dead aircraft.
- **Lead the target.** A round takes time to arrive and the raider sweeps at up to a lane and a
  half a second, so it aims off by `bossDriftX()` times the flight time, and closes the range in a
  raider fight so that guess is a short one.

**It flies on a stick.** The first version moved the whole step the moment a square scored better
and none of it otherwise: measured over a minute of flight, it was **motionless for 72% of frames
and at full travel for 18%**, with nothing in between. That is what made it look wrong, and it made
the aircraft snap between level and full bank as well, since the view reads bank off how far it
moved last frame.

So it flies a stick instead. `flyAutopilot()` turns the chosen square into a *speed* it wants to be
going and eases onto it at `AI_AGILITY`. Easing all the time was smooth and cost it the flak stage,
so how sharply it may lean on the stick is how badly it needs to: `AI_URGENT` scales the easing by
how bad the square it is standing in already is, which gives a pilot who cruises with room and
yanks when something is about to hit. Frames at full travel went 18% to 1%, motionless 72% to 12%.

Two things that sounded right and measured wrong, both reverted: planning from where momentum is
carrying it (a feedback loop -- the projected spot keeps sliding downrange, so "keep going" always
wins, 7.1 deaths a run), and a deadband on how much better a square must be before it moves (safe,
but it stops chasing aim and the score halves).

**And it yanks the stick only for what is actually there.** The sharp move is load-bearing --
softening it costs runs however it is softened, and capping the acceleration was worse still --
but it was firing off the whole planning horizon. A round that will graze the aircraft in a second
is worth planning around; bolting from it looks, from outside, like the aircraft moving for no
reason. `aiPress()` is the same danger sum over `AI_PRESS`, short enough that whatever set the
yank off is plainly on the screen, and only that decides how hard it may pull. Over fourteen
minutes of flight the sudden accelerations went from 119 to 68, and the ones with nothing within
a plane's length of the aircraft from 66 to 32 -- at identical survival and score.

Sixteen six-minute runs on sixteen seeds: **0.13 deaths**, stage 3.88 on average, and 35 of 62
stage clears graded S.

**Falling is not the end of the run.** A death costs one of `MAX_CONTINUES`, and the next tap puts
you back on the stage you fell on with a fresh aircraft. The score, the kills and the best chain
stay -- you are continuing, not starting over -- and only `start()` clears them, so the run still
ends once the continues are spent.

When the raider's health runs out the stage does not end on that frame. The world nearly stops
for a beat (`HITSTOP_SCALE`), then winds back up while the hull falls, rolls over and comes apart
in a run of `BOSS_BREAKS` blasts that walk along it, trailing smoke and embers the whole way down.
The last blast takes the hull with it and the sky gets `BOSS_AFTERGLOW` to itself before the clear
panel comes up. The moment it dies, every enemy bullet in the air is wiped and nothing can hurt
you any more -- a fight you have won cannot be taken back during the fireworks.

Two ways to fly, and both are always live: drag the aircraft itself, one-to-one, the way it always
worked; or drag inside the **steering pad** in the bottom-left corner, which multiplies your thumb
by `PAD_GAIN` so one short stroke crosses the whole band without your hand covering the fight. The
bomb button takes its own finger, so you can steer and bomb at the same time.

- Simulation: `SkyWorld.kt`, pure Kotlin with no Android in it, unit tested on a plain JVM.
- Renderer: `SkyView.kt`, a Canvas view. Screen space is x in [-1, 1] across, y in [0, 1] down.
- Aircraft are drawn by `tools/generate_planes.py`, which shares the crowd game's PNG writer.
- Sounds come from the same `tools/generate_sounds.py`.

Regenerate the art and audio with:

```
python3 tools/generate_planes.py
python3 tools/generate_sounds.py skystrike/src/main/res/raw
```
