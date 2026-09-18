# -*- coding: utf-8 -*-
"""대본 JSON 을 검증해서 queue/ 에 다음 번호로 넣는다.

    python add_to_queue.py --file /tmp/script.json
    python add_to_queue.py --dir /tmp/scripts/        # 폴더 안 *.json 전부

큐는 파일명 정렬 순(FIFO)으로 소비되므로 0001.json, 0002.json … 번호를 자동으로 붙인다.
"""
import argparse
import json
import re
import sys
from pathlib import Path

from common import QUEUE_DIR, POSTED_DIR
from render import validate_script


def next_number():
    nums = []
    for d in (QUEUE_DIR, POSTED_DIR):
        if d.exists():
            for p in d.glob("*.json"):
                m = re.match(r"(\d+)", p.stem)
                if m:
                    nums.append(int(m.group(1)))
    return (max(nums) + 1) if nums else 1


def add(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    script = validate_script(data)
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    dest = QUEUE_DIR / f"{next_number():04d}.json"
    dest.write_text(json.dumps(script, ensure_ascii=False, indent=2), encoding="utf-8")
    nar = sum(len(s["narration"]) for s in script["scenes"]) + len(script.get("hook", "")) + len(script.get("cta", ""))
    print(f"큐 추가: {dest.name}  「{script['title']}」  장면 {len(script['scenes'])}  나레이션 {nar}자")
    return dest


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--file")
    g.add_argument("--dir")
    args = ap.parse_args()
    if args.file:
        add(args.file)
    else:
        files = sorted(Path(args.dir).glob("*.json"))
        if not files:
            print("폴더에 *.json 이 없습니다.", file=sys.stderr)
            sys.exit(1)
        for f in files:
            add(f)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"큐 추가 실패: {e}", file=sys.stderr)
        sys.exit(1)
