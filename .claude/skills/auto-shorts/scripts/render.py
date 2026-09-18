#!/usr/bin/env python3
"""ffmpeg 렌더링 단계 모음 (auto-shorts).

make_shorts.py 가 순서대로 호출한다. 각 함수는 파일 하나를 만들고 끝나므로
문제가 생기면 work/ 폴더의 중간 산출물을 하나씩 확인할 수 있다.

  render_scene_clip  정지 이미지 → 켄 번즈(줌/팬) 무음 클립
  assemble_video     클립들을 크로스페이드(xfade)로 잇고 ASS 자막을 번인
  narration_track    씬별 나레이션을 타임라인 위치에 맞춰 하나의 wav 로
  music_track        BGM 을 길이에 맞게 루프·페이드하고, 나레이션에 따라 자동 덕킹
  sfx_track          효과음을 지정 시각에 배치
  mux                영상 + 오디오 트랙 믹스 + 라우드니스 정규화(-14 LUFS, 유튜브 기준)
  preview_sheet      결과 영상의 프레임 12장을 한 장의 그리드로(검수용)
  thumbnail          첫 씬 이미지 + 제목으로 썸네일
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (CAPTION_FONT_FILE, FONT_DIR, FPS, HEIGHT, WIDTH, ff_path, log,  # noqa: E402
                    run_ffmpeg)

STAGE = "render"
MOTIONS = ["in", "out", "pan_right", "in", "pan_up", "out", "pan_left", "in", "pan_down"]
TRANSITION_MIX = ["fade", "smoothleft", "zoomin", "smoothup"]
UPSCALE = 3          # zoompan 떨림을 줄이기 위한 사전 업스케일 배율
ZOOM_AMOUNT = 0.14   # 줌 인/아웃 폭 (14%)
PAN_ZOOM = 1.12      # 팬 동작 시 고정 줌


def _ease(n_frames: int) -> str:
    p = f"(on/{n_frames})"
    return f"({p}*{p}*(3-2*{p}))"   # smoothstep


def zoompan_expr(motion: str, n_frames: int) -> str:
    e = _ease(n_frames)
    center_x, center_y = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    if motion == "in":
        z, x, y = f"1+{ZOOM_AMOUNT}*{e}", center_x, center_y
    elif motion == "out":
        z, x, y = f"{1 + ZOOM_AMOUNT}-{ZOOM_AMOUNT}*{e}", center_x, center_y
    elif motion == "pan_right":
        z, x, y = f"{PAN_ZOOM}", f"(iw-iw/zoom)*{e}", center_y
    elif motion == "pan_left":
        z, x, y = f"{PAN_ZOOM}", f"(iw-iw/zoom)*(1-{e})", center_y
    elif motion == "pan_up":
        z, x, y = f"{PAN_ZOOM}", center_x, f"(ih-ih/zoom)*(1-{e})"
    elif motion == "pan_down":
        z, x, y = f"{PAN_ZOOM}", center_x, f"(ih-ih/zoom)*{e}"
    else:  # static
        z, x, y = "1", center_x, center_y
    return f"zoompan=z='{z}':x='{x}':y='{y}':d={n_frames}:s={WIDTH}x{HEIGHT}:fps={FPS}"


def render_scene_clip(image: Path, out: Path, length: float, motion: str = "in",
                      vignette: bool = True, look: str = "") -> Path:
    """1080x1920 정지 이미지 하나로 length 초짜리 무음 클립을 만든다."""
    n = max(2, int(round(length * FPS)))
    chain = [
        f"scale={WIDTH * UPSCALE}:{HEIGHT * UPSCALE}:flags=lanczos",
        zoompan_expr(motion, n),
    ]
    if look == "cinematic":
        chain.append("eq=contrast=1.05:saturation=1.08")
    if vignette:
        chain.append("vignette=angle=PI/6.5")
    chain.append("format=yuv420p")
    run_ffmpeg([
        "-i", str(image), "-vf", ",".join(chain), "-frames:v", str(n), "-r", str(FPS),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-an", str(out),
    ], stage=STAGE)
    return out


def clip_lengths(durations: list[float], tdur: float) -> list[float]:
    """xfade 로 잇고 나서 총 길이가 sum(durations) 가 되도록 각 클립 길이를 늘린다."""
    n = len(durations)
    if n == 1 or tdur <= 0:
        return list(durations)
    out = []
    for i, d in enumerate(durations):
        extra = tdur / 2 if i in (0, n - 1) else tdur
        out.append(d + extra)
    return out


def assemble_video(clips: list[Path], durations: list[float], out: Path, *, subs: Path | None,
                   transition: str = "fade", tdur: float = 0.4) -> Path:
    n = len(clips)
    args: list[str] = []
    for c in clips:
        args += ["-i", str(c)]
    parts = []
    if n == 1 or transition == "none" or tdur <= 0:
        if n == 1:
            last = "[0:v]"
        else:
            parts.append("".join(f"[{i}:v]" for i in range(n)) + f"concat=n={n}:v=1:a=0[vc]")
            last = "[vc]"
    else:
        names = TRANSITION_MIX if transition == "mix" else [transition]
        offset = 0.0
        last = "[0:v]"
        for i in range(1, n):
            offset += durations[i - 1]
            tname = names[(i - 1) % len(names)]
            o = offset - tdur / 2
            lbl = f"[x{i}]"
            parts.append(f"{last}[{i}:v]xfade=transition={tname}:duration={tdur:.3f}:offset={o:.3f}{lbl}")
            last = lbl
    if subs:
        parts.append(f"{last}ass='{ff_path(subs)}':fontsdir='{ff_path(FONT_DIR)}'[vout]")
        last = "[vout]"
    fc = ";".join(parts) if parts else None
    cmd = args
    if fc:
        cmd += ["-filter_complex", fc, "-map", last]
    else:
        cmd += ["-map", "0:v"]
    cmd += ["-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
            "-an", str(out)]
    run_ffmpeg(cmd, stage=STAGE)
    return out


# ---------------------------------------------------------------- 오디오
_STEREO = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"


def narration_track(files: list[Path], durations: list[float], leads: list[float], out: Path) -> Path:
    args: list[str] = []
    for f in files:
        args += ["-i", str(f)]
    parts = []
    for i, (d, lead) in enumerate(zip(durations, leads)):
        ms = int(round(lead * 1000))
        parts.append(f"[{i}:a]{_STEREO},adelay={ms}|{ms},apad=whole_dur={d:.3f},atrim=0:{d:.3f},"
                     f"asetpts=N/SR/TB[a{i}]")
    parts.append("".join(f"[a{i}]" for i in range(len(files))) + f"concat=n={len(files)}:v=0:a=1[a]")
    run_ffmpeg(args + ["-filter_complex", ";".join(parts), "-map", "[a]", "-c:a", "pcm_s16le", str(out)],
               stage=STAGE)
    return out


def music_track(bgm: Path, total: float, volume: float, narration: Path, out: Path, duck: bool = True) -> Path:
    fade_out = min(2.5, total / 4)
    music = (f"[0:a]{_STEREO},atrim=0:{total + 1:.3f},asetpts=N/SR/TB,"
             f"loudnorm=I=-20:TP=-2:LRA=9,aresample=48000,volume={volume:.3f},"
             f"afade=t=in:d=1.0,afade=t=out:st={total - fade_out:.3f}:d={fade_out:.3f},atrim=0:{total:.3f}[m]")
    if duck:
        fc = (f"{music};[1:a]{_STEREO}[sc];"
              f"[m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=350:makeup=1:level_sc=1[a]")
    else:
        fc = f"{music.replace('[m]', '[a]')}"
    run_ffmpeg(["-stream_loop", "-1", "-i", str(bgm), "-i", str(narration), "-filter_complex", fc,
                "-map", "[a]", "-t", f"{total:.3f}", "-c:a", "pcm_s16le", str(out)], stage=STAGE)
    return out


def sfx_track(events: list[tuple[Path, float, float]], total: float, out: Path) -> Path | None:
    """events: (파일, 시작초, 볼륨)"""
    if not events:
        return None
    args: list[str] = []
    parts = []
    for i, (f, start, vol) in enumerate(events):
        args += ["-i", str(f)]
        ms = int(round(max(0.0, start) * 1000))
        parts.append(f"[{i}:a]{_STEREO},volume={vol:.3f},adelay={ms}|{ms}[s{i}]")
    if len(events) == 1:
        parts.append(f"[s0]apad=whole_dur={total:.3f},atrim=0:{total:.3f}[a]")
    else:
        parts.append("".join(f"[s{i}]" for i in range(len(events))) +
                     f"amix=inputs={len(events)}:normalize=0:dropout_transition=0,"
                     f"apad=whole_dur={total:.3f},atrim=0:{total:.3f}[a]")
    run_ffmpeg(args + ["-filter_complex", ";".join(parts), "-map", "[a]", "-c:a", "pcm_s16le", str(out)],
               stage=STAGE)
    return out


def mux(video: Path, tracks: list[Path], out: Path, loudnorm: bool = True) -> Path:
    args = ["-i", str(video)]
    for t in tracks:
        args += ["-i", str(t)]
    k = len(tracks)
    if k == 1:
        chain = "[1:a]"
        fc_parts = []
    else:
        fc_parts = ["".join(f"[{i + 1}:a]" for i in range(k)) + f"amix=inputs={k}:normalize=0[mix]"]
        chain = "[mix]"
    post = "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000" if loudnorm else "alimiter=limit=0.95"
    fc_parts.append(f"{chain}{post}[a]")
    run_ffmpeg(args + ["-filter_complex", ";".join(fc_parts), "-map", "0:v", "-map", "[a]",
                       "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                       "-shortest", str(out)], stage=STAGE)
    return out


# ---------------------------------------------------------------- 검수용
def preview_sheet(video: Path, total: float, out: Path, cols: int = 4, rows: int = 3) -> Path:
    step = max(0.5, total / (cols * rows))
    run_ffmpeg(["-i", str(video), "-vf", f"fps=1/{step:.4f},scale=270:480,tile={cols}x{rows}",
                "-frames:v", "1", "-q:v", "3", str(out)], stage=STAGE)
    return out


def thumbnail(image: Path, title: str, out: Path) -> Path:
    from PIL import Image, ImageDraw, ImageFont  # type: ignore

    img = Image.open(image).convert("RGB").resize((WIDTH, HEIGHT))
    # 하단 그라디언트로 글자 가독성 확보
    grad = Image.new("L", (1, HEIGHT))
    for y in range(HEIGHT):
        grad.putpixel((0, y), int(max(0, (y / HEIGHT - 0.35)) / 0.65 * 170))
    shade = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    img = Image.composite(shade, img, grad.resize((WIDTH, HEIGHT)))
    draw = ImageDraw.Draw(img)
    font_path = str(CAPTION_FONT_FILE) if CAPTION_FONT_FILE.exists() else None
    size = 128
    while size > 60:
        font = ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
        lines = _wrap(title, font, WIDTH - 160, draw)
        if len(lines) <= 3:
            break
        size -= 8
    lh = int(size * 1.22)
    y = int(HEIGHT * 0.62) - (lh * len(lines)) // 2
    for i, line in enumerate(lines):
        w = draw.textlength(line, font=font)
        x = (WIDTH - w) / 2
        fill = (255, 212, 0) if i == 0 else (255, 255, 255)
        draw.text((x, y), line, font=font, fill=fill, stroke_width=10, stroke_fill=(0, 0, 0))
        y += lh
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "JPEG", quality=92)
    return out


def _wrap(text: str, font, max_w: int, draw) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if draw.textlength(cand, font=font) <= max_w:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [text]
