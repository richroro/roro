# -*- coding: utf-8 -*-
"""주제 → 쇼츠 대본 JSON 생성 (무인 스케줄용 폴백).

큐(queue/)가 비었을 때만 쓰인다. Claude 가 대화 중일 때는 이 파일을 쓰지 말 것 —
Claude 가 직접 대본을 써서 add_to_queue.py 로 넣는 편이 품질이 훨씬 좋다.

저장소의 다른 스킬(blogger-auto-post/generate.py)과 같은 이유로 SDK 없이
urllib 로 Anthropic Messages API 를 직접 호출한다(의존성 최소화). ANTHROPIC_API_KEY
환경변수가 필요하다. 모델은 ANTHROPIC_MODEL 로 바꿀 수 있다.

    python generate.py --topic "월급날 통장 쪼개기 5분 루틴" --out /tmp/script.json
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

DEFAULT_MODEL = "claude-opus-5"

PROMPT = """당신은 한국어 숏폼(유튜브 쇼츠·틱톡·네이버 클립) 재테크 채널 "부자되자"의 대본 작가입니다.
아래 주제로 60~75초짜리 '정보형 페이스리스 쇼츠' 대본을 쓰세요. 화면에는 큰 글씨 카드가 뜨고,
여성 나레이션(TTS)이 읽습니다. 얼굴·촬영·B롤은 없습니다.

주제: {topic}

규칙:
- hook: 첫 3초에 스크롤을 멈추게 할 한 문장 (25자 내외). 과장·낚시·허위 수치 금지.
- scenes: 7개. 각 장면은
  - caption: 화면 큰 글씨. 최대 2줄, 줄바꿈은 \\n, 한 줄 14자 내외. 번호형이면 "1. ..." 형식.
  - narration: 구어체 나레이션 1~2문장, 35~45자. caption 을 그대로 읽지 말고 살을 붙일 것.
- cta: 마지막 장면. 저장/팔로우 유도 한 문장 + 그 이유(다음 편 예고 등).
- description: 플랫폼 캡션용 1~2문장.
- hashtags: 6개. 반드시 "#부자되자" 포함, 나머지는 주제 관련 한국어 태그.
- 검증 안 된 통계·금리·법령 수치를 지어내지 마세요. 숫자는 "예시" 수준으로만.
- 특정 금융상품·회사명을 추천하지 마세요.
- 나레이션 총량은 300~340자 (60초 이상이 되어야 틱톡 리워드 대상입니다).

반드시 아래 JSON 형식으로만 답하세요. 다른 설명은 붙이지 마세요.
{{"title": "...", "hook": "...", "scenes": [{{"caption": "...", "narration": "..."}}], "cta": "...", "description": "...", "hashtags": ["#...", "#부자되자"], "theme": "navy"}}
"""


def _extract_json(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"모델 응답에서 JSON 을 찾지 못했습니다: {text[:200]}")
    return json.loads(text[start:end + 1])


def generate_script(topic, model=None):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY 환경변수가 없습니다. 무인 자동 생성을 쓰려면 API 키가 필요합니다. "
            "(대안: queue/ 에 Claude 가 미리 만든 대본을 넣어 두는 방식 — SKILL.md 참고)"
        )
    model = model or os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)

    body = {
        "model": model,
        "max_tokens": 4000,
        # 안전 분류기가 요청을 거절하면 서버가 대체 모델로 자동 재시도한다.
        "fallbacks": "default",
        "messages": [{"role": "user", "content": PROMPT.format(topic=topic)}],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "server-side-fallback-2026-07-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Anthropic API 오류 {e.code}: {e.read().decode('utf-8', 'replace')[:300]}") from e

    if data.get("stop_reason") == "refusal":
        details = data.get("stop_details") or {}
        raise RuntimeError(f"모델이 요청을 거절했습니다: {details.get('category')} {details.get('explanation', '')}")

    text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
    script = _extract_json(text)

    # render.validate_script 와 같은 기준으로 최소 검증
    from render import validate_script

    return validate_script(script)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", required=True)
    ap.add_argument("--out", default=None, help="저장 경로 (없으면 stdout)")
    ap.add_argument("--model", default=None)
    args = ap.parse_args()
    script = generate_script(args.topic, args.model)
    out = json.dumps(script, ensure_ascii=False, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out)
        print(args.out)
    else:
        print(out)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"생성 실패: {e}", file=sys.stderr)
        sys.exit(1)
