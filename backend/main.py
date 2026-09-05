from io import BytesIO
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO


BACKEND_DIR = Path(__file__).resolve().parent
LOCAL_MODEL_PATH = BACKEND_DIR / "models" / "best.pt"


def resolve_model_path():
    if LOCAL_MODEL_PATH.is_file():
        return LOCAL_MODEL_PATH

    repository = os.getenv("HF_MODEL_REPO")
    filename = os.getenv("HF_MODEL_FILENAME", "best.pt")
    if not repository:
        raise FileNotFoundError(
            f"YOLO model not found at {LOCAL_MODEL_PATH}. "
            "Set HF_MODEL_REPO and optionally HF_MODEL_FILENAME for production."
        )

    try:
        return Path(
            hf_hub_download(
                repo_id=repository,
                filename=filename,
                token=os.getenv("HF_TOKEN") or None,
            )
        )
    except Exception as error:
        raise RuntimeError(
            f"Could not download YOLO model '{filename}' from '{repository}': {error}"
        ) from error


MODEL_PATH = resolve_model_path()


try:
    model = YOLO(MODEL_PATH)
except Exception as error:
    raise RuntimeError(f"Could not load YOLO model from {MODEL_PATH}: {error}") from error

app = FastAPI(title="DeepSight API")

configured_origins = os.getenv("FRONTEND_ORIGIN")
allowed_origins = (
    [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
    if configured_origins
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "DeepSight API is running"
    }


@app.post("/detect")
async def detect(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    confidence_threshold: float = Form(0.5),
):
    if not 0 <= confidence_threshold <= 1:
        raise HTTPException(
            status_code=422,
            detail="confidence_threshold must be between 0 and 1",
        )

    image_bytes = await image.read()

    try:
        original_image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image") from error

    image_array = np.asarray(original_image)
    image_width, image_height = original_image.size

    try:
        prediction = model.predict(
            source=image_array,
            conf=confidence_threshold,
            verbose=False,
        )[0]
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"YOLO inference failed: {error}") from error

    detections = []
    boxes = prediction.boxes
    if boxes is not None:
        coordinates = boxes.xyxy.cpu().tolist()
        class_ids = boxes.cls.cpu().tolist()
        confidences = boxes.conf.cpu().tolist()

        for coordinates, class_id, confidence in zip(coordinates, class_ids, confidences):
            x1, y1, x2, y2 = coordinates
            class_id = int(class_id)
            detections.append(
                {
                    "class": model.names[class_id],
                    "class_id": class_id,
                    "confidence": float(confidence),
                    "bbox": {
                        "x1": float(x1),
                        "y1": float(y1),
                        "x2": float(x2),
                        "y2": float(y2),
                        "width": float(x2 - x1),
                        "height": float(y2 - y1),
                    },
                    "latitude": latitude,
                    "longitude": longitude,
                }
            )

    return {
        "success": True,
        "image": image.filename,
        "image_width": image_width,
        "image_height": image_height,
        "latitude": latitude,
        "longitude": longitude,
        "confidence_threshold": confidence_threshold,
        "detections": detections,
    }