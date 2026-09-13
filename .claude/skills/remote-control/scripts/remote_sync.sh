#!/usr/bin/env bash
# 로컬 <-> 원격 서버 간 파일 동기화. 기본은 --dry-run(미리보기)이며,
# 실제로 파일을 옮기려면 --apply 를 명시적으로 붙여야 한다.
#
# 사용법:
#   remote_sync.sh <push|pull> <local_path> <host> <remote_path> [--apply]
#
# 예 (미리보기만):
#   remote_sync.sh push ./dist myserver /var/www/app
# 예 (실제 전송):
#   remote_sync.sh push ./dist myserver /var/www/app --apply
#   remote_sync.sh pull myserver /var/log/app.log ./logs --apply

set -euo pipefail

if [ $# -lt 4 ]; then
  echo "usage: remote_sync.sh <push|pull> <local_path> <host> <remote_path> [--apply]" >&2
  exit 1
fi

DIRECTION="$1"
LOCAL_PATH="$2"
HOST="$3"
REMOTE_PATH="$4"
APPLY="${5:-}"

RSYNC_BIN="$(command -v rsync || true)"

DRYRUN_FLAG="--dry-run"
if [ "$APPLY" = "--apply" ]; then
  DRYRUN_FLAG=""
else
  echo "[remote_sync] --apply 가 없어 미리보기(dry-run)만 실행합니다. 실제 전송하려면 --apply를 붙이세요." >&2
fi

if [ "$DIRECTION" = "push" ]; then
  SRC="$LOCAL_PATH"
  DST="$HOST:$REMOTE_PATH"
elif [ "$DIRECTION" = "pull" ]; then
  SRC="$HOST:$REMOTE_PATH"
  DST="$LOCAL_PATH"
else
  echo "direction must be 'push' or 'pull'" >&2
  exit 1
fi

if [ -n "$RSYNC_BIN" ]; then
  echo "[remote_sync] rsync $DRYRUN_FLAG -avz $SRC $DST" >&2
  # shellcheck disable=SC2086
  rsync $DRYRUN_FLAG -avz -e "ssh -o ConnectTimeout=10" "$SRC" "$DST"
else
  echo "[remote_sync] rsync가 없어 scp로 대체합니다 (dry-run 미지원, --apply 없이는 실행하지 않음)." >&2
  if [ "$APPLY" != "--apply" ]; then
    echo "scp는 미리보기를 지원하지 않습니다. 실제로 전송하려면 --apply를 붙여 다시 실행하세요." >&2
    exit 1
  fi
  scp -o ConnectTimeout=10 -r "$SRC" "$DST"
fi
