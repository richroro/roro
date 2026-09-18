#!/usr/bin/env python3
"""ASS 자막 생성 (auto-shorts).

TTS 가 준 단어 타이밍으로 '지금 읽는 단어'가 강조되는 카라오케형 자막을 만든다.
쇼츠 UI(하단 제목·우측 버튼)를 피해 화면 65~72% 높이에 큰 글씨로 배치한다.

- Caption  : 2~4어절씩 묶어 보여주고 현재 어절만 강조색 + 살짝 확대
- Headline : 씬 시작 시 상단에 뜨는 큰 문구(훅/소제목), 페이드 인
- CTA      : 마지막 몇 초 상단에 뜨는 구독 유도 문구

입력은 make_shorts.py 가 만든 타임라인(dict)이며 CLI 로도 쓸 수 있다:
    python build_subtitles.py --timeline work/timeline.json --out work/subs.ass
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CAPTION_FONT, HEIGHT, WIDTH  # noqa: E402

DEFAULT_STYLE = {
    "caption_size": 78,
    "caption_color": "#FFFFFF",
    "highlight_color": "#FFD400",   # 노랑
    "outline": 5,
    "caption_margin_v": 560,         # 아래에서 띄우는 픽셀 (1920 기준)
    "headline_size": 104,
    "headline_color": "#FFFFFF",
    "headline_margin_v": 250,
    "headline_seconds": 2.6,
    "cta_size": 60,
    "cta_color": "#FFD400",
    "cta_seconds": 3.0,
    "max_words": 4,
    "max_chars": 16,
    "quote_size": 74,                # 명언 레이아웃: 화면 중앙 큰 글씨
    "quote_color": "#FFFFFF",
    "quote_margin_v": 0,             # 0 이면 화면 정중앙
    "author_size": 46,
    "author_color": "#FFD400",
    "brand": "",                     # 채널명/시리즈명. 영상 내내 좌상단에 작게(아이덴티티·반복성 콘텐츠 판정 완화)
    "brand_size": 40,
    "caption_margin_h": 110,         # 자막 좌우 여백(px). 우측 버튼 열(약 15%)을 피한다
}


def ass_color(hex_color: str, alpha: int = 0) -> str:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"&H{alpha:02X}{b:02X}{g:02X}{r:02X}"


def ts(sec: float) -> str:
    sec = max(0.0, sec)
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02d}:{s:05.2f}"


_EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\u2B00-\u2BFF\uFE0F\u200D]+")


def esc(text: str) -> str:
    """ASS 텍스트 이스케이프. 자막 폰트에 이모지가 없어 깨진 네모로 나오므로 이모지는 뺀다."""
    text = _EMOJI_RE.sub("", text)
    text = re.sub(r"[ \t]{2,}", " ", text).strip()
    return text.replace("{", "(").replace("}", ")").replace("\\", "").replace("\n", "\\N")


_END_PUNCT = re.compile(r"[.!?…]$")


def chunk_words(words: list[dict], max_words: int, max_chars: int) -> list[list[dict]]:
    """어절을 화면에 함께 보여줄 덩어리로 묶는다. 문장 끝 부호에서는 끊는다."""
    chunks, cur, cur_len = [], [], 0
    for w in words:
        wl = len(w["text"])
        if cur and (len(cur) >= max_words or cur_len + 1 + wl > max_chars):
            chunks.append(cur)
            cur, cur_len = [], 0
        cur.append(w)
        cur_len += wl + (1 if cur_len else 0)
        if _END_PUNCT.search(w["text"]):
            chunks.append(cur)
            cur, cur_len = [], 0
    if cur:
        chunks.append(cur)
    # 마지막 덩어리가 한 어절뿐이면(외로운 한 단어) 앞 덩어리에서 한 어절을 옮겨 2:2 로 나누거나,
    # 앞 덩어리가 짧으면 합친다. 어느 쪽도 max_chars 를 크게 넘기지 않게 한다.
    if len(chunks) >= 2 and len(chunks[-1]) == 1:
        prev, last = chunks[-2], chunks[-1]
        merged_len = sum(len(w["text"]) for w in prev + last) + len(prev)
        if len(prev) >= 3 and not _END_PUNCT.search(prev[-2]["text"]):
            last.insert(0, prev.pop())
        elif merged_len <= max_chars + 2:
            prev.extend(chunks.pop())
    return chunks


def build_ass(timeline: dict, style: dict | None = None) -> str:
    st = dict(DEFAULT_STYLE)
    st.update({k: v for k, v in (style or {}).items() if k in DEFAULT_STYLE})
    hl = ass_color(st["highlight_color"]).replace("&H", "&H")  # 전체 &HAABBGGRR
    hl_inline = "&H" + hl[4:] + "&"                               # 인라인 \c 는 &HBBGGRR&
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {WIDTH}",
        f"PlayResY: {HEIGHT}",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Caption,{CAPTION_FONT},{st['caption_size']},{ass_color(st['caption_color'])},{hl},"
        f"{ass_color('#000000')},{ass_color('#000000', 0x60)},0,0,0,0,100,100,0,0,1,{st['outline']},2,2,"
        f"{st['caption_margin_h']},{st['caption_margin_h']},{st['caption_margin_v']},1",
        f"Style: Headline,{CAPTION_FONT},{st['headline_size']},{ass_color(st['headline_color'])},{hl},"
        f"{ass_color('#000000')},{ass_color('#000000', 0x50)},0,0,0,0,100,100,0,0,1,{st['outline'] + 1},3,8,"
        f"70,70,{st['headline_margin_v']},1",
        f"Style: CTA,{CAPTION_FONT},{st['cta_size']},{ass_color(st['cta_color'])},{hl},"
        f"{ass_color('#000000')},{ass_color('#000000', 0x50)},0,0,0,0,100,100,0,0,1,4,2,8,"
        f"70,70,{st['headline_margin_v'] + 20},1",
        # 명언: 화면 정중앙(정렬 5), 줄바꿈 여유를 위해 좌우 여백을 넓게
        f"Style: Quote,{CAPTION_FONT},{st['quote_size']},{ass_color(st['quote_color'])},{hl},"
        f"{ass_color('#000000')},{ass_color('#000000', 0x60)},0,0,0,0,100,100,0,0,1,{st['outline']},3,5,"
        f"120,120,{st['quote_margin_v']},1",
        f"Style: Author,{CAPTION_FONT},{st['author_size']},{ass_color(st['author_color'])},{hl},"
        f"{ass_color('#000000')},{ass_color('#000000', 0x60)},0,0,0,0,100,100,0,0,1,4,2,8,"
        f"120,120,{int(HEIGHT * 0.62)},1",
        f"Style: Brand,{CAPTION_FONT},{st['brand_size']},{ass_color('#FFFFFF', 0x30)},{hl},"
        f"{ass_color('#000000', 0x30)},{ass_color('#000000', 0x80)},0,0,0,0,100,100,0,0,1,2,1,7,"
        f"60,60,190,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    events: list[tuple[float, str]] = []
    total = float(timeline["total"])
    scenes = timeline["scenes"]

    for si, sc in enumerate(scenes):
        base = float(sc["start"])
        dur = float(sc["duration"])
        words = sc.get("words") or []
        quote = (sc.get("quote") or "").strip()

        if quote:
            # --- 명언 레이아웃: 중앙에 큰 글씨로 씬 내내 띄우고, 하단 카라오케는 넣지 않는다
            #     (나레이션이 같은 문장을 읽으므로 자막이 두 벌이면 산만하다)
            text = "{\\fad(260,240)}" + esc(quote).replace(" / ", "\\N")
            events.append((base, f"Dialogue: 0,{ts(base + 0.15)},{ts(base + dur - 0.1)},Quote,,0,0,0,,{text}"))
            author = (sc.get("author") or "").strip()
            if author:
                a_start = base + min(1.2, dur * 0.35)
                events.append((a_start, f"Dialogue: 0,{ts(a_start)},{ts(base + dur - 0.1)},Author,,0,0,0,,"
                                        f"{{\\fad(300,240)}}— {esc(author)}"))
            head = (sc.get("headline") or "").strip()
            if head:
                h_end = base + min(dur - 0.15, max(1.2, st["headline_seconds"]))
                events.append((base, f"Dialogue: 1,{ts(base)},{ts(h_end)},Headline,,0,0,0,,"
                                     f"{{\\fad(140,160)}}{esc(head)}"))
            continue

        # --- 카라오케 캡션
        chunks = chunk_words(words, st["max_words"], st["max_chars"])
        for ci, chunk in enumerate(chunks):
            c_end = base + chunk[-1]["end"] + 0.18
            c_end = min(c_end, base + dur)
            if ci + 1 < len(chunks):
                # 다음 덩어리가 시작되기 전에 반드시 사라져야 두 줄이 겹쳐 쌓이지 않는다
                c_end = min(c_end, base + chunks[ci + 1][0]["start"])
            for k, w in enumerate(chunk):
                w_start = base + w["start"]
                w_end = base + chunk[k + 1]["start"] if k + 1 < len(chunk) else c_end
                if w_end - w_start < 0.04:
                    w_end = w_start + 0.04
                parts = []
                for j, ww in enumerate(chunk):
                    t = esc(ww["text"])
                    if j == k:
                        parts.append(f"{{\\c{hl_inline}\\fscx106\\fscy106}}{t}{{\\r}}")
                    else:
                        parts.append(t)
                text = " ".join(parts)
                events.append((w_start, f"Dialogue: 0,{ts(w_start)},{ts(w_end)},Caption,,0,0,0,,{text}"))
        # --- 헤드라인
        head = (sc.get("headline") or "").strip()
        if head:
            h_dur = dur if si == 0 else st["headline_seconds"]
            h_end = base + min(dur - 0.15, max(1.2, h_dur))
            text = f"{{\\fad(140,160)\\fscx92\\fscy92\\t(0,160,\\fscx100\\fscy100)}}{esc(head)}"
            events.append((base, f"Dialogue: 1,{ts(base)},{ts(h_end)},Headline,,0,0,0,,{text}"))

    # --- CTA (마지막 몇 초)
    cta = (timeline.get("cta") or "").strip()
    if cta:
        start = max(0.0, total - st["cta_seconds"])
        last = scenes[-1]
        if last.get("headline"):
            start = max(start, float(last["start"]) + st["headline_seconds"] + 0.1)
        if total - start > 0.8:
            events.append((start, f"Dialogue: 1,{ts(start)},{ts(total)},CTA,,0,0,0,,{{\\fad(200,0)}}{esc(cta)}"))

    brand = (st.get("brand") or "").strip()
    if brand:
        events.append((-1.0, f"Dialogue: 2,{ts(0)},{ts(total)},Brand,,0,0,0,,{esc(brand)}"))

    events.sort(key=lambda e: e[0])
    lines.extend(e[1] for e in events)
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts ASS 자막 생성")
    ap.add_argument("--timeline", required=True, help="make_shorts.py 가 만든 timeline.json")
    ap.add_argument("--out", required=True)
    ap.add_argument("--style", default=None, help="스타일 덮어쓰기 JSON 문자열")
    args = ap.parse_args()
    tl = json.loads(Path(args.timeline).read_text(encoding="utf-8"))
    style = json.loads(args.style) if args.style else tl.get("style")
    Path(args.out).write_text(build_ass(tl, style), encoding="utf-8")
    print(f"[subs] {args.out}")


if __name__ == "__main__":
    main()
