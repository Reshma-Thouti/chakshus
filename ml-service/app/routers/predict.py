"""
app/routers/predict.py

API router handling retinal scan upload and inference requests.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, status
from app.schemas.prediction import PredictionResponse
from app.services.dr_model import DiabeticRetinopathyClassifier

router = APIRouter(prefix="", tags=["Inference"])

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
    "application/octet-stream",  # Allow binary streams from some clients
}


@router.post(
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Diabetic Retinopathy severity from retinal fundus scan",
    description="Accepts a fundus photograph via multipart/form-data and returns a predicted DR grade (0-4), confidence score, and probability distribution.",
)
async def predict_retinopathy(file: UploadFile = File(...)):
    """
    Endpoint consumed by the Node.js backend when a fundus photograph is uploaded.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file was uploaded. Please supply a retinal scan image.",
        )

    # Basic MIME type verification
    content_type = file.content_type or "application/octet-stream"
    if not (content_type.startswith("image/") or content_type in ALLOWED_MIME_TYPES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{content_type}'. Expected an image (JPEG, PNG, TIFF, BMP).",
        )

    try:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty (0 bytes).",
            )

        # Run inference through classifier service
        result = DiabeticRetinopathyClassifier.predict(
            file_bytes=file_bytes,
            filename=file.filename or "unknown_scan.jpg",
            content_type=content_type,
        )

        return result

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference pipeline failure: {str(exc)}",
        )
