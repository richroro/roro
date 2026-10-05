# -*- coding: utf-8 -*-
"""가짜 스마트에디터 페이지(file://)로 발행 흐름 전체를 돌려 본다.

실제 네이버에는 접속하지 않는다. 프레임 찾기 → 팝업 닫기 → 제목/본문 입력 →
발행 레이어 → 공개 설정 → 태그 → 발행 → 글 주소 확인까지 코드 경로를 검증한다.
"""
import json
import os
import unittest
from pathlib import Path

from naverblog.post import Post
from naverblog.publisher import NaverBlogPublisher, PublishError
from tests.helpers import TempDirs

FIXTURES = Path(__file__).resolve().parent / "fixtures"

POST = Post(
    title="테스트 제목입니다",
    content="첫 문단이에요.\n\n## 소제목 하나\n\n두 번째 문단.\n줄바꿈 포함.\n\n- 항목 A\n- 항목 B\n\n마무리 문단.",
    tags=["#태그하나", "태그 둘", "태그하나"],
)


def _executable():
    # 이 샌드박스는 Playwright 버전과 내장 브라우저 빌드가 달라 경로를 직접 준다.
    for cand in (os.environ.get("NAVER_BROWSER_EXECUTABLE"), "/opt/pw-browsers/chromium"):
        if cand and Path(cand).exists():
            return cand
    return None


def _run(fixture: str, base: Path, private: bool):
    url = (FIXTURES / fixture).resolve().as_uri()
    with NaverBlogPublisher(
        "testblog",
        headless=True,
        profile_dir=base / "profile",
        executable_path=_executable(),
        write_url=url,
        require_login=False,
        bold_headings=True,
    ) as pub:
        result = pub.publish(POST, private=private)
        # 발행 직전 상태는 에디터 프레임의 window.name 에 남아 있다
        published = None
        for fr in pub.page.frames:
            raw = fr.evaluate("window.name")
            if raw and raw.startswith("{"):
                published = json.loads(raw)
        return result, published


class PublisherFakeEditorTest(unittest.TestCase):
    def _check(self, fixture, private=False):
        with TempDirs() as base:
            try:
                url, published = _run(fixture, base, private)
            except PublishError as e:
                if "크롬을 실행하지 못했습니다" in str(e):
                    self.skipTest(f"브라우저 없음: {e}")
                raise
        self.assertEqual(url, "https://blog.naver.com/testblog/223456789012")
        self.assertIsNotNone(published, "발행 직전 상태를 읽지 못했다")
        self.assertEqual(published["title"], POST.title)
        body = published["body"]
        for needle in ("첫 문단이에요.", "소제목 하나", "두 번째 문단.", "줄바꿈 포함.", "• 항목 A", "• 항목 B", "마무리 문단."):
            self.assertIn(needle, body)
        self.assertEqual(published["tags"], ["태그하나", "태그둘"])
        self.assertEqual(published["isPrivate"], private)
        return published

    def test_publish_public_main_frame(self):
        published = self._check("fake_editor.html")
        # 소제목 굵게(Ctrl+B)가 contenteditable 에서 실제로 적용됐는지는 참고용으로만 출력
        print("bold applied:", "<b>" in published["html"].lower() or "font-weight" in published["html"].lower())

    def test_publish_private_inside_iframe(self):
        self._check("fake_editor_iframe.html", private=True)

    def test_missing_editor_reports_step_and_screenshot(self):
        with TempDirs() as base:
            blank = base / "blank.html"
            blank.write_text("<html><body><p>에디터 없음</p></body></html>", encoding="utf-8")
            try:
                with NaverBlogPublisher(
                    "testblog", headless=True, profile_dir=base / "profile",
                    executable_path=_executable(), write_url=blank.as_uri(), require_login=False,
                ) as pub:
                    with self.assertRaises(PublishError) as ctx:
                        pub.publish(Post(title="t", content="c"))
            except PublishError as e:
                if "크롬을 실행하지 못했습니다" in str(e):
                    self.skipTest(str(e))
                raise
            self.assertIn("[에디터 로드]", str(ctx.exception))
            shots = list((base / "logs").glob("*.png"))
            self.assertEqual(len(shots), 1)


if __name__ == "__main__":
    unittest.main()
