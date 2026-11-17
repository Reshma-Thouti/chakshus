/**
 * routes/authRoutes.js
 *
 * User Authentication & Onboarding Routes.
 */

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getDoctorsList,
  getAdminPublicInfo,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/doctors', getDoctorsList);
router.get('/admin-info', getAdminPublicInfo);
router.get('/me', protect, getMe);

module.exports = router;
