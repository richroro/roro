# -*- coding: utf-8 -*-
"""네이버 블로그 스마트에디터 ONE 화면 요소 선택자.

네이버가 화면을 바꾸면 여기만 고치면 된다. 각 항목은 앞에서부터 차례로 시도하는
후보 리스트다. 해시가 붙는 클래스(예: publish_btn__m9KHH)는 접두어 매칭
(`[class^='publish_btn__']`)으로 잡아 해시가 바뀌어도 버티게 했다.

고치는 법: 발행이 실패하면 logs/ 에 스크린샷이 남는다. 크롬에서 글쓰기 화면을
열고 F12 → 요소 검사로 해당 요소의 class 를 확인해 후보 맨 앞에 추가한다.
"""

# 글쓰기 화면. {blog_id} 가 채워진다. 실제로는 PostWriteForm.naver 로 리다이렉트되며
# 에디터가 mainFrame iframe 안에 뜨는 경우와 바로 뜨는 경우가 모두 있어 두 경우를 다 처리한다.
WRITE_URL = "https://blog.naver.com/{blog_id}?Redirect=Write&"
LOGIN_URL = "https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fblog.naver.com%2F"
BLOG_HOME_URL = "https://blog.naver.com/{blog_id}"

# 로그인 여부 판단에 쓰는 쿠키 (naver.com 도메인)
LOGIN_COOKIES = ("NID_AUT", "NID_SES")

SELECTORS = {
    # 에디터가 로드됐는지 확인하는 루트 요소 (어느 프레임에 있는지 찾는 데 쓴다)
    "editor_root": [
        ".se-main-container",
        ".se-content",
        ".se-component-content",
    ],
    # "작성 중인 글이 있습니다" (임시저장 불러오기) 팝업 → 취소하고 새 글로 시작
    "popup_cancel": [
        ".se-popup-button-cancel",
        "button.se-popup-button-cancel",
        ".se-popup-dim button:has-text('취소')",
    ],
    # 첫 진입 시 뜨는 도움말 패널 닫기
    "help_close": [
        ".se-help-panel-close-button",
        "button.se-help-panel-close-button",
    ],
    # 제목 입력 영역
    "title": [
        ".se-section-documentTitle .se-text-paragraph",
        ".se-documentTitle .se-text-paragraph",
        ".se-title-text .se-text-paragraph",
    ],
    # 본문 첫 문단
    "body": [
        ".se-section-text .se-text-paragraph",
        ".se-component.se-text .se-text-paragraph",
        ".se-main-container .se-text .se-text-paragraph",
    ],
    # 우측 상단 "발행" 버튼 (발행 설정 레이어를 연다)
    "publish_open": [
        "button[class^='publish_btn__']",
        "button[class*='publish_btn']",
        "button:has-text('발행')",
    ],
    # 발행 설정 레이어 안의 최종 "발행" 버튼
    "publish_confirm": [
        "button[class^='confirm_btn__']",
        "button[class*='confirm_btn']",
        "[class*='layer_publish'] button:has-text('발행')",
        "[class*='publish_layer'] button:has-text('발행')",
    ],
    # 태그 입력칸
    "tag_input": [
        "#tag-input",
        "input[class^='tag_input__']",
        "input[class*='tag_input']",
        "input[placeholder*='태그']",
    ],
    # 공개 설정
    "visibility_public": [
        "label[for='open_public']",
        "label:has-text('전체공개')",
    ],
    "visibility_private": [
        "label[for='open_private']",
        "label:has-text('비공개')",
    ],
    # 카테고리 선택 버튼과 목록 항목 (선택)
    "category_button": [
        "button[class^='selectbox_button__']",
        "button[class*='selectbox_button']",
    ],
    "category_item": [
        "[class*='option_list'] label:has-text('{name}')",
        "[class*='selectbox'] label:has-text('{name}')",
        "label:has-text('{name}')",
    ],
    # 로그인 폼
    "login_id": ["#id", "input[name='id']"],
    "login_pw": ["#pw", "input[name='pw']"],
    "login_submit": ["#log\\.login", "button[type='submit']"],
}
