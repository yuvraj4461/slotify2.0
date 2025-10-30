# ai_service/app.py
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import pytesseract
import cv2
import numpy as np
import joblib
from utils.ocr import preprocess_image
import os

app = FastAPI(
    title="Slotify AI Microservice",
    description="Triage prediction and OCR-based report analysis",
    version="1.0.0"
)

# Try to load a pre-trained model if exists
MODEL_PATH = os.path.join("model", "triage_model.pkl")
model = None
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
    except Exception as e:
        model = None

class PatientData(BaseModel):
    symptoms: str
    heart_rate: int
    temperature: float
    oxygen_saturation: int

@app.post("/predict")
def predict(data: PatientData):
    """
    Return triage score and category.
    If a model exists it will be used; otherwise a fallback heuristic is used.
    Score is normalized/clamped to 0..100.
    """
    if model is not None:
        try:
            features = [[data.heart_rate, data.temperature, data.oxygen_saturation]]
            raw = float(model.predict(features)[0])
        except Exception:
            raw = float((data.heart_rate / 2) + (data.temperature * 10) - (100 - data.oxygen_saturation))
    else:
        # simple heuristic fallback (may produce big numbers) — we will clamp below
        raw = float((data.heart_rate / 2) + (data.temperature * 10) - (100 - data.oxygen_saturation))

    # Normalize / clamp to 0..100
    # Simple approach: if raw is already 0..100 keep it; otherwise compress
    try:
        raw = float(raw)
    except Exception:
        raw = 0.0

    # Option A: clamp directly (fast, safe)
    score = max(0.0, min(100.0, raw))

    # Option B (recommended longer-term): smooth large values using a logistic-like scaling
    # Uncomment to use logistic scaling instead of hard clamp:
    # import math
    # score = 100 * (1 / (1 + math.exp(- (raw - 50) / 25)))  # maps input to 0..100 smoothly

    # Determine category
    if score >= 80:
        category = "Critical"
    elif score >= 60:
        category = "Urgent"
    elif score >= 40:
        category = "Less-Urgent"
    else:
        category = "Non-Urgent"

    return {"score": round(score, 2), "category": category}


@app.post("/analyze-report")
async def analyze_report(file: UploadFile = File(...)):
    """
    Accepts an image/pdf (image recommended) and returns extracted text summary.
    """
    contents = await file.read()
    # Convert bytes to numpy array then decode
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        return {"success": False, "message": "Unable to decode image"}

    processed = preprocess_image(img)
    text = pytesseract.image_to_string(processed)

    # very simple lightweight extraction examples (improve with regex/spacy)
    summary = "Critical findings detected" if "critical" in text.lower() or "abnormal" in text.lower() else "Normal findings"
    snippet = text[:200] + ("..." if len(text) > 200 else "")

    return {"success": True, "summary": summary, "extracted_text": snippet}
