from io import BytesIO
from pathlib import Path

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO


MODEL_PATH = Path(__file__).resolve().parent / "models" / "best.pt"

if not MODEL_PATH.is_file():
    raise FileNotFoundError(f"YOLO model not found: {MODEL_PATH}")

try:
    model = YOLO(MODEL_PATH)
except Exception as error:
    raise RuntimeError(f"Could not load YOLO model from {MODEL_PATH}: {error}") from error

app = FastAPI(title="DeepSight API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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