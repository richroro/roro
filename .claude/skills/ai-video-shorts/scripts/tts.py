#!/usr/bin/env python3
"""
나레이션 TTS 생성기 (ai-video-shorts 스킬).

한 줄에 한 씬씩 적힌 나레이션 텍스트 파일을 읽어, Microsoft Edge 뉴럴 보이스로
씬별 mp3(01.mp3, 02.mp3 ...)를 만든다. --merge 를 주면 하나로 이어붙인
narration.mp3 도 만든다(ffmpeg 필요).

설치:
    pip install edge-tts
    (병합 --merge 를 쓰려면 ffmpeg 도 필요: winget install Gyan.FFmpeg)

한국어 추천 보이스:
    ko-KR-SunHiNeural   (여성, 밝고 또렷 — 기본값)
    ko-KR-InJoonNeural  (남성, 차분)
    ko-KR-HyunsuNeural  (남성/멀티, 자연스러움)  ← 버전에 따라 없을 수 있음
전체 목록:  edge-tts --list-voices | findstr ko-KR

사용 예:
    python tts.py --input narration.txt --out-dir narration --voice ko-KR-SunHiNeural
    python tts.py --input narration.txt --out-dir narration --rate "-5%" --merge

주의:
    edge-tts 는 마이크로소프트 서버를 호출하는 온라인 방식이다(무료지만 인터넷 필요).
    완전 오프라인이 필요하면 Windows 내장 SAPI(README/안내 참고)나 로컬 TTS 사용.
"""
import argparse
import asyncio
import os
import shutil
import subprocess
import sys


def die(msg, code=1):
    print(f"[tts] 오류: {msg}", file=sys.stderr)
    sys.exit(code)


def read_lines(path):
    if not os.path.isfile(path):
        die(f"입력 파일이 없습니다: {path}")
    lines = []
    with open(path, encoding="utf-8") as f:
        for raw in f:
            s = raw.strip()
            if not s or s.startswith("#"):
                continue
            lines.append(s)
    if not lines:
        die(f"읽을 나레이션 줄이 없습니다: {path}")
    return lines


async def synth(text, out_path, voice, rate, volume, pitch):
    import edge_tts  # 지연 임포트: 미설치 시 친절한 안내
    kwargs = {"voice": voice}
    if rate:
        kwargs["rate"] = rate
    if volume:
        kwargs["volume"] = volume
    if pitch:
        kwargs["pitch"] = pitch
    communicate = edge_tts.Communicate(text, **kwargs)
    await communicate.save(out_path)


def merge_mp3(files, out_path):
    if shutil.which("ffmpeg") is None:
        print("[tts] ffmpeg 가 없어 병합을 건너뜁니다 (개별 mp3 는 생성됨).")
        return
    list_path = out_path + ".concat.txt"
    with open(list_path, "w", encoding="utf-8") as f:
        for p in files:
            ap = os.path.abspath(p).replace("\\", "/")
            f.write(f"file '{ap}'\n")
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
           "-i", list_path, "-c", "copy", out_path]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    os.remove(list_path)
    if proc.returncode != 0:
        # copy 로 안되면 재인코딩 재시도
        cmd2 = ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", list_path, "-c:a", "libmp3lame", "-q:a", "2", out_path]
        # list_path 를 지웠으니 다시 생성
        with open(list_path, "w", encoding="utf-8") as f:
            for p in files:
                ap = os.path.abspath(p).replace("\\", "/")
                f.write(f"file '{ap}'\n")
        proc2 = subprocess.run(cmd2, capture_output=True, text=True)
        os.remove(list_path)
        if proc2.returncode != 0:
            tail = "\n".join(proc2.stderr.strip().splitlines()[-10:])
            print(f"[tts] 병합 실패(개별 파일은 정상):\n{tail}")
            return
    print(f"[tts] 병합 완료: {out_path}")


def main():
    ap = argparse.ArgumentParser(description="나레이션 TTS 생성기 (edge-tts)")
    ap.add_argument("--input", required=True, help="나레이션 텍스트 (한 줄=한 씬, # 은 주석)")
    ap.add_argument("--out-dir", default="narration", help="mp3 저장 폴더")
    ap.add_argument("--voice", default="ko-KR-SunHiNeural", help="Edge 뉴럴 보이스")
    ap.add_argument("--rate", default=None, help='말 속도, 예 "-5%%" 느리게 / "+10%%" 빠르게')
    ap.add_argument("--volume", default=None, help='볼륨, 예 "+0%%"')
    ap.add_argument("--pitch", default=None, help='피치, 예 "+0Hz"')
    ap.add_argument("--merge", action="store_true", help="ffmpeg 로 하나의 narration.mp3 로 병합")
    args = ap.parse_args()

    try:
        import edge_tts  # noqa: F401
    except ImportError:
        die("edge-tts 가 설치되지 않았습니다. 먼저 실행:\n  pip install edge-tts")

    lines = read_lines(args.input)
    os.makedirs(args.out_dir, exist_ok=True)

    made = []
    for i, text in enumerate(lines, 1):
        out_path = os.path.join(args.out_dir, f"{i:02d}.mp3")
        print(f"[tts] {i:02d}. {text[:30]}... -> {out_path}")
        asyncio.run(synth(text, out_path, args.voice, args.rate, args.volume, args.pitch))
        made.append(out_path)

    print(f"[tts] {len(made)}개 나레이션 생성 완료 (폴더: {args.out_dir})")

    if args.merge:
        merge_mp3(made, os.path.join(args.out_dir, "narration.mp3"))


if __name__ == "__main__":
    main()
