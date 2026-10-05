# -*- coding: utf-8 -*-
import json
import unittest
from types import SimpleNamespace

from naverblog import generator

RESULT = {
    "title": "통장 쪼개기, 3개면 충분해요",
    "intro": "월급날마다 돈이 어디로 갔는지 모르겠다면 통장부터 나눠 보세요.",
    "sections": [
        {"heading": "왜 세 개인가", "paragraphs": ["급여, 생활비, 저축. 이 셋이면 됩니다.", "- 급여 통장\n- 생활비 통장"]},
        {"heading": "자동이체 걸기", "paragraphs": ["월급 다음 날로 이체일을 맞춥니다."]},
    ],
    "outro": "오늘 통장 하나만 더 만들어 보세요.",
    "tags": ["#통장쪼개기", "재테크", "월급 관리"],
}


class FakeStream:
    def __init__(self, message):
        self.message = message

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def get_final_message(self):
        return self.message


class FakeMessages:
    def __init__(self, message=None, error=None):
        self.message, self.error, self.calls = message, error, []

    def stream(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return FakeStream(self.message)


def fake_message(data=RESULT, stop_reason="end_turn"):
    return SimpleNamespace(
        stop_reason=stop_reason,
        stop_details=None,
        content=[SimpleNamespace(type="text", text=json.dumps(data, ensure_ascii=False))],
        usage=SimpleNamespace(input_tokens=100, output_tokens=900),
    )


def fake_client(beta_messages, messages):
    return SimpleNamespace(beta=SimpleNamespace(messages=beta_messages), messages=messages)


class GeneratorTest(unittest.TestCase):
    def test_structured_output_to_post(self):
        beta = FakeMessages(fake_message())
        client = fake_client(beta, FakeMessages(fake_message()))
        post = generator.generate_post("통장 쪼개기", client=client, model="claude-opus-5", keywords=["월급"])
        self.assertEqual(post.title, RESULT["title"])
        self.assertEqual(post.tags, ["통장쪼개기", "재테크", "월급관리"])
        kinds = [b.kind for b in post.blocks]
        self.assertEqual(kinds, ["paragraph", "heading", "paragraph", "bullet", "bullet", "heading", "paragraph", "paragraph"])
        self.assertEqual(post.meta["usage"]["output_tokens"], 900)
        self.assertEqual(post.meta["topic"], "통장 쪼개기")

        # 요청 형태 확인: 구조화 출력 + 스트리밍 + 서버 fallbacks
        kw = beta.calls[0]
        self.assertEqual(kw["model"], "claude-opus-5")
        self.assertEqual(kw["output_config"]["format"]["type"], "json_schema")
        self.assertEqual(kw["output_config"]["format"]["schema"], generator.POST_SCHEMA)
        self.assertEqual(kw["betas"], ["server-side-fallback-2026-07-01"])
        self.assertEqual(kw["fallbacks"], "default")
        self.assertIn("월급", kw["messages"][0]["content"])
        self.assertNotIn("thinking", kw)  # Opus 5 는 생략 시 adaptive

    def test_refusal(self):
        client = fake_client(FakeMessages(fake_message(stop_reason="refusal")), FakeMessages())
        with self.assertRaises(generator.GenerationError):
            generator.generate_post("x", client=client)

    def test_bad_request_retries_without_fallbacks(self):
        import anthropic
        import httpx2 as httpx

        err = anthropic.BadRequestError(
            "fallbacks not supported",
            response=httpx.Response(400, request=httpx.Request("POST", "https://api.anthropic.com/v1/messages")),
            body={"error": {"message": "fallbacks not supported"}},
        )
        plain = FakeMessages(fake_message())
        client = fake_client(FakeMessages(error=err), plain)
        post = generator.generate_post("x", client=client)
        self.assertEqual(post.title, RESULT["title"])
        self.assertEqual(len(plain.calls), 1)
        self.assertNotIn("fallbacks", plain.calls[0])

    def test_prompt_contents(self):
        prompt = generator.build_prompt("주제A", style="formal", length="long", keywords=["k1"], audience="독자", persona="페르소나", extra="추가")
        for needle in ("주제A", "합니다", "2,500~3,500자", "k1", "독자", "페르소나", "추가"):
            self.assertIn(needle, prompt)


if __name__ == "__main__":
    unittest.main()
