---
name: remote-control
description: 본인이 관리하는 원격 리눅스 서버/클라우드 인스턴스에 SSH로 명령을 실행하고, 파일을 동기화하고, VNC로 화면·마우스·키보드를 제어한다. "다른 컴퓨터 제어해줘", "원격 서버에 명령 실행", "서버랑 파일 동기화", "VNC로 화면 조작" 같은 요청에 사용한다.
---

# 원격 서버 제어 (SSH 명령 실행 + 파일 동기화 + VNC 화면 제어)

본인이 소유/관리하는 원격 리눅스 서버(클라우드 인스턴스)를 세 가지 방식으로 제어한다.

1. **명령어 실행** — SSH로 원격 셸 명령 실행 (`scripts/remote_exec.sh`)
2. **파일 동기화/전송** — rsync/scp로 로컬 ↔ 원격 파일 동기화 (`scripts/remote_sync.sh`)
3. **화면/마우스/키보드 제어** — 원격에 이미 설치된 VNC 서버에 `vncdo` CLI로 접속해 GUI 조작

## 언제 이 스킬을 쓰는가

- 사용자가 본인 소유의 원격 서버/클라우드 인스턴스에 명령을 실행하거나 상태를 확인하고 싶을 때
- 로컬과 원격 서버 간 파일을 주고받고 싶을 때
- 원격 서버의 데스크톱(GUI)을 화면으로 보면서 마우스 클릭/타이핑으로 조작하고 싶을 때

## 실행 전 반드시 확인할 것 (안전 수칙)

원격 제어는 되돌리기 어려운 실제 시스템에 영향을 준다. 아래 원칙을 반드시 지킨다.

1. **대상이 사용자 본인 소유/관리 서버인지 확인한다.** 제3자 소유 시스템이거나 접근 권한이
   불명확하면 실행하지 않는다.
2. **파괴적이거나 되돌리기 어려운 명령**(`rm -rf`, `systemctl stop`, DB 삭제, 방화벽 변경,
   패키지 제거/업그레이드, reboot/shutdown 등)은 실행 전에 반드시 사용자에게 명령 전문을
   보여주고 확인받는다. 절대 임의로 `--force`, `-y`, `--no-verify` 류 플래그를 추가하지 않는다.
3. **파일 동기화는 기본적으로 dry-run(미리보기)부터** 보여준다. `remote_sync.sh`는 `--apply`를
   명시하지 않으면 실제로 아무것도 옮기지 않는다 — 미리보기 결과를 사용자에게 보여주고
   확인받은 뒤에만 `--apply`로 재실행한다.
4. **VNC 화면 제어는 먼저 캡처(스크린샷)로 현재 상태를 확인한 뒤에만** 클릭/타이핑을 실행한다.
   화면을 보지 않고 좌표를 추측해서 클릭하지 않는다.
5. **자격 증명(비밀번호, SSH 키 내용, VNC 비밀번호)을 로그나 대화에 그대로 노출하지 않는다.**
   가능하면 SSH 키 기반 인증과 `~/.ssh/config`의 Host alias를 사용한다.

## 0. 사전 준비 (최초 1회)

**SSH** — `~/.ssh/config`에 원격 서버를 alias로 등록해두면 매번 IP/키 경로를 반복하지 않아도
된다. 이미 설정되어 있다면 생략.

```
Host myserver
    HostName <원격 IP 또는 도메인>
    User <원격 사용자명>
    IdentityFile ~/.ssh/id_ed25519
```

**rsync** — Windows(Git Bash) 환경에는 기본 포함되어 있지 않을 수 있다. 없으면
`remote_sync.sh`가 자동으로 `scp -r`로 대체한다(단, dry-run 미지원).

**vncdotool** — VNC 화면 제어에 필요. 최초 1회 설치 확인 후 없으면 설치:

```bash
python -m pip show vncdotool >/dev/null 2>&1 || python -m pip install vncdotool
```

## 1. 명령어 실행

```bash
bash .claude/skills/remote-control/scripts/remote_exec.sh myserver "df -h"
bash .claude/skills/remote-control/scripts/remote_exec.sh myserver "systemctl status myapp"
```

실행할 명령이 조회성(상태 확인, 로그 조회 등)이면 바로 실행해도 되지만, 시스템 상태를
바꾸는 명령이면 "안전 수칙" 2번을 따른다.

## 2. 파일 동기화/전송

```bash
# 1) 먼저 미리보기 (기본값, --apply 없음)
bash .claude/skills/remote-control/scripts/remote_sync.sh push ./dist myserver /var/www/app

# 2) 사용자 확인 후 실제 적용
bash .claude/skills/remote-control/scripts/remote_sync.sh push ./dist myserver /var/www/app --apply

# 원격 -> 로컬 다운로드도 동일한 방식
bash .claude/skills/remote-control/scripts/remote_sync.sh pull ./logs myserver /var/log/app.log --apply
```

## 3. 화면/마우스/키보드 제어 (VNC)

원격 서버에 VNC 서버가 이미 떠 있다고 가정한다 (예: `vncserver :1` → 포트 5901).
`vncdo` CLI로 접속 문자열은 `host::port` 형식을 쓴다.

**항상 캡처부터:**

```bash
vncdo -s <원격IP>::5901 -p <VNC비밀번호> capture screen.png
```

캡처한 이미지를 Read 도구로 확인한 뒤, 그 좌표를 근거로만 다음 동작을 수행한다.

```bash
# 마우스 이동 + 클릭
vncdo -s <원격IP>::5901 -p <VNC비밀번호> move 500 300 click 1

# 텍스트 입력
vncdo -s <원격IP>::5901 -p <VNC비밀번호> type "hello world"

# 키 입력 (조합키는 - 로 연결)
vncdo -s <원격IP>::5901 -p <VNC비밀번호> key ctrl-alt-Delete

# 여러 동작을 한 번에 (캡처로 검증하며 순차 실행)
vncdo -s <원격IP>::5901 -p <VNC비밀번호> move 100 200 click 1 pause 1 capture after.png
```

SSH 터널을 통해 VNC 포트를 감싸고 싶다면(공인 IP로 VNC 포트를 직접 열어두고 싶지 않은 경우):

```bash
ssh -L 5901:localhost:5901 -N -f myserver
vncdo -s localhost::5901 -p <VNC비밀번호> capture screen.png
```

## 완료 후

각 단계 실행 결과(명령 출력, 동기화된 파일 목록, 캡처 이미지 경로)를 사용자에게 요약해서
알려주고, 다음 동작이 필요하면 무엇을 할지 확인한다.
