# -*- coding: utf-8 -*-
"""대본 JSON → 9:16 세로 쇼츠 mp4 렌더러 (auto-shorts 스킬).

얼굴·촬영·유료 AI 영상툴 없이, 큰 글씨 카드 + 한국어 나레이션(TTS) + 자막으로
"정보형 페이스리스 쇼츠"를 완전 자동으로 만든다. GitHub Actions 우분투 러너와
Windows PC 양쪽에서 돈다.

    python render.py --script queue/0001.json
    python render.py --script queue/0001.json --tts silent      # TTS 없이 무음 테스트
    python render.py --script queue/0001.json --bgm assets/bgm.mp3 --bgm-volume 0.12

입력 대본 형식 (queue/*.json):
{
  "title": "영상 제목",
  "hook": "첫 3초 훅 문구 (선택, 있으면 첫 장면)",
  "scenes": [
    {"caption": "화면 큰 글씨 (줄바꿈은 \\n)", "narration": "읽어줄 나레이션 한두 문장"},
    ...
  ],
  "cta": "마지막 장면 문구 (선택)",
  "description": "플랫폼 캡션에 넣을 설명 (선택)",
  "hashtags": ["#재테크", "#돈관리"],
  "voice": "ko-KR-SunHiNeural",       (선택)
  "theme": "navy" | "green" | "charcoal" | "purple"   (선택)
}

결과 (shorts_output/<날짜>_<슬러그>/):
  final.mp4      완성 영상 (1080x1920, 30fps, AAC)
  cover.png      커버/썸네일 (훅 카드)
  captions.srt   나레이션 자막
  caption.txt    제목·설명·해시태그 (플랫폼 업로드 시 복붙)
  meta.json      길이·장면 수·파일 경로

요구사항: ffmpeg (PATH 또는 pip imageio-ffmpeg), pillow, edge-tts(온라인 TTS),
한글 폰트(나눔/맑은고딕/Noto CJK 중 하나).
"""
import argparse
import asyncio
import json
import os
import platform
import re
import subprocess
import sys
from pathlib import Path

from common import (
    ASSETS_DIR,
    OUTPUT_DIR,
    find_ffmpeg,
    find_ffprobe,
    slugify,
    today_str,
)

W, H = 1080, 1920
FPS = 30
PAUSE_AFTER_SCENE = 0.45     # 나레이션 끝나고 다음 장면 전 여백(초)
MIN_SCENE_SEC = 2.2
SILENT_CHARS_PER_SEC = 5.2   # --tts silent 일 때 길이 추정 (한국어 TTS 평균)

THEMES = {
    "navy":     {"top": (11, 27, 58),   "bottom": (20, 43, 92),   "accent": (255, 209, 102), "text": (255, 255, 255)},
    "green":    {"top": (8, 46, 36),    "bottom": (16, 84, 62),   "accent": (167, 243, 208), "text": (255, 255, 255)},
    "charcoal": {"top": (18, 18, 20),   "bottom": (44, 44, 50),   "accent": (255, 107, 107), "text": (255, 255, 255)},
    "purple":   {"top": (38, 20, 71),   "bottom": (76, 41, 126),  "accent": (255, 214, 165), "text": (255, 255, 255)},
}

FONT_CANDIDATES_BOLD = [
    "/usr/share/fonts/truetype/nanum/NanumSquareRoundEB.ttf",
    "/usr/share/fonts/truetype/nanum/NanumSquareRoundB.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/truetype/nanum/NanumBarunGothicBold.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
    "C:/Windows/Fonts/malgunbd.ttf",
    "C:/Windows/Fonts/NanumSquareRoundEB.ttf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
]
FONT_CANDIDATES_REGULAR = [
    "/usr/share/fonts/truetype/nanum/NanumSquareRoundR.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "C:/Windows/Fonts/malgun.ttf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
]


def die(msg, code=1):
    print(f"[render] 오류: {msg}", file=sys.stderr)
    sys.exit(code)


# ---------------------------------------------------------------------------
# 대본 로드/검증
# ---------------------------------------------------------------------------
def load_script(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return validate_script(data)


def validate_script(data):
    if not isinstance(data, dict):
        raise ValueError("대본은 JSON 객체여야 합니다.")
    title = (data.get("title") or "").strip()
    if not title:
        raise ValueError("title 이 비어 있습니다.")
    scenes = data.get("scenes")
    if not isinstance(scenes, list) or len(scenes) < 2:
        raise ValueError("scenes 는 최소 2개 이상의 장면 목록이어야 합니다.")
    norm = []
    for i, sc in enumerate(scenes, 1):
        if not isinstance(sc, dict):
            raise ValueError(f"scenes[{i}] 은 객체여야 합니다.")
        cap = (sc.get("caption") or "").strip()
        nar = (sc.get("narration") or "").strip() or cap.replace("\n", " ")
        if not cap:
            raise ValueError(f"scenes[{i}].caption 이 비어 있습니다.")
        norm.append({"caption": cap, "narration": nar})
    data = dict(data)
    data["title"] = title
    data["scenes"] = norm
    data["hashtags"] = [h if h.startswith("#") else f"#{h}" for h in data.get("hashtags", []) if h]
    data["theme"] = data.get("theme") or "navy"
    if data["theme"] not in THEMES:
        raise ValueError(f"theme 은 {list(THEMES)} 중 하나여야 합니다: {data['theme']}")
    return data


def build_timeline(script):
    """훅 → 본문 장면들 → CTA 순으로 렌더 단위(장면) 목록을 만든다."""
    items = []
    hook = (script.get("hook") or "").strip()
    if hook:
        items.append({"kind": "hook", "caption": hook, "narration": hook.replace("\n", " ")})
    for sc in script["scenes"]:
        items.append({"kind": "body", **sc})
    cta = (script.get("cta") or "").strip()
    if cta:
        items.append({"kind": "cta", "caption": cta, "narration": cta.replace("\n", " ")})
    return items


# ---------------------------------------------------------------------------
# 폰트
# ---------------------------------------------------------------------------
def _first_existing(paths):
    for p in paths:
        if Path(p).exists():
            return p
    return None


def find_fonts():
    bold = os.environ.get("SHORTS_FONT_BOLD") or _first_existing(FONT_CANDIDATES_BOLD)
    regular = os.environ.get("SHORTS_FONT_REGULAR") or _first_existing(FONT_CANDIDATES_REGULAR) or bold
    if not bold:
        hint = (
            "sudo apt-get install -y fonts-nanum" if platform.system() == "Linux"
            else "Windows 는 맑은 고딕(C:/Windows/Fonts/malgunbd.ttf)이 기본 포함 — 경로를 확인하세요"
        )
        die(f"한글 폰트를 찾지 못했습니다. 설치 후 다시 실행: {hint}\n"
            "또는 SHORTS_FONT_BOLD=<ttf 경로> 환경변수로 지정.")
    return bold, regular


# ---------------------------------------------------------------------------
# 카드(이미지) 렌더
# ---------------------------------------------------------------------------
def _wrap(text, font, max_width, draw):
    """한국어 친화 줄바꿈: 명시적 \\n 존중, 공백 우선, 넘치면 글자 단위."""
    lines = []
    for para in text.split("\n"):
        words = para.split(" ")
        cur = ""
        for w in words:
            cand = (cur + " " + w).strip() if cur else w
            if draw.textlength(cand, font=font) <= max_width:
                cur = cand
                continue
            if cur:
                lines.append(cur)
            # 단어 하나가 너무 길면 글자 단위로 쪼갠다
            cur = ""
            for ch in w:
                cand = cur + ch
                if draw.textlength(cand, font=font) <= max_width:
                    cur = cand
                else:
                    lines.append(cur)
                    cur = ch
        lines.append(cur)
    return [ln for ln in lines if ln != ""] or [""]


def _fit_text(draw, text, font_path, max_width, max_lines, start_size, min_size):
    from PIL import ImageFont

    size = start_size
    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        lines = _wrap(text, font, max_width, draw)
        if len(lines) <= max_lines:
            return font, lines
        size -= 4
    font = ImageFont.truetype(font_path, min_size)
    lines = _wrap(text, font, max_width, draw)[:max_lines]
    return font, lines


def _gradient(theme):
    from PIL import Image

    top, bottom = theme["top"], theme["bottom"]
    img = Image.new("RGB", (W, H), top)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return img


_GRADIENT_CACHE = {}


def draw_card(item, index, total, script, fonts, brand):
    """장면 하나를 1080x1920 카드로 그린다. 반환: PIL.Image"""
    from PIL import Image, ImageDraw

    theme = THEMES[script["theme"]]
    key = script["theme"]
    if key not in _GRADIENT_CACHE:
        _GRADIENT_CACHE[key] = _gradient(theme)
    img = _GRADIENT_CACHE[key].copy()
    draw = ImageDraw.Draw(img, "RGBA")
    bold, regular = fonts
    accent, text_color = theme["accent"], theme["text"]

    # 상단 브랜드 필
    from PIL import ImageFont
    brand_font = ImageFont.truetype(bold, 40)
    bw = draw.textlength(brand, font=brand_font)
    bx, by = (W - bw) / 2, 150
    draw.rounded_rectangle((bx - 36, by - 18, bx + bw + 36, by + 58), radius=38, fill=(255, 255, 255, 28))
    draw.text((bx, by), brand, font=brand_font, fill=accent)

    # 장면 번호 (본문만)
    if item["kind"] == "body":
        body_idx = index
        num_font = ImageFont.truetype(bold, 46)
        label = f"{body_idx:02d}"
        draw.text(((W - draw.textlength(label, font=num_font)) / 2, 290), label, font=num_font, fill=accent)

    # 가운데 큰 글씨
    is_hook = item["kind"] == "hook"
    is_cta = item["kind"] == "cta"
    start = 118 if is_hook else 100
    font, lines = _fit_text(draw, item["caption"], bold, W - 200, 6, start, 60)
    line_h = int(font.size * 1.32)
    block_h = line_h * len(lines)
    y = (H - block_h) / 2 - (110 if not is_cta else 40)
    for ln in lines:
        lw = draw.textlength(ln, font=font)
        x = (W - lw) / 2
        # 그림자
        draw.text((x + 4, y + 4), ln, font=font, fill=(0, 0, 0, 120))
        draw.text((x, y), ln, font=font, fill=accent if (is_hook or is_cta) else text_color)
        y += line_h

    # 훅 밑줄 포인트
    if is_hook:
        draw.rounded_rectangle((W / 2 - 120, y + 30, W / 2 + 120, y + 42), radius=6, fill=accent)

    # 하단 나레이션 자막 박스 (무음 시청자용)
    if item["narration"] and item["narration"] != item["caption"].replace("\n", " "):
        sfont, slines = _fit_text(draw, item["narration"], regular, W - 220, 4, 46, 34)
        sl_h = int(sfont.size * 1.4)
        box_h = sl_h * len(slines) + 60
        top = H - 420 - box_h
        draw.rounded_rectangle((70, top, W - 70, top + box_h), radius=28, fill=(0, 0, 0, 110))
        yy = top + 30
        for ln in slines:
            lw = draw.textlength(ln, font=sfont)
            draw.text(((W - lw) / 2, yy), ln, font=sfont, fill=(245, 245, 245))
            yy += sl_h

    # 진행 바
    bar_y = H - 300
    draw.rounded_rectangle((120, bar_y, W - 120, bar_y + 10), radius=5, fill=(255, 255, 255, 50))
    prog = (index + 1) / max(total, 1)
    draw.rounded_rectangle((120, bar_y, 120 + (W - 240) * prog, bar_y + 10), radius=5, fill=accent)

    return img


# ---------------------------------------------------------------------------
# 오디오 (TTS)
# ---------------------------------------------------------------------------
def media_duration(path):
    """초 단위 길이. ffprobe 가 있으면 그것, 없으면 ffmpeg 로그를 파싱."""
    ffprobe = find_ffprobe()
    if ffprobe:
        out = subprocess.run(
            [ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, check=False,
        )
        try:
            return float(out.stdout.strip())
        except ValueError:
            pass
    ffmpeg = find_ffmpeg()
    out = subprocess.run([ffmpeg, "-i", str(path)], capture_output=True, text=True, check=False)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.?\d*)", out.stderr)
    if not m:
        raise RuntimeError(f"길이를 읽지 못했습니다: {path}")
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


async def _edge_tts(text, out_path, voice, rate):
    import edge_tts

    kwargs = {"voice": voice}
    if rate:
        kwargs["rate"] = rate
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        kwargs["proxy"] = proxy
    comm = edge_tts.Communicate(text, **kwargs)
    await comm.save(str(out_path))


def synthesize(text, out_path, mode, voice, rate, ffmpeg):
    """나레이션 mp3 생성. mode='edge' 는 온라인 TTS, 'silent' 는 길이만 맞춘 무음."""
    if mode == "edge":
        try:
            asyncio.run(_edge_tts(text, out_path, voice, rate))
            if Path(out_path).stat().st_size > 0:
                return
            raise RuntimeError("edge-tts 결과 파일이 비어 있습니다.")
        except ModuleNotFoundError:
            die("edge-tts 가 설치되어 있지 않습니다: pip install edge-tts  (또는 --tts silent)")
        except Exception as e:  # noqa: BLE001
            die(f"TTS 실패 ({voice}): {e}\n네트워크가 막힌 환경이면 --tts silent 로 무음 테스트가 가능합니다.")
    # silent
    sec = max(MIN_SCENE_SEC, len(text) / SILENT_CHARS_PER_SEC + 0.5)
    subprocess.run(
        [ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", f"{sec:.2f}", "-c:a", "libmp3lame", "-q:a", "9", str(out_path)],
        check=True,
    )


# ---------------------------------------------------------------------------
# 영상 조립
# ---------------------------------------------------------------------------
def render_segment(ffmpeg, card_png, audio, out_mp4, seconds):
    frames = int(round(seconds * FPS))
    # 카드를 1.5배로 키운 뒤 천천히 줌인 (Ken Burns). 첫 0.25초 페이드인.
    vf = (
        f"scale={int(W * 1.5)}:{int(H * 1.5)},"
        f"zoompan=z='min(zoom+0.0007,1.14)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":d={frames}:s={W}x{H}:fps={FPS},"
        f"fade=t=in:st=0:d=0.25,format=yuv420p"
    )
    cmd = [
        ffmpeg, "-y", "-v", "error",
        "-loop", "1", "-framerate", str(FPS), "-i", str(card_png),
        "-i", str(audio),
        "-filter_complex", f"[0:v]{vf}[v];[1:a]apad=pad_dur={PAUSE_AFTER_SCENE},aresample=48000[a]",
        "-map", "[v]", "-map", "[a]",
        "-t", f"{seconds:.3f}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-movflags", "+faststart",
        str(out_mp4),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        die("장면 렌더 실패:\n" + "\n".join(proc.stderr.strip().splitlines()[-12:]))


def concat_segments(ffmpeg, segments, out_mp4):
    list_path = out_mp4.parent / "segments.txt"
    with open(list_path, "w", encoding="utf-8") as f:
        for s in segments:
            f.write(f"file '{Path(s).resolve().as_posix()}'\n")
    proc = subprocess.run(
        [ffmpeg, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(list_path),
         "-c", "copy", "-movflags", "+faststart", str(out_mp4)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        die("이어붙이기 실패:\n" + "\n".join(proc.stderr.strip().splitlines()[-12:]))


def mix_bgm(ffmpeg, video, bgm, volume, out_mp4):
    fc = (
        f"[1:a]volume={volume},aresample=48000[b];"
        f"[0:a][b]amix=inputs=2:duration=first:dropout_transition=2,"
        f"afade=t=out:st=0:d=0[a]"
    )
    proc = subprocess.run(
        [ffmpeg, "-y", "-v", "error", "-i", str(video), "-stream_loop", "-1", "-i", str(bgm),
         "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-shortest",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out_mp4)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        die("배경음 믹스 실패:\n" + "\n".join(proc.stderr.strip().splitlines()[-12:]))


def srt_time(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(items, durations, path):
    t = 0.0
    with open(path, "w", encoding="utf-8") as f:
        for i, (it, d) in enumerate(zip(items, durations), 1):
            f.write(f"{i}\n{srt_time(t)} --> {srt_time(t + d - 0.05)}\n{it['narration']}\n\n")
            t += d


def write_caption(script, path, duration):
    tags = " ".join(script.get("hashtags", []))
    desc = (script.get("description") or "").strip()
    lines = [
        f"제목: {script['title']}",
        "",
        "[캡션/설명 — 플랫폼에 그대로 복붙]",
        script["title"],
        desc,
        tags,
        "",
        f"[길이] {duration:.0f}초",
        "",
        "[플랫폼 메모]",
        "- YouTube Shorts: 제목 끝에 #Shorts 는 선택. 설명 첫 줄에 훅 문구.",
        "- TikTok: 크리에이터 리워드는 1분 이상 영상만 집계 → 60초 넘는지 확인.",
        "- Naver Clip: 관심사 태그 3~5개 + 클립 크리에이터 미션 해시태그 있으면 추가.",
        "- Instagram Reels: 캡션 첫 줄이 훅. 해시태그는 5~8개.",
    ]
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------
def render(script, out_dir=None, tts="edge", voice=None, rate=None, bgm=None, bgm_volume=0.12,
           brand=None):
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        die("ffmpeg 를 찾을 수 없습니다. 설치: Ubuntu `sudo apt-get install ffmpeg`, "
            "Windows `winget install Gyan.FFmpeg`, 또는 `pip install imageio-ffmpeg`.")
    fonts = find_fonts()

    try:
        from PIL import Image  # noqa: F401
    except ModuleNotFoundError:
        die("pillow 가 없습니다: pip install pillow")

    voice = voice or script.get("voice") or "ko-KR-SunHiNeural"
    brand = brand or script.get("brand") or "부자되자"
    items = build_timeline(script)

    slug = slugify(script["title"])
    out_dir = Path(out_dir) if out_dir else OUTPUT_DIR / f"{today_str()}_{slug}"
    cards_dir, audio_dir, seg_dir = out_dir / "cards", out_dir / "audio", out_dir / "segments"
    for d in (cards_dir, audio_dir, seg_dir):
        d.mkdir(parents=True, exist_ok=True)

    print(f"[render] {script['title']}  ({len(items)}장면, tts={tts}, voice={voice})")
    durations, segments = [], []
    body_counter = 0
    for i, it in enumerate(items):
        if it["kind"] == "body":
            body_counter += 1
        card = cards_dir / f"{i + 1:02d}.png"
        img = draw_card(it, body_counter if it["kind"] == "body" else i, len(items), script, fonts, brand)
        img.save(card)
        if i == 0:
            img.save(out_dir / "cover.png")

        mp3 = audio_dir / f"{i + 1:02d}.mp3"
        synthesize(it["narration"], mp3, tts, voice, rate, ffmpeg)
        sec = max(MIN_SCENE_SEC, media_duration(mp3) + PAUSE_AFTER_SCENE)
        durations.append(sec)

        seg = seg_dir / f"{i + 1:02d}.mp4"
        render_segment(ffmpeg, card, mp3, seg, sec)
        segments.append(seg)
        print(f"  {i + 1:02d}. [{it['kind']:4s}] {sec:5.1f}s  {it['caption'].splitlines()[0][:30]}")

    raw = out_dir / "final_nobgm.mp4"
    final = out_dir / "final.mp4"
    concat_segments(ffmpeg, segments, raw)

    bgm_path = Path(bgm) if bgm else (ASSETS_DIR / "bgm.mp3" if (ASSETS_DIR / "bgm.mp3").exists() else None)
    if bgm_path and bgm_path.exists():
        mix_bgm(ffmpeg, raw, bgm_path, bgm_volume, final)
    else:
        raw.replace(final)
        raw = None

    total = sum(durations)
    write_srt(items, durations, out_dir / "captions.srt")
    write_caption(script, out_dir / "caption.txt", total)
    meta = {
        "title": script["title"],
        "duration": round(total, 2),
        "scenes": len(items),
        "video": str(final),
        "cover": str(out_dir / "cover.png"),
        "srt": str(out_dir / "captions.srt"),
        "caption": str(out_dir / "caption.txt"),
        "tts": tts,
        "voice": voice,
        "bgm": str(bgm_path) if bgm_path else "",
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[render] 완료: {final}  ({total:.1f}초)")
    if total < 60:
        print("[render] 참고: 60초 미만 — 틱톡 크리에이터 리워드(1분 이상) 대상이 아닙니다. "
              "장면/나레이션을 늘리면 60초를 넘길 수 있습니다.")
    return meta


def main():
    ap = argparse.ArgumentParser(description="대본 JSON → 세로 쇼츠 mp4")
    ap.add_argument("--script", required=True, help="대본 JSON 경로")
    ap.add_argument("--out-dir", default=None, help="결과 폴더 (기본 shorts_output/<날짜>_<슬러그>)")
    ap.add_argument("--tts", choices=["edge", "silent"], default="edge",
                    help="edge=온라인 TTS(기본), silent=무음(오프라인 테스트)")
    ap.add_argument("--voice", default=None, help="edge-tts 보이스 (기본 ko-KR-SunHiNeural)")
    ap.add_argument("--rate", default=None, help="말 속도, 예: -5%% / +10%%")
    ap.add_argument("--bgm", default=None, help="배경음 mp3 (없으면 assets/bgm.mp3 자동 사용)")
    ap.add_argument("--bgm-volume", type=float, default=0.12)
    ap.add_argument("--brand", default=None, help="상단 브랜드 문구 (기본 부자되자)")
    args = ap.parse_args()

    try:
        script = load_script(args.script)
    except Exception as e:  # noqa: BLE001
        die(f"대본 검증 실패: {e}")
    meta = render(script, args.out_dir, args.tts, args.voice, args.rate, args.bgm, args.bgm_volume,
                  args.brand)
    print(meta["video"])


if __name__ == "__main__":
    main()
