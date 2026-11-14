/**
 * routes/scanRoutes.js — STUB
 *
 * Routes for fundus image upload and DR grading retrieval.
 * Will be implemented in Phase 4 (the Multer + ML bridge phase).
 *
 * Planned endpoints:
 *   POST   /api/scans            → Upload a fundus image (multipart/form-data)
 *                                   → Forwards to Python ML service
 *                                   → Saves DR grade to MongoDB
 *   GET    /api/scans/:patientId → List all scans for a patient
 *   GET    /api/scans/urgent     → List scans requiring urgent clinical review
 *   PUT    /api/scans/:id/grade  → Clinician manually overrides AI grade
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({ message: 'Scan routes — coming in Phase 4' });
});

module.exports = router;
