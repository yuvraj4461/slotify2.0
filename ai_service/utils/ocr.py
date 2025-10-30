# ai_service/utils/ocr.py
import cv2
import numpy as np

def preprocess_image(image):
    """
    Preprocessing to improve OCR accuracy:
    - Convert to gray
    - Denoise
    - Adaptive threshold
    - Resize if small
    """
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    except Exception:
        # if already gray
        gray = image

    # Resize if too small
    h, w = gray.shape[:2]
    if w < 1000:
        scale = 1000.0 / w
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)

    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    # adaptive threshold to handle different lighting
    thresh = cv2.adaptiveThreshold(blur, 255,
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 21, 10)
    return thresh

