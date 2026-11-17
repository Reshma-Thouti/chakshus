/**
 * routes/adminRoutes.js
 *
 * Administrator Master API Routes for चक्षुस् (Chakshus).
 * Guarded strictly by JWT authentication and 'admin' role authorization.
 */

const express = require('express');
const router = express.Router();
const {
  getAdminOverview,
  getAdminDoctors,
  getAdminPatients,
  getAdminScans,
  reassignPatientDoctor,
  deletePatient,
  getRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require valid JWT and role: 'admin'
router.use(protect);
router.use(authorize('admin'));

// System overview
router.get('/overview', getAdminOverview);

// Registration requests governance
router.get('/requests', getRegistrationRequests);
router.put('/requests/:id/approve', approveRegistrationRequest);
router.put('/requests/:id/reject', rejectRegistrationRequest);

// Doctor directory & workload
router.get('/doctors', getAdminDoctors);

// Master patient registry
router.get('/patients', getAdminPatients);
router.put('/patients/:id/reassign', reassignPatientDoctor);
router.delete('/patients/:id', deletePatient);

// Master scans repository
router.get('/scans', getAdminScans);

module.exports = router;
