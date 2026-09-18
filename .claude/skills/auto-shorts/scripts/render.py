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

import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (CAPTION_FONT_FILE, FONT_DIR, FPS, HEIGHT, WIDTH, ff_path, find_ffmpeg,  # noqa: E402
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
                      vignette: bool = True, look: str = "", dim: float = 0.0) -> Path:
    """1080x1920 정지 이미지 하나로 length 초짜리 무음 클립을 만든다."""
    n = max(2, int(round(length * FPS)))
    chain = [
        f"scale={WIDTH * UPSCALE}:{HEIGHT * UPSCALE}:flags=lanczos",
        zoompan_expr(motion, n),
    ]
    if look == "cinematic":
        chain.append("eq=contrast=1.05:saturation=1.08")
    if dim > 0:
        # 사진 위에 큰 글씨를 얹는 레이아웃(명언 등)에서 대비를 확보한다
        chain.append(f"eq=brightness=-{min(0.6, dim) * 0.55:.3f}:saturation={max(0.4, 1 - dim * 0.5):.2f}")
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


# TTS 목소리 다듬기: 럼블 제거 → 저중역 온기 → 기계적인 중고역·치찰음 완화 → 레벨 고르기 →
# 아주 짧은 룸 리버브(건조함 완화). 어떤 엔진(edge-tts·오프라인 모델)에도 도움이 된다.
VOICE_POLISH = ("highpass=f=85,"
                "equalizer=f=240:t=q:w=1.1:g=2.5,"
                "equalizer=f=1900:t=q:w=1.4:g=-1.5,"
                "equalizer=f=6500:t=q:w=1.6:g=-3,"
                "acompressor=threshold=-20dB:ratio=3:attack=8:release=180:makeup=2,"
                "aecho=0.92:0.9:21:0.09,"        # out_gain 을 1 가까이 둬야 목소리 크기가 유지된다
                "alimiter=limit=0.95")


def pitch_filter(percent: float) -> str:
    """목소리 높낮이를 percent 만큼(-6~+6) 바꾼다. 음정만 바뀌고 속도는 유지된다."""
    if not percent:
        return ""
    r = 1.0 + max(-12.0, min(12.0, percent)) / 100.0
    return f"asetrate=48000*{r:.4f},aresample=48000,atempo={1 / r:.4f}"


def narration_track(files: list[Path], durations: list[float], leads: list[float], out: Path,
                    polish: bool = True, pitch: float = 0.0) -> Path:
    args: list[str] = []
    for f in files:
        args += ["-i", str(f)]
    chain = [_STEREO]
    pf = pitch_filter(pitch)
    if pf:
        chain.append(pf)
    if polish:
        chain.append(VOICE_POLISH)
    pre = ",".join(chain)
    parts = []
    for i, (d, lead) in enumerate(zip(durations, leads)):
        ms = int(round(lead * 1000))
        parts.append(f"[{i}:a]{pre},adelay={ms}|{ms},apad=whole_dur={d:.3f},atrim=0:{d:.3f},"
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
        # 예전 설정(threshold 0.03 / ratio 5)은 음악을 너무 깊게 눌러 거의 들리지 않았다.
        # 말할 때만 부드럽게 비켜 주고 문장 사이에서는 빠르게 돌아오게 한다.
        fc = (f"{music};[1:a]{_STEREO}[sc];"
              f"[m][sc]sidechaincompress=threshold=0.055:ratio=2.8:attack=20:release=260:makeup=1.6:"
              f"level_sc=1[a]")
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


def _measure_loudness(wav: Path) -> dict | None:
    """loudnorm 1패스: 측정값(JSON)을 stderr 에서 읽는다."""
    proc = subprocess.run(
        [find_ffmpeg(), "-hide_banner", "-nostdin", "-i", str(wav), "-af",
         "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", proc.stderr, re.S)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
        return {k: d[k] for k in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")}
    except (json.JSONDecodeError, KeyError):
        return None


def mux(video: Path, tracks: list[Path], out: Path, loudnorm: bool = True) -> Path:
    """트랙을 믹스해 wav 로 만든 뒤, 2패스 loudnorm(측정 → 선형 적용)으로 -14 LUFS 에 맞춰 영상과 합친다."""
    mix = out.parent / "work" / "mix.wav" if (out.parent / "work").is_dir() else out.with_suffix(".mix.wav")
    args: list[str] = []
    for t in tracks:
        args += ["-i", str(t)]
    k = len(tracks)
    fc = ("".join(f"[{i}:a]" for i in range(k)) + f"amix=inputs={k}:normalize=0[a]") if k > 1 else "[0:a]anull[a]"
    run_ffmpeg(args + ["-filter_complex", fc, "-map", "[a]", "-c:a", "pcm_s16le", str(mix)], stage=STAGE)

    if loudnorm:
        meas = _measure_loudness(mix)
        if meas:
            ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
                  f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:"
                  f"offset={meas['target_offset']}:linear=true,aresample=48000")
        else:
            ln = "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
    else:
        ln = "alimiter=limit=0.95"
    run_ffmpeg(["-i", str(video), "-i", str(mix), "-map", "0:v", "-map", "1:a", "-af", ln,
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(out)],
               stage=STAGE)
    return out


# ---------------------------------------------------------------- 검수용
def preview_sheet(video: Path, total: float, out: Path, marks: list[float] | None = None,
                  cols: int = 4, rows: int = 3) -> Path:
    """프레임 그리드. 균등 간격 샘플에 더해, marks(헤드라인 시작 등)에 해당하는 순간을 반드시 포함시켜
    검수할 때 헤드라인·CTA 가 실제로 보이는지 확인할 수 있게 한다. 각 타일에 시각을 적는다."""
    from PIL import Image, ImageDraw, ImageFont  # type: ignore

    n = cols * rows
    marks = sorted({round(min(max(0.05, m), total - 0.1), 2) for m in (marks or [])})[:n - 2]
    even = [round(total * (i + 0.5) / n, 2) for i in range(n)]
    times = list(marks)
    for t in even:                     # 마크와 1.5초 이내로 겹치는 균등 샘플은 건너뛴다
        if len(times) >= n:
            break
        if all(abs(t - m) > 1.5 for m in times):
            times.append(t)
    times = sorted(times)[:n]
    tw, th = 270, 480
    sheet = Image.new("RGB", (cols * tw, rows * th), (20, 20, 20))
    font = ImageFont.truetype(str(CAPTION_FONT_FILE), 22) if CAPTION_FONT_FILE.exists() else ImageFont.load_default()
    tmp = out.parent / "work" / "_preview_frame.jpg" if (out.parent / "work").is_dir() else out.with_suffix(".frame.jpg")
    for i, t in enumerate(times):
        run_ffmpeg(["-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", "-q:v", "3",
                    "-vf", f"scale={tw}:{th}", str(tmp)], stage=STAGE)
        tile = Image.open(tmp).convert("RGB")
        d = ImageDraw.Draw(tile)
        label = f"{t:.1f}s" + (" ★" if t in marks else "")
        d.rectangle((0, th - 30, 8 + int(d.textlength(label, font=font)) + 8, th), fill=(0, 0, 0))
        d.text((8, th - 28), label, font=font, fill=(255, 212, 0) if t in marks else (255, 255, 255))
        sheet.paste(tile, ((i % cols) * tw, (i // cols) * th))
    tmp.unlink(missing_ok=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "JPEG", quality=88)
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
