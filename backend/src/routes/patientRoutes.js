/**
 * routes/patientRoutes.js
 *
 * Patient management API routes.
 */

const express = require('express');
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
} = require('../controllers/patientController');

router.route('/')
  .get(getPatients)
  .post(createPatient);

router.route('/:id')
  .get(getPatientById)
  .put(updatePatient);

module.exports = router;
