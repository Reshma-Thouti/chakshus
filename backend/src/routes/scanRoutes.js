/**
 * routes/scanRoutes.js
 *
 * Clinical Scan Routes:
 *  - POST   /api/scans            -> Upload image & run AI analysis
 *  - GET    /api/scans/urgent     -> Fetch all scans flagged for urgent review
 *  - GET    /api/scans/:patientId -> List scans for a patient
 *  - PUT    /api/scans/:id/grade  -> Clinician override of AI grade
 */

const express = require('express');
const router = express.Router();
const uploadFundus = require('../middleware/uploadMiddleware');
const {
  uploadAndAnalyzeScan,
  getScansByPatient,
  getUrgentScans,
  overrideScanGrade,
} = require('../controllers/scanController');

// Urgent scans route must precede /:patientId to avoid route collision
router.get('/urgent', getUrgentScans);

// Upload and predict endpoint using Multer for single file with field name 'file'
router.post('/', uploadFundus.single('file'), uploadAndAnalyzeScan);

// Scans for a specific patient
router.get('/:patientId', getScansByPatient);

// Clinician grade override
router.put('/:id/grade', overrideScanGrade);

module.exports = router;
