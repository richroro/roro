import shutil
import sys
import time

import cv2
import numpy as np

# 어두운 배경 터미널 기준: 밝을수록 촘촘한 문자로 표현
ASCII_CHARS = " .:-=+*#%@"


def frame_to_ascii(frame, out_width):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    # 글자는 폭보다 높이가 크므로 세로를 압축해서 비율을 맞춘다
    out_height = max(1, int(out_width * (h / w) * 0.5))
    resized = cv2.resize(gray, (out_width, out_height))

    indices = (resized.astype(np.float32) / 255 * (len(ASCII_CHARS) - 1)).astype(np.int32)
    rows = ["".join(ASCII_CHARS[i] for i in row) for row in indices]
    return "\n".join(rows)


def main():
    cap = cv2.VideoCapture(0, cv2.CAP_MSMF)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("카메라를 열 수 없습니다.")
        return

    for _ in range(10):
        cap.read()

    print("Ctrl+C 를 눌러 종료하세요.\n")
    time.sleep(1)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("프레임을 읽을 수 없습니다.")
                break

            frame = cv2.flip(frame, 1)  # 거울 모드
            cols = shutil.get_terminal_size((100, 30)).columns
            width = max(20, min(cols, 160))
            ascii_frame = frame_to_ascii(frame, width)

            sys.stdout.write("\x1b[H\x1b[J")  # 커서를 맨 위로 이동 + 화면 지우기
            sys.stdout.write(ascii_frame + "\n")
            sys.stdout.flush()

            time.sleep(0.05)
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()


if __name__ == "__main__":
    main()
