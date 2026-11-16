# 🤖 Diabetic Vision ML Microservice

Standalone Python FastAPI microservice that predicts Diabetic Retinopathy (DR) severity grades (0–4) from retinal fundus photographs.

## 📋 Technology Stack

- **Framework**: FastAPI (Asynchronous Python Web Framework)
- **ASGI Server**: Uvicorn
- **Validation**: Pydantic v2
- **Image Processing**: Pillow

---

## 🚀 Getting Started

### 1. Set Up Virtual Environment

```powershell
cd C:\Capstone\ml-service
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Start the Server

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive OpenAPI Swagger documentation will be available at:
👉 **http://127.0.0.1:8000/docs**

---

## 🔌 API Endpoints

### `POST /predict`
Accepts a fundus photograph (`multipart/form-data` with field key `file`) and returns the DR grading.

**Sample Response:**
```json
{
  "success": true,
  "dr_grade": 2,
  "dr_grade_label": "Moderate NPDR",
  "confidence_score": 0.88,
  "grade_probabilities": [0.03, 0.06, 0.88, 0.02, 0.01],
  "requires_urgent_review": false,
  "model_version": "mock-resnet50-dr-v1.0",
  "image_metadata": {
    "filename": "fundus_scan_right.jpg",
    "content_type": "image/jpeg",
    "size_bytes": 245120,
    "format": "JPEG",
    "dimensions": "1024x1024"
  },
  "clinical_recommendation": "Moderate non-proliferative changes detected. Refer to an ophthalmologist for comprehensive evaluation. Re-screen in 6 months."
}
```

### `GET /health`
Returns microservice health status:
```json
{
  "status": "healthy",
  "service": "diabetic-vision-ml-service",
  "version": "1.0.0",
  "device": "cpu"
}
```

---

## 🩺 Diabetic Retinopathy Grading Scale (ICDR)

| Grade | Clinical Label | Features | Recommendation |
|:---:|---|---|---|
| **0** | No DR | No vascular abnormalities | Routine annual screening |
| **1** | Mild NPDR | Microaneurysms only | Glycemic control, re-screen 12m |
| **2** | Moderate NPDR | Microaneurysms + exudates/hemorrhages | Ophthalmology referral, re-screen 6m |
| **3** | Severe NPDR | 4-2-1 rule (hemorrhages / venous beading / IRMA) | Urgent referral, evaluate for PRP laser |
| **4** | Proliferative DR (PDR) | Neovascularization, vitreous/preretinal hemorrhage | Urgent surgical consult, high risk of vision loss |
