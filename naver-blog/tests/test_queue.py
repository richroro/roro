# -*- coding: utf-8 -*-
import unittest

from naverblog import queue as q
from naverblog.config import load_state, read_json_list
from naverblog.post import Post
from tests.helpers import TempDirs


def make(title="제목", n=1):
    return Post(title=f"{title} {n}", content=f"## 소제목\n\n본문 {n}", tags=["태그"])


class QueueTest(unittest.TestCase):
    def test_fifo_numbering_and_posted(self):
        with TempDirs() as base:
            p1 = q.add_post(make(n=1))
            p2 = q.add_post(make(n=2))
            self.assertEqual([p.name for p in q.queue_files()], ["0001.json", "0002.json"])
            path, post = q.next_post()
            self.assertEqual(path, p1)
            self.assertEqual(post.title, "제목 1")

            target = q.mark_posted(path, post, "https://blog.naver.com/x/1")
            self.assertTrue(target.exists())
            self.assertFalse(p1.exists())
            self.assertEqual([p.name for p in q.queue_files()], ["0002.json"])
            log = read_json_list(base / "data" / "posted_log.json")
            self.assertEqual(log[-1]["url"], "https://blog.naver.com/x/1")
            self.assertEqual(q.load_post(target).meta["published_url"], "https://blog.naver.com/x/1")

            # 번호는 posted 에 있는 것까지 고려해 계속 증가한다
            p3 = q.add_post(make(n=3))
            self.assertEqual(p3.name, "0003.json")
            self.assertEqual(load_state()["queue_seq"], 4)

            # 큐 밖 파일은 발행 기록만 남기고 옮기지 않는다
            outside = base / "outside.json"
            q.save_post(outside, make(n=9))
            same = q.mark_posted(outside, q.load_post(outside), "u", source="file")
            self.assertEqual(same, outside)
            self.assertTrue(outside.exists())

    def test_resolve(self):
        with TempDirs():
            p = q.add_post(make())
            self.assertEqual(q.resolve("1")[0], p)
            self.assertEqual(q.resolve("0001.json")[0], p)
            self.assertEqual(q.resolve(str(p))[0], p)
            with self.assertRaises(FileNotFoundError):
                q.resolve("42")

    def test_add_invalid(self):
        with TempDirs():
            with self.assertRaises(ValueError):
                q.add_post(Post(title="", content="x"))


if __name__ == "__main__":
    unittest.main()
