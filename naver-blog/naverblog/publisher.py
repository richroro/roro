# -*- coding: utf-8 -*-
"""Playwright 로 크롬 창을 열어 네이버 블로그(스마트에디터 ONE)에 글을 발행한다.

- profile/ 폴더에 크롬 프로필을 저장해 한 번 로그인하면 세션이 유지된다.
- 네이버는 자동화 로그인을 잘 막으므로 기본은 '창을 띄우고 사람이 로그인' 이다.
  .env 에 NAVER_ID/NAVER_PW 가 있으면 자동 로그인을 먼저 시도하고, 캡차가 뜨면
  사람이 마무리할 때까지 기다린다.
- 실패하면 logs/ 에 스크린샷을 남기고 어느 단계에서 멈췄는지 알려준다.
- 화면 요소 선택자는 selectors.py 한곳에 모여 있다.
"""
import re
import sys
import time
from pathlib import Path

from .config import LOGS_DIR, PROFILE_DIR, env, env_bool, stamp
from .post import Post
from .selectors import LOGIN_COOKIES, LOGIN_URL, SELECTORS, WRITE_URL

POST_URL_RE = re.compile(r"logNo=(\d+)|blog\.naver\.com/[^/?#]+/(\d{6,})")


class PublishError(RuntimeError):
    pass


class LoginRequired(PublishError):
    pass


class NaverBlogPublisher:
    """`with NaverBlogPublisher(blog_id) as pub: pub.publish(post)` 형태로 쓴다."""

    def __init__(
        self,
        blog_id: str,
        *,
        headless: bool = None,
        profile_dir: Path = None,
        slow_mo: int = None,
        executable_path: str = None,
        channel: str = None,
        write_url: str = None,
        typing_delay_ms: int = None,
        bold_headings: bool = None,
        require_login: bool = True,
    ):
        if not blog_id:
            raise PublishError("블로그 아이디(NAVER_BLOG_ID)가 없습니다.")
        self.blog_id = blog_id
        self.headless = env_bool("NAVER_HEADLESS", False) if headless is None else headless
        self.profile_dir = Path(profile_dir or env("NAVER_PROFILE_DIR") or PROFILE_DIR)
        self.slow_mo = int(slow_mo if slow_mo is not None else env("NAVER_SLOW_MO", 0))
        self.executable_path = executable_path or env("NAVER_BROWSER_EXECUTABLE")
        self.channel = channel or env("NAVER_BROWSER_CHANNEL")  # 예: chrome (PC에 설치된 크롬 사용)
        self.write_url = write_url or env("NAVER_WRITE_URL") or WRITE_URL
        self.typing_delay_ms = int(
            typing_delay_ms if typing_delay_ms is not None else env("NAVER_TYPING_DELAY_MS", 0)
        )
        self.bold_headings = (
            env_bool("NAVER_BOLD_HEADINGS", True) if bold_headings is None else bold_headings
        )
        self.require_login = require_login
        self._pw = None
        self.context = None
        self.page = None

    # ------------------------------------------------------------------ 브라우저
    def __enter__(self):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as e:  # pragma: no cover
            raise PublishError(
                "playwright 패키지가 없습니다. `pip install -r requirements.txt` 후 "
                "`python -m playwright install chromium` 을 실행하세요."
            ) from e

        self.profile_dir.mkdir(parents=True, exist_ok=True)
        self._pw = sync_playwright().start()
        kwargs = dict(
            user_data_dir=str(self.profile_dir),
            headless=self.headless,
            slow_mo=self.slow_mo,
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            viewport={"width": 1280, "height": 900},
            # 자동화 표시(navigator.webdriver 등)를 줄인다
            args=["--disable-blink-features=AutomationControlled", "--lang=ko-KR"],
            ignore_default_args=["--enable-automation"],
        )
        if self.executable_path:
            kwargs["executable_path"] = self.executable_path
        elif self.channel:
            kwargs["channel"] = self.channel
        try:
            self.context = self._pw.chromium.launch_persistent_context(**kwargs)
        except Exception as e:
            self._pw.stop()
            msg = str(e).splitlines()[0]
            raise PublishError(
                f"크롬을 실행하지 못했습니다: {msg}\n"
                "  - 브라우저가 없으면: python -m playwright install chromium\n"
                "  - PC에 설치된 크롬을 쓰려면 .env 에 NAVER_BROWSER_CHANNEL=chrome\n"
                "  - 프로필이 잠겨 있으면 이미 열린 자동화 크롬 창을 닫고 다시 실행"
            ) from e
        self.context.set_default_timeout(15000)
        self.page = self.context.pages[0] if self.context.pages else self.context.new_page()
        # confirm()/alert() 류 대화상자는 항상 확인으로 넘긴다
        self.page.on("dialog", lambda d: d.accept())
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if self.context is not None:
                self.context.close()
        finally:
            if self._pw is not None:
                self._pw.stop()
        return False

    # ------------------------------------------------------------------ 로그인
    def is_logged_in(self) -> bool:
        try:
            cookies = self.context.cookies()
        except Exception:  # noqa: BLE001
            return False
        names = {c.get("name") for c in cookies if "naver.com" in (c.get("domain") or "")}
        return LOGIN_COOKIES[0] in names

    def login(self, interactive: bool = True, timeout_s: int = 300) -> bool:
        """로그인돼 있으면 바로 True. 아니면 로그인 페이지를 열고 세션이 생길 때까지 기다린다."""
        if self.is_logged_in():
            return True
        page = self.page
        page.goto(LOGIN_URL, wait_until="domcontentloaded")

        nid, npw = env("NAVER_ID"), env("NAVER_PW")
        if nid and npw:
            self._auto_login(page, nid, npw)
            if self.is_logged_in():
                print("[login] 자동 로그인 성공.")
                return True

        if not interactive:
            raise LoginRequired(
                "네이버 로그인이 필요합니다. 먼저 `python -m naverblog login` 을 실행해 "
                "브라우저 창에서 한 번 로그인해 두세요 (세션은 profile/ 에 저장됩니다)."
            )
        print(
            "브라우저 창에서 네이버에 로그인해 주세요 (캡차·2단계 인증 포함).\n"
            f"로그인되면 자동으로 이어갑니다. (최대 {timeout_s}초 대기)"
        )
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            if self.is_logged_in():
                print("[login] 로그인 확인됨. 세션을 profile/ 에 저장했습니다.")
                return True
            page.wait_for_timeout(1500)
        raise LoginRequired("로그인 대기 시간이 지났습니다. 다시 시도해 주세요.")

    def _auto_login(self, page, nid: str, npw: str) -> None:
        """아이디/비밀번호를 JS 로 채워 넣고 로그인 버튼을 누른다.

        키 입력으로 넣으면 네이버가 자동화로 판단해 캡차를 띄우는 경우가 많아
        값을 직접 설정한다. 그래도 캡차가 뜨면 사람이 마무리한다.
        """
        try:
            id_el = self._first(page, "login_id", timeout=8000)
            pw_el = self._first(page, "login_pw", timeout=3000)
            for el, value in ((id_el, nid), (pw_el, npw)):
                el.click()
                el.evaluate(
                    "(node, v) => { node.value = v;"
                    " node.dispatchEvent(new Event('input', {bubbles: true}));"
                    " node.dispatchEvent(new Event('change', {bubbles: true})); }",
                    value,
                )
                page.wait_for_timeout(300)
            self._first(page, "login_submit", timeout=3000).click()
            page.wait_for_timeout(4000)
        except Exception as e:  # noqa: BLE001 - 자동 로그인은 보조 수단
            print(
                f"[login] 자동 로그인 시도 실패 ({e.__class__.__name__}). 수동 로그인으로 넘어갑니다.",
                file=sys.stderr,
            )

    # ------------------------------------------------------------------ 발행
    def publish(
        self,
        post: Post,
        *,
        private: bool = False,
        category: str = None,
        review: bool = False,
    ) -> str:
        """글을 발행하고 글 주소를 돌려준다. review=True 면 발행 직전에 멈춰 사람이 확인한다."""
        post.validate()
        if self.require_login:
            self.login(interactive=not self.headless)

        page = self.page
        step = "글쓰기 화면 열기"
        try:
            page.goto(self.write_url.format(blog_id=self.blog_id), wait_until="domcontentloaded")

            step = "에디터 로드"
            frame = self._editor_frame(page)
            page.wait_for_timeout(1500)

            step = "팝업 닫기"
            if self._click_optional(frame, "popup_cancel"):
                page.wait_for_timeout(500)
            self._click_optional(frame, "help_close", timeout=1500)

            step = "제목 입력"
            self._first(frame, "title").click()
            page.keyboard.insert_text(post.title)

            step = "본문 입력"
            self._first(frame, "body").click()
            self._type_blocks(page, post.blocks)

            step = "발행 설정 열기"
            self._first(frame, "publish_open").click()
            confirm = self._first(frame, "publish_confirm", timeout=10000)

            step = "공개 설정"
            self._click_optional(
                frame, "visibility_private" if private else "visibility_public", timeout=3000
            )

            if category:
                step = f"카테고리 선택: {category}"
                self._select_category(frame, category)

            step = "태그 입력"
            if post.tags:
                tag_input = self._first(frame, "tag_input", timeout=8000)
                tag_input.click()
                for tag in post.tags:
                    page.keyboard.insert_text(tag)
                    page.keyboard.press("Enter")
                    page.wait_for_timeout(150)

            if review:
                print("\n" + post.summary())
                print(
                    "\n[review] 브라우저에서 내용을 확인하세요. 이 창에서 Enter 를 누르면 "
                    "발행 버튼을 클릭합니다. 취소하려면 Ctrl+C."
                )
                input()

            step = "발행 버튼 클릭"
            if confirm.is_visible():
                confirm.click()

            step = "발행 결과 확인"
            return self._wait_for_post_url(page)
        except PublishError as e:
            shot = self._screenshot(page, step)
            raise PublishError(f"[{step}] {e} (스크린샷: {shot})") from e
        except Exception as e:  # noqa: BLE001 - Playwright 오류를 단계 정보와 함께 감싼다
            shot = self._screenshot(page, step)
            first = str(e).strip().splitlines()[0] if str(e).strip() else e.__class__.__name__
            raise PublishError(
                f"[{step}] 단계에서 실패: {e.__class__.__name__}: {first} (스크린샷: {shot})\n"
                "  네이버 화면이 바뀐 경우 naverblog/selectors.py 의 후보 선택자를 고치세요."
            ) from e

    # ------------------------------------------------------------------ 내부 도우미
    def _editor_frame(self, page, timeout_s: int = 30):
        """에디터가 들어 있는 프레임(iframe 또는 메인)을 찾는다."""
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            for fr in page.frames:
                for sel in SELECTORS["editor_root"]:
                    try:
                        if fr.locator(sel).count() > 0:
                            return fr
                    except Exception:  # noqa: BLE001 - 프레임이 갈아끼워지는 중일 수 있다
                        continue
            page.wait_for_timeout(500)
        raise PublishError(
            "에디터를 찾지 못했습니다. 로그인이 풀렸거나 글쓰기 화면 구조가 바뀐 것 같습니다."
        )

    def _first(self, scope, key: str, timeout: int = 15000, **fmt):
        """후보 선택자를 차례로 시도해 처음 보이는 요소의 Locator 를 돌려준다."""
        candidates = SELECTORS[key]
        per = max(1000, timeout // max(1, len(candidates)))
        for sel in candidates:
            if fmt:
                sel = sel.format(**fmt)
            loc = scope.locator(sel).first
            try:
                loc.wait_for(state="visible", timeout=per)
                return loc
            except Exception:  # noqa: BLE001
                continue
        raise PublishError(
            f"화면 요소를 찾지 못했습니다: '{key}' (selectors.py 의 '{key}' 후보를 확인하세요)"
        )

    def _click_optional(self, scope, key: str, timeout: int = 2500) -> bool:
        """있으면 클릭하고 True, 없으면 조용히 False."""
        try:
            self._first(scope, key, timeout=timeout).click()
            return True
        except PublishError:
            return False
        except Exception:  # noqa: BLE001
            return False

    def _type_blocks(self, page, blocks) -> None:
        """본문 블록을 키 입력으로 넣는다. 블록 사이에는 빈 줄 하나."""
        for i, block in enumerate(blocks):
            text = block.text if block.kind != "bullet" else f"• {block.text}"
            lines = [ln for ln in text.split("\n") if ln.strip()]
            for ln in lines:
                if block.kind == "heading" and self.bold_headings:
                    page.keyboard.press("Control+b")
                    page.keyboard.insert_text(ln)
                    page.keyboard.press("Control+b")
                else:
                    page.keyboard.insert_text(ln)
                page.keyboard.press("Enter")
                if self.typing_delay_ms:
                    page.wait_for_timeout(self.typing_delay_ms)
            nxt = blocks[i + 1] if i + 1 < len(blocks) else None
            if not (block.kind == "bullet" and nxt is not None and nxt.kind == "bullet"):
                page.keyboard.press("Enter")

    def _select_category(self, frame, name: str) -> None:
        self._first(frame, "category_button", timeout=5000).click()
        self._first(frame, "category_item", timeout=5000, name=name).click()

    def _wait_for_post_url(self, page, timeout_s: int = 60) -> str:
        """발행 후 어떤 프레임이든 글 주소(logNo)로 바뀌기를 기다린다."""
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            for fr in page.frames:
                m = POST_URL_RE.search(fr.url or "")
                if m:
                    log_no = m.group(1) or m.group(2)
                    return f"https://blog.naver.com/{self.blog_id}/{log_no}"
            page.wait_for_timeout(500)
        raise PublishError(
            "발행 후 글 주소를 확인하지 못했습니다. 블로그에 실제로 올라갔는지 확인하세요."
        )

    def _screenshot(self, page, step: str):
        try:
            LOGS_DIR.mkdir(parents=True, exist_ok=True)
            safe = re.sub(r"[^\w가-힣]+", "_", step).strip("_")[:40] or "error"
            path = LOGS_DIR / f"{stamp()}-{safe}.png"
            page.screenshot(path=str(path))
            return path
        except Exception:  # noqa: BLE001
            return None
