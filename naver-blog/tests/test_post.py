# -*- coding: utf-8 -*-
import unittest

from naverblog.post import Post, normalize_tags, parse_blocks

SAMPLE = """월급이 들어오면 먼저 하는 일이 있어요.

## 통장은 세 개면 충분해요
급여 통장, 생활비 통장, 저축 통장으로 나눕니다.
이체는 자동으로 걸어 두면 잊어버려도 굴러가요.

- 급여: 들어오는 곳
- 생활비: 체크카드 연결
* 저축: 손대지 않는 곳

## 마무리
작게 시작해도 괜찮아요.
"""


class ParseBlocksTest(unittest.TestCase):
    def test_kinds_and_order(self):
        kinds = [b.kind for b in parse_blocks(SAMPLE)]
        self.assertEqual(
            kinds,
            ["paragraph", "heading", "paragraph", "bullet", "bullet", "bullet", "heading", "paragraph"],
        )

    def test_paragraph_keeps_lines(self):
        blocks = parse_blocks(SAMPLE)
        self.assertIn("\n", blocks[2].text)
        self.assertEqual(blocks[1].text, "통장은 세 개면 충분해요")
        self.assertEqual(blocks[3].text, "급여: 들어오는 곳")

    def test_crlf(self):
        self.assertEqual(len(parse_blocks("a\r\n\r\nb")), 2)


class TagsTest(unittest.TestCase):
    def test_normalize(self):
        tags = normalize_tags(["#재테크", " 통장 쪼개기 ", "재테크", "", None, "돈!관리"])
        self.assertEqual(tags, ["재테크", "통장쪼개기", "돈관리"])

    def test_limit(self):
        self.assertEqual(len(normalize_tags([f"t{i}" for i in range(50)])), 30)


class PostTest(unittest.TestCase):
    def test_roundtrip_and_views(self):
        post = Post(title=" 통장 쪼개기 ", content=SAMPLE, tags=["#a", "b"], meta={"topic": "x"})
        self.assertEqual(post.title, "통장 쪼개기")
        again = Post.from_dict(post.to_dict())
        self.assertEqual(again.to_dict(), post.to_dict())
        html = post.to_html()
        self.assertIn("<h2>통장은 세 개면 충분해요</h2>", html)
        self.assertIn("<ul><li>급여: 들어오는 곳</li>", html)
        md = post.to_markdown()
        self.assertTrue(md.startswith("# 통장 쪼개기"))
        self.assertIn("- 저축: 손대지 않는 곳", md)
        txt = post.to_plain_text()
        self.assertIn("• 급여", txt)
        self.assertIn("#a #b", txt)
        self.assertIn("소제목 2개", post.summary())

    def test_validate(self):
        with self.assertRaises(ValueError):
            Post(title="", content="x").validate()
        with self.assertRaises(ValueError):
            Post(title="t", content="  ").validate()

    def test_from_html_compat(self):
        post = Post.from_dict({"title": "t", "html": "<h2>소제목</h2><p>문단 &amp; 내용</p><ul><li>항목</li></ul>", "labels": ["x"]})
        kinds = [b.kind for b in post.blocks]
        self.assertEqual(kinds, ["heading", "paragraph", "bullet"])
        self.assertEqual(post.blocks[1].text, "문단 & 내용")
        self.assertEqual(post.tags, ["x"])


if __name__ == "__main__":
    unittest.main()
