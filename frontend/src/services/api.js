/**
 * services/api.js
 *
 * Centralised Axios API client for all backend communication with JWT auth support.
 */

import axios from 'axios';

// ── Axios Instance ───────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request Interceptor (JWT Token Injection) ────────────────
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('chakshus_token') || localStorage.getItem('diavision_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // If Vite proxy returns 500 or ECONNREFUSED when backend is down
    if (
      error.response?.status === 500 &&
      (!error.response.data ||
        typeof error.response.data === 'string' ||
        !error.response.data.message)
    ) {
      message =
        'Backend server (Port 5000) is unreachable. Please ensure the backend is running (run start-system.bat or npm run dev in backend).';
    } else if (error.code === 'ERR_NETWORK') {
      message =
        'Network error: Unable to reach the backend API server on port 5000.';
    }

    return Promise.reject(new Error(message));
  }
);

// ════════════════════════════════════════════════════════════
// AUTHENTICATION & MULTI-TENANCY ENDPOINTS
// ════════════════════════════════════════════════════════════

/** Register user (Doctor or Patient) */
export const registerUser = (userData) =>
  api.post('/auth/register', userData);

/** Login user */
export const loginUser = (credentials) =>
  api.post('/auth/login', credentials);

/** Fetch current user profile */
export const getAuthMe = () =>
  api.get('/auth/me');

/** Fetch list of registered doctors for patient onboarding */
export const getDoctorsList = () =>
  api.get('/auth/doctors');

// ════════════════════════════════════════════════════════════
// PATIENT ENDPOINTS
// ════════════════════════════════════════════════════════════

/** Enroll a new patient (Doctor adds to their allotted roster) */
export const createPatient = (patientData) =>
  api.post('/patients', patientData);

/** Fetch all patients allotted to the logged-in doctor */
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

/** Submit daily biometric log */
export const createHealthLog = (logData) =>
  api.post('/health-logs', logData);

/** Fetch health logs for a patient */
export const getHealthLogs = (patientId, params = {}) =>
  api.get(`/health-logs/${patientId}`, { params });

/** Update a specific log entry */
export const updateHealthLog = (logId, updates) =>
  api.put(`/health-logs/${logId}`, updates);

/** Delete a specific log entry */
export const deleteHealthLog = (logId) =>
  api.delete(`/health-logs/${logId}`);

// ════════════════════════════════════════════════════════════
// CLINICAL SCAN & REPORT SHARING ENDPOINTS
// ════════════════════════════════════════════════════════════

/**
 * Upload a fundus image for AI grading.
 * @param {FormData} formData - Must contain: file, patientId, scanDate, eye
 */
export const uploadFundusScan = (formData) =>
  api.post('/scans', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

/**
 * Fetch all scans for a patient.
 * If called by patient: returns only reports shared by doctor.
 * If called by doctor: returns all scans for this allotted patient.
 */
export const getPatientScans = (patientId) =>
  api.get(`/scans/${patientId}`);

/** Transmit scan report to patient portal */
export const shareScanWithPatient = (scanId, payload) =>
  api.put(`/scans/${scanId}/share`, payload);

/** Fetch scans flagged for urgent clinical review */
export const getUrgentScans = () =>
  api.get('/scans/urgent');

/** Clinician manually overrides the AI-predicted DR grade */
export const overrideScanGrade = (scanId, gradeData) =>
  api.put(`/scans/${scanId}/grade`, gradeData);

export default api;
