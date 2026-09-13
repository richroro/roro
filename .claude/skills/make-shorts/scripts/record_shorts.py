"""웹캠으로 9:16 세로 쇼츠 영상을 녹화하는 스크립트.

사용 예:
    python record_shorts.py --filter character --duration 15 --caption "오늘의 하이라이트"

카메라 창이 열리며, 카운트다운 후 지정한 시간(기본 15초, 최대 60초) 동안 녹화한다.
'q' 를 누르면 조기 종료된다. 오디오 트랙은 포함되지 않는다(무음 mp4).
"""

import argparse
import datetime
import sys
import time
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parent))
from filters import FILTERS  # noqa: E402


def open_camera():
    cap = cv2.VideoCapture(0, cv2.CAP_MSMF)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    return cap


def crop_to_vertical(frame, target_w, target_h):
    h, w = frame.shape[:2]
    target_ratio = target_w / target_h
    cur_ratio = w / h

    if cur_ratio > target_ratio:
        new_w = int(h * target_ratio)
        x0 = (w - new_w) // 2
        frame = frame[:, x0:x0 + new_w]
    else:
        new_h = int(w / target_ratio)
        y0 = (h - new_h) // 2
        frame = frame[y0:y0 + new_h, :]

    return cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)


def draw_caption(frame, text):
    if not text:
        return frame
    h, w = frame.shape[:2]
    font = cv2.FONT_HERSHEY_DUPLEX
    scale = w / 700
    thickness = max(1, int(scale * 2))
    (tw, _), _ = cv2.getTextSize(text, font, scale, thickness)
    x = max(10, (w - tw) // 2)
    y = int(h * 0.12)
    cv2.putText(frame, text, (x, y), font, scale, (0, 0, 0), thickness + 3, cv2.LINE_AA)
    cv2.putText(frame, text, (x, y), font, scale, (255, 255, 255), thickness, cv2.LINE_AA)
    return frame


def main():
    parser = argparse.ArgumentParser(description="웹캠으로 세로형(9:16) 쇼츠 영상을 녹화합니다.")
    parser.add_argument("--filter", choices=list(FILTERS.keys()), default="none", help="적용할 필터")
    parser.add_argument("--duration", type=float, default=15.0, help="녹화 길이(초). 1~60초")
    parser.add_argument("--caption", type=str, default="", help="상단에 표시할 자막 텍스트")
    parser.add_argument("--width", type=int, default=1080, help="출력 영상 가로 픽셀")
    parser.add_argument("--height", type=int, default=1920, help="출력 영상 세로 픽셀")
    parser.add_argument("--fps", type=float, default=None, help="출력 프레임레이트 (미지정 시 실제 녹화 시간 기준으로 자동 계산해 재생 길이를 실제 녹화 시간에 맞춤)")
    parser.add_argument("--countdown", type=int, default=3, help="녹화 시작 전 카운트다운 초")
    parser.add_argument("--output", type=str, default=None, help="저장할 mp4 경로 (기본: shorts_output/shorts_<타임스탬프>.mp4)")
    args = parser.parse_args()

    duration = min(max(args.duration, 1.0), 60.0)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    output = Path(args.output) if args.output else Path.cwd() / "shorts_output" / f"shorts_{timestamp}.mp4"
    output.parent.mkdir(parents=True, exist_ok=True)

    cap = open_camera()
    if not cap.isOpened():
        print("카메라를 열 수 없습니다.")
        return
    for _ in range(10):
        cap.read()

    window = "Shorts Recorder"
    cv2.namedWindow(window, cv2.WINDOW_NORMAL)
    filter_fn = FILTERS[args.filter]

    # 카운트다운
    countdown_start = time.time()
    aborted = False
    while True:
        ok, frame = cap.read()
        if not ok:
            aborted = True
            break
        frame = cv2.flip(frame, 1)
        vertical = crop_to_vertical(frame, args.width, args.height)
        remaining = args.countdown - (time.time() - countdown_start)
        if remaining <= 0:
            break
        cv2.putText(
            vertical, str(int(remaining) + 1),
            (args.width // 2 - 40, args.height // 2),
            cv2.FONT_HERSHEY_SIMPLEX, 4, (0, 0, 255), 6, cv2.LINE_AA,
        )
        cv2.imshow(window, vertical)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            aborted = True
            break

    if aborted:
        cap.release()
        cv2.destroyAllWindows()
        print("녹화가 취소되었습니다.")
        return

    # 1차: 실제 카메라 처리 속도가 얼마든 일단 프레임을 그대로 임시 파일에 기록하고
    # 정확한 경과 시간을 재둔다. (필터별로 처리 속도가 달라 사전 추정이 부정확하기 때문)
    raw_output = output.with_name(output.stem + "_raw.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    placeholder_fps = 25.0
    raw_writer = cv2.VideoWriter(str(raw_output), fourcc, placeholder_fps, (args.width, args.height))
    if not raw_writer.isOpened():
        print("영상 파일을 생성할 수 없습니다.")
        cap.release()
        return

    print(f"녹화 시작. {duration:.0f}초 동안 촬영합니다. 'q'를 누르면 조기 종료됩니다.")
    frame_count = 0
    rec_start = time.time()

    while True:
        elapsed = time.time() - rec_start
        if elapsed >= duration:
            break

        ok, frame = cap.read()
        if not ok:
            print("프레임을 읽을 수 없습니다.")
            break

        frame = cv2.flip(frame, 1)
        frame = filter_fn(frame)
        vertical = crop_to_vertical(frame, args.width, args.height)
        vertical = draw_caption(vertical, args.caption)

        raw_writer.write(vertical)
        frame_count += 1

        preview = vertical.copy()
        cv2.putText(
            preview, f"REC {elapsed:0.1f}s / {duration:.0f}s",
            (20, args.height - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA,
        )
        cv2.circle(preview, (args.width - 30, 30), 10, (0, 0, 255), -1)
        cv2.imshow(window, preview)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if cv2.getWindowProperty(window, cv2.WND_PROP_VISIBLE) < 1:
            break

    actual_elapsed = time.time() - rec_start
    cap.release()
    raw_writer.release()
    cv2.destroyAllWindows()

    if frame_count == 0:
        raw_output.unlink(missing_ok=True)
        print("녹화된 프레임이 없어 파일을 저장하지 않았습니다.")
        return

    # 2차: 실측 fps(요청 시 --fps)로 재생 길이가 실제 녹화 시간과 맞도록 다시 인코딩
    if args.fps is not None:
        final_fps = args.fps
    elif actual_elapsed > 0:
        final_fps = min(60.0, max(1.0, frame_count / actual_elapsed))
    else:
        final_fps = placeholder_fps

    reader = cv2.VideoCapture(str(raw_output))
    final_writer = cv2.VideoWriter(str(output), fourcc, final_fps, (args.width, args.height))
    while True:
        ok, frame = reader.read()
        if not ok:
            break
        final_writer.write(frame)
    reader.release()
    final_writer.release()
    raw_output.unlink(missing_ok=True)

    print(f"완료: {output} ({frame_count}프레임, {final_fps:.1f}fps, 약 {frame_count / final_fps:.1f}초, 오디오 없음)")


if __name__ == "__main__":
    main()
