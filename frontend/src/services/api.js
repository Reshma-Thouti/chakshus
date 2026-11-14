/**
 * services/api.js
 *
 * Centralised Axios API client for all backend communication.
 *
 * Design rationale:
 *  - One Axios instance with a shared baseURL means we only change the URL
 *    in one place when deploying (via environment variable).
 *  - Interceptors handle request/response concerns globally (auth headers,
 *    error logging) without each component duplicating that logic.
 *  - Each exported function maps 1:1 to a backend route, keeping components
 *    free of URL strings and HTTP verbs.
 *  - In Phase 1 these calls will return 501 (stub responses). They will work
 *    fully once Phase 2 controllers are wired to the routes.
 *
 * File upload (Phase 4):
 *  - uploadFundusScan uses multipart/form-data via FormData, overriding the
 *    default Content-Type so Axios/Multer handle the boundary correctly.
 */

import axios from 'axios';

// ── Axios Instance ───────────────────────────────────────────
const api = axios.create({
  // Vite proxy forwards /api/* → Express on port 5000 (see vite.config.js)
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15s timeout — longer for image uploads
});

// ── Request Interceptor ──────────────────────────────────────
// Will be used to attach JWT auth token in a future phase
api.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('dvh_token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,  // unwrap .data so callers get payload directly
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ════════════════════════════════════════════════════════════
// PATIENT ENDPOINTS
// ════════════════════════════════════════════════════════════

/** Register a new patient */
export const createPatient = (patientData) =>
  api.post('/patients', patientData);

/** Fetch all patients (for doctor's patient list) */
export const getAllPatients = () =>
  api.get('/patients');

/** Fetch a single patient by MongoDB ObjectId */
export const getPatientById = (patientId) =>
  api.get(`/patients/${patientId}`);

/** Update patient profile */
export const updatePatient = (patientId, updates) =>
  api.put(`/patients/${patientId}`, updates);

// ════════════════════════════════════════════════════════════
// DAILY HEALTH LOG ENDPOINTS
// ════════════════════════════════════════════════════════════

/**
 * Submit a new daily biometric log.
 * @param {Object} logData - { patientId, fastingGlucose, postMealGlucose,
 *                             bloodPressureSystolic, bloodPressureDiastolic,
 *                             logDate, notes }
 */
export const createHealthLog = (logData) =>
  api.post('/health-logs', logData);

/**
 * Fetch health logs for a patient, optionally filtered by date range.
 * @param {string} patientId
 * @param {Object} params - { startDate?, endDate?, limit? }
 */
export const getHealthLogs = (patientId, params = {}) =>
  api.get(`/health-logs/${patientId}`, { params });

/** Update a specific log entry (e.g., correct a typo) */
export const updateHealthLog = (logId, updates) =>
  api.put(`/health-logs/${logId}`, updates);

/** Delete a specific log entry */
export const deleteHealthLog = (logId) =>
  api.delete(`/health-logs/${logId}`);

// ════════════════════════════════════════════════════════════
// CLINICAL SCAN ENDPOINTS  (Phase 4 — Multer + ML bridge)
// ════════════════════════════════════════════════════════════

/**
 * Upload a fundus image for AI grading.
 * Uses FormData / multipart so the file is transmitted correctly.
 * The backend (Phase 4) will:
 *   1. Save the file via Multer
 *   2. Forward it to the Python ML service
 *   3. Store the DR grade in MongoDB
 *   4. Return the ClinicalScan document
 *
 * @param {FormData} formData - Must contain: file, patientId, scanDate, eye
 */
export const uploadFundusScan = (formData) =>
  api.post('/scans', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 60s — image analysis takes longer
  });

/** Fetch all scans for a patient */
export const getPatientScans = (patientId) =>
  api.get(`/scans/${patientId}`);

/** Fetch scans flagged for urgent clinical review */
export const getUrgentScans = () =>
  api.get('/scans/urgent');

/**
 * Clinician manually overrides the AI-predicted DR grade.
 * @param {string} scanId
 * @param {Object} gradeData - { drGrade: 0|1|2|3|4, clinicianNotes? }
 */
export const overrideScanGrade = (scanId, gradeData) =>
  api.put(`/scans/${scanId}/grade`, gradeData);

export default api;
