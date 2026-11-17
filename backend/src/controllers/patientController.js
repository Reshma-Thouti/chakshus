/**
 * controllers/patientController.js
 *
 * Patient management controllers with strict Doctor-Patient allotment security:
 *  - Doctor A can only view, add, and manage patients allotted to Doctor A.
 *  - Doctor B is strictly forbidden from accessing Doctor A's patient roster.
 *  - Patients can only view their own profile.
 */

const User = require('../models/User');
const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/errorHandler');

/**
 * @desc    Enroll a new patient (Doctor adds patient directly to their roster)
 * @route   POST /api/patients
 * @access  Private (Doctor)
 */
exports.createPatient = asyncHandler(async (req, res) => {
  const {
    fullName,
    dateOfBirth,
    gender,
    email,
    phone,
    diabetesType,
    diabetesDurationYears,
    baselineHbA1c,
    hasHypertension,
    hasKidneyDisease,
    createPortalAccount,
    portalPassword,
  } = req.body;

  // Determine assigned doctor ID (from authenticated user or explicitly passed in dev)
  const doctorId = req.user ? String(req.user._id) : (req.body.assignedDoctorId || 'doctor-default');

  const patient = await Patient.create({
    fullName,
    dateOfBirth: dateOfBirth || new Date('1975-01-01'),
    gender: gender || 'Other',
    email: email ? email.toLowerCase() : undefined,
    phone,
    diabetesType: diabetesType || 'Type 2',
    diabetesDurationYears: diabetesDurationYears ? Number(diabetesDurationYears) : 5,
    baselineHbA1c: baselineHbA1c ? Number(baselineHbA1c) : 7.0,
    hasHypertension: Boolean(hasHypertension),
    hasKidneyDisease: Boolean(hasKidneyDisease),
    assignedDoctorId: doctorId,
    isActive: true,
  });

  // Automatically create Patient Portal Login if email is provided
  let portalCreated = false;
  let activePassword = '';
  if (email && (createPortalAccount || portalPassword)) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (!existingUser) {
      activePassword = portalPassword && portalPassword.trim() ? portalPassword.trim() : 'Patient@123';
      const patientUser = await User.create({
        name: fullName,
        email: email.toLowerCase(),
        password: activePassword,
        role: 'patient',
        assignedDoctorId: doctorId,
        patientProfileId: patient._id,
        isApproved: true,
        approvalStatus: 'approved',
        requestNote: 'Directly enrolled and provisioned by attending clinician',
      });
      portalCreated = true;
    }
  }

  res.status(201).json({
    success: true,
    message: portalCreated
      ? `Patient successfully enrolled and Patient Portal login provisioned (${email}).`
      : 'Patient successfully enrolled and added to your roster.',
    patient,
    portalCreated,
    portalEmail: email ? email.toLowerCase() : null,
    portalPassword: portalCreated ? activePassword : null,
  });
});

/**
 * @desc    Get all active patients allotted to the requesting doctor
 * @route   GET /api/patients
 * @access  Private (Doctor)
 */
exports.getPatients = asyncHandler(async (req, res) => {
  const filter = { isActive: true };

  // Strict Data Isolation:
  // If authenticated as a doctor, return ONLY patients allotted to this doctor.
  if (req.user && req.user.role === 'doctor') {
    filter.assignedDoctorId = String(req.user._id);
  } else if (req.query.doctorId) {
    filter.assignedDoctorId = req.query.doctorId;
  }

  const patients = await Patient.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: patients.length,
    patients,
  });
});

/**
 * @desc    Get patient profile by ID (with privacy guard)
 * @route   GET /api/patients/:id
 * @access  Private
 */
exports.getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: `Patient not found with ID ${req.params.id}`,
    });
  }

  // Multi-Tenancy Privacy Guard:
  // If requested by a doctor, verify this patient belongs to them
  if (req.user && req.user.role === 'doctor') {
    const isOwner = String(patient.assignedDoctorId) === String(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Security Alert: You are not authorized to view patients allotted to another clinician.',
      });
    }
  }

  // If requested by a patient, verify they are viewing their own record
  if (req.user && req.user.role === 'patient') {
    const isSelf = String(patient._id) === String(req.user.patientProfileId);
    if (!isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own medical record.',
      });
    }
  }

  res.status(200).json({
    success: true,
    patient,
  });
});

/**
 * @desc    Update patient information
 * @route   PUT /api/patients/:id
 * @access  Private (Assigned Doctor)
 */
exports.updatePatient = asyncHandler(async (req, res) => {
  const existingPatient = await Patient.findById(req.params.id);

  if (!existingPatient) {
    return res.status(404).json({
      success: false,
      message: `Patient not found with ID ${req.params.id}`,
    });
  }

  // Verify doctor ownership before allowing updates
  if (req.user && req.user.role === 'doctor') {
    if (String(existingPatient.assignedDoctorId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Security Alert: You cannot modify records of patients allotted to another doctor.',
      });
    }
  }

  const updatedPatient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    patient: updatedPatient,
  });
});
