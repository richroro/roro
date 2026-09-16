# 메타 스레드(Threads) 자동 게시 최초 설정 가이드

스레드에 API로 글을 올리려면 **Meta 개발자 앱**과 **액세스 토큰**이 한 번 필요하다.
Threads의 OAuth 리다이렉트는 HTTPS만 허용해서 로컬 스크립트로 처리하기 번거롭기
때문에, 이 스킬은 **대시보드에서 토큰을 직접 발급해 붙여넣는** 간단한 방식을 쓴다.

아래는 한 번만 하면 된다.

## 0. 준비물
- 인스타그램에 연결된 **스레드(Threads) 계정** (공개 프로필 권장).
- Meta(페이스북) 계정.

## 1. Meta 개발자 앱 만들기
1. https://developers.facebook.com/ 접속 → 우상단 **My Apps** → **Create App**.
2. Use case(사용 사례)에서 **"Access the Threads API"** 를 선택.
3. 앱 이름 입력하고 생성.

## 2. 앱에 Threads 설정 추가
1. 앱 대시보드 왼쪽 메뉴에서 **Threads > Use case > Customize** (또는
   **Threads API** 설정)로 이동.
2. 필요한 권한(scope) 추가: **`threads_basic`**, **`threads_content_publish`**.
3. **Threads tester** 로 본인 스레드 계정을 추가하고, 스레드 앱/설정에서 초대
   수락(계정 연결)까지 완료한다.

## 3. 앱 시크릿 확인
- **App settings > Basic** 에서 **App secret**(앱 시크릿)을 확인/복사해 둔다.
  (단기 토큰을 60일짜리 장기 토큰으로 교환할 때 쓴다.)

## 4. 액세스 토큰 발급 (가장 간단한 경로)
1. Threads Use case 설정 화면에서 **Generate access token**(액세스 토큰 생성)
   버튼을 찾는다. (테스터로 추가한 본인 계정 옆)
2. 버튼을 누르면 스레드 로그인/동의 화면이 뜨고, 끝나면 **액세스 토큰 문자열**을
   보여준다. 이 값을 복사한다. (이건 보통 단기 토큰이다.)

> 대시보드에 생성 버튼이 안 보이면, Graph API 방식으로 아래 URL을 브라우저에
> 직접 넣어 로그인 → 리다이렉트된 주소의 `code` 로 토큰을 받는 방법도 있다.
> 하지만 대부분 위 "Generate access token" 버튼이 가장 쉽다.

## 5. 이 스킬에 토큰 등록
복사한 토큰과 앱 시크릿으로 아래를 한 번 실행한다. 단기 토큰을 자동으로 60일
장기 토큰으로 바꿔서 저장하고, 스레드 user_id 도 함께 저장한다.

```bash
pip install -r .claude/skills/threads-auto-post/requirements.txt

python .claude/skills/threads-auto-post/scripts/auth.py \
  --token "붙여넣은_액세스_토큰" \
  --app-secret "앱_시크릿"
```

성공하면 `secrets/token.json` 과 `secrets/config.json` 이 생성된다. 이후 게시는
저장된 장기 토큰으로 조용히 동작하고, 만료가 가까워지면 자동으로 갱신한다.

## 참고 / 제약
- 텍스트 게시글은 **최대 500자**.
- 게시는 2단계다: 컨테이너 생성 → 발행. 스크립트가 알아서 처리한다.
- 장기 토큰은 약 60일 유효하고, 24시간 지난 뒤부터 갱신 가능하다. 스킬이 만료
  10일 전부터 자동 갱신을 시도한다. **60일 넘게 한 번도 안 돌리면 만료**되므로,
  그럴 땐 4단계부터 토큰만 다시 발급해 `auth.py` 를 재실행하면 된다.
- 이미지 게시는 **공개적으로 접근 가능한 이미지 URL**이 필요하다(로컬 파일 불가).
