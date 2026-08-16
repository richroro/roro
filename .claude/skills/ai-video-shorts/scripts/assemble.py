#!/usr/bin/env python3
"""
AI 영상 쇼츠 조립기 (ai-video-shorts 스킬).

clips/ 폴더의 클립들을 파일명 정렬 순으로 이어붙여 9:16 세로 mp4 하나로 만든다.
선택적으로 SRT 자막을 하드번인하고 배경음악을 원본 오디오와 믹스한다.

요구사항: ffmpeg / ffprobe 가 PATH 에 있어야 한다 (`ffmpeg -version` 으로 확인).
없으면 Windows: `winget install Gyan.FFmpeg` 또는 https://ffmpeg.org 참고.

제약 / 동작:
- 각 클립을 1080x1920(기본)로 '중앙 크롭 후 스케일'해 해상도·화면비를 통일한 뒤
  concat 하므로, 입력 클립 해상도가 제각각이어도 안전하게 붙는다.
- 오디오가 없는 클립이 섞여 있어도 무음 트랙을 넣어 정상 처리한다.
- 자막 번인은 libass(subtitles 필터)를 쓴다. Windows 경로의 백슬래시/콜론을
  이스케이프해서 넘긴다.
- 재인코딩(concat filter)이라 클립 수가 많으면 시간이 걸릴 수 있다.
"""
import argparse
import os
import shutil
import subprocess
import sys
import glob


def die(msg: str, code: int = 1):
    print(f"[assemble] 오류: {msg}", file=sys.stderr)
    sys.exit(code)


def check_ffmpeg():
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            die(
                f"{tool} 를 찾을 수 없습니다. ffmpeg 를 설치하세요.\n"
                "  Windows: winget install Gyan.FFmpeg\n"
                "  그 후 새 터미널에서 다시 실행하세요."
            )


def has_audio(path: str) -> bool:
    """ffprobe 로 오디오 스트림 존재 여부 확인."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a",
             "-show_entries", "stream=index", "-of", "csv=p=0", path],
            capture_output=True, text=True, check=False,
        )
        return bool(out.stdout.strip())
    except Exception:
        return False


def collect_clips(clips_dir: str):
    exts = ("*.mp4", "*.mov", "*.m4v", "*.webm", "*.mkv", "*.avi")
    files = []
    for e in exts:
        files.extend(glob.glob(os.path.join(clips_dir, e)))
        files.extend(glob.glob(os.path.join(clips_dir, e.upper())))
    files = sorted(set(files), key=lambda p: os.path.basename(p).lower())
    return files


def escape_subtitles_path(path: str) -> str:
    """subtitles 필터용 경로 이스케이프 (Windows 백슬래시/드라이브 콜론 대응)."""
    p = os.path.abspath(path).replace("\\", "/")
    # 드라이브 문자 뒤 콜론 이스케이프: C:/... -> C\:/...
    p = p.replace(":", "\\:")
    # 필터 그래프 구분자 이스케이프
    p = p.replace("'", "\\'")
    return p


def build_and_run(clips, output, width, height, fps, subtitles, bgm, bgm_volume):
    n = len(clips)
    inputs = []
    for c in clips:
        inputs.extend(["-i", c])
    bgm_index = None
    if bgm:
        inputs.extend(["-i", bgm])
        bgm_index = n  # bgm 은 마지막 입력

    filter_parts = []
    v_labels = []
    a_labels = []
    for i, c in enumerate(clips):
        # 9:16 로 중앙 크롭 후 스케일 + fps/sar 통일
        filter_parts.append(
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},setsar=1,fps={fps},format=yuv420p[v{i}]"
        )
        v_labels.append(f"[v{i}]")
        if has_audio(c):
            filter_parts.append(f"[{i}:a]aresample=48000,asetpts=N/SR/TB[a{i}]")
        else:
            # 무음 오디오 생성 (해당 클립 영상 길이에 맞춤)
            filter_parts.append(
                f"anullsrc=channel_layout=stereo:sample_rate=48000[sil{i}];"
                f"[sil{i}][{i}:v]atrim=0,asetpts=N/SR/TB[a{i}]"
            )
        a_labels.append(f"[a{i}]")

    concat_in = "".join(v + a for v, a in zip(v_labels, a_labels))
    filter_parts.append(f"{concat_in}concat=n={n}:v=1:a=1[vc][ac]")

    v_out = "vc"
    a_out = "ac"

    # 자막 번인
    if subtitles:
        sub = escape_subtitles_path(subtitles)
        filter_parts.append(f"[{v_out}]subtitles='{sub}'[vsub]")
        v_out = "vsub"

    # 배경음악 믹스
    if bgm_index is not None:
        filter_parts.append(
            f"[{bgm_index}:a]volume={bgm_volume},aresample=48000[bgm]"
        )
        filter_parts.append(
            f"[{a_out}][bgm]amix=inputs=2:duration=first:dropout_transition=2[amix]"
        )
        a_out = "amix"

    filter_complex = ";".join(filter_parts)

    cmd = ["ffmpeg", "-y", *inputs,
           "-filter_complex", filter_complex,
           "-map", f"[{v_out}]", "-map", f"[{a_out}]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-c:a", "aac", "-b:a", "192k",
           "-movflags", "+faststart",
           output]

    print(f"[assemble] {n}개 클립 조립 중 -> {output}")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        # ffmpeg 오류 로그의 마지막 부분만 보여준다
        tail = "\n".join(proc.stderr.strip().splitlines()[-15:])
        die(f"ffmpeg 실패:\n{tail}")


def main():
    ap = argparse.ArgumentParser(description="AI 쇼츠 클립 조립기")
    ap.add_argument("--clips", required=True, help="클립 폴더 (파일명 정렬 순으로 이어붙임)")
    ap.add_argument("--output", default="final.mp4", help="결과 mp4 경로")
    ap.add_argument("--subtitles", default=None, help="SRT 자막 (있으면 번인)")
    ap.add_argument("--bgm", default=None, help="배경음악 파일")
    ap.add_argument("--bgm-volume", type=float, default=0.3, help="배경음악 볼륨 0~1")
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("--fps", type=int, default=30)
    args = ap.parse_args()

    check_ffmpeg()

    if not os.path.isdir(args.clips):
        die(f"클립 폴더가 없습니다: {args.clips}")
    clips = collect_clips(args.clips)
    if not clips:
        die(f"클립을 찾지 못했습니다 (mp4/mov/webm...): {args.clips}")

    if args.subtitles and not os.path.isfile(args.subtitles):
        die(f"자막 파일이 없습니다: {args.subtitles}")
    if args.bgm and not os.path.isfile(args.bgm):
        die(f"배경음악 파일이 없습니다: {args.bgm}")

    print("[assemble] 순서:")
    for i, c in enumerate(clips, 1):
        print(f"  {i:>2}. {os.path.basename(c)}")

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    build_and_run(clips, args.output, args.width, args.height, args.fps,
                  args.subtitles, args.bgm, args.bgm_volume)

    print(f"[assemble] 완료: {args.output}")


if __name__ == "__main__":
    main()
