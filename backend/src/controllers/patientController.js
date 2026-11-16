/**
 * controllers/patientController.js
 *
 * Patient management controllers: registration, profile retrieval,
 * updates, and patient list queries for clinicians.
 */

const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/errorHandler');

/**
 * @desc    Register a new patient
 * @route   POST /api/patients
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
    assignedDoctorId,
  } = req.body;

  const patient = await Patient.create({
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
    assignedDoctorId,
  });

  res.status(201).json({
    success: true,
    message: 'Patient registered successfully.',
    patient,
  });
});

/**
 * @desc    Get all active patients
 * @route   GET /api/patients
 */
exports.getPatients = asyncHandler(async (req, res) => {
  const { doctorId } = req.query;
  const filter = { isActive: true };
  if (doctorId) filter.assignedDoctorId = doctorId;

  const patients = await Patient.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: patients.length,
    patients,
  });
});

/**
 * @desc    Get patient profile by ID
 * @route   GET /api/patients/:id
 */
exports.getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: `Patient not found with ID ${req.params.id}`,
    });
  }

  res.status(200).json({
    success: true,
    patient,
  });
});

/**
 * @desc    Update patient information
 * @route   PUT /api/patients/:id
 */
exports.updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: `Patient not found with ID ${req.params.id}`,
    });
  }

  res.status(200).json({
    success: true,
    patient,
  });
});
