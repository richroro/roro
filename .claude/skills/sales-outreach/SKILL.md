---
name: sales-outreach
description: 1인기업(1인 사장·프리랜서·소상공인)을 발굴해 리드 목록으로 정리하고, 업무 자동화 대행/컨설팅을 제안하는 개인화 영업 이메일을 초안→확인→발송한다. 발송 내역은 Slack DM으로 알린다. "1인기업 찾아줘", "잠재고객 발굴", "영업 이메일 보내줘", "콜드메일 써줘", "자동화 영업 자동화", "리드 리스트 만들어줘" 같은 요청에 사용한다.
---

# 1인기업 영업 아웃리치 (리드 발굴 + 자동화 영업 이메일)

혼자 일하는 사장님(1인 쇼핑몰·프리랜서·동네 매장·스튜디오·컨설턴트 등)을 찾아
**리드 목록(CSV)** 으로 정리하고, 그들의 반복 업무를 대신 자동화해 주겠다는
**개인화 영업 이메일**을 만들어 발송한다. 발송 결과는 **Slack DM**으로 남긴다.

> 이 스킬의 목적은 "대량 스팸"이 아니라 **소수·정밀 타깃 아웃리치**다.
> 리드마다 실제로 도움이 될 자동화 포인트 1개를 찾아 개인화하는 것이 핵심이다.

## 언제 이 스킬을 쓰는가
- "○○ 업종 1인기업 좀 찾아줘" — 웹 리서치로 후보 발굴 → `leads.csv` 정리
- "이 사람들한테 자동화 영업 메일 보내줘" — 템플릿 개인화 → 초안 → 확인 → 발송
- "콜드메일 초안 써줘" — 발송 없이 템플릿만 개인화해서 보여주기
- "답장 없는 사람 팔로업 보내줘" — follow-up 템플릿으로 재접촉
- "영업 메일 매일 자동으로 나가게 해줘" — 큐 + 예약작업(선택)

## ⚠️ 반드시 지키는 발송 원칙 (안전)
이메일 발송은 **되돌릴 수 없는 외부 발신 행위**다. 항상 이 순서를 따른다.

1. **초안 먼저.** 실제 발송 전에 대상·제목·본문을 사용자에게 그대로 보여준다.
2. **명시적 확인.** 사용자가 "보내"라고 분명히 답하기 전에는 `send_email.py`를
   `--send` 로 실행하지 않는다. 확인 없이는 `--dry-run`(미리보기)만 돈다.
3. **한 건 = 한 확인이 기본.** 여러 명에게 보낼 때도 첫 발송 전에 목록 전체를
   요약해 확인받고, 하루 발송량은 기본 상한(20건)을 넘기지 않는다.
4. **개인화 없는 메일은 보내지 않는다.** `{{personal_hook}}` 가 비어 있으면
   그 리드는 건너뛴다(스팸 방지).
5. **수신거부 문구 포함.** 모든 메일 하단에 1줄 opt-out 안내를 넣는다(템플릿 기본).
6. 웹에서 수집한 이메일이 **영업 수신을 명시적으로 거부**(예: "광고 메일 사절")
   한 경우 발송하지 않는다.

## 최초 1회 설정
발송에는 사용자 본인 메일 계정의 SMTP 접근이 필요하다. `secrets/.env` 가 없으면
아직 설정 전이다. 이때는 **곧바로 발송하지 말고** `references/naver_smtp_setup.md`
를 안내한다. 핵심만(네이버 기준, 사용자 메일 from0731@naver.com):

1. 네이버 → 환경설정 → POP3/SMTP 사용 **ON**
2. 네이버 → 내정보 → 2단계 인증에서 **애플리케이션 비밀번호** 발급
3. `secrets/.env.example` 를 `secrets/.env` 로 복사하고 값 채우기:
   ```
   SMTP_HOST=smtp.naver.com
   SMTP_PORT=465
   SMTP_USER=from0731@naver.com
   SMTP_PASSWORD=<앱 비밀번호>
   FROM_NAME=김병채
   REPLY_TO=from0731@naver.com
   ```
   > 앱 비밀번호는 사용자가 직접 파일에 넣는다. Claude는 비밀번호를 대신
   > 입력하지 않고, 스크립트는 이 .env 에서만 읽는다.
4. 발송 테스트(자기 자신에게):
   ```bash
   python .claude/skills/sales-outreach/scripts/send_email.py \
     --to from0731@naver.com --subject "테스트" --body-file "/경로/test.html" --send
   ```

## 1) 리드 발굴 워크플로 (Claude가 웹 리서치)
"○○ 업종 1인기업 찾아줘" 요청이 오면:

1. 타깃을 좁힌다. 필요하면 한 번 되묻는다 — 업종/지역/규모(1인 여부 신호)/
   자동화로 풀 만한 반복 업무(예약 관리·정산·CS 응대·SNS 발행·재고).
2. `WebSearch` 로 후보를 찾는다. 상세 방법은 `references/finding-leads.md` 참고.
   - 공개된 사업자 홈페이지/블로그/인스타의 **공개 문의 이메일**만 수집한다.
   - "1인" 신호(대표=운영자 1명, 소규모 공방/스튜디오/프리랜서)를 확인한다.
3. 각 리드마다 **개인화 훅 1문장**(`personal_hook`)을 반드시 메모한다.
   예: "예약을 인스타 DM으로만 받고 계셔서 자동 예약·리마인드가 잘 맞겠다".
4. `leads.csv` 에 append 한다(형식은 `leads.example.csv`). 헬퍼:
   ```bash
   python .claude/skills/sales-outreach/scripts/add_lead.py \
     --name "공방이름/대표" --email "hi@example.com" --company "○○공방" \
     --niche "수제 가죽공방" --source "인스타 프로필" \
     --hook "예약을 DM으로만 받고 있어 자동 예약·알림이 효과 큼"
   ```
   중복 이메일은 자동으로 건너뛴다.

> 개인정보 주의: 공개된 비즈니스 문의처만 다룬다. 개인 사생활 정보를 수집·결합
> 하지 않는다. 명단은 `secrets/`(git 제외)에 두는 것을 권장한다.

## 2) 이메일 개인화 & 초안 미리보기
템플릿과 리드를 합쳐 개인화 본문을 만든다. **발송 없이** 미리보기만:
```bash
python .claude/skills/sales-outreach/scripts/render.py \
  --template cold-intro --lead-email "hi@example.com"
```
- `--template` : `templates/` 의 파일명(확장자 제외). 목록은 아래 "템플릿".
- 리드 CSV의 값으로 `{{name}}`, `{{company}}`, `{{personal_hook}}` 등을 치환한다.
- 훅이 비어 있으면 경고하고 렌더링을 막는다(원칙 4).
- 출력된 제목/본문을 **그대로 사용자에게 보여주고** 손볼 부분을 확인받는다.

Claude가 직접 본문을 다듬어도 된다(템플릿은 출발점일 뿐). 다듬은 결과를
임시 `.html` 파일로 저장해 아래 발송 스크립트에 넘긴다.

## 3) 발송 (확인 후에만)
사용자가 명시적으로 승인하면:
```bash
python .claude/skills/sales-outreach/scripts/send_email.py \
  --to "hi@example.com" --subject "제목" --body-file "/경로/mail.html" \
  --lead-email "hi@example.com" --send
```
- `--send` 없이 실행하면 **dry-run**(발송 안 함, 미리보기+로그만).
- 발송 성공 시 `secrets/sent_log.csv` 에 기록하고, `leads.csv` 의 상태를
  `contacted` 로 갱신, **Slack DM**으로 발송 알림.
- 하루 상한(기본 20건, `--daily-cap` 로 조정)을 넘기면 발송을 막는다.

### 여러 명에게 (배치)
`leads.csv` 에서 `status=new` 이고 훅이 있는 리드만 골라 순차 발송한다.
**반드시 먼저 대상 목록을 요약해 확인받고**, 승인 후에만 `--send`:
```bash
# 1) 미리보기 (누구에게 무엇이 나가는지 확인)
python .claude/skills/sales-outreach/scripts/send_batch.py --template cold-intro
# 2) 승인 후 실제 발송
python .claude/skills/sales-outreach/scripts/send_batch.py --template cold-intro --send
```
발송 간 지연(기본 45초)과 하루 상한이 적용된다(스팸/차단 방지).

## 4) 팔로업
답장이 없으면 `follow-up-1`(3일 후), `follow-up-2`(7일 후) 템플릿으로 재접촉한다.
사용자가 답장을 받았다고 알려주면 `leads.csv` 상태를 `replied`/`won`/`lost` 로
바꿔 이후 팔로업 대상에서 제외한다:
```bash
python .claude/skills/sales-outreach/scripts/set_status.py --email "hi@example.com" --status replied
```

## 템플릿 (templates/)
- `cold-intro.md` — 첫 접촉. 자동화 제안 + 개인화 훅 + 가벼운 CTA
- `follow-up-1.md` — 무응답 3일 후, 짧은 리마인드
- `follow-up-2.md` — 무응답 7일 후, 가치 한 스푼 + 마지막 노크
- `niche-shop.md` — 온라인 쇼핑몰/스마트스토어 1인 운영자용
- `niche-consultant.md` — 프리랜서·컨설턴트·강사용
- `niche-local.md` — 동네 매장·공방·스튜디오(예약/CS)용

치환 변수: `{{name}}`(호칭), `{{company}}`, `{{niche}}`, `{{personal_hook}}`,
`{{sender_name}}`, `{{sender_contact}}`. 값은 `leads.csv` + `.env` 에서 온다.
새 템플릿은 같은 형식(`제목:` 첫 줄 + 본문)으로 `templates/` 에 추가하면 된다.

## Slack 알림
`slackbot/.env` 의 `SLACK_BOT_TOKEN`/`SLACK_ALLOWED_USER_ID` 를 재사용해 발송
내역을 본인에게 DM으로 보낸다. 토큰이 없으면 알림만 조용히 건너뛰고 발송은 정상.

## 파일 구조
- `scripts/common.py` — .env·CSV·Slack·개인화 치환 공용 로직
- `scripts/add_lead.py` — 리드 1건 추가(중복 방지)
- `scripts/render.py` — 템플릿+리드 → 개인화 이메일 미리보기(발송 안 함)
- `scripts/send_email.py` — 이메일 1건 발송(`--send` 필요, 기본 dry-run)
- `scripts/send_batch.py` — new 상태 리드 순차 발송(상한·지연 적용)
- `scripts/set_status.py` — 리드 상태 변경(replied/won/lost 등)
- `templates/*.md` — 영업/팔로업 이메일 템플릿
- `references/finding-leads.md` — 1인기업 찾는 리서치 가이드
- `references/naver_smtp_setup.md` — 네이버 SMTP/앱 비밀번호 설정
- `secrets/` — .env·leads.csv·sent_log.csv (git 제외 권장)
- `leads.example.csv` / `secrets/.env.example` — 형식 예시
