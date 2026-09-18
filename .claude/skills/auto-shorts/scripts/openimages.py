#!/usr/bin/env python3
"""Open Images 사진 은행 (auto-shorts) — 키 없이 쓰는 CC BY 2.0 실사 사진.

구글 Open Images 데이터셋은 **플리커의 CC BY 2.0 사진**을 사람이 붙인 라벨(약 2만 개 분류)과 함께
공개한다. 사진 본체는 S3 에서, 저작자·제목·라이선스는 메타데이터 CSV 에서 받아 출처를 정확히 남긴다.

    사진:    https://s3.amazonaws.com/open-images-dataset/{subset}/{ImageID}.jpg
    라벨:    https://storage.googleapis.com/openimages/v5/{subset}-annotations-human-imagelabels.csv
    메타:    https://storage.googleapis.com/openimages/2018_04/{subset}/{subset}-images-with-rotation.csv
    분류명:  https://storage.googleapis.com/openimages/v6/oidv6-class-descriptions.csv

첫 사용 때 위 CSV(수십 MB)를 내려받아 **분류당 최대 N장**으로 추린 작은 색인을 만들고 CSV 는 지운다.
그 뒤부터는 색인만 읽으므로 빠르다. 스톡 API 키가 없거나 Openverse·위키미디어가 막힌 환경에서 쓸모 있다.

주의: CC BY 2.0 은 **저작자 표시가 필수**다. 파이프라인이 meta.md 에 자동으로 남기므로 업로드 설명란에
그대로 넣으면 된다.

CLI:
    python openimages.py --build                 # 색인 만들기(validation)
    python openimages.py --build --sets validation,test
    python openimages.py --find "bee flower"     # 어떤 분류·사진이 잡히는지 확인
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SKILL_DIR, download, http_get, log, write_json  # noqa: E402

STAGE = "openimages"
CACHE = Path(__import__("os").environ.get("AUTO_SHORTS_OPENIMAGES_DIR", str(SKILL_DIR / "cache" / "openimages")))
CLASSES_URL = "https://storage.googleapis.com/openimages/v6/oidv6-class-descriptions.csv"
LABELS_URL = "https://storage.googleapis.com/openimages/v5/{subset}-annotations-human-imagelabels.csv"
META_URL = "https://storage.googleapis.com/openimages/2018_04/{subset}/{subset}-images-with-rotation.csv"
IMAGE_URL = __import__("os").environ.get(
    "AUTO_SHORTS_OPENIMAGES_IMAGE_URL", "https://s3.amazonaws.com/open-images-dataset/{subset}/{image_id}.jpg")
PER_CLASS = 60          # 분류당 보관할 사진 수 (색인 크기와 다양성의 균형)

_INDEX: Optional[dict] = None
# 사진이 잘 나오지 않는 추상·장면 분류는 검색에서 제외
_BAD_CLASSES = {"person", "human face", "human body", "man", "woman", "boy", "girl", "clothing", "footwear"}


def index_path() -> Path:
    return CACHE / "index.json"


# ---------------------------------------------------------------- 색인 만들기
def build_index(sets: tuple[str, ...] = ("validation",), per_class: int = PER_CLASS, force: bool = False) -> dict:
    """라벨·메타 CSV 를 받아 {분류명: [사진…]} 색인을 만든다. CSV 는 만든 뒤 지운다."""
    out = index_path()
    if out.exists() and not force:
        return json.loads(out.read_text(encoding="utf-8"))
    CACHE.mkdir(parents=True, exist_ok=True)

    log(STAGE, "분류 목록 내려받는 중…")
    names: dict[str, str] = {}      # mid → name
    text = http_get(CLASSES_URL, timeout=180, stage=STAGE).decode("utf-8", "replace")
    for row in csv.reader(text.splitlines()):
        if len(row) >= 2 and row[0].startswith("/m/"):
            names[row[0]] = row[1]

    by_class: dict[str, list] = {}
    for subset in sets:
        labels_csv = CACHE / f"{subset}-labels.csv"
        meta_csv = CACHE / f"{subset}-meta.csv"
        if not labels_csv.exists():
            log(STAGE, f"{subset} 라벨 내려받는 중 (수십 MB, 최초 1회)…")
            download(LABELS_URL.format(subset=subset), labels_csv, timeout=900, min_bytes=100_000, stage=STAGE)
        if not meta_csv.exists():
            log(STAGE, f"{subset} 메타데이터(저작자·라이선스) 내려받는 중…")
            download(META_URL.format(subset=subset), meta_csv, timeout=900, min_bytes=100_000, stage=STAGE)

        wanted: dict[str, list[str]] = {}       # image_id → [class name…]
        counts: dict[str, int] = {}
        with labels_csv.open(encoding="utf-8", newline="") as f:
            for row in csv.reader(f):
                if len(row) < 4 or row[3] != "1":
                    continue
                name = names.get(row[2])
                if not name or name.lower() in _BAD_CLASSES:
                    continue
                if counts.get(name, 0) >= per_class:
                    continue
                counts[name] = counts.get(name, 0) + 1
                wanted.setdefault(row[0], []).append(name)

        kept = 0
        with meta_csv.open(encoding="utf-8", newline="") as f:
            for r in csv.DictReader(f):
                cls = wanted.get(r["ImageID"])
                if not cls:
                    continue
                lic = r.get("License", "")
                if "creativecommons.org" not in lic:     # CC 가 아닌 항목은 쓰지 않는다
                    continue
                entry = {"id": r["ImageID"], "subset": subset, "author": r.get("Author", "unknown"),
                         "title": r.get("Title", ""), "license": lic, "page": r.get("OriginalLandingURL", "")}
                for name in cls:
                    by_class.setdefault(name.lower(), []).append(entry)
                kept += 1
        log(STAGE, f"{subset}: 사진 {kept:,}장 · 분류 {len(by_class):,}개")
        labels_csv.unlink(missing_ok=True)
        meta_csv.unlink(missing_ok=True)

    index = {"version": 1, "sets": list(sets), "per_class": per_class, "classes": by_class}
    write_json(out, index)
    log(STAGE, f"색인 저장: {out} ({out.stat().st_size / 1e6:.1f}MB, 분류 {len(by_class):,}개)")
    return index


def load_index(auto_build: bool = True, sets: tuple[str, ...] = ("validation",)) -> dict:
    global _INDEX
    if _INDEX is None:
        if index_path().exists():
            _INDEX = json.loads(index_path().read_text(encoding="utf-8"))
        elif auto_build:
            _INDEX = build_index(sets)
        else:
            raise LookupError("Open Images 색인 없음 (python openimages.py --build 로 생성)")
    return _INDEX


# ---------------------------------------------------------------- 검색
def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]", " ", s.lower()).strip()


def _stem(w: str) -> str:
    return w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w


def find_class(query: str, index: dict) -> list[tuple[str, list]]:
    """검색어에 맞는 분류들을 적합도 순으로.

    단어 단위로만 맞춘다("honey jar" 가 "honeysuckle" 을 잡지 않도록). 우리 키워드 규칙이
    '앞쪽 단어가 주인공'이므로 앞 단어와 맞는 분류에 가산점을 준다.
    """
    classes = index["classes"]
    q_norm = _norm(query)
    q_words = [_stem(w) for w in q_norm.split() if len(w) > 2]
    if not q_words:
        return []
    hits: list[tuple[float, str]] = []
    for name, entries in classes.items():
        n_norm = _norm(name)
        n_words = [_stem(w) for w in n_norm.split()]
        overlap = [w for w in q_words if w in n_words]
        if not overlap:
            continue
        if n_norm == q_norm:
            score = 1000.0
        else:
            score = 100.0 * len(set(overlap)) / max(len(n_words), 1)     # 분류가 검색어에 온전히 덮이면 높다
            score += 30.0 / (1 + q_words.index(overlap[0]))              # 앞쪽 단어와 맞을수록 가산
            if len(n_words) == 1 and n_words[0] in q_words:
                score += 40.0                                            # 한 단어 분류의 정확 일치
        score += min(len(entries), 30) * 0.05                            # 사진이 많은 쪽을 살짝 선호
        hits.append((score, name))
    hits.sort(key=lambda t: (-t[0], t[1]))
    return [(name, classes[name]) for _, name in hits[:5]]


_ALL: Optional[list] = None


def all_entries(index: dict) -> list:
    """중복 없는 전체 사진 목록(제목 검색용). 분류 색인에서 한 번만 만든다."""
    global _ALL
    if _ALL is None:
        seen, out = set(), []
        for entries in index["classes"].values():
            for e in entries:
                if e["id"] not in seen:
                    seen.add(e["id"])
                    out.append(e)
        _ALL = out
    return _ALL


def pick(query: str, used: Optional[set] = None, index: Optional[dict] = None) -> tuple[str, dict]:
    """검색어 → (사진 URL, 출처 정보).

    분류 일치뿐 아니라 **사진 제목** 도 본다. Open Images 분류는 넓어서("medicine") 분류만 보면
    주제와 어긋난 사진이 걸리기 쉬운데, 촬영자가 붙인 제목에 검색어가 들어 있으면 대개 정확하다.
    """
    index = index or load_index()
    used = used or set()
    words = [_stem(w) for w in _norm(query).split() if len(w) > 2]
    if not words:
        raise LookupError("검색어가 비어 있음")

    # 1) 분류(사람이 검수한 라벨) 점수 — 사진이 무엇인지 보장한다
    cls_score: dict[str, tuple[float, str]] = {}
    for rank, (name, entries) in enumerate(find_class(query, index)):
        for e in entries:
            base = (10.0 - rank) * 2
            if e["id"] not in cls_score or base > cls_score[e["id"]][0]:
                cls_score[e["id"]] = (base, name)

    # 2) 제목(촬영자가 붙인 말) 보너스 — 같은 분류 안에서 주제에 더 가까운 것을 고른다.
    #    분류가 안 맞는데 제목만 걸린 사진("Honey Garlic Sauce" 치킨)은 크게 깎는다.
    best: dict[str, tuple[dict, float, str]] = {}
    for e in all_entries(index):
        t_words = [_stem(w) for w in _norm(e.get("title", "")).split()]
        bonus = sum((25.0 if i == 0 else 12.0) for i, w in enumerate(words) if w in t_words)
        base, name = cls_score.get(e["id"], (0.0, ""))
        if not base and not bonus:
            continue
        title = (e.get("title") or "")[:30]
        if base and bonus:
            score, why = base + bonus, f'{name} + 제목 "{title}"'
        elif base:
            score, why = base, name
        else:
            score, why = bonus * 0.4, f'제목 "{title}"'
        best[e["id"]] = (e, score, why)

    for entry, score, why in sorted(best.values(), key=lambda t: (-t[1], t[0]["id"])):
        page = entry.get("page") or entry["id"]
        if page in used:
            continue
        url = IMAGE_URL.format(subset=entry["subset"], image_id=entry["id"])
        lic = "CC BY 2.0" if "/by/2.0" in entry.get("license", "") else entry.get("license", "CC")
        title = (entry.get("title") or "untitled").strip()
        return url, {"provider": "openimages", "url": page, "query": f"{query} → {why}", "license": lic,
                     "credit": f'"{title}" by {entry.get("author")} — {lic} ({page})'}
    raise LookupError(f"open images 에 '{query}' 에 맞는 사진 없음")


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts Open Images 사진 은행")
    ap.add_argument("--build", action="store_true", help="색인 만들기")
    ap.add_argument("--sets", default="validation", help="validation / test / validation,test")
    ap.add_argument("--per-class", type=int, default=PER_CLASS)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--find", default=None, help="검색어로 어떤 분류가 잡히는지 확인")
    args = ap.parse_args()
    sets = tuple(s.strip() for s in args.sets.split(",") if s.strip())
    if args.build:
        build_index(sets, args.per_class, args.force)
    if args.find:
        index = load_index(sets=sets)
        for name, entries in find_class(args.find, index):
            print(f"{name:<30} {len(entries)}장  예: {entries[0]['title'][:40]} / {entries[0]['author']}")
        try:
            url, info = pick(args.find, index=index)
            print("\n선택:", url, "\n출처:", info["credit"])
        except LookupError as e:
            print(e)


if __name__ == "__main__":
    main()
