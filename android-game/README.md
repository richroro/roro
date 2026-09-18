# Android 게임 모음 — Sky Dodge · Crowd Rush

하나의 Gradle 프로젝트에 두 개의 독립 앱이 들어 있습니다. 둘 다 외부 라이브러리 없이
Kotlin + Android 프레임워크(Canvas)만으로 만들어져 APK 가 매우 작습니다.

| 앱 (모듈) | 장르 | applicationId |
| --- | --- | --- |
| **Sky Dodge · 스카이 닷지** (`:app`) | 떨어지는 블록을 좌우 드래그로 피하고 별을 모으는 한 손 캐주얼 | `com.richroro.skydodge` |
| **Crowd Rush · 군단 러시** (`:crowdrush`) | 군단을 이끌고 달리며 +N/×2 게이트로 병력을 불려 보스 군단과 숫자 대결하는 크라우드 러너 | `com.richroro.crowdrush` |

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
├─ crowdrush/                          # Crowd Rush
│  ├─ src/main/kotlin/com/richroro/crowdrush/
│  │  ├─ CrowdWorld.kt    # 레인·게이트·적 군단·보스 시뮬레이션, 시드 기반 결정적 레벨 생성
│  │  ├─ CrowdView.kt     # 유사 3D(원근 투영) Canvas 렌더링 + 터치 입력
│  │  └─ MainActivity.kt
│  └─ src/test/…/CrowdWorldTest.kt
└─ store/                              # Play Console 등록용 이미지 + 생성 스크립트
```

### Crowd Rush 규칙

- 군단은 자동으로 전진하고, 좌우 드래그로 레인 안에서 이동합니다.
- 게이트는 좌/우 한 쌍으로 나오며 지나간 쪽의 연산이 적용됩니다: `+N`, `×2/×3`(파란색, 이득) / `−N`, `÷2`(빨간색, 손해).
- 빨간 적 군단과 부딪히면 그 숫자만큼 병력이 줄고, 0 이하가 되면 게임 오버입니다. 피해 가면 무시됩니다.
- 레인 끝의 보스 군단보다 병력이 많으면 레벨 클리어. 보스 크기는 그 레벨의 최선 경로 병력의 60% 로 정해져 잘 고르면 항상 이길 수 있습니다.
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

| 트리거 | 동작 |
| --- | --- |
| PR, `main` push | 단위 테스트 → 릴리스 APK/AAB 빌드 → Actions 아티팩트 업로드 |
| `android-v*` 태그 push | 위 작업 + GitHub Release 생성 (APK/AAB 첨부) |
| 수동 실행 (workflow_dispatch) | 옵션: `create_github_release`, `play_track`(internal/alpha/beta/production), `play_app`(skydodge/crowdrush) |

`versionCode` 는 워크플로 실행 번호(`github.run_number`)라서 항상 증가합니다.
`versionName` 은 태그(`android-v1.2.0` → `1.2.0`) 또는 수동 실행 입력값에서 옵니다.

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

### 3. Google Play Console 에 앱 만들기 (앱마다 최초 1회, 수동)

1. https://play.google.com/console 에서 개발자 계정 등록 (1회 등록비 US$25).
2. **앱 만들기** → 이름 `Sky Dodge` 또는 `Crowd Rush`, 기본 언어 한국어, 앱/게임 → 게임, 무료.
3. **대시보드**의 설정 항목 완료:
   - 앱 액세스: 특별한 액세스 불필요
   - 광고: 광고 없음
   - 콘텐츠 등급: 설문 작성 (폭력·도박 등 모두 "아니오")
   - 타겟 대상: 13세 이상 권장 (아동 대상으로 하면 추가 정책 적용)
   - 데이터 보안: "데이터를 수집하거나 공유하지 않음"
   - 개인정보처리방침 URL: 데이터 미수집이어도 입력을 요구할 수 있음 → 간단한 페이지(GitHub Pages 등) 링크
4. **스토어 등록정보**: `store/<앱>-icon-512.png`(앱 아이콘), `store/<앱>-feature-graphic-1024x500.png`(그래픽 이미지),
   휴대전화 스크린샷 2장 이상(에뮬레이터/기기에서 캡처), 짧은 설명·자세한 설명.
5. **테스트 → 내부 테스트 → 새 버전 만들기** 에서 Actions 아티팩트(또는 GitHub Release)의 `SkyDodge-*.aab` / `CrowdRush-*.aab` 를
   업로드하고 저장. Play 앱 서명 등록을 수락하면 첫 업로드 완료.
   *첫 AAB 는 반드시 콘솔에서 직접 올려야 하며, 그 후부터 API 업로드가 가능합니다.*

### 4. 자동 업로드 연결 (선택)

1. Play Console **설정 → API 액세스** 에서 Google Cloud 프로젝트 연결 → 서비스 계정 생성 → JSON 키 다운로드.
2. Play Console **사용자 및 권한** 에서 그 서비스 계정에 앱 권한(출시 관리) 부여.
3. JSON 내용을 `PLAY_SERVICE_ACCOUNT_JSON` 시크릿으로 등록.
4. **Actions → Android Release → Run workflow** 에서 `play_track=internal`, `play_app` 선택 후 실행 → 내부 테스트 트랙에 자동 업로드.
   검수 후 콘솔에서 프로덕션으로 승급하거나, `play_track=production` 으로 재실행.

### 5. 새 버전 내기

```bash
git tag android-v1.0.1 && git push origin android-v1.0.1
```

태그를 올리면 빌드·서명·GitHub Release 까지 자동으로 진행됩니다.
