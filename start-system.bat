@echo off
title Chakshus - System Launcher
echo =================================================================
echo  Chakshus Tele-Oculomics System - Starting All Services
echo =================================================================
echo.

echo [1/3] Starting Python ML Microservice (FastAPI + PyTorch) on port 8000...
start "Chakshus - Python ML Service (Port 8000)" cmd /k "cd /d C:\Capstone\ml-service && .\venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting Node.js / Express API Backend on port 5000...
start "Chakshus - Node Backend (Port 5000)" cmd /k "cd /d C:\Capstone\backend && npm run dev"

echo [3/3] Starting React Frontend Dashboard on port 3000...
start "Chakshus - React Frontend (Port 3000)" cmd /k "cd /d C:\Capstone\frontend && npm run dev"

echo.
echo =================================================================
echo  All services have been launched in separate terminal windows!
echo  Web Dashboard: http://localhost:3000
echo  Backend API  : http://localhost:5000/api/health
echo  AI ML Docs   : http://127.0.0.1:8000/docs
echo =================================================================
echo.
pause
