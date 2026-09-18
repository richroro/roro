# -*- coding: utf-8 -*-
"""발행 대기 큐.

queue/NNNN.json 으로 저장하고 번호가 작은 것부터(FIFO) 발행한다.
발행이 끝나면 queue/posted/ 로 옮기고 data/posted_log.json 에 기록한다.
"""
import json
from pathlib import Path

from .config import POSTED_DIR, QUEUE_DIR, load_state, record_published, save_state
from .post import Post


def queue_files() -> list:
    if not QUEUE_DIR.exists():
        return []
    return sorted(p for p in QUEUE_DIR.glob("*.json") if p.is_file())


def load_post(path: Path) -> Post:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return Post.from_dict(data)


def save_post(path: Path, post: Post) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(
        json.dumps(post.to_dict(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def _max_existing_number() -> int:
    biggest = 0
    for d in (QUEUE_DIR, POSTED_DIR):
        if not d.exists():
            continue
        for p in d.glob("*.json"):
            try:
                biggest = max(biggest, int(p.stem.split("-")[0]))
            except ValueError:
                continue
    return biggest


def add_post(post: Post) -> Path:
    """큐 끝에 글을 추가한다. 번호는 기존 최대값+1 과 상태 카운터 중 큰 값."""
    post.validate()
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state()
    seq = max(int(state.get("queue_seq", 1)), _max_existing_number() + 1)
    path = QUEUE_DIR / f"{seq:04d}.json"
    save_post(path, post)
    state["queue_seq"] = seq + 1
    save_state(state)
    return path


def next_post():
    """큐 맨 앞 (path, Post) 또는 None."""
    files = queue_files()
    if not files:
        return None
    return files[0], load_post(files[0])


def resolve(ref: str):
    """'3' 같은 번호, '0003.json' 같은 파일명, 또는 임의 경로를 (path, Post) 로 푼다."""
    ref = str(ref).strip()
    candidates = []
    if ref.isdigit():
        candidates.append(QUEUE_DIR / f"{int(ref):04d}.json")
    candidates.append(QUEUE_DIR / ref)
    candidates.append(Path(ref))
    for p in candidates:
        if p.exists() and p.is_file():
            return p, load_post(p)
    raise FileNotFoundError(f"큐에서 글을 찾지 못했습니다: {ref}")


def mark_posted(path: Path, post: Post, url: str, source: str = "queue") -> Path:
    """발행 완료 처리: posted/ 로 이동 + 이력 기록. 큐 밖의 파일이면 이동하지 않는다."""
    record_published(post.title, post.tags, url, source=source)
    path = Path(path)
    if path.parent.resolve() != QUEUE_DIR.resolve():
        return path
    POSTED_DIR.mkdir(parents=True, exist_ok=True)
    target = POSTED_DIR / path.name
    if target.exists():  # 같은 번호가 이미 있으면 덮어쓰지 않는다
        target = POSTED_DIR / f"{path.stem}-{abs(hash(url)) % 10000:04d}.json"
    post.meta["published_url"] = url
    save_post(target, post)
    path.unlink()
    return target


def remove(path: Path) -> None:
    Path(path).unlink()
