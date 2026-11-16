"""
app/schemas/prediction.py

Pydantic schemas defining the request/response data contracts for
the Diabetic Retinopathy prediction microservice.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ImageMetadata(BaseModel):
    """Metadata extracted from the uploaded retinal fundus image."""
    filename: str
    content_type: str
    size_bytes: int
    format: Optional[str] = None
    dimensions: Optional[str] = None  # e.g., "1024x1024"


class PredictionResponse(BaseModel):
    """
    Standardized AI output schema for Diabetic Retinopathy classification.
    Matches the schema requirements of the Node.js/Mongoose ClinicalScan model.
    """
    success: bool = True
    dr_grade: int = Field(
        ...,
        ge=0,
        le=4,
        description="International Clinical Diabetic Retinopathy Severity Scale (0 to 4)"
    )
    dr_grade_label: str = Field(
        ...,
        description="Human readable clinical label corresponding to the predicted grade"
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Softmax confidence score for the predicted DR class"
    )
    grade_probabilities: List[float] = Field(
        ...,
        min_length=5,
        max_length=5,
        description="Probability distribution across all 5 classes [P(0), P(1), P(2), P(3), P(4)]"
    )
    requires_urgent_review: bool = Field(
        ...,
        description="Flag indicating immediate clinician attention is needed (Grade >= 3 or low confidence)"
    )
    model_version: str = Field(
        default="mock-resnet50-v1.0",
        description="Version identifier of the prediction model"
    )
    image_metadata: ImageMetadata
    clinical_recommendation: str = Field(
        ...,
        description="Standard clinical guideline associated with the predicted grade"
    )


class HealthResponse(BaseModel):
    """Microservice health check response."""
    status: str
    service: str
    version: str
    device: str
