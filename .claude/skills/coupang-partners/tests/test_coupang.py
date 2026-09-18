# -*- coding: utf-8 -*-
"""coupang-partners 단위 테스트 (네트워크 없이 실행).

    python -m unittest discover -s .claude/skills/coupang-partners/tests
"""
import hashlib
import hmac
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))

import common  # noqa: E402
import render  # noqa: E402
import report  # noqa: E402

SEARCH_PAYLOAD = {
    "rCode": "0",
    "rMessage": "",
    "data": {
        "landingUrl": "https://link.coupang.com/re/AFFSRP?lptag=AF123&pageKey=%EA%B0%80%EA%B3%84%EB%B6%80",
        "productData": [
            {
                "keyword": "가계부",
                "rank": 1,
                "isRocket": True,
                "isFreeShipping": False,
                "productId": 111,
                "productImage": "https://static.coupangcdn.com/a.jpg",
                "productName": "2026 심플 가계부 <A5>",
                "productPrice": 8900,
                "productUrl": "https://link.coupang.com/re/AFFSDP?lptag=AF123&pageKey=111",
                "categoryName": "문구/오피스",
            },
            {
                "keyword": "가계부",
                "rank": 2,
                "isRocket": False,
                "productId": 222,
                "productImage": "",
                "productName": "돈이 모이는 가계부 노트",
                "productPrice": "12000",
                "productUrl": "https://link.coupang.com/re/AFFSDP?lptag=AF123&pageKey=222",
            },
        ],
    },
}

GOLDBOX_PAYLOAD = {
    "rCode": "0",
    "rMessage": "",
    "data": [
        {"productId": 9, "productName": "특가 상품", "productPrice": 5000,
         "productUrl": "https://link.coupang.com/re/AFFSDP?pageKey=9", "productImage": "https://x/y.jpg"}
    ],
}


class SignatureTests(unittest.TestCase):
    def test_signed_date_is_utc_and_compact(self):
        kst = timezone(timedelta(hours=9))
        now = datetime(2026, 9, 18, 9, 5, 7, tzinfo=kst)  # 00:05:07 UTC
        self.assertEqual(common.signed_date(now), "260918T000507Z")

    def test_authorization_header_matches_coupang_scheme(self):
        now = datetime(2026, 9, 18, 0, 5, 7, tzinfo=timezone.utc)
        path = common.PATH_SEARCH
        query = common.encode_query({"keyword": "가계부", "limit": 5, "subId": "blog"})
        header = common.build_authorization("get", path, query, "AK", "SK", now=now)

        expected_msg = "260918T000507Z" + "GET" + path + query
        expected_sig = hmac.new(b"SK", expected_msg.encode("utf-8"), hashlib.sha256).hexdigest()
        self.assertEqual(
            header,
            f"CEA algorithm=HmacSHA256, access-key=AK, signed-date=260918T000507Z, signature={expected_sig}",
        )

    def test_encode_query_drops_empty_values_and_encodes_korean(self):
        q = common.encode_query({"keyword": "가계부 노트", "limit": 5, "subId": None, "imageSize": ""})
        self.assertEqual(q, "keyword=%EA%B0%80%EA%B3%84%EB%B6%80+%EB%85%B8%ED%8A%B8&limit=5")
        self.assertEqual(common.encode_query({}), "")

    def test_api_request_signs_exactly_what_it_sends(self):
        captured = {}

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return json.dumps(SEARCH_PAYLOAD).encode("utf-8")

        def fake_urlopen(req, timeout=0):
            captured["url"] = req.full_url
            captured["auth"] = req.get_header("Authorization")
            captured["method"] = req.get_method()
            return FakeResp()

        with mock.patch.object(common, "require_keys", return_value=("AK", "SK")), \
             mock.patch.object(common.urllib.request, "urlopen", fake_urlopen):
            payload = common.api_request("GET", common.PATH_SEARCH, {"keyword": "가계부", "limit": 5})

        self.assertEqual(payload["rCode"], "0")
        self.assertEqual(captured["method"], "GET")
        sent_path, sent_query = captured["url"].replace(common.API_HOST, "").split("?", 1)
        signed_date = captured["auth"].split("signed-date=")[1].split(",")[0]
        sig = captured["auth"].split("signature=")[1]
        expected = hmac.new(b"SK", (signed_date + "GET" + sent_path + sent_query).encode(), hashlib.sha256).hexdigest()
        self.assertEqual(sig, expected)

    def test_api_request_raises_on_rcode_error(self):
        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return json.dumps({"rCode": "400", "rMessage": "bad", "data": None}).encode()

        with mock.patch.object(common, "require_keys", return_value=("AK", "SK")), \
             mock.patch.object(common.urllib.request, "urlopen", lambda *a, **k: FakeResp()):
            with self.assertRaises(common.ApiError):
                common.api_request("GET", common.PATH_GOLDBOX, {})


class EnvTests(unittest.TestCase):
    def test_load_env_parses_file_and_prefers_environment(self):
        with tempfile.TemporaryDirectory() as tmp:
            env_file = Path(tmp) / ".env"
            env_file.write_text(
                "# comment\nCOUPANG_ACCESS_KEY = file-ak\nCOUPANG_SECRET_KEY='file-sk'\nCOUPANG_SUB_ID=blog\n",
                encoding="utf-8",
            )
            with mock.patch.dict(os.environ, {"COUPANG_ACCESS_KEY": "env-ak"}, clear=False):
                env = common.load_env(env_file)
        self.assertEqual(env["COUPANG_ACCESS_KEY"], "env-ak")
        self.assertEqual(env["COUPANG_SECRET_KEY"], "file-sk")
        self.assertEqual(env["COUPANG_SUB_ID"], "blog")

    def test_require_keys_gives_setup_guidance_when_missing(self):
        with mock.patch.object(common, "load_env", return_value={}):
            with self.assertRaises(common.SetupError) as ctx:
                common.require_keys()
        self.assertIn("coupang_setup.md", str(ctx.exception))


class NormalizeTests(unittest.TestCase):
    def test_search_payload(self):
        products, landing = common.normalize_products(SEARCH_PAYLOAD)
        self.assertEqual(len(products), 2)
        self.assertTrue(landing.startswith("https://link.coupang.com/re/AFFSRP"))
        self.assertEqual(products[0]["name"], "2026 심플 가계부 <A5>")
        self.assertTrue(products[0]["isRocket"])
        self.assertFalse(products[1]["isRocket"])

    def test_goldbox_payload_list_shape(self):
        products, landing = common.normalize_products(GOLDBOX_PAYLOAD)
        self.assertIsNone(landing)
        self.assertEqual(products[0]["price"], 5000)


class DisclosureTests(unittest.TestCase):
    POST = "<h2>가계부</h2><p>본문</p><a href=\"https://link.coupang.com/a/abc\">상품</a>"

    def test_adds_once_at_top_when_coupang_link_present(self):
        out = common.ensure_disclosure(self.POST)
        self.assertTrue(out.startswith('<p class="coupang-disclosure"'))
        self.assertIn(common.DISCLOSURE, out)
        self.assertEqual(common.ensure_disclosure(out), out)  # idempotent

    def test_no_change_without_coupang_link(self):
        plain = "<p>쿠팡이라는 단어만 있고 링크는 없음 https://example.com/coupang</p>"
        self.assertEqual(common.ensure_disclosure(plain), plain)

    def test_recognizes_existing_disclosure_without_spaces(self):
        post = "<p>이 포스팅은 쿠팡파트너스 활동의 일환으로 수수료를 받습니다.</p>" + self.POST
        self.assertEqual(common.ensure_disclosure(post), post)

    def test_link_detection_variants(self):
        self.assertTrue(common.has_coupang_link('<a href="https://coupa.ng/xyz">x</a>'))
        self.assertTrue(common.has_coupang_link("https://www.coupang.com/vp/products/1"))
        self.assertFalse(common.has_coupang_link("https://notcoupang.com/a"))
        self.assertFalse(common.has_coupang_link(""))


class RenderTests(unittest.TestCase):
    def test_cards_escape_and_format(self):
        products, _ = common.normalize_products(SEARCH_PAYLOAD)
        html = common.render_products_html(products, heading="추천 <가계부>")
        self.assertIn("추천 &lt;가계부&gt;", html)
        self.assertIn("2026 심플 가계부 &lt;A5&gt;", html)
        self.assertIn("8,900원", html)
        self.assertIn("12,000원", html)
        self.assertIn('rel="nofollow sponsored noopener"', html)
        self.assertIn("🚀 로켓배송", html)
        self.assertNotIn(common.DISCLOSURE, html)  # 블로거 발행 시 맨 위에 자동 삽입되므로 기본 미포함
        self.assertEqual(html.count("<img "), 1)  # 이미지 없는 상품은 img 생략

    def test_with_disclosure_appends_notice(self):
        products, _ = common.normalize_products(SEARCH_PAYLOAD)
        html = common.render_products_html(products, disclosure=True)
        self.assertIn(common.DISCLOSURE, html)
        self.assertEqual(common.ensure_disclosure(html), html)  # 이미 있으면 위에 또 넣지 않음

    def test_list_style_without_disclosure(self):
        products, _ = common.normalize_products(SEARCH_PAYLOAD)
        html = common.render_products_html(products, style="list")
        self.assertIn("<ul", html)
        self.assertNotIn("<img", html)
        self.assertNotIn(common.DISCLOSURE, html)

    def test_long_names_are_shortened(self):
        html = common.render_products_html([{"url": "u", "name": "가" * 80, "price": 1}], max_name=20)
        self.assertIn("가" * 19 + "…", html)

    def test_empty_raises(self):
        with self.assertRaises(ValueError):
            common.render_products_html([])


class RenderCliTests(unittest.TestCase):
    def test_parse_item_and_pick(self):
        item = render.parse_item("https://link.coupang.com/a/x | 상품 | 19900 | https://img")
        self.assertEqual(item, {"url": "https://link.coupang.com/a/x", "name": "상품", "price": "19900", "image": "https://img"})
        item2 = render.parse_item("https://link.coupang.com/a/y|이름만")
        self.assertIsNone(item2["price"])
        with self.assertRaises(ValueError):
            render.parse_item("no-pipe")
        self.assertEqual(render.pick([1, 2, 3], "3,1"), [3, 1])
        with self.assertRaises(ValueError):
            render.pick([1], "2")


class ReportTests(unittest.TestCase):
    def test_summarize_sums_numeric_fields_only(self):
        rows = [
            {"date": "20260901", "click": 3, "commission": 120.5, "subId": "blog"},
            {"date": "20260902", "click": 2, "commission": 79.5, "isRocket": True},
        ]
        self.assertEqual(report.summarize(rows), {"click": 5, "commission": 200.0})


if __name__ == "__main__":
    unittest.main()
