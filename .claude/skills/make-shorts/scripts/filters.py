"""웹캠 프레임에 적용할 쇼츠용 필터 모음.

기존 ascii_webcam.py / face_character_filter.py / eye_sunglasses_filter.py 의
로직을 녹화 스크립트에서 재사용할 수 있게 함수로 뽑아둔 모듈.
"""

import cv2
import numpy as np

_face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
_eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

ASCII_CHARS = " .:-=+*#%@"


def apply_none(frame):
    return frame


def apply_character(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = _face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))

    overlay = frame.copy()
    for (x, y, w, h) in faces:
        pad = int(w * 0.15)
        cx, cy = x + w // 2, y + h // 2
        r = w // 2 + pad

        cv2.circle(overlay, (cx, cy), r, (150, 220, 255), -1)
        cv2.circle(overlay, (cx, cy), r, (60, 130, 200), 4)

        blush_r = max(4, r // 6)
        cv2.circle(overlay, (cx - r // 2, cy + r // 4), blush_r, (170, 170, 255), -1)
        cv2.circle(overlay, (cx + r // 2, cy + r // 4), blush_r, (170, 170, 255), -1)

        eye_r = max(6, r // 5)
        eye_dx = r // 2
        eye_dy = -r // 6
        for sign in (-1, 1):
            ex, ey = cx + sign * eye_dx, cy + eye_dy
            cv2.circle(overlay, (ex, ey), eye_r, (255, 255, 255), -1)
            cv2.circle(overlay, (ex, ey), eye_r, (40, 40, 40), 2)
            cv2.circle(overlay, (ex, ey), max(2, eye_r // 2), (30, 30, 30), -1)
            cv2.line(
                overlay,
                (ex - eye_r, ey - eye_r - 4),
                (ex + eye_r, ey - eye_r - 8),
                (50, 50, 50),
                3,
            )

        mouth_y = cy + r // 3
        cv2.ellipse(overlay, (cx, mouth_y), (r // 2, r // 3), 0, 0, 180, (60, 60, 180), 4)

    return overlay


def apply_sunglasses(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = _face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100))

    overlay = frame.copy()
    for (fx, fy, fw, fh) in faces:
        upper_h = int(fh * 0.6)
        roi_gray = gray[fy:fy + upper_h, fx:fx + fw]
        eyes = _eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=8, minSize=(20, 20))
        if len(eyes) < 2:
            continue

        eyes = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
        centers = []
        for (ex, ey, ew, eh) in eyes:
            cx = fx + ex + ew // 2
            cy = fy + ey + eh // 2
            r = int(max(ew, eh) * 0.65)
            centers.append((cx, cy, r))
        centers.sort(key=lambda c: c[0])
        (lx, ly, lr), (rx, ry, rr) = centers[0], centers[-1]
        lens_r = max(lr, rr)

        arm_len = int(fw * 0.18)
        cv2.line(overlay, (lx - lens_r, ly), (lx - lens_r - arm_len, ly), (20, 20, 20), 6)
        cv2.line(overlay, (rx + lens_r, ry), (rx + lens_r + arm_len, ry), (20, 20, 20), 6)
        cv2.line(overlay, (lx + lens_r, ly), (rx - lens_r, ry), (20, 20, 20), 6)

        for (cx, cy) in ((lx, ly), (rx, ry)):
            cv2.circle(overlay, (cx, cy), lens_r, (15, 15, 15), -1)
            cv2.circle(overlay, (cx, cy), lens_r, (0, 0, 0), 3)
            hl_r = max(2, lens_r // 4)
            cv2.circle(overlay, (cx - lens_r // 3, cy - lens_r // 3), hl_r, (200, 200, 200), -1)

    return overlay


def apply_ascii_art(frame, cols=70):
    h, w = frame.shape[:2]
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    cell_w = max(4, w // cols)
    cell_h = int(cell_w * 1.8)
    rows = max(1, h // cell_h)

    small = cv2.resize(gray, (cols, rows), interpolation=cv2.INTER_AREA)
    canvas = np.zeros_like(frame)
    scale = cell_w / 18.0
    font = cv2.FONT_HERSHEY_SIMPLEX

    for r in range(rows):
        for c in range(cols):
            val = int(small[r, c])
            ch = ASCII_CHARS[int(val / 255 * (len(ASCII_CHARS) - 1))]
            x = c * cell_w
            y = r * cell_h + cell_h
            cv2.putText(canvas, ch, (x, y), font, scale, (val, val, val), 1, cv2.LINE_AA)

    return canvas


FILTERS = {
    "none": apply_none,
    "character": apply_character,
    "sunglasses": apply_sunglasses,
    "ascii": apply_ascii_art,
}
