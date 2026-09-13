# -*- coding: utf-8 -*-
"""Generate a blog post (title + HTML body + labels) from a topic.

Used by the UNATTENDED daily schedule, which has no Claude in the loop. It
calls the Anthropic API directly (urllib, no SDK dependency). Requires the
ANTHROPIC_API_KEY environment variable.

When Claude is in the loop (interactive requests), you do NOT need this file —
Claude writes the HTML itself and calls publish.py.

Returns a dict: {"title": str, "html": str, "labels": [str, ...]}.
"""
import json
import os
import re
import urllib.request

# Sonnet 4.5 is a good cost/quality balance for article generation.
# Override with the ANTHROPIC_MODEL env var (e.g. claude-opus-4-5) if you want.
DEFAULT_MODEL = "claude-sonnet-4-5"

PROMPT_TEMPLATE = """당신은 한국어 블로그 작가입니다. 아래 주제로 블로그 글 한 편을 작성하세요.

주제: {topic}

요구사항:
- 독자에게 실질적으로 도움이 되는, 자연스럽고 사람이 쓴 듯한 한국어 글.
- 900~1500자 분량. 소제목(<h2>)으로 3~5개 섹션 구성.
- 본문은 순수 HTML 조각으로 작성 (<h2>, <p>, <ul>, <li>, <strong> 등만 사용).
  <html>, <head>, <body> 태그나 마크다운은 넣지 마세요.
- 과장·클릭베이트 없이 신뢰감 있는 톤.

반드시 아래 JSON 형식으로만 답하세요. 다른 설명은 절대 붙이지 마세요.
{{"title": "글 제목", "labels": ["라벨1", "라벨2", "라벨3"], "html": "<h2>...</h2><p>...</p>"}}
"""


def _extract_json(text):
    """Models sometimes wrap JSON in prose or code fences — pull out the object."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"모델 응답에서 JSON을 찾지 못했습니다: {text[:200]}")
    return json.loads(text[start : end + 1])


def generate_post(topic, model=None):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY 환경변수가 없습니다. 무인 자동 생성을 쓰려면 API 키가 필요합니다. "
            "(대안: queue 폴더에 미리 생성해둔 글을 쓰는 방식 — SKILL.md 참고)"
        )
    model = model or os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)

    payload = json.dumps(
        {
            "model": model,
            "max_tokens": 4000,
            "messages": [
                {"role": "user", "content": PROMPT_TEMPLATE.format(topic=topic)}
            ],
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    text = "".join(
        block.get("text", "") for block in data.get("content", []) if block.get("type") == "text"
    )
    post = _extract_json(text)
    if not post.get("title") or not post.get("html"):
        raise ValueError("생성 결과에 title 또는 html 이 없습니다.")
    post.setdefault("labels", [])
    return post


if __name__ == "__main__":
    import sys

    topic = " ".join(sys.argv[1:]) or "자동화로 부수입 만들기"
    result = generate_post(topic)
    print(json.dumps(result, ensure_ascii=False, indent=2))
