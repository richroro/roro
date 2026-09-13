# -*- coding: utf-8 -*-
"""Generate one Threads post about business/work automation from a topic.

Used by the UNATTENDED daily schedule, which has no Claude in the loop. Calls
the Anthropic API directly (urllib, no SDK). Requires ANTHROPIC_API_KEY.

When Claude is in the loop (interactive requests), you do NOT need this file —
Claude writes the post itself and calls publish.py / add_to_queue.py.

Returns a dict: {"text": str, "link": str|None}.
"""
import json
import os
import re
import urllib.request

# Sonnet 5 is a good cost/quality balance for short social copy.
# Override with the ANTHROPIC_MODEL env var if you want.
DEFAULT_MODEL = "claude-sonnet-5"

PROMPT_TEMPLATE = """당신은 '업무 자동화'를 주제로 스레드(Threads)에 글을 쓰는 한국어 크리에이터입니다.
아래 소재로 스레드 게시글 하나를 작성하세요.

소재: {topic}

요구사항:
- 순수 텍스트. 마크다운/HTML 금지. 전체 500자 이내(공백 포함), 한 게시글 분량.
- 첫 줄은 스크롤을 멈추게 하는 후킹 한 문장.
- 실제로 써먹을 수 있는 구체적 팁/사례 1~3개. 과장·클릭베이트 금지.
- 마지막에 관련 해시태그 2~4개(#업무자동화 등)를 자연스럽게.
- 사람이 직접 쓴 듯한 담백하고 신뢰감 있는 말투.

반드시 아래 JSON 형식으로만 답하세요. 다른 설명은 절대 붙이지 마세요.
{{"text": "게시글 본문(500자 이내)", "link": null}}
"""


def _extract_json(text):
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
            "(대안: queue 폴더에 미리 만들어둔 글을 쓰는 방식 — SKILL.md 참고)"
        )
    model = model or os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)

    payload = json.dumps(
        {
            "model": model,
            "max_tokens": 1500,
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
        block.get("text", "")
        for block in data.get("content", [])
        if block.get("type") == "text"
    )
    post = _extract_json(text)
    if not post.get("text"):
        raise ValueError("생성 결과에 text 가 없습니다.")
    post.setdefault("link", None)
    # Safety net: enforce the Threads limit even if the model overshoots.
    if len(post["text"]) > 500:
        post["text"] = post["text"][:497].rstrip() + "..."
    return post


if __name__ == "__main__":
    import sys

    topic = " ".join(sys.argv[1:]) or "반복 업무를 자동화해 시간 아끼는 법"
    print(json.dumps(generate_post(topic), ensure_ascii=False, indent=2))
