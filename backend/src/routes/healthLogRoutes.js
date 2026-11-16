/**
 * routes/healthLogRoutes.js
 *
 * Daily Health Log biometric tracking routes.
 */

const express = require('express');
const router = express.Router();
const {
  createHealthLog,
  getHealthLogsByPatient,
  updateHealthLog,
  deleteHealthLog,
} = require('../controllers/healthLogController');

router.post('/', createHealthLog);
router.get('/:patientId', getHealthLogsByPatient);
router.route('/:id')
  .put(updateHealthLog)
  .delete(deleteHealthLog);

module.exports = router;
