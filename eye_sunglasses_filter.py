import cv2
import numpy as np

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")


def draw_sunglasses(frame, face_x, face_y, face_w, eyes):
    # 눈 중심 좌표(프레임 기준)로 변환
    centers = []
    for (ex, ey, ew, eh) in eyes:
        cx = face_x + ex + ew // 2
        cy = face_y + ey + eh // 2
        r = int(max(ew, eh) * 0.65)
        centers.append((cx, cy, r))

    # 왼쪽/오른쪽 순서로 정렬
    centers.sort(key=lambda c: c[0])
    left, right = centers[0], centers[-1]

    lx, ly, lr = left
    rx, ry, rr = right
    lens_r = max(lr, rr)

    overlay = frame.copy()

    # 다리(팔) - 얼굴 옆쪽으로
    arm_len = int(face_w * 0.18)
    cv2.line(overlay, (lx - lens_r, ly), (lx - lens_r - arm_len, ly), (20, 20, 20), 6)
    cv2.line(overlay, (rx + lens_r, ry), (rx + lens_r + arm_len, ry), (20, 20, 20), 6)

    # 브릿지(코 부분 연결)
    cv2.line(overlay, (lx + lens_r, ly), (rx - lens_r, ry), (20, 20, 20), 6)

    # 렌즈
    for (cx, cy) in ((lx, ly), (rx, ry)):
        cv2.circle(overlay, (cx, cy), lens_r, (15, 15, 15), -1)
        cv2.circle(overlay, (cx, cy), lens_r, (0, 0, 0), 3)
        # 반사광
        hl_r = max(2, lens_r // 4)
        cv2.circle(overlay, (cx - lens_r // 3, cy - lens_r // 3), hl_r, (200, 200, 200), -1)

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

    print("눈 인식 선글라스 필터 시작. 창을 닫거나 'q'를 눌러 종료하세요.")
    cv2.namedWindow("Sunglasses Filter", cv2.WINDOW_NORMAL)

    while True:
        ok, frame = cap.read()
        if not ok:
            print("프레임을 읽을 수 없습니다.")
            break

        frame = cv2.flip(frame, 1)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100))

        for (fx, fy, fw, fh) in faces:
            # 눈은 보통 얼굴 위쪽 절반에 있음 -> 오탐 줄이기
            upper_h = int(fh * 0.6)
            roi_gray = gray[fy:fy + upper_h, fx:fx + fw]
            eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=8, minSize=(20, 20))

            if len(eyes) >= 2:
                # 가장 큰 두 개만 사용 (오탐 제거)
                eyes = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
                draw_sunglasses(frame, fx, fy, fw, eyes)

        cv2.imshow("Sunglasses Filter", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if cv2.getWindowProperty("Sunglasses Filter", cv2.WND_PROP_VISIBLE) < 1:
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
