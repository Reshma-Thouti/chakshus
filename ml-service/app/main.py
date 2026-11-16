"""
app/main.py

FastAPI Application Entrypoint for the Diabetic Vision ML Microservice.
Runs on port 8000 by default (as configured in backend/.env.example).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.predict import router as predict_router
from app.schemas.prediction import HealthResponse

app = FastAPI(
    title="Diabetic Vision AI Microservice",
    description="Standalone FastAPI machine learning service providing Diabetic Retinopathy (DR) grading (0-4) from retinal fundus imagery.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS so both Node.js (internal) and React (direct dev testing) can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include inference router
app.include_router(predict_router)


@app.get("/", tags=["General"])
def root_info():
    """Service discovery endpoint."""
    return {
        "service": "Diabetic Vision ML Microservice",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "predict": "POST /predict",
            "health": "GET /health",
            "documentation": "GET /docs",
        },
    }


@app.get("/health", response_model=HealthResponse, tags=["General"])
def health_check():
    """Health status endpoint for Docker / orchestration / load balancers."""
    return HealthResponse(
        status="healthy",
        service="diabetic-vision-ml-service",
        version="1.0.0",
        device="cpu",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
