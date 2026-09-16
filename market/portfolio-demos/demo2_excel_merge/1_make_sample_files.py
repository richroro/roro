# -*- coding: utf-8 -*-
"""
데모 2) 준비 단계 - 흩어진 엑셀 파일 5개(Before) 생성
------------------------------------------------
'지점별 매출 파일이 5개로 나뉘어 있는' 흔한 상황을 재현합니다.
실행하면 input_files/ 폴더에 매출_강남.xlsx ... 5개가 생깁니다.
(포트폴리오 Before 캡처용)
"""
import os
from openpyxl import Workbook

BRANCHES = {
    "강남": [("아메리카노", 120, 4500), ("라떼", 80, 5000), ("케이크", 30, 6500)],
    "홍대": [("아메리카노", 200, 4500), ("라떼", 150, 5000), ("샌드위치", 60, 7000)],
    "판교": [("아메리카노", 90, 4500), ("콜드브루", 70, 5500), ("케이크", 25, 6500)],
    "잠실": [("아메리카노", 160, 4500), ("라떼", 110, 5000), ("쿠키", 90, 3000)],
    "부산": [("아메리카노", 140, 4500), ("콜드브루", 50, 5500), ("샌드위치", 40, 7000)],
}

OUT_DIR = os.path.join(os.path.dirname(__file__), "input_files")
os.makedirs(OUT_DIR, exist_ok=True)

for branch, items in BRANCHES.items():
    wb = Workbook()
    ws = wb.active
    ws.title = "매출"
    ws.append(["상품명", "판매수량", "단가"])
    for name, qty, price in items:
        ws.append([name, qty, price])
    path = os.path.join(OUT_DIR, f"매출_{branch}.xlsx")
    wb.save(path)
    print(f"생성: 매출_{branch}.xlsx  ({len(items)}개 상품)")

print(f"\n완료 - input_files 폴더에 5개 파일 생성 (Before 상태)")
