#!/usr/bin/env python3
"""캡처 주석 자체 점검.

빨간 박스가 **엉뚱한 행**을 가리키면 영상이 거짓말을 한다. 표 괘선 검출과 row/col 지정이
실제로 그 칸을 잡는지 확인한다.

    python scripts/selftest_annotate.py
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import annotate  # noqa: E402

SPEC = {
    "title": "점검용 표",
    "head": ["구분", "값"],
    "width": 900, "row_h": 80, "font_scale": 1.2,
    "rows": [["행 A", "111"], ["행 B", "222"], ["행 C", "333"], ["행 D", "444"], ["합계", "1,110"]],
}


def main() -> int:
    fails = 0
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        doc = annotate.make_table_image(SPEC, tmp / "doc.jpg")
        from PIL import Image
        import numpy as np

        img = Image.open(doc).convert("RGB")
        g = annotate._gray(img)
        region = annotate.find_document(g)
        bands = annotate.table_bands(g, region, axis=0)
        cols = annotate.table_bands(g, region, axis=1, min_size=24)

        want_rows = 1 + len(SPEC["rows"])        # 머리행 + 데이터행
        ok = len(bands) == want_rows
        print(f"  {'OK  ' if ok else 'FAIL'} 행 검출 {len(bands)}개 (기대 {want_rows})")
        fails += 0 if ok else 1
        ok = len(cols) == len(SPEC["head"])
        print(f"  {'OK  ' if ok else 'FAIL'} 열 검출 {len(cols)}개 (기대 {len(SPEC['head'])})")
        fails += 0 if ok else 1

        # row k 로 지정한 사각형의 세로 중심이 정말 k번째 띠 안에 있는가
        for k in range(len(bands)):
            r = annotate._rect_of({"row": k}, g, region, img.size)
            if r is None:
                print(f"  FAIL row {k}: 위치를 찾지 못함")
                fails += 1
                continue
            cy = (r[1] + r[3]) / 2 * img.height
            a, b = bands[k]
            inside = a <= cy <= b
            print(f"  {'OK  ' if inside else 'FAIL'} row {k} 중심 {cy:.0f} ∈ 띠({a},{b})")
            fails += 0 if inside else 1

        # 여러 행 묶기: row [1,3] 은 1~3행 전체를 덮어야 한다
        r = annotate._rect_of({"row": [1, 3]}, g, region, img.size)
        ok = r is not None and abs(r[1] * img.height - bands[1][0]) < 4 \
            and abs(r[3] * img.height - bands[3][1]) < 4
        print(f"  {'OK  ' if ok else 'FAIL'} row [1,3] 이 1~3행을 덮는다")
        fails += 0 if ok else 1

        # 실제로 그려진 빨간 박스가 지정한 행 위치에 있는가
        out = annotate.render({"src": str(doc), "marks": [{"type": "box", "row": 4}]},
                              tmp / "ann.jpg", 1.0)
        a = np.asarray(Image.open(out).convert("RGB"), dtype=int)
        red = (a[:, :, 0] > 170) & (a[:, :, 1] < 90) & (a[:, :, 2] < 90)
        ys = np.where(red.any(axis=1))[0]
        if len(ys) == 0:
            print("  FAIL 빨간 박스가 그려지지 않음")
            fails += 1
        else:
            _, pl = annotate.place(Image.open(doc).convert("RGB"), None)
            exp = pl.rect(annotate._rect_of({"row": 4}, g, region, img.size))
            ok = abs(ys.min() - exp[1]) < 20 and abs(ys.max() - exp[3]) < 20
            print(f"  {'OK  ' if ok else 'FAIL'} 빨간 박스 y {ys.min()}~{ys.max()} "
                  f"(기대 {exp[1]:.0f}~{exp[3]:.0f})")
            fails += 0 if ok else 1

    print("캡처 주석 점검:", "통과" if not fails else f"{fails}건 실패")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
