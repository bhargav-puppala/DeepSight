from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

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
    longitude: float = Form(...)
):
    return {
        "success": True,
        "image": image.filename,
        "location": {
            "latitude": latitude,
            "longitude": longitude
        },
        "detections": [
            {
                "class": "sample_anomaly",
                "confidence": 0,
                "status": "dummy_result"
            }
        ]
    }