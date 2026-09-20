import cv2
import numpy as np

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def draw_character_face(frame, x, y, w, h):
    # 얼굴 박스보다 살짝 크게 그려서 실제 얼굴을 가리도록 함
    pad = int(w * 0.15)
    cx, cy = x + w // 2, y + h // 2
    r = w // 2 + pad

    overlay = frame.copy()

    # 얼굴(원)
    cv2.circle(overlay, (cx, cy), r, (150, 220, 255), -1)
    cv2.circle(overlay, (cx, cy), r, (60, 130, 200), 4)

    # 볼터치
    blush_r = max(4, r // 6)
    cv2.circle(overlay, (cx - r // 2, cy + r // 4), blush_r, (170, 170, 255), -1)
    cv2.circle(overlay, (cx + r // 2, cy + r // 4), blush_r, (170, 170, 255), -1)

    # 눈
    eye_r = max(6, r // 5)
    eye_dx = r // 2
    eye_dy = -r // 6
    for sign in (-1, 1):
        ex, ey = cx + sign * eye_dx, cy + eye_dy
        cv2.circle(overlay, (ex, ey), eye_r, (255, 255, 255), -1)
        cv2.circle(overlay, (ex, ey), eye_r, (40, 40, 40), 2)
        cv2.circle(overlay, (ex, ey), max(2, eye_r // 2), (30, 30, 30), -1)

    # 눈썹
    for sign in (-1, 1):
        ex, ey = cx + sign * eye_dx, cy + eye_dy
        cv2.line(
            overlay,
            (ex - eye_r, ey - eye_r - 4),
            (ex + eye_r, ey - eye_r - 8),
            (50, 50, 50),
            3,
        )

    # 입 (웃는 곡선)
    mouth_y = cy + r // 3
    cv2.ellipse(overlay, (cx, mouth_y), (r // 2, r // 3), 0, 0, 180, (60, 60, 180), 4)

    frame[:] = overlay


def main():
    cap = cv2.VideoCapture(0, cv2.CAP_MSMF)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("카메라를 열 수 없습니다.")
        return

    for _ in range(10):
        cap.read()

    print("웹캠 캐릭터 필터 시작. 창을 닫거나 'q'를 눌러 종료하세요.")
    cv2.namedWindow("Character Filter", cv2.WINDOW_NORMAL)

    while True:
        ok, frame = cap.read()
        if not ok:
            print("프레임을 읽을 수 없습니다.")
            break

        frame = cv2.flip(frame, 1)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))

        for (x, y, w, h) in faces:
            draw_character_face(frame, x, y, w, h)

        cv2.imshow("Character Filter", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if cv2.getWindowProperty("Character Filter", cv2.WND_PROP_VISIBLE) < 1:
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
