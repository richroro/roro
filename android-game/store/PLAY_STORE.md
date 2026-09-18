# Google Play 등록 가이드 — 빌런 러시 (Villain Rush)

이 문서는 Play Console 에 앱을 올릴 때 화면에 그대로 붙여 넣을 수 있게 정리한 자료입니다.
자동화할 수 있는 부분(빌드·서명·업로드)은 `.github/workflows/android-release.yml` 이 처리하고,
개발자 계정 생성과 최초 업로드처럼 본인 인증이 필요한 단계만 직접 하시면 됩니다.

## 0. 준비물 체크리스트

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| 릴리스 AAB | ✅ 준비됨 | [최신 릴리스](https://github.com/richroro/roro/releases)의 `VillainRush-*.aab` (게임별 태그 `villainrush-v*`) |
| 앱 아이콘 512×512 | ✅ 준비됨 | `store/goblinhunters-icon-512.png` |
| 그래픽 이미지 1024×500 | ✅ 준비됨 | `store/goblinhunters-feature-graphic-1024x500.png` |
| 휴대전화 스크린샷 | ✅ 준비됨 | `store/screenshots/play-*.jpg` (1080×1920, 5장) |
| 앱 이름·설명 문구 | ✅ 준비됨 | 아래 2번 |
| 개인정보처리방침 URL | ⚠️ main 병합 후 | `https://richroro.github.io/roro/privacy/villain-rush.html` |
| 데이터 보안·콘텐츠 등급 답변 | ✅ 준비됨 | 아래 3번 |
| Google Play 개발자 계정 | ❌ 직접 필요 | 최초 1회 등록비 US$25, 신분 확인 |
| 업로드 키스토어 | ❌ 직접 필요 | 아래 1번 |

## 1. 업로드 키 만들고 Secrets 등록 (최초 1회)

```bash
keytool -genkeypair -v -keystore villainrush-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 villainrush-upload.jks > villainrush-upload.jks.b64   # macOS: base64 -i villainrush-upload.jks
```

`.jks` 파일은 저장소에 절대 커밋하지 말고 안전한 곳에 백업하세요. 분실하면 앱 업데이트가 불가능합니다.

저장소 **Settings → Secrets and variables → Actions** 에 등록:

| Secret | 값 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `villainrush-upload.jks.b64` 파일 내용 |
| `ANDROID_KEYSTORE_PASSWORD` | 키스토어 비밀번호 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 |

등록 후 **Actions → Android Release → Run workflow** 를 실행하면 릴리스 키로 서명된 AAB 가 나옵니다.
(시크릿이 없으면 디버그 키로 서명되어 Play 업로드가 거부됩니다.)

## 2. 스토어 등록정보 문구

### 앱 이름 (30자 이내)
```
빌런 러시
```

### 간단한 설명 (80자 이내)
```
김부장, 황금수저, 잔소리 이모… 오늘의 빌런을 동료를 모아 돌파하는 러너 게임
```

### 자세한 설명 (4000자 이내)
```
월요일 아침 9시. 부장님이 내 기획안을 들고 오시더니 "이거 내가 말했던 거잖아?" 라고 하신다.

빌런 러시는 우리가 매일 마주치는 '현실 빌런'을 동료들과 함께 돌파하는 한 손 러너 게임입니다.

■ 이렇게 플레이합니다
· 좌우로 드래그해서 길을 따라 달립니다. 동료들은 알아서 앞으로 사격합니다.
· 게이트를 쏘면 숫자가 올라갑니다. +5 를 +8 로, ÷2 를 +1 로 바꿔 놓고 지나가세요.
· 어느 쪽 게이트로 지나갈지가 전부입니다. 파란 쪽은 동료가 늘고, 보라 쪽은 줄어듭니다.
· 길 끝에는 오늘의 빌런이 기다립니다. 도착하기 전에 최대한 깎아 두세요.

■ 오늘의 빌런들
· STAGE 1 · 사무실 — 김부장 "왕년엔 말이야"
· STAGE 2 · 동창회 — 황금수저, 재벌집 사위. 오늘만 세 번째로 차 키를 꺼낸다.
· STAGE 3 · 큰집 거실 — 잔소리 이모, 30년째 같은 질문
· STAGE 4 · 새 아파트 — 층간소음 마왕, 천장에서 드리블 소리가 들린다

스테이지를 모두 깨면 시즌 2가 시작됩니다. 더 빠르고, 더 많고, 더 끈질기게.

■ 아이템
· ⚡ 연사 — 6초 동안 발사 속도 2배
· 🛡 방어막 — 손해 게이트나 적 무리 한 번을 막아줍니다
· ✚ 증원 — 동료 30% 충원
· 💣 폭탄 — 앞쪽 무리를 싹 정리하고 빌런 체력도 깎습니다

■ 이런 분께
· 지하철에서 한 손으로 가볍게 할 게임을 찾는 분
· 오늘 회사에서 있었던 일을 어딘가에 풀고 싶은 분
· 광고와 결제에 지친 분

■ 약속
· 광고 없음
· 인앱 결제 없음
· 인터넷 권한조차 없습니다. 기록은 기기에만 저장됩니다.
· 설치 용량 1MB 미만
```

### 영문 (선택)
- App name: `Villain Rush`
- Short description: `Gather your crew and take down the villain waiting at the end of every day.`

### 카테고리·태그
- 앱/게임: **게임**
- 카테고리: **캐주얼** (대안: 아케이드)
- 태그: 러너, 캐주얼, 싱글 플레이어, 오프라인

## 3. 콘솔 설문 답변

| 항목 | 답변 |
| --- | --- |
| 앱 액세스 | 모든 기능을 제한 없이 사용 가능 (로그인 없음) |
| 광고 | 광고 없음 |
| 콘텐츠 등급 (게임 설문) | 폭력·성적 콘텐츠·욕설·약물·도박 전부 "아니오". 만화적 캐릭터 간의 가벼운 대결만 있음 → 전체이용가 예상 |
| 타겟 연령층 | 13세 이상 (아동 대상 앱 아님) |
| 데이터 보안 | **데이터를 수집하거나 공유하지 않음**. 데이터 암호화 전송 해당 없음. 삭제 요청 해당 없음 |
| 정부 앱 | 아니오 |
| 금융 기능 | 없음 |
| 개인정보처리방침 URL | `https://richroro.github.io/roro/privacy/villain-rush.html` |

## 4. 콘솔에서 하는 일 (본인 계정 필요)

1. <https://play.google.com/console> 에서 개발자 계정 등록 (US$25, 신분 확인, 보통 1~2일 소요).
2. **앱 만들기** → 이름 `빌런 러시`, 기본 언어 한국어, 앱/게임 → **게임**, 무료.
3. 대시보드의 설정 항목을 위 3번 표대로 채웁니다.
4. **스토어 등록정보**에 2번 문구와 `store/` 의 아이콘·그래픽 이미지·스크린샷을 올립니다.
5. **테스트 → 내부 테스트 → 새 버전 만들기** 에서 `VillainRush-*.aab` 업로드 후 저장 → 검토 → 출시.
   Play 앱 서명 등록을 수락하면 최초 업로드 완료입니다.
6. 내부 테스트로 확인한 뒤 **프로덕션**으로 승급하면 심사(보통 며칠) 후 공개됩니다.

> 최초 AAB 는 반드시 콘솔에서 직접 올려야 합니다. 그 다음부터 API 자동 업로드가 열립니다.

## 5. 이후 업데이트 자동화 (선택)

1. Play Console **설정 → API 액세스** 에서 Google Cloud 프로젝트 연결 → 서비스 계정 생성 → JSON 키 다운로드.
2. **사용자 및 권한** 에서 그 서비스 계정에 이 앱의 출시 권한 부여.
3. JSON 내용을 저장소 시크릿 `PLAY_SERVICE_ACCOUNT_JSON` 으로 등록.
4. **Actions → Android Release → Run workflow** 에서 `app=villainrush`, `play_track=internal` 실행 → 자동 업로드.

이후에는 태그만 올리면 빌드·서명·릴리스까지 자동으로 진행됩니다.

```bash
git tag villainrush-v1.9.0 && git push origin villainrush-v1.9.0
```

두 게임은 Play Console 에서 별개의 앱이라 등록정보·심사·versionCode 가 각각입니다.
Sky Dodge 를 올릴 때는 같은 절차를 그 앱으로 한 번 더 진행하고, 태그는 `skydodge-v*` 를 씁니다.
