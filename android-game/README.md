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
