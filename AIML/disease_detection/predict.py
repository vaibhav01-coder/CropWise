from __future__ import annotations

import io
import json
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

try:
    import numpy as np
    import tensorflow as tf
    from PIL import Image
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

    _IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover - depends on local Python deps
    np = None
    tf = None
    Image = None
    preprocess_input = None
    _IMPORT_ERROR = exc


router = APIRouter()

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "disease_model.keras"
CLASS_INDEX_PATH = MODEL_DIR / "class_indices.json"
IMG_SIZE = 224

_model = None
_class_names = None


class PredictionItem(BaseModel):
    label: str
    confidence: float
    crop: str
    condition: str


class PredictionResponse(BaseModel):
    top_prediction: PredictionItem
    all_predictions: list[PredictionItem]
    advice: str


def _dependency_error_message() -> str:
    if _IMPORT_ERROR is None:
        return ""
    return (
        "Disease detection dependencies are not installed for the AIML service. "
        "Install the new packages from AIML/requirements.txt and restart the server."
    )


def _load_model():
    global _model, _class_names

    if _IMPORT_ERROR is not None:
        raise RuntimeError(_dependency_error_message())

    if _model is None:
        if not MODEL_PATH.exists() or not CLASS_INDEX_PATH.exists():
            raise RuntimeError(
                "Disease detection model files are missing. Expected "
                f"{MODEL_PATH} and {CLASS_INDEX_PATH}."
            )

        _model = tf.keras.models.load_model(MODEL_PATH)
        class_indices = json.loads(CLASS_INDEX_PATH.read_text(encoding="utf-8"))
        _class_names = [class_indices[str(i)] for i in range(len(class_indices))]

    return _model, _class_names


def _parse_label(raw_label: str):
    if "___" in raw_label:
        crop, condition = raw_label.split("___", 1)
    else:
        crop, condition = raw_label, "unknown"
    return crop.replace("_", " "), condition.replace("_", " ")


def _basic_advice(condition: str) -> str:
    condition_lower = condition.lower()
    if "healthy" in condition_lower:
        return "No disease detected. Continue routine monitoring and good field hygiene."
    return (
        f"Signs consistent with {condition} detected. Isolate affected plants if possible, "
        "remove heavily infected leaves, and consult your local Krishi Vigyan Kendra or "
        "agricultural officer for a targeted treatment recommendation."
    )


@router.get("/health")
def health():
    return {
        "status": "ok",
        "dependencies_ready": _IMPORT_ERROR is None,
        "model_ready": MODEL_PATH.exists() and CLASS_INDEX_PATH.exists(),
    }


@router.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    allowed_extensions = (".jpg", ".jpeg", ".png", ".webp")
    filename = (file.filename or "").lower()
    content_type_ok = file.content_type in (
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
    )
    extension_ok = filename.endswith(allowed_extensions)

    if not (content_type_ok or extension_ok):
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPEG, PNG, or WEBP image.",
        )

    try:
        model, class_names = _load_model()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image = image.resize((IMG_SIZE, IMG_SIZE))
        arr = np.array(image, dtype=np.float32)
        arr = np.expand_dims(arr, axis=0)
        arr = preprocess_input(arr)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not process the uploaded image.",
        ) from exc

    preds = model.predict(arr, verbose=0)[0]
    top_indices = preds.argsort()[::-1][:3]

    results = []
    for idx in top_indices:
        raw_label = class_names[idx]
        crop, condition = _parse_label(raw_label)
        results.append(
            PredictionItem(
                label=raw_label,
                confidence=round(float(preds[idx]) * 100, 2),
                crop=crop,
                condition=condition,
            )
        )

    top = results[0]
    return PredictionResponse(
        top_prediction=top,
        all_predictions=results,
        advice=_basic_advice(top.condition),
    )
