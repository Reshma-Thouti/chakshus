/**
 * routes/scanRoutes.js
 *
 * Clinical Scan Routes:
 *  - POST   /api/scans            -> Upload image & run AI analysis (Doctor only)
 *  - GET    /api/scans/urgent     -> Fetch all scans flagged for urgent review (Doctor only)
 *  - GET    /api/scans/:patientId -> List scans for a patient (Doctor & Patient)
 *  - PUT    /api/scans/:id/share  -> Share scan report to patient portal (Doctor only)
 *  - PUT    /api/scans/:id/grade  -> Clinician override of AI grade (Doctor only)
 */

const express = require('express');
const router = express.Router();
const uploadFundus = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  uploadAndAnalyzeScan,
  getScansByPatient,
  getUrgentScans,
  shareScanWithPatient,
  overrideScanGrade,
} = require('../controllers/scanController');

// All scan routes require authentication
router.use(protect);

// Urgent scans route must precede /:patientId to avoid route collision
router.get('/urgent', authorize('doctor'), getUrgentScans);

// Upload and predict endpoint using Multer for single file with field name 'file'
router.post('/', authorize('doctor'), uploadFundus.single('file'), uploadAndAnalyzeScan);

// Scans for a specific patient (Doctor views all, Patient views doctor-shared reports)
router.get('/:patientId', getScansByPatient);

// Share scan report with patient portal
router.put('/:id/share', authorize('doctor'), shareScanWithPatient);

// Clinician grade override
router.put('/:id/grade', authorize('doctor'), overrideScanGrade);

module.exports = router;
