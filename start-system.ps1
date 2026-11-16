# PowerShell One-Click Launcher for चक्षुस् (Chakshus)
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "🩺 चक्षुस् (Chakshus) Tele-Oculomics System - Starting All Services" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Python ML Microservice
Write-Host "[1/3] Starting Python ML Microservice on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Capstone\ml-service; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# 2. Node.js Backend
Write-Host "[2/3] Starting Node.js / Express API on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Capstone\backend; npm run dev"

# 3. React Frontend
Write-Host "[3/3] Starting React Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Capstone\frontend; npm run dev"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "🚀 All services launched!" -ForegroundColor Green
Write-Host "👉 Open Dashboard in Browser: http://localhost:3000" -ForegroundColor White
Write-Host "👉 Backend API Health       : http://localhost:5000/api/health" -ForegroundColor White
Write-Host "👉 FastAPI Swagger Docs     : http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
