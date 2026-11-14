# 🩺 Diabetic Vision Health Management System

A full-stack AI-assisted clinical platform for predicting and preventing Diabetic Retinopathy.

## Architecture

```
C:\Capstone\
├── backend/          → Node.js + Express + MongoDB (Primary API)
├── frontend/         → React (Patient & Doctor Dashboards)
└── ml-service/       → Python FastAPI (DR Grading Microservice)
```

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | React, Chart.js                   |
| Backend API  | Node.js, Express, Mongoose        |
| Database     | MongoDB                           |
| ML Service   | Python, FastAPI, Uvicorn          |
| File Upload  | Multer (Node.js)                  |

## Diabetic Retinopathy Grading Scale

| Grade | Label                  | Description                            |
|-------|------------------------|----------------------------------------|
| 0     | No DR                  | No signs of retinopathy                |
| 1     | Mild NPDR              | Microaneurysms only                    |
| 2     | Moderate NPDR          | More than mild, less than severe       |
| 3     | Severe NPDR            | Extensive hemorrhages, no PDR signs    |
| 4     | Proliferative DR (PDR) | Neovascularization / high-risk PDR     |

## Phases

- [x] Phase 1: Backend Foundation (Schemas + Express setup)
- [ ] Phase 2: React UI Dashboard
- [ ] Phase 3: Python FastAPI ML Microservice
- [ ] Phase 4: Multi-Service Communication (Multer bridge)
