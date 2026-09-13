# -*- coding: utf-8 -*-
"""블로그 조회수 조회 + 이력 스냅샷 + 주제별 성과 리포트.

블로거 API는 **블로그 전체 조회수만** 제공한다(ALL_TIME / 30DAYS / 7DAYS).
글별 조회수는 API에 없다. 그래서 이 스크립트는:
  1) 현재 전체 조회수를 가져와 stats_history.json 에 매번 스냅샷으로 쌓고,
  2) 스냅샷 사이의 조회수 증가분을, 그 기간에 발행한 글의 라벨(주제)에 배분해
     "어떤 주제를 올린 뒤 조회수가 늘었는지" 를 누적 추정한다.

데이터가 쌓일수록 정확해진다. 트래픽이 아직 적으면(수십 회 수준) 자체 신호는
약하므로, 콘텐츠 방향은 외부 수요(검색·트렌드)로 보완해야 한다. 진짜 글별
데이터가 필요하면 Google Analytics 연동이 답이다(references/analytics_setup.md).

    python .claude/skills/blogger-auto-post/scripts/stats.py
"""
from collections import defaultdict

from common import (
    get_service,
    load_config,
    now_iso,
    today_str,
    read_json_list,
    append_json_list,
    POSTED_LOG_PATH,
    STATS_HISTORY_PATH,
)


def fetch_pageviews(service=None, blog_id=None):
    if service is None:
        service = get_service(interactive=False)
    if blog_id is None:
        blog_id = load_config()["blog_id"]
    pv = (
        service.pageViews()
        .get(blogId=blog_id, range=["all", "30DAYS", "7DAYS"])
        .execute()
    )
    out = {"all_time": 0, "thirty_days": 0, "seven_days": 0}
    key = {"ALL_TIME": "all_time", "THIRTY_DAYS": "thirty_days", "SEVEN_DAYS": "seven_days"}
    for c in pv.get("counts", []):
        k = key.get(c.get("timeRange"))
        if k:
            out[k] = int(c.get("count", 0))
    return out


def snapshot(service=None, blog_id=None):
    """현재 조회수를 이력에 한 줄 추가하고 counts 를 반환."""
    counts = fetch_pageviews(service, blog_id)
    append_json_list(
        STATS_HISTORY_PATH,
        {"date": today_str(), "ts": now_iso(), **counts},
    )
    return counts


def _topic_attribution():
    """스냅샷 증가분을 그 사이 발행 글의 라벨에 배분 → 라벨별 누적 조회수 추정."""
    history = sorted(read_json_list(STATS_HISTORY_PATH), key=lambda x: x.get("ts", ""))
    posts = sorted(read_json_list(POSTED_LOG_PATH), key=lambda x: x.get("ts", ""))
    label_views = defaultdict(int)
    label_posts = defaultdict(int)

    for p in posts:
        for lb in p.get("labels", []):
            label_posts[lb] += 1

    for i in range(1, len(history)):
        prev, cur = history[i - 1], history[i]
        delta = max(0, cur.get("all_time", 0) - prev.get("all_time", 0))
        if delta == 0:
            continue
        # 이 구간(prev.ts < ts <= cur.ts)에 발행된 글들에 조회수 증가분을 균등 배분
        window = [
            p for p in posts if prev.get("ts", "") < p.get("ts", "") <= cur.get("ts", "")
        ]
        if not window:
            continue
        share = delta / len(window)
        for p in window:
            for lb in p.get("labels", []):
                label_views[lb] += share
    return label_views, label_posts


def report():
    counts = snapshot()
    cfg = load_config()
    history = sorted(read_json_list(STATS_HISTORY_PATH), key=lambda x: x.get("ts", ""))
    posts = read_json_list(POSTED_LOG_PATH)

    print("=== 블로그 조회수 ===")
    print(f"블로그   : {cfg.get('blog_name', '?')}  ({cfg.get('blog_url', '')})")
    print(f"전체     : {counts['all_time']}회")
    print(f"최근 30일: {counts['thirty_days']}회")
    print(f"최근 7일 : {counts['seven_days']}회")

    # 성장 추세 (첫 스냅샷 대비, 직전 스냅샷 대비)
    if len(history) >= 2:
        first, prev = history[0], history[-2]
        print(
            f"\n증가: 직전 스냅샷 대비 +{counts['all_time'] - prev.get('all_time', 0)}회, "
            f"기록 시작({first.get('date')}) 대비 +{counts['all_time'] - first.get('all_time', 0)}회"
        )
    else:
        print("\n(이력 스냅샷이 1개뿐 — 증가 추세는 다음 실행부터 표시됩니다.)")

    # 주제별 성과 추정
    label_views, label_posts = _topic_attribution()
    print("\n=== 주제(라벨)별 성과 추정 ===")
    if label_views:
        ranked = sorted(label_views.items(), key=lambda x: x[1], reverse=True)
        print("추정 조회수 상위 라벨 (증가분 배분 기준):")
        for lb, v in ranked[:8]:
            print(f"  - {lb}: ~{v:.1f}회  (발행 {label_posts.get(lb, 0)}편)")
        best = ranked[0][0]
        print(f"\n👉 지금까지 신호: '{best}' 계열 주제가 조회수 기여가 큼 → 이 방향을 늘려볼 것.")
    else:
        print("아직 배분할 조회수 증가 데이터가 부족합니다.")

    # 저볼륨 안내
    if counts["all_time"] < 200:
        print(
            "\n⚠️ 아직 전체 조회수가 적어 자체 데이터 신호가 약합니다.\n"
            "   콘텐츠 방향은 '외부 수요'(검색·트렌드로 사람들이 찾는 재테크 주제)로\n"
            "   잡고, 자체 조회수는 계속 쌓으며 참고하세요. 글별 정확한 데이터가\n"
            "   필요하면 Google Analytics 연동을 권장합니다."
        )

    print(f"\nSUMMARY all_time={counts['all_time']} posts_logged={len(posts)}")


if __name__ == "__main__":
    report()
