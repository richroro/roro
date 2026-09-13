import time
import numpy as np
import cv2

def probe(index, backend, backend_name):
    cap = cv2.VideoCapture(index, backend)
    if not cap.isOpened():
        print(f"index={index} backend={backend_name}: open failed", flush=True)
        return
    for _ in range(20):
        cap.read()
        time.sleep(0.03)
    ok, frame = cap.read()
    if not ok:
        print(f"index={index} backend={backend_name}: read failed", flush=True)
        cap.release()
        return
    mean = np.mean(frame)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fname = f"C:\\Users\\MiJin\\richgogo\\probe_{index}_{backend_name}.png"
    cv2.imwrite(fname, frame)
    print(f"index={index} backend={backend_name}: size={w}x{h} mean_brightness={mean:.2f} saved={fname}", flush=True)
    cap.release()

for index in range(4):
    probe(index, cv2.CAP_MSMF, "MSMF")
