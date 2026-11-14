/**
 * routes/patientRoutes.js — STUB
 *
 * Full CRUD routes for Patient management.
 * Will be implemented in Phase 2 when the UI is scaffolded.
 *
 * Planned endpoints:
 *   POST   /api/patients          → Register a new patient
 *   GET    /api/patients          → List all patients (doctor view)
 *   GET    /api/patients/:id      → Get a single patient profile
 *   PUT    /api/patients/:id      → Update patient details
 *   DELETE /api/patients/:id      → Soft-delete (set isActive: false)
 */

const express = require('express');
const router = express.Router();

// TODO: Import patientController in Phase 2
// const patientController = require('../controllers/patientController');

router.get('/', (req, res) => {
  res.status(501).json({ message: 'Patient routes — coming in Phase 2' });
});

module.exports = router;
