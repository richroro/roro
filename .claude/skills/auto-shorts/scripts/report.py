#!/usr/bin/env python3
"""성과 리포트 (auto-shorts 업그레이드 루프).

`data/performance.jsonl` 을 읽어 카테고리·훅 유형·길이·보이스별로 조회수와 평균 시청률의 중앙값을 비교하고,
표본이 충분한 특징에 대해서만 "이렇게 바꿔 보라"는 제안을 낸다. Claude 는 이 출력을 주제 선정과
플레이북 갱신에 쓴다.

    python report.py            # 표
    python report.py --json     # 기계용
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SKILL_DIR  # noqa: E402

PERF = SKILL_DIR / "data" / "performance.jsonl"
PROD = SKILL_DIR / "data" / "productions.jsonl"
MIN_SAMPLES = 3   # 이보다 적으면 우연일 수 있어 제안하지 않는다
# 훅 실패 기준 (2025-26 벤치마크: 30~60초 쇼츠 평균 시청률 40~55%가 보통, '시청 vs 스와이프' 60% 미만이면 훅 문제)
HOOK_FAIL_VVSA = 60.0
HOOK_FAIL_AVG_PCT = 40.0


def load_rows() -> list[dict]:
    if not PERF.exists():
        return []
    rows = []
    for line in PERF.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    # 같은 slug+platform 은 마지막 기록(가장 최신 수치)만 쓴다
    latest: dict = {}
    for r in rows:
        latest[(r.get("slug"), r.get("platform"))] = r
    return list(latest.values())


def bucket_duration(d) -> str:
    if d is None:
        return "?"
    return "~30s" if d <= 30 else "31~45s" if d <= 45 else "46~60s" if d <= 60 else "60s+"


def group_stats(rows: list[dict], key, label: str) -> list[dict]:
    groups = defaultdict(list)
    for r in rows:
        groups[key(r)].append(r)
    out = []
    for g, rs in groups.items():
        views = [r["views"] for r in rs if isinstance(r.get("views"), (int, float))]
        pct = [r["avg_view_pct"] for r in rs if isinstance(r.get("avg_view_pct"), (int, float))]
        out.append({"group": label, "value": str(g), "n": len(rs),
                    "median_views": int(statistics.median(views)) if views else None,
                    "median_avg_view_pct": round(statistics.median(pct), 1) if pct else None})
    out.sort(key=lambda x: -(x["median_views"] or 0))
    return out


def suggestions(tables: dict) -> list[str]:
    tips = []
    for label, rows in tables.items():
        strong = [r for r in rows if r["n"] >= MIN_SAMPLES and r["median_views"]]
        if len(strong) >= 2:
            best, worst = strong[0], strong[-1]
            if best["median_views"] and worst["median_views"] and best["median_views"] >= worst["median_views"] * 1.5:
                tips.append(f'{label}: "{best["value"]}"(중앙값 {best["median_views"]:,}회, n={best["n"]}) 가 '
                            f'"{worst["value"]}"({worst["median_views"]:,}회, n={worst["n"]}) 보다 확실히 낫다 → 기본값/우선순위 조정 검토')
    return tips


def hook_failures(rows: list[dict]) -> list[str]:
    out = []
    for r in rows:
        why = []
        if isinstance(r.get("viewed_vs_swiped"), (int, float)) and r["viewed_vs_swiped"] < HOOK_FAIL_VVSA:
            why.append(f'시청 vs 스와이프 {r["viewed_vs_swiped"]}% < {HOOK_FAIL_VVSA:.0f}%')
        if isinstance(r.get("avg_view_pct"), (int, float)) and r["avg_view_pct"] < HOOK_FAIL_AVG_PCT:
            why.append(f'평균 시청률 {r["avg_view_pct"]}% < {HOOK_FAIL_AVG_PCT:.0f}%')
        if why:
            out.append(f'{r.get("title")} [{r.get("hook_type")}] — {", ".join(why)} → 첫 문장·헤드라인을 바꿔 다음 편에서 재시험')
    return out


def recent_productions(n: int = 6) -> list[dict]:
    if not PROD.exists():
        return []
    rows = []
    for line in PROD.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return rows[-n:]


def repetition_warnings(prods: list[dict]) -> list[str]:
    """최근 편들이 훅 유형·구조가 똑같으면 경고 (유튜브 '비진정성 콘텐츠' 정책 + 시청자 피로)."""
    warns = []
    if len(prods) >= 3:
        last3 = prods[-3:]
        for key, label in (("hook_type", "훅 유형"), ("category", "카테고리"), ("image_style", "이미지 스타일")):
            vals = {p.get(key) for p in last3}
            if len(vals) == 1 and None not in vals:
                warns.append(f"최근 3편의 {label}이 모두 '{last3[0].get(key)}' — 다음 편은 다른 {label}로 (반복 템플릿으로 보이지 않게)")
    return warns


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts 성과 리포트")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    rows = load_rows()
    prods = recent_productions()
    if not rows:
        print("성과 기록이 없습니다. 업로드 후:  python scripts/log_result.py --slug <slug> --views N --avg-view-pct P")
        if prods:
            print("\n최근 제작:")
            for p in prods:
                print(f'- {p.get("date")} {p.get("title")} [{p.get("category")}/{p.get("hook_type")}/{p.get("duration")}s]')
            for w in repetition_warnings(prods):
                print(f"! {w}")
        return
    tables = {
        "카테고리": group_stats(rows, lambda r: r.get("category", "unknown"), "카테고리"),
        "훅 유형": group_stats(rows, lambda r: r.get("hook_type", "?"), "훅 유형"),
        "길이": group_stats(rows, lambda r: bucket_duration(r.get("duration")), "길이"),
        "보이스": group_stats(rows, lambda r: r.get("voice", "?"), "보이스"),
        "BGM 무드": group_stats(rows, lambda r: r.get("bgm_mood", "?"), "BGM 무드"),
        "전환": group_stats(rows, lambda r: r.get("transition", "?"), "전환"),
        "플랫폼": group_stats(rows, lambda r: r.get("platform", "?"), "플랫폼"),
    }
    tips = suggestions(tables)
    fails = hook_failures(rows)
    reps = repetition_warnings(prods)
    top = sorted(rows, key=lambda r: -(r.get("views") or 0))[:5]
    if args.json:
        print(json.dumps({"n": len(rows), "tables": tables, "tips": tips, "hook_failures": fails, "repetition": reps,
                          "top": [{k: r.get(k) for k in ("slug", "title", "views", "avg_view_pct", "hook_type", "category")} for r in top]},
                         ensure_ascii=False, indent=1))
        return
    print(f"# 성과 리포트 — 기록 {len(rows)}편\n")
    print("## 상위 5편")
    for r in top:
        pct = f' · 시청률 {r["avg_view_pct"]}%' if r.get("avg_view_pct") is not None else ""
        print(f'- {r.get("views", 0):,}회{pct} · {r.get("title")} [{r.get("category")}/{r.get("hook_type")}/{r.get("duration")}s]')
    for label, t in tables.items():
        print(f"\n## {label}")
        print("| 값 | 편수 | 조회수 중앙값 | 평균 시청률 중앙값 |\n|---|---|---|---|")
        for r in t:
            mv = f'{r["median_views"]:,}' if r["median_views"] is not None else "-"
            mp = f'{r["median_avg_view_pct"]}%' if r["median_avg_view_pct"] is not None else "-"
            print(f'| {r["value"]} | {r["n"]} | {mv} | {mp} |')
    if fails:
        print("\n## 훅 실패로 보이는 편")
        for f in fails:
            print(f"- {f}")
    if reps:
        print("\n## 반복 경고")
        for w in reps:
            print(f"- {w}")
    print("\n## 제안" + ("" if tips else f" (표본이 특징당 {MIN_SAMPLES}편 이상 쌓이면 나옵니다)"))
    for t in tips:
        print(f"- {t}")
    print("\n제안이 반복해서 같은 방향을 가리키면 references/playbook.md 의 해당 규칙과 SKILL.md 기본값을 갱신하고 '업데이트 기록'에 근거를 남긴다.")


if __name__ == "__main__":
    main()
