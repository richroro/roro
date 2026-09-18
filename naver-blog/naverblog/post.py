# -*- coding: utf-8 -*-
"""블로그 글 데이터 모델과 변환.

글 본문(content)은 사람이 손으로도 쓰기 쉬운 '마크다운 라이트' 텍스트다.
  - `## 소제목`  → 소제목 (# 개수는 무시)
  - `- 항목` / `* 항목` → 글머리 기호 항목
  - 빈 줄 → 문단 구분
그 외 줄은 본문 문단이다. 에디터 입력·HTML·마크다운 내보내기 모두 이 블록 파싱을 거친다.
"""
import html
import re
from dataclasses import dataclass, field

HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+(.*)$")
BULLET_RE = re.compile(r"^\s*[-*•]\s+(.*)$")

MAX_TAGS = 30  # 네이버 블로그 태그 최대 개수
MAX_TAG_LEN = 30


@dataclass
class Block:
    kind: str  # heading | paragraph | bullet
    text: str


def normalize_tags(tags) -> list:
    """'#' 제거, 공백 제거, 중복 제거, 개수·길이 제한 (네이버 태그 규칙에 맞춤)."""
    out = []
    for raw in tags or []:
        if raw is None:
            continue
        tag = str(raw).strip().lstrip("#").strip()
        tag = re.sub(r"\s+", "", tag)  # 네이버 태그는 공백을 허용하지 않는다
        tag = re.sub(r"[^\w가-힣]", "", tag)  # 특수문자 제거
        if not tag:
            continue
        tag = tag[:MAX_TAG_LEN]
        if tag not in out:
            out.append(tag)
        if len(out) >= MAX_TAGS:
            break
    return out


def parse_blocks(content: str) -> list:
    """본문 텍스트를 블록 리스트로 파싱한다."""
    blocks = []
    para = []

    def flush():
        if para:
            blocks.append(Block("paragraph", "\n".join(para).strip()))
            para.clear()

    for raw in (content or "").replace("\r\n", "\n").split("\n"):
        line = raw.rstrip()
        if not line.strip():
            flush()
            continue
        m = HEADING_RE.match(line)
        if m:
            flush()
            blocks.append(Block("heading", m.group(1).strip()))
            continue
        m = BULLET_RE.match(line)
        if m:
            flush()
            blocks.append(Block("bullet", m.group(1).strip()))
            continue
        para.append(line.strip())
    flush()
    return blocks


@dataclass
class Post:
    title: str
    content: str
    tags: list = field(default_factory=list)
    meta: dict = field(default_factory=dict)

    def __post_init__(self):
        self.title = (self.title or "").strip()
        self.content = (self.content or "").strip()
        self.tags = normalize_tags(self.tags)
        self.meta = dict(self.meta or {})

    # ---- 직렬화 ---------------------------------------------------------------
    @classmethod
    def from_dict(cls, data: dict) -> "Post":
        # 예전/외부 형식도 받아준다: body, html 키
        content = data.get("content") or data.get("body") or ""
        if not content and data.get("html"):
            content = html_to_content(data["html"])
        return cls(
            title=data.get("title", ""),
            content=content,
            tags=data.get("tags") or data.get("labels") or [],
            meta=data.get("meta") or {},
        )

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "tags": list(self.tags),
            "content": self.content,
            "meta": dict(self.meta),
        }

    # ---- 뷰 -------------------------------------------------------------------
    @property
    def blocks(self) -> list:
        return parse_blocks(self.content)

    @property
    def char_count(self) -> int:
        return len(re.sub(r"\s", "", self.content))

    def validate(self) -> None:
        if not self.title:
            raise ValueError("제목이 비어 있습니다.")
        if not self.content.strip():
            raise ValueError("본문이 비어 있습니다.")
        if len(self.title) > 100:
            raise ValueError("제목이 100자를 넘습니다 (네이버 제한).")

    def to_plain_text(self, with_tags: bool = True) -> str:
        lines = [self.title, ""]
        prev = None
        for b in self.blocks:
            if prev == "bullet" and b.kind != "bullet":
                lines.append("")  # 글머리 묶음이 끝나면 빈 줄
            if b.kind == "heading":
                lines += [b.text, ""]
            elif b.kind == "bullet":
                lines.append(f"• {b.text}")
            else:
                lines += [b.text, ""]
            prev = b.kind
        if with_tags and self.tags:
            lines += ["", " ".join(f"#{t}" for t in self.tags)]
        return "\n".join(lines).strip() + "\n"

    def to_markdown(self) -> str:
        lines = [f"# {self.title}", ""]
        prev = None
        for b in self.blocks:
            if prev == "bullet" and b.kind != "bullet":
                lines.append("")
            if b.kind == "heading":
                lines += [f"## {b.text}", ""]
            elif b.kind == "bullet":
                lines.append(f"- {b.text}")
            else:
                lines += [b.text, ""]
            prev = b.kind
        if self.tags:
            lines += ["", "태그: " + ", ".join(self.tags)]
        return "\n".join(lines).strip() + "\n"

    def to_html(self) -> str:
        parts = [f"<h1>{html.escape(self.title)}</h1>"]
        bullets = []

        def flush_bullets():
            if bullets:
                parts.append("<ul>" + "".join(f"<li>{html.escape(x)}</li>" for x in bullets) + "</ul>")
                bullets.clear()

        for b in self.blocks:
            if b.kind == "bullet":
                bullets.append(b.text)
                continue
            flush_bullets()
            if b.kind == "heading":
                parts.append(f"<h2>{html.escape(b.text)}</h2>")
            else:
                parts.append("<p>" + html.escape(b.text).replace("\n", "<br>") + "</p>")
        flush_bullets()
        if self.tags:
            parts.append("<p>" + " ".join(f"#{html.escape(t)}" for t in self.tags) + "</p>")
        return "\n".join(parts) + "\n"

    def summary(self) -> str:
        blocks = self.blocks
        headings = [b.text for b in blocks if b.kind == "heading"]
        lines = [
            f"제목   : {self.title}",
            f"태그   : {', '.join(self.tags) if self.tags else '-'}",
            f"분량   : 공백 제외 {self.char_count:,}자 / 블록 {len(blocks)}개 / 소제목 {len(headings)}개",
        ]
        if headings:
            lines.append("소제목 : " + " | ".join(headings))
        if self.meta.get("topic"):
            lines.append(f"주제   : {self.meta['topic']}")
        return "\n".join(lines)


def html_to_content(fragment: str) -> str:
    """간단한 HTML 조각(h2/p/li)을 마크다운 라이트로 바꾼다. 예전 큐 파일 호환용."""
    text = fragment
    text = re.sub(r"(?is)<h[1-6][^>]*>(.*?)</h[1-6]>", lambda m: f"\n## {strip_tags(m.group(1))}\n", text)
    text = re.sub(r"(?is)<li[^>]*>(.*?)</li>", lambda m: f"\n- {strip_tags(m.group(1))}", text)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</p>|</ul>|</ol>|</div>", "\n\n", text)
    text = strip_tags(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def strip_tags(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()
