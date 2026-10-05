# -*- coding: utf-8 -*-
"""명령줄 인터페이스.  python -m naverblog <명령> --help 로 각 명령의 옵션을 본다."""
import argparse
import re
import sys
from pathlib import Path

from . import __version__
from . import queue as q
from .config import (
    EXPORT_DIR,
    POSTED_LOG_PATH,
    PROFILE_DIR,
    TOPICS_PATH,
    env,
    load_env,
    load_state,
    now_str,
    read_json_list,
    read_topics,
    record_published,
    save_state,
    stamp,
)
from .post import Post


def _split_csv(value) -> list:
    if not value:
        return []
    return [x.strip() for x in str(value).split(",") if x.strip()]


def _slug(title: str, limit: int = 30) -> str:
    return re.sub(r"[^\w가-힣]+", "_", title).strip("_")[:limit] or "post"


def _blog_id() -> str:
    blog_id = env("NAVER_BLOG_ID") or env("NAVER_ID")
    if not blog_id:
        from .publisher import PublishError

        raise PublishError("NAVER_BLOG_ID 를 naver-blog/.env 에 설정하세요 (보통 네이버 아이디와 같습니다).")
    return blog_id


def _publisher(args):
    from .publisher import NaverBlogPublisher

    return NaverBlogPublisher(
        _blog_id(),
        headless=True if getattr(args, "headless", False) else None,
        channel=getattr(args, "channel", None),
        slow_mo=getattr(args, "slow_mo", None),
    )


# --------------------------------------------------------------------------- 명령
def cmd_login(args) -> int:
    with _publisher(args) as pub:
        if pub.is_logged_in():
            print("이미 로그인돼 있습니다. (세션: %s)" % pub.profile_dir)
            return 0
        pub.login(interactive=not pub.headless, timeout_s=args.timeout)
    print("로그인 세션을 저장했습니다. 이제 `python -m naverblog publish` 로 발행할 수 있습니다.")
    return 0


def _next_topics(count: int):
    topics = read_topics()
    if not topics:
        raise FileNotFoundError(
            f"주제 파일이 없거나 비어 있습니다: {TOPICS_PATH}\n"
            "  topics.example.txt 를 topics.txt 로 복사해 주제를 채우거나 --topic 으로 직접 주세요."
        )
    state = load_state()
    idx = int(state.get("topic_index", 0))
    picked = topics[idx : idx + count]
    if not picked:
        raise ValueError(f"주제를 모두 소진했습니다 ({len(topics)}개). topics.txt 에 주제를 더 추가하세요.")
    return picked, idx


def _advance_topic_index(new_index: int) -> None:
    state = load_state()
    state["topic_index"] = new_index
    save_state(state)


def _generate_one(topic: str, args) -> Post:
    from .generator import generate_post

    print(f"[generate] '{topic}' 글을 생성합니다... (모델: {args.model or env('ANTHROPIC_MODEL', 'claude-opus-5')})")
    post = generate_post(
        topic,
        style=args.style,
        length=args.length,
        keywords=_split_csv(args.keywords),
        audience=args.audience,
        extra=args.extra,
        model=args.model,
    )
    return post


def cmd_generate(args) -> int:
    if args.topic:
        topics, start_idx = list(args.topic), None
    else:
        topics, start_idx = _next_topics(args.count)

    for i, topic in enumerate(topics):
        post = _generate_one(topic, args)
        print(post.summary())
        if args.out:
            out = Path(args.out)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(post.to_markdown(), encoding="utf-8")
            print(f"저장: {out}")
        if not args.no_queue:
            path = q.add_post(post)
            print(f"큐에 추가: {path.name}  (현재 큐 {len(q.queue_files())}편)")
        else:
            print("\n" + post.to_plain_text())
        if start_idx is not None:
            _advance_topic_index(start_idx + i + 1)
        print("-" * 60)
    return 0


def cmd_queue(args) -> int:
    if args.action == "list":
        files = q.queue_files()
        if not files:
            print("큐가 비어 있습니다. `python -m naverblog generate --topic \"주제\"` 로 글을 만들어 넣으세요.")
            return 0
        for p in files:
            post = q.load_post(p)
            print(f"{p.stem}  {post.title}  [{', '.join(post.tags[:5])}]  {post.char_count:,}자")
        print(f"총 {len(files)}편")
        return 0
    if args.action == "show":
        _, post = q.resolve(args.ref)
        print(post.summary())
        print()
        print(post.to_plain_text())
        return 0
    if args.action == "remove":
        path, post = q.resolve(args.ref)
        q.remove(path)
        print(f"삭제: {path.name} ({post.title})")
        return 0
    if args.action == "add":
        if args.file:
            import json

            post = Post.from_dict(json.loads(Path(args.file).read_text(encoding="utf-8")))
        else:
            if not args.title or not args.body_file:
                raise ValueError("--file 또는 (--title 과 --body-file) 을 지정하세요.")
            post = Post(
                title=args.title,
                content=Path(args.body_file).read_text(encoding="utf-8"),
                tags=_split_csv(args.tags),
                meta={"source": "manual"},
            )
        path = q.add_post(post)
        print(f"큐에 추가: {path.name}  (제목: {post.title}) | 현재 큐 {len(q.queue_files())}편")
        return 0
    raise ValueError(f"알 수 없는 queue 동작: {args.action}")


def _pick_post(args):
    """publish/export 공용: --file > REF > 큐 맨 앞."""
    if getattr(args, "file", None):
        path = Path(args.file)
        return path, q.load_post(path)
    if getattr(args, "ref", None):
        return q.resolve(args.ref)
    picked = q.next_post()
    if not picked:
        raise FileNotFoundError("큐가 비어 있습니다. 먼저 generate 로 글을 만들거나 --file 로 지정하세요.")
    return picked


def _publish_post(args, path, post: Post, source: str):
    if args.dry_run:
        print("[dry-run] 브라우저를 열지 않고 다음 글을 발행할 예정입니다:")
        print(post.summary())
        print(f"공개 설정: {'비공개' if args.private else '전체공개'} | 카테고리: {args.category or env('NAVER_CATEGORY') or '-'}")
        return None
    with _publisher(args) as pub:
        url = pub.publish(
            post,
            private=args.private,
            category=args.category or env("NAVER_CATEGORY"),
            review=args.review,
        )
    print(f"[{now_str()}] 발행 완료: {post.title}\n  → {url}")
    if path is not None and not args.keep:
        target = q.mark_posted(path, post, url, source=source)
        if target != path:
            print(f"  큐에서 이동: {target}")
    else:
        record_published(post.title, post.tags, url, source=source)
    return url


def cmd_publish(args) -> int:
    path, post = _pick_post(args)
    source = "file" if args.file else "queue"
    _publish_post(args, path, post, source)
    return 0


def cmd_run(args) -> int:
    """무인 실행용: 큐 맨 앞 글을 발행하고, 큐가 비었으면 topics.txt 로 한 편 생성해 발행."""
    picked = q.next_post()
    source = "queue"
    if picked is None:
        topics, idx = _next_topics(1)
        post = _generate_one(topics[0], args)
        path = q.add_post(post)
        _advance_topic_index(idx + 1)
        print(f"큐가 비어 있어 새 글을 생성했습니다: {path.name}")
        picked = (path, post)
        source = "topics"
    path, post = picked
    _publish_post(args, path, post, source)
    remaining = len(q.queue_files())
    print(f"큐 잔량: {remaining}편")
    if remaining <= 2 and not args.dry_run:
        print("⏳ 큐가 얼마 남지 않았습니다. `generate --from-topics --count 5` 등으로 채워 두세요.")
    return 0


def cmd_export(args) -> int:
    path, post = _pick_post(args)
    fmt = args.format
    text = {"txt": post.to_plain_text, "md": post.to_markdown, "html": post.to_html}[fmt]()
    out_dir = Path(args.out) if args.out else EXPORT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    base = path.stem if path is not None and path.suffix == ".json" else stamp()
    out = out_dir / f"{base}-{_slug(post.title)}.{fmt}"
    out.write_text(text, encoding="utf-8")
    print(f"내보내기 완료: {out}\n(에디터에 붙여넣을 때는 이 파일 내용을 복사하세요)")
    return 0


def cmd_status(args) -> int:
    files = q.queue_files()
    print(f"발행 대기 큐: {len(files)}편")
    if files:
        nxt = q.load_post(files[0])
        print(f"  다음 발행: {files[0].stem}  {nxt.title}")
    topics = read_topics()
    idx = int(load_state().get("topic_index", 0))
    if topics:
        print(f"주제 목록: {len(topics)}개 중 {idx}개 사용, {max(0, len(topics) - idx)}개 남음")
    else:
        print(f"주제 목록: 없음 ({TOPICS_PATH.name} 를 만들면 무인 생성에 쓰입니다)")
    print(f"로그인 세션: {'있음' if (PROFILE_DIR / 'Default').exists() else '없음 (login 명령으로 만드세요)'}")
    print(f"블로그 아이디: {env('NAVER_BLOG_ID') or env('NAVER_ID') or '미설정'}")
    print(f"Claude API 키: {'설정됨' if env('ANTHROPIC_API_KEY') else '없음 (generate 에 필요)'}")
    log = read_json_list(POSTED_LOG_PATH)
    if log:
        print(f"최근 발행 ({len(log)}편 중 마지막 5편):")
        for e in log[-5:]:
            print(f"  {e.get('date')}  {e.get('title')}  {e.get('url')}")
    return 0


# --------------------------------------------------------------------------- 파서
def _add_browser_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--headless", action="store_true", help="창을 띄우지 않고 실행 (저장된 로그인 세션 필요)")
    p.add_argument("--channel", help="PC에 설치된 브라우저 사용. 예: chrome, msedge")
    p.add_argument("--slow-mo", type=int, default=None, help="동작 사이 지연(ms). 화면을 눈으로 따라갈 때")


def _add_generate_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--style", choices=["friendly", "formal", "casual"], default="friendly", help="문체 (기본 friendly)")
    p.add_argument("--length", choices=["short", "medium", "long"], default="medium", help="분량 (기본 medium, 1500~2200자)")
    p.add_argument("--keywords", help="본문에 넣을 키워드 (쉼표 구분)")
    p.add_argument("--audience", help="주요 독자 (예: 30대 직장인)")
    p.add_argument("--extra", help="추가 요청 문장")
    p.add_argument("--model", help="Claude 모델 ID (기본 ANTHROPIC_MODEL 또는 claude-opus-5)")


def _add_publish_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--private", action="store_true", help="비공개로 발행")
    p.add_argument("--category", help="발행할 카테고리 이름 (기본 NAVER_CATEGORY 또는 블로그 기본값)")
    p.add_argument("--review", action="store_true", help="입력만 하고 발행 직전에 멈춰 사람이 확인 후 Enter")
    p.add_argument("--dry-run", action="store_true", help="브라우저를 열지 않고 무엇을 발행할지만 출력")
    p.add_argument("--keep", action="store_true", help="발행 후 큐에서 옮기지 않음 (테스트용)")
    _add_browser_args(p)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m naverblog",
        description="네이버 블로그 자동 글쓰기·발행 (글 생성: Claude API / 발행: 크롬 자동화)",
    )
    parser.add_argument("--version", action="version", version=f"naverblog {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("login", help="크롬 창을 열어 네이버에 로그인하고 세션을 저장")
    p.add_argument("--timeout", type=int, default=300, help="로그인 대기 시간(초)")
    _add_browser_args(p)
    p.set_defaults(func=cmd_login)

    p = sub.add_parser("generate", help="Claude 로 글을 생성해 큐에 넣기")
    p.add_argument("--topic", action="append", help="주제 (여러 번 지정 가능)")
    p.add_argument("--from-topics", action="store_true", help="topics.txt 의 다음 주제 사용")
    p.add_argument("--count", type=int, default=1, help="--from-topics 일 때 생성할 편수")
    p.add_argument("--no-queue", action="store_true", help="큐에 넣지 않고 화면에만 출력")
    p.add_argument("--out", help="생성 결과를 마크다운 파일로도 저장")
    _add_generate_args(p)
    p.set_defaults(func=cmd_generate)

    p = sub.add_parser("queue", help="발행 대기 큐 관리")
    qs = p.add_subparsers(dest="action", required=True)
    qs.add_parser("list", help="큐 목록")
    s = qs.add_parser("show", help="글 내용 보기")
    s.add_argument("ref", help="번호(예: 3) 또는 파일명")
    s = qs.add_parser("remove", help="큐에서 삭제")
    s.add_argument("ref")
    s = qs.add_parser("add", help="직접 쓴 글을 큐에 추가")
    s.add_argument("--file", help="{title, tags, content} JSON 파일")
    s.add_argument("--title")
    s.add_argument("--body-file", help="본문 파일 (## 소제목, 빈 줄로 문단 구분)")
    s.add_argument("--tags", help="쉼표 구분 태그")
    p.set_defaults(func=cmd_queue)

    p = sub.add_parser("publish", help="큐 맨 앞(또는 지정한) 글을 네이버 블로그에 발행")
    p.add_argument("ref", nargs="?", help="큐 번호 또는 파일명 (생략하면 맨 앞)")
    p.add_argument("--file", help="큐 밖의 JSON 파일을 직접 발행")
    _add_publish_args(p)
    p.set_defaults(func=cmd_publish)

    p = sub.add_parser("run", help="무인 실행: 큐 발행, 비었으면 topics.txt 로 생성 후 발행")
    _add_publish_args(p)
    _add_generate_args(p)
    p.set_defaults(func=cmd_run)

    p = sub.add_parser("export", help="글을 txt/md/html 로 내보내기 (수동 붙여넣기용)")
    p.add_argument("ref", nargs="?", help="큐 번호 또는 파일명 (생략하면 맨 앞)")
    p.add_argument("--file", help="큐 밖의 JSON 파일")
    p.add_argument("--format", choices=["txt", "md", "html"], default="txt")
    p.add_argument("--out", help="저장 폴더 (기본 export/)")
    p.set_defaults(func=cmd_export)

    p = sub.add_parser("status", help="큐·주제·로그인·최근 발행 요약")
    p.set_defaults(func=cmd_status)
    return parser


def main(argv=None) -> int:
    load_env()
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "generate" and not args.topic and not args.from_topics:
        parser.error("--topic \"주제\" 또는 --from-topics 를 지정하세요.")
    try:
        return int(args.func(args) or 0)
    except KeyboardInterrupt:
        print("\n중단했습니다.")
        return 130
    except Exception as e:  # noqa: BLE001 - 사용자에게 한 줄로 보여주고 종료
        from .generator import GenerationError
        from .publisher import PublishError

        if isinstance(e, (GenerationError, PublishError, FileNotFoundError, ValueError)):
            print(f"오류: {e}", file=sys.stderr)
            return 1
        raise
