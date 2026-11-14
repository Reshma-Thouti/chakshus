/**
 * routes/healthLogRoutes.js — STUB
 *
 * Routes for submitting and querying daily health log entries.
 * Will be implemented in Phase 2.
 *
 * Planned endpoints:
 *   POST   /api/health-logs            → Submit a new daily log
 *   GET    /api/health-logs/:patientId → Get all logs for a patient
 *   GET    /api/health-logs/:patientId?startDate=&endDate= → Date-range query
 *   PUT    /api/health-logs/:id        → Correct an erroneous log
 *   DELETE /api/health-logs/:id        → Remove a log entry
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({ message: 'Health log routes — coming in Phase 2' });
});

module.exports = router;
