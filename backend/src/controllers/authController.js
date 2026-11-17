/**
 * controllers/authController.js
 *
 * User Authentication, Role Onboarding, and Doctor Allotment.
 */

const User = require('../models/User');
const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/errorHandler');
const { ADMIN_DETAILS, validateAdminDetails } = require('../config/adminConfig');

/**
 * @desc    Register a new user (Doctor or Patient)
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    specialization,
    hospitalOrClinic,
    assignedDoctorId,
    // Patient clinical baseline (if role === 'patient')
    dateOfBirth,
    gender,
    phone,
    diabetesType,
    diabetesDurationYears,
    baselineHbA1c,
    hasHypertension,
  } = req.body;

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email address already exists.',
    });
  }

  // 2. Doctor Registration
  if (role === 'doctor') {
    const doctor = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'doctor',
      specialization: specialization || 'Ophthalmologist / Retina Specialist',
      hospitalOrClinic: hospitalOrClinic || 'Tele-Oculomics Center',
    });

    const token = doctor.generateAuthToken();

    return res.status(201).json({
      success: true,
      message: 'Doctor account registered successfully.',
      token,
      user: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        specialization: doctor.specialization,
        hospitalOrClinic: doctor.hospitalOrClinic,
      },
    });
  }

  // 2b. Admin Registration Guard (Strictly checked against details in code)
  if (role === 'admin') {
    const adminCheck = validateAdminDetails(email, password, req.body.securityPin);
    if (!adminCheck.isValid) {
      return res.status(403).json({
        success: false,
        message: `Admin Registration Rejected: ${adminCheck.error}`,
      });
    }

    let adminUser = await User.findOne({ email: ADMIN_DETAILS.email });
    if (!adminUser) {
      adminUser = await User.create({
        name: name || ADMIN_DETAILS.name,
        email: ADMIN_DETAILS.email,
        password: ADMIN_DETAILS.password,
        role: 'admin',
      });
    } else {
      adminUser.name = name || adminUser.name;
      adminUser.password = ADMIN_DETAILS.password;
      await adminUser.save();
    }

    const token = adminUser.generateAuthToken();

    return res.status(201).json({
      success: true,
      message: 'Administrator details successfully matched code specification. Master account initialized.',
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  }

  // 3. Patient Registration
  if (!assignedDoctorId) {
    return res.status(400).json({
      success: false,
      message: 'Please select an assigned doctor for patient enrollment.',
    });
  }

  // Verify doctor exists
  const doctorExists = await User.findOne({ _id: assignedDoctorId, role: 'doctor' });
  if (!doctorExists) {
    return res.status(404).json({
      success: false,
      message: 'The selected doctor was not found in the system.',
    });
  }

  // Create User account for Patient
  const patientUser = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'patient',
    assignedDoctorId: doctorExists._id,
  });

  // Automatically create medical profile record in Patient collection
  const patientRecord = await Patient.create({
    fullName: name,
    dateOfBirth: dateOfBirth || new Date('1975-01-01'),
    gender: gender || 'Other',
    email: email.toLowerCase(),
    phone: phone || '',
    diabetesType: diabetesType || 'Type 2',
    diabetesDurationYears: diabetesDurationYears ? Number(diabetesDurationYears) : 5,
    baselineHbA1c: baselineHbA1c ? Number(baselineHbA1c) : 7.0,
    hasHypertension: Boolean(hasHypertension),
    assignedDoctorId: String(doctorExists._id),
  });

  // Link profile to user
  patientUser.patientProfileId = patientRecord._id;
  await patientUser.save();

  const token = patientUser.generateAuthToken();

  res.status(201).json({
    success: true,
    message: 'Patient registered and successfully allotted to doctor.',
    token,
    user: {
      id: patientUser._id,
      name: patientUser.name,
      email: patientUser.email,
      role: patientUser.role,
      assignedDoctorId: doctorExists._id,
      assignedDoctorName: doctorExists.name,
      patientProfileId: patientRecord._id,
    },
  });
});

/**
 * @desc    Login user (Doctor or Patient)
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password, expectedRole, securityPin } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.',
    });
  }

  // ── Administrator Authentication Guard (Matched against details in code) ──
  if (expectedRole === 'admin' || (email && email.toLowerCase().trim() === ADMIN_DETAILS.email)) {
    const adminCheck = validateAdminDetails(email, password, securityPin);
    if (!adminCheck.isValid) {
      return res.status(401).json({
        success: false,
        message: `Administrator Authentication Failed: ${adminCheck.error}`,
      });
    }

    // Ensure Admin account exists in database for JWT and relational models
    let adminUser = await User.findOne({ email: ADMIN_DETAILS.email }).select('+password');
    if (!adminUser) {
      adminUser = await User.create({
        name: ADMIN_DETAILS.name,
        email: ADMIN_DETAILS.email,
        password: ADMIN_DETAILS.password,
        role: 'admin',
      });
    } else {
      const isMatch = await adminUser.matchPassword(password);
      if (!isMatch) {
        adminUser.password = ADMIN_DETAILS.password;
        await adminUser.save();
      }
    }

    const token = adminUser.generateAuthToken();

    return res.status(200).json({
      success: true,
      message: `Administrator verified successfully against code details. Welcome, ${adminUser.name}!`,
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'admin',
      },
    });
  }

  // Find user and explicitly select password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Account not found. Registration must be completed before logging in.',
    });
  }

  // Verify role if specified (e.g. preventing a patient from logging in via doctor portal)
  if (expectedRole && user.role !== expectedRole) {
    return res.status(403).json({
      success: false,
      message: `Access denied. This portal is strictly for ${expectedRole} accounts.`,
    });
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Incorrect password. Please verify your credentials and try again.',
    });
  }

  const token = user.generateAuthToken();

  // If patient, fetch assigned doctor details and linked profile
  let assignedDoctorName = null;
  if (user.role === 'patient' && user.assignedDoctorId) {
    const doc = await User.findById(user.assignedDoctorId);
    if (doc) assignedDoctorName = doc.name;
  }

  res.status(200).json({
    success: true,
    message: `Welcome back, ${user.name}!`,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      specialization: user.specialization,
      hospitalOrClinic: user.hospitalOrClinic,
      assignedDoctorId: user.assignedDoctorId,
      assignedDoctorName,
      patientProfileId: user.patientProfileId,
    },
  });
});

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  let assignedDoctorName = null;
  if (user.role === 'patient' && user.assignedDoctorId) {
    const doc = await User.findById(user.assignedDoctorId);
    if (doc) assignedDoctorName = doc.name;
  }

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      specialization: user.specialization,
      hospitalOrClinic: user.hospitalOrClinic,
      assignedDoctorId: user.assignedDoctorId,
      assignedDoctorName,
      patientProfileId: user.patientProfileId,
    },
  });
});

/**
 * @desc    Get list of all doctors for patient selection during registration
 * @route   GET /api/auth/doctors
 * @access  Public
 */
exports.getDoctorsList = asyncHandler(async (req, res) => {
  const doctors = await User.find({ role: 'doctor' })
    .select('_id name specialization hospitalOrClinic')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: doctors.length,
    doctors,
  });
});

/**
 * @desc    Get configured admin public details
 * @route   GET /api/auth/admin-info
 * @access  Public
 */
exports.getAdminPublicInfo = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    adminEmail: ADMIN_DETAILS.email,
    adminName: ADMIN_DETAILS.name,
    hasConfiguredPin: Boolean(ADMIN_DETAILS.securityPin),
  });
});
