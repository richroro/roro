#!/usr/bin/env bash
# 원격 서버에서 명령어를 실행한다. 반드시 SSH 접속 정보(~/.ssh/config의 Host alias)가
# 미리 설정되어 있어야 한다.
#
# 사용법:
#   remote_exec.sh <host> "<command>"
#
# 예:
#   remote_exec.sh myserver "df -h"
#   remote_exec.sh myserver "systemctl restart myapp"

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: remote_exec.sh <host> \"<command>\"" >&2
  exit 1
fi

HOST="$1"
shift
CMD="$*"

echo "[remote_exec] $HOST \$ $CMD" >&2
ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" -- "$CMD"
