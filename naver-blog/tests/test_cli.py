# -*- coding: utf-8 -*-
import io
import os
import unittest
from contextlib import redirect_stdout
from unittest import mock

from naverblog import cli
from naverblog import queue as q
from naverblog.config import load_state
from naverblog.post import Post
from tests.helpers import TempDirs


def run(*argv):
    buf = io.StringIO()
    with redirect_stdout(buf):
        code = cli.main(list(argv))
    return code, buf.getvalue()


class CliTest(unittest.TestCase):
    def setUp(self):
        self._env = mock.patch.dict(os.environ, {"NAVER_BLOG_ID": "testblog"})
        self._env.start()

    def tearDown(self):
        self._env.stop()

    def test_queue_add_list_show_export_status_dryrun(self):
        with TempDirs() as base:
            body = base / "post.md"
            body.write_text("도입 문단.\n\n## 소제목\n\n본문.", encoding="utf-8")
            code, out = run("queue", "add", "--title", "수동 글", "--body-file", str(body), "--tags", "a, b")
            self.assertEqual(code, 0)
            self.assertIn("0001.json", out)

            code, out = run("queue", "list")
            self.assertEqual(code, 0)
            self.assertIn("수동 글", out)

            code, out = run("queue", "show", "1")
            self.assertIn("소제목 1개", out)

            code, out = run("export", "--format", "html")
            self.assertEqual(code, 0)
            files = list((base / "export").glob("*.html"))
            self.assertEqual(len(files), 1)
            self.assertIn("<h2>소제목</h2>", files[0].read_text(encoding="utf-8"))

            code, out = run("publish", "--dry-run", "--private")
            self.assertEqual(code, 0)
            self.assertIn("[dry-run]", out)
            self.assertIn("비공개", out)
            self.assertEqual(len(q.queue_files()), 1)  # dry-run 은 큐를 건드리지 않는다

            code, out = run("status")
            self.assertEqual(code, 0)
            self.assertIn("발행 대기 큐: 1편", out)

            code, out = run("queue", "remove", "1")
            self.assertEqual(code, 0)
            self.assertEqual(q.queue_files(), [])

    def test_generate_with_mocked_claude_and_topics(self):
        def fake_generate(topic, **kw):
            return Post(title=f"{topic} 제목", content="## 소제목\n\n본문", tags=["t"], meta={"topic": topic})

        with TempDirs() as base, mock.patch("naverblog.generator.generate_post", side_effect=fake_generate):
            code, out = run("generate", "--topic", "주제1", "--topic", "주제2")
            self.assertEqual(code, 0)
            self.assertEqual([q.load_post(p).title for p in q.queue_files()], ["주제1 제목", "주제2 제목"])

            (base / "topics.txt").write_text("# 주석\nA\nB\nC\n", encoding="utf-8")
            code, out = run("generate", "--from-topics", "--count", "2")
            self.assertEqual(code, 0)
            self.assertEqual(load_state()["topic_index"], 2)
            self.assertEqual(q.load_post(q.queue_files()[-1]).title, "B 제목")

            code, out = run("generate", "--from-topics", "--count", "5")
            self.assertEqual(code, 0)
            self.assertEqual(load_state()["topic_index"], 3)  # 남은 C 하나만 생성

            code, _ = run("generate", "--from-topics")
            self.assertEqual(code, 1)  # 주제 소진 → 오류 메시지로 종료

    def test_publish_moves_to_posted(self):
        class FakePub:
            def __init__(self, *a, **k):
                pass

            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

            def publish(self, post, **kw):
                return "https://blog.naver.com/testblog/1"

        with TempDirs() as base, mock.patch("naverblog.publisher.NaverBlogPublisher", FakePub):
            q.add_post(Post(title="t", content="c"))
            code, out = run("publish")
            self.assertEqual(code, 0)
            self.assertIn("발행 완료", out)
            self.assertEqual(q.queue_files(), [])
            self.assertTrue((base / "queue" / "posted" / "0001.json").exists())

    def test_generate_requires_topic(self):
        with self.assertRaises(SystemExit):
            run("generate")


if __name__ == "__main__":
    unittest.main()
