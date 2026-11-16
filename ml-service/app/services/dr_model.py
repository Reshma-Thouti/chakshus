"""
app/services/dr_model.py

Diabetic Retinopathy (DR) Model Engine.

Currently implements a realistic mock inference pipeline that simulates
a Deep Learning convolutional model (e.g. ResNet50 or EfficientNet-B4)
trained on standard fundus photography datasets (e.g., EyePACS / APTOS 2019).
"""

import io
import hashlib
from typing import Tuple, List
from PIL import Image
from app.schemas.prediction import PredictionResponse, ImageMetadata

DR_GRADE_LABELS = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR",
}

CLINICAL_RECOMMENDATIONS = {
    0: "No diabetic retinopathy detected. Continue routine annual screening and maintain glycemic control.",
    1: "Mild non-proliferative changes observed (microaneurysms). Optimize glycemic control and blood pressure. Re-screen in 12 months.",
    2: "Moderate non-proliferative changes detected. Refer to an ophthalmologist for comprehensive evaluation. Re-screen in 6 months.",
    3: "Severe non-proliferative diabetic retinopathy with high risk of progression. Urgent ophthalmology referral required. Consider panretinal photocoagulation (PRP).",
    4: "Proliferative Diabetic Retinopathy (PDR) detected (neovascularization/vitreous hemorrhage). Urgent vitreoretinal surgical consultation required to prevent permanent vision loss.",
}


class DiabeticRetinopathyClassifier:
    """
    Mock inference service that models the behavior of a production CNN.
    Validates input imagery, extracts visual dimensions, and calculates
    softmax probability distributions.
    """

    MODEL_VERSION = "mock-resnet50-dr-v1.0"

    @classmethod
    def inspect_image(cls, file_bytes: bytes, filename: str, content_type: str) -> ImageMetadata:
        """
        Validates whether bytes represent an interpretable image and returns metadata.
        """
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                format_name = img.format or "UNKNOWN"
                dimensions = f"{img.width}x{img.height}"
        except Exception:
            # Fallback if image cannot be parsed by PIL (e.g. mock test payload)
            format_name = "UNKNOWN"
            dimensions = "N/A"

        return ImageMetadata(
            filename=filename,
            content_type=content_type,
            size_bytes=len(file_bytes),
            format=format_name,
            dimensions=dimensions,
        )

    @classmethod
    def predict(cls, file_bytes: bytes, filename: str, content_type: str) -> PredictionResponse:
        """
        Simulates model inference on the retinal scan.

        Uses the SHA256 checksum of the uploaded file bytes to deterministically
        assign a realistic probability distribution across the 5 DR severity grades.
        This provides consistent, reproducible results for the same scan while
        still providing varied responses across different test images.
        """
        metadata = cls.inspect_image(file_bytes, filename, content_type)

        # Derive a deterministic integer seed from the image content hash
        digest = hashlib.sha256(file_bytes).hexdigest()
        seed_val = int(digest[:8], 16)

        # Generate a simulated probability distribution across the 5 classes
        # Grade 0 to 4
        predicted_grade = seed_val % 5
        base_confidence = 0.75 + ((seed_val % 21) / 100.0)  # Between 0.75 and 0.95
        remaining_prob = 1.0 - base_confidence

        probabilities: List[float] = [0.0] * 5
        probabilities[predicted_grade] = round(base_confidence, 4)

        # Distribute remaining probability mass to neighboring classes
        other_indices = [i for i in range(5) if i != predicted_grade]
        weights = [1, 2, 3, 2][:len(other_indices)]
        total_w = sum(weights)
        for idx, w in zip(other_indices, weights):
            probabilities[idx] = round(remaining_prob * (w / total_w), 4)

        # Normalize to ensure sum is strictly 1.0
        diff = round(1.0 - sum(probabilities), 4)
        probabilities[predicted_grade] = round(probabilities[predicted_grade] + diff, 4)

        confidence_score = probabilities[predicted_grade]
        dr_grade_label = DR_GRADE_LABELS[predicted_grade]

        # Clinical rule: flag for urgent review if grade is 3 or 4, or if confidence is low (< 0.65)
        requires_urgent_review = (predicted_grade >= 3) or (confidence_score < 0.65)

        return PredictionResponse(
            success=True,
            dr_grade=predicted_grade,
            dr_grade_label=dr_grade_label,
            confidence_score=confidence_score,
            grade_probabilities=probabilities,
            requires_urgent_review=requires_urgent_review,
            model_version=cls.MODEL_VERSION,
            image_metadata=metadata,
            clinical_recommendation=CLINICAL_RECOMMENDATIONS[predicted_grade],
        )
