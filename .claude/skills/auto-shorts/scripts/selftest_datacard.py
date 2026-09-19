#!/usr/bin/env python3
"""데이터 카드 클립 자체 점검.

금융·통계 영상에서 **화면에 뜬 숫자가 틀리는 것**은 최악의 버그다. 실제로 zoompan 의 d 값을
스트림 입력에 잘못 줘서 카운트업 첫 프레임(98:1)이 클립 전체로 늘어난 적이 있다.
그 회귀를 잡기 위해, 렌더된 클립의 마지막 프레임이 '완성된 카드'와 같은지 픽셀로 비교한다.

    python scripts/selftest_datacard.py
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import datacard  # noqa: E402
import render  # noqa: E402
from common import FPS, find_ffmpeg  # noqa: E402

CASES = [
    {"type": "stat", "label": "기관 경쟁률", "value": "1,109 : 1", "note": "2,255건"},
    {"type": "compare", "left": {"label": "최초", "value": "27,000원"},
     "right": {"label": "확정", "value": "18,000원"}, "delta": "33% 인하"},
    {"type": "table", "head": "결과", "highlight": 2,
     "rows": [["확정 공모가", "18,000원"], ["의무보유확약", "18.14%"], ["청약 경쟁률", "1,375 : 1"]]},
    {"type": "bars", "highlight": 1, "rows": [["전", 27000, "27,000원"], ["후", 18000, "18,000원"]]},
    {"type": "steps", "done": 2, "rows": [["수요예측", "1,109 : 1"], ["상장", "9월 29일"]]},
]


def _diff(a: Path, b: Path) -> float:
    from PIL import Image
    import numpy as np

    x = np.asarray(Image.open(a).convert("L").resize((270, 480)), dtype=float)
    y = np.asarray(Image.open(b).convert("L").resize((270, 480)), dtype=float)
    return float(abs(x - y).mean())


def main() -> int:
    fails = 0
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for i, card in enumerate(CASES, 1):
            final = tmp / f"final_{i}.jpg"
            datacard.draw_card(card, final, "navy")            # 완성된 카드(정답)
            adir = tmp / f"anim_{i}"
            nf = datacard.render_animation(card, adir, "navy", FPS, 1.1)
            clip = tmp / f"clip_{i}.mp4"
            render.render_card_clip(adir, nf, final, clip, 4.0, beats=3)

            shot = tmp / f"shot_{i}.jpg"
            subprocess.run([find_ffmpeg(), "-hide_banner", "-loglevel", "error", "-y",
                            "-sseof", "-0.3", "-i", str(clip), "-frames:v", "1", str(shot)],
                           check=True)
            d = _diff(final, shot)
            # 줌 펀치 때문에 완전히 같지는 않다. 첫 프레임(숫자 0)과 섞였다면 차이가 훨씬 크게 난다.
            first = adir / "f_001.jpg"
            d0 = _diff(first, shot)
            ok = d < 6.0 and d0 > d * 1.5
            print(f"  {'OK  ' if ok else 'FAIL'} {card['type']:8} 끝프레임 vs 완성카드 {d:5.2f} / "
                  f"vs 카운트업 첫프레임 {d0:5.2f}")
            fails += 0 if ok else 1

    print("데이터 카드 점검:", "통과" if not fails else f"{fails}건 실패")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
