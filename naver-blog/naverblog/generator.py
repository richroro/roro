# -*- coding: utf-8 -*-
"""Claude API 로 주제 → 블로그 글(제목·본문·태그) 생성.

구조화 출력(output_config.format = json_schema)으로 항상 같은 형태의 JSON 을 받고,
스트리밍으로 받아 긴 글에서도 타임아웃이 나지 않게 한다.
ANTHROPIC_API_KEY 가 필요하다 (.env 또는 환경변수).
"""
import json
import sys

from .config import env
from .post import Post

DEFAULT_MODEL = "claude-opus-5"
MAX_TOKENS = 16000

STYLE_PRESETS = {
    "friendly": "친근한 존댓말('~해요', '~인데요')로 이웃에게 이야기하듯 쓴다. 이모지는 소제목에만 가끔 1개.",
    "formal": "정중하고 정보성 높은 존댓말('~합니다', '~입니다')로 쓴다. 이모지는 쓰지 않는다.",
    "casual": "편한 반말('~야', '~해')로 친구에게 말하듯 가볍게 쓴다. 이모지는 가끔 쓴다.",
}

# 공백 제외 글자 수 범위
LENGTH_PRESETS = {
    "short": (800, 1200),
    "medium": (1500, 2200),
    "long": (2500, 3500),
}

SYSTEM_PROMPT = """당신은 네이버 블로그에서 오랫동안 글을 써 온 한국어 블로거입니다.
검색으로 들어온 독자가 끝까지 읽고 도움을 받았다고 느끼는 글을 씁니다.

글쓰기 원칙:
- 제목은 30자 안쪽, 검색 키워드가 자연스럽게 들어가되 클릭베이트는 쓰지 않는다.
- 도입부(intro)는 2~3문장으로 독자의 상황에 공감하며 글에서 얻을 것을 예고한다.
- 본문은 소제목(heading) 3~5개로 나누고, 소제목마다 문단(paragraphs) 2~4개를 쓴다.
  문단은 2~4문장으로 짧게 끊고, 구체적인 숫자·예시·상황을 넣는다.
- 마무리(outro)는 핵심을 2~3문장으로 정리하고 가벼운 행동 제안이나 질문으로 끝낸다.
- 태그(tags)는 검색에 쓰일 핵심 키워드 5~10개. 공백 없는 단어형('#' 없이).
- 과장·허위·확인되지 않은 통계, 의학·법률·투자에 대한 단정적 조언은 피한다.
- 마크다운 기호, HTML 태그, 이모지 남발, "이 글에서는 ~를 알아보겠습니다" 같은 상투어는 쓰지 않는다.
- 문장은 AI 냄새가 나지 않게, 사람이 겪은 경험을 이야기하듯 자연스럽게 쓴다."""

POST_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "description": "블로그 글 제목 (30자 안쪽)"},
        "intro": {"type": "string", "description": "도입부 문단 (2~3문장)"},
        "sections": {
            "type": "array",
            "description": "본문 섹션 3~5개",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string", "description": "소제목"},
                    "paragraphs": {
                        "type": "array",
                        "description": "소제목 아래 문단 2~4개. 글머리 항목은 문단 앞에 '- ' 를 붙인다.",
                        "items": {"type": "string"},
                    },
                },
                "required": ["heading", "paragraphs"],
                "additionalProperties": False,
            },
        },
        "outro": {"type": "string", "description": "마무리 문단 (2~3문장)"},
        "tags": {
            "type": "array",
            "description": "검색 키워드 태그 5~10개, 공백·# 없이",
            "items": {"type": "string"},
        },
    },
    "required": ["title", "intro", "sections", "outro", "tags"],
    "additionalProperties": False,
}


class GenerationError(RuntimeError):
    pass


def build_prompt(
    topic: str,
    style: str = "friendly",
    length: str = "medium",
    keywords=None,
    audience: str = None,
    persona: str = None,
    extra: str = None,
) -> str:
    lo, hi = LENGTH_PRESETS.get(length, LENGTH_PRESETS["medium"])
    lines = [f"다음 주제로 네이버 블로그 글 한 편을 써 주세요.", "", f"주제: {topic}", ""]
    lines.append(f"문체: {STYLE_PRESETS.get(style, STYLE_PRESETS['friendly'])}")
    lines.append(f"분량: 공백 제외 {lo:,}~{hi:,}자 (도입부+본문+마무리 합산)")
    if audience:
        lines.append(f"주요 독자: {audience}")
    if keywords:
        lines.append(f"본문에 자연스럽게 넣을 키워드: {', '.join(keywords)}")
    if persona:
        lines += ["", "블로그 운영자 소개(글의 시점·톤을 여기에 맞출 것):", persona.strip()]
    if extra:
        lines += ["", "추가 요청:", extra.strip()]
    return "\n".join(lines)


def _result_to_post(data: dict, topic: str, model: str) -> Post:
    parts = []
    intro = (data.get("intro") or "").strip()
    if intro:
        parts.append(intro)
    for sec in data.get("sections") or []:
        heading = (sec.get("heading") or "").strip()
        if heading:
            parts.append(f"## {heading}")
        for p in sec.get("paragraphs") or []:
            p = (p or "").strip()
            if p:
                parts.append(p)
    outro = (data.get("outro") or "").strip()
    if outro:
        parts.append(outro)
    post = Post(
        title=data.get("title", ""),
        content="\n\n".join(parts),
        tags=data.get("tags") or [],
        meta={"topic": topic, "model": model, "source": "claude"},
    )
    post.validate()
    return post


def _make_client():
    try:
        import anthropic
    except ImportError as e:  # pragma: no cover
        raise GenerationError(
            "anthropic 패키지가 없습니다. `pip install -r requirements.txt` 를 실행하세요."
        ) from e
    if not env("ANTHROPIC_API_KEY") and not env("ANTHROPIC_AUTH_TOKEN"):
        raise GenerationError(
            "ANTHROPIC_API_KEY 가 없습니다. naver-blog/.env 에 ANTHROPIC_API_KEY=... 를 넣어 주세요."
        )
    return anthropic.Anthropic()


def _request(client, model: str, prompt: str, use_fallbacks: bool):
    """스트리밍으로 요청하고 최종 메시지를 돌려준다."""
    kwargs = dict(
        model=model,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        output_config={"format": {"type": "json_schema", "schema": POST_SCHEMA}},
    )
    effort = env("ANTHROPIC_EFFORT")
    if effort:
        kwargs["output_config"]["effort"] = effort
    if use_fallbacks:
        # 안전 분류기가 요청을 거절(stop_reason=refusal)하면 서버가 같은 요청을
        # 대체 모델로 이어서 처리한다. 블로그 글에서는 거의 안 일어나지만 무인 실행이
        # 조용히 비는 걸 막는다. ANTHROPIC_FALLBACKS=0 으로 끌 수 있다.
        with client.beta.messages.stream(
            betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kwargs
        ) as stream:
            return stream.get_final_message()
    with client.messages.stream(**kwargs) as stream:
        return stream.get_final_message()


def generate_post(
    topic: str,
    *,
    style: str = "friendly",
    length: str = "medium",
    keywords=None,
    audience: str = None,
    extra: str = None,
    model: str = None,
    client=None,
) -> Post:
    """주제 하나로 글 한 편을 생성해 Post 로 돌려준다."""
    import anthropic

    model = model or env("ANTHROPIC_MODEL", DEFAULT_MODEL)
    persona = env("BLOG_PERSONA")
    audience = audience or env("BLOG_AUDIENCE")
    prompt = build_prompt(topic, style, length, keywords, audience, persona, extra)
    client = client or _make_client()

    use_fallbacks = env("ANTHROPIC_FALLBACKS", "1") not in ("0", "false", "no")
    try:
        message = _request(client, model, prompt, use_fallbacks)
    except anthropic.BadRequestError as e:
        if not use_fallbacks:
            raise GenerationError(f"API 요청 오류: {e.message}") from e
        # 베타 파라미터를 받지 않는 환경이면 일반 요청으로 한 번 더 시도한다.
        print(f"[generate] fallbacks 옵션을 뺀 채 다시 요청합니다: {e.message}", file=sys.stderr)
        try:
            message = _request(client, model, prompt, False)
        except anthropic.BadRequestError as e2:
            raise GenerationError(f"API 요청 오류: {e2.message}") from e2
    except anthropic.AuthenticationError as e:
        raise GenerationError("API 키가 올바르지 않습니다 (AuthenticationError).") from e
    except anthropic.RateLimitError as e:
        raise GenerationError("API 사용량 한도에 걸렸습니다. 잠시 후 다시 시도하세요.") from e
    except anthropic.APIStatusError as e:
        raise GenerationError(f"API 오류 {e.status_code}: {e.message}") from e
    except anthropic.APIConnectionError as e:
        raise GenerationError(f"API 서버에 연결할 수 없습니다: {e}") from e

    if message.stop_reason == "refusal":
        detail = getattr(message, "stop_details", None)
        why = getattr(detail, "explanation", None) or "사유 미제공"
        raise GenerationError(f"모델이 이 주제의 글 생성을 거절했습니다: {why}")
    if message.stop_reason == "max_tokens":
        raise GenerationError("출력이 max_tokens 에 잘렸습니다. 분량을 줄이거나 MAX_TOKENS 를 올리세요.")

    text = "".join(b.text for b in message.content if getattr(b, "type", "") == "text")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise GenerationError(f"모델 응답이 JSON 이 아닙니다: {text[:200]}") from e

    post = _result_to_post(data, topic, model)
    usage = getattr(message, "usage", None)
    if usage is not None:
        post.meta["usage"] = {
            "input_tokens": getattr(usage, "input_tokens", None),
            "output_tokens": getattr(usage, "output_tokens", None),
        }
    post.meta["style"] = style
    post.meta["length"] = length
    return post
