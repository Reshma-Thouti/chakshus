/**
 * routes/patientRoutes.js
 *
 * Patient management API routes with strict auth protection.
 */

const express = require('express');
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(authorize('doctor', 'admin'), getPatients)
  .post(authorize('doctor', 'admin'), createPatient);

router.route('/:id')
  .get(getPatientById)
  .put(authorize('doctor', 'admin'), updatePatient);

module.exports = router;
