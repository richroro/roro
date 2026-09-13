# 10년 부자 프로젝트 — 매일 슬랙 알림

매일 아침 슬랙 DM으로 **"오늘의 한 걸음"**을 보내줍니다. 매일 내용이 바뀝니다:
현재 로드맵 단계(진행률 포함) + 6개 축을 돌아가며 뽑는 구체적 미션 1개 + 부의 플라이휠 리마인더.

## 부자 되는 원리 (이 시스템의 뼈대)
1. **소득 늘리기 💰** — 부의 대부분은 소득 증가에서. 시급이 아닌 가치로 돈 받기.
2. **저축·지출 통제 🏦** — 저축률이 부자 되는 속도를 결정.
3. **투자·복리 📈** — 잉여를 자산에 넣고 10년 견디면 복리가 일한다.
4. **자산 만들기 🏗️** — 한 번 만들어 계속 파는 것을 늘린다.
5. **레버리지·자동화 ⚙️** — 코드로 시간을 산다 (자동화 사업가의 무기).
6. **성장·네트워크 🧠** — 실력·건강·사람이 10년 완주를 만든다.

## 로드맵 5단계 (2026-08-07 → 2036-08-07)
1. 0~6개월: 기반 다지기
2. 6개월~2년: 첫 수익 만들기
3. 2~5년: 시스템화 & 확장
4. 5~8년: 자산화 & 다각화
5. 8~10년: 복리 & 자유

시작일로부터 경과일을 계산해 오늘이 몇 단계인지 자동으로 판단합니다.

## 파일
- `roadmap.json` — **여기만 고치면 됨.** 단계·축·미션 문구 전부 (UTF-8).
- `send_wealth_daily.ps1` — 경과일/단계/오늘의 미션 계산 후 슬랙 전송 (ASCII-safe, 토큰은 `../slackbot/.env`에서 읽음).
- `send_wealth_daily.bat` — 예약작업이 실행하는 래퍼.
- `install_wealth_task.ps1` — Windows 예약작업 `RichgogoWealth10yr` 등록 (매일 07:30).

## 사용법
```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "wealth\send_wealth_daily.ps1"
```
- 지금 바로 한 번 보내기: `Start-ScheduledTask -TaskName RichgogoWealth10yr`
- 시간 바꾸기: `install_wealth_task.ps1`의 `$runAt` 수정 후 다시 실행
- 중단: `Unregister-ScheduledTask -TaskName RichgogoWealth10yr -Confirm:$false`

## 미션을 더 넣거나 바꾸려면
`roadmap.json`의 각 pillar `missions` 배열에 문장을 추가/수정하면 됩니다. 파일만 바꾸면 스크립트는 그대로 동작합니다.

> 참고: 투자 관련 미션은 정보·습관 형성용이며, 실제 투자 판단·책임은 본인에게 있습니다.
