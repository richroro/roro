# Sky Dodge (스카이 닷지) — Android 게임

하늘에서 떨어지는 블록을 좌우 드래그로 피하고 별을 모아 점수를 올리는 한 손 캐주얼 게임입니다.
외부 라이브러리 없이 Kotlin + Android 프레임워크(Canvas)만으로 만들어져 APK 가 매우 작습니다.

| 항목 | 값 |
| --- | --- |
| 패키지 이름 (applicationId) | `com.richroro.skydodge` |
| minSdk / targetSdk / compileSdk | 26 / 36 / 36 |
| 언어 | Kotlin 2.2, AGP 8.13, Gradle 8.14 |
| 권한 | 없음 (인터넷·저장소 등 일절 사용 안 함) |
| 데이터 수집 | 없음 (최고 점수만 기기 내 SharedPreferences 에 저장) |

## 구조

```
android-game/
├─ app/src/main/kotlin/com/richroro/skydodge/
│  ├─ GameWorld.kt     # 순수 Kotlin 게임 시뮬레이션 (Android 의존성 없음 → JVM 단위 테스트)
│  ├─ GameView.kt      # Canvas 렌더링 + Choreographer 프레임 루프 + 터치 입력
│  └─ MainActivity.kt  # 전체화면(immersive) Activity
├─ app/src/test/…/GameWorldTest.kt   # 충돌·점수·난이도·일시정지 단위 테스트
├─ app/src/main/res/                 # 문자열(en/ko), 색상, 테마, 적응형 아이콘
└─ store/                            # Play Console 등록용 이미지 + 생성 스크립트
```

## 로컬 빌드

Android Studio 에서 `android-game/` 폴더를 열거나, 터미널에서:

```bash
cd android-game
./gradlew testDebugUnitTest      # 단위 테스트
./gradlew assembleDebug          # app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease bundleRelease   # 릴리스 APK + AAB (키스토어 env 없으면 디버그 키 서명)
```

## CI / 배포 파이프라인 (`.github/workflows/android-release.yml`)

| 트리거 | 동작 |
| --- | --- |
| PR, `main` push | 단위 테스트 → 릴리스 APK/AAB 빌드 → Actions 아티팩트 업로드 |
| `android-v*` 태그 push | 위 작업 + GitHub Release 생성 (APK/AAB 첨부) |
| 수동 실행 (workflow_dispatch) | 옵션: `create_github_release`, `play_track`(internal/alpha/beta/production) |

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

### 3. Google Play Console 에 앱 만들기 (최초 1회, 수동)

1. https://play.google.com/console 에서 개발자 계정 등록 (1회 등록비 US$25).
2. **앱 만들기** → 이름 `Sky Dodge`, 기본 언어 한국어, 앱/게임 → 게임, 무료.
3. **대시보드**의 설정 항목 완료:
   - 앱 액세스: 특별한 액세스 불필요
   - 광고: 광고 없음
   - 콘텐츠 등급: 설문 작성 (폭력·도박 등 모두 "아니오")
   - 타겟 대상: 13세 이상 권장 (아동 대상으로 하면 추가 정책 적용)
   - 데이터 보안: "데이터를 수집하거나 공유하지 않음"
   - 개인정보처리방침 URL: 데이터 미수집이어도 입력을 요구할 수 있음 → 간단한 페이지(GitHub Pages 등) 링크
4. **스토어 등록정보**: `store/icon-512.png`(앱 아이콘), `store/feature-graphic-1024x500.png`(그래픽 이미지),
   휴대전화 스크린샷 2장 이상(에뮬레이터/기기에서 캡처), 짧은 설명·자세한 설명.
5. **테스트 → 내부 테스트 → 새 버전 만들기** 에서 Actions 아티팩트(또는 GitHub Release)의 `SkyDodge-*.aab` 를
   업로드하고 저장. Play 앱 서명 등록을 수락하면 첫 업로드 완료.
   *첫 AAB 는 반드시 콘솔에서 직접 올려야 하며, 그 후부터 API 업로드가 가능합니다.*

### 4. 자동 업로드 연결 (선택)

1. Play Console **설정 → API 액세스** 에서 Google Cloud 프로젝트 연결 → 서비스 계정 생성 → JSON 키 다운로드.
2. Play Console **사용자 및 권한** 에서 그 서비스 계정에 앱 권한(출시 관리) 부여.
3. JSON 내용을 `PLAY_SERVICE_ACCOUNT_JSON` 시크릿으로 등록.
4. **Actions → Android Release → Run workflow** 에서 `play_track=internal` 로 실행 → 내부 테스트 트랙에 자동 업로드.
   검수 후 콘솔에서 프로덕션으로 승급하거나, `play_track=production` 으로 재실행.

### 5. 새 버전 내기

```bash
git tag android-v1.0.1 && git push origin android-v1.0.1
```

태그를 올리면 빌드·서명·GitHub Release 까지 자동으로 진행됩니다.
