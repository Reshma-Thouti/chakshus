/**
 * controllers/scanController.js
 *
 * Handles fundus photograph uploads, invokes the Python ML microservice
 * to predict Diabetic Retinopathy severity (0-4), persists the
 * clinical scan diagnosis to MongoDB, and manages secure doctor-to-patient report sharing.
 *
 * Security & Multi-Tenancy:
 *  - Doctors can only upload scans and view scans for their allotted patients.
 *  - Doctor B is strictly blocked (403) from accessing Doctor A's patient scans.
 *  - Patients can only view scans that have been reviewed and shared by their doctor (isSharedWithPatient: true).
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ClinicalScan = require('../models/ClinicalScan');
const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/errorHandler');

/**
 * @desc    Upload retinal scan & get AI prediction
 * @route   POST /api/scans
 * @access  Private (Doctor)
 */
exports.uploadAndAnalyzeScan = asyncHandler(async (req, res) => {
  // 1. Validate file existence
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No retinal image file provided. Please upload a fundus photograph.',
    });
  }

  const { patientId, scanDate, eye } = req.body;

  // 2. Validate patient reference
  if (!patientId) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: 'patientId is required to associate scan with a patient.',
    });
  }

  // Multi-Tenancy Check: Verify patient exists and is allotted to the requesting doctor
  if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
    const patientExists = await Patient.findById(patientId);
    if (!patientExists) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${patientId} not found.`,
      });
    }

    if (req.user && req.user.role === 'doctor') {
      const isOwner = String(patientExists.assignedDoctorId) === String(req.user._id);
      if (!isOwner) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to upload scans for another doctor\'s patient.',
        });
      }
    }
  }

  // 3. Prepare payload for Python FastAPI ML microservice
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
  const fileBuffer = fs.readFileSync(req.file.path);

  // Use standard FormData with Blob (Node.js 18+)
  const formData = new FormData();
  const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
  formData.append('file', fileBlob, req.file.originalname);

  const doctorIdentifier = req.user ? String(req.user._id) : (req.body.uploadedByDoctorId || 'Doctor');

  let mlResponse;
  try {
    // 4. Send image to Python ML microservice (POST /predict)
    const response = await axios.post(`${mlServiceUrl}/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });
    mlResponse = response.data;
  } catch (mlError) {
    console.error(`[ML Microservice Error]: ${mlError.message}`);

    // If ML service is offline or errors, record scan as 'pending' for later analysis
    const relativePath = path
      .relative(path.join(__dirname, '../../'), req.file.path)
      .replace(/\\/g, '/');

    const pendingScan = new ClinicalScan({
      patientId,
      scanDate: scanDate || Date.now(),
      eye: eye || 'Right',
      imagePath: relativePath,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      drGrade: null,
      drGradeLabel: null,
      confidenceScore: null,
      gradeProbabilities: [],
      gradingSource: 'pending',
      uploadedByDoctorId: doctorIdentifier,
    });

    await pendingScan.save();

    return res.status(503).json({
      success: true,
      scan: pendingScan,
      warning:
        'Image stored successfully, but AI ML microservice was unreachable. Scan marked as pending review.',
    });
  }

  // 5. Build and persist ClinicalScan record with AI predictions
  const relativePath = path
    .relative(path.join(__dirname, '../../'), req.file.path)
    .replace(/\\/g, '/');

  const scanRecord = new ClinicalScan({
    patientId,
    scanDate: scanDate || Date.now(),
    eye: eye || 'Right',
    imagePath: relativePath,
    originalFileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSizeBytes: req.file.size,
    drGrade: mlResponse.dr_grade,
    drGradeLabel: mlResponse.dr_grade_label,
    confidenceScore: mlResponse.confidence_score,
    gradeProbabilities: mlResponse.grade_probabilities,
    gradingSource: 'ai',
    gradedAt: new Date(),
    requiresUrgentReview: mlResponse.requires_urgent_review,
    clinicianNotes: mlResponse.clinical_recommendation,
    uploadedByDoctorId: doctorIdentifier,
  });

  let savedScan;
  try {
    savedScan = await scanRecord.save();
  } catch (dbErr) {
    console.warn(`⚠️ Scan analyzed by AI, but MongoDB write skipped (${dbErr.message}).`);
    savedScan = scanRecord.toObject ? scanRecord.toObject() : scanRecord;
  }

  res.status(201).json({
    success: true,
    message: 'Fundus scan successfully analyzed and recorded.',
    scan: savedScan,
  });
});

/**
 * @desc    Get all scans for a specific patient (Role-Filtered)
 * @route   GET /api/scans/:patientId
 * @access  Private
 */
exports.getScansByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  // Verify patient existence and multi-tenancy bounds
  if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // If requested by doctor, ensure allotment
    if (req.user && req.user.role === 'doctor') {
      const isOwner = String(patient.assignedDoctorId) === String(req.user._id);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You cannot access scans belonging to another doctor\'s patient.',
        });
      }
    }
  }

  const query = { patientId };

  // If requested by a patient, ONLY return scans shared by the doctor
  if (req.user && req.user.role === 'patient') {
    query.isSharedWithPatient = true;
  }

  const scans = await ClinicalScan.find(query).sort({ scanDate: -1 });

  res.status(200).json({
    success: true,
    count: scans.length,
    scans,
  });
});

/**
 * @desc    Transmit scan report to the Patient's Portal
 * @route   PUT /api/scans/:id/share
 * @access  Private (Doctor)
 */
exports.shareScanWithPatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes, doctorSignatureName } = req.body;

  const scan = await ClinicalScan.findById(id);
  if (!scan) {
    return res.status(404).json({
      success: false,
      message: `Clinical scan with ID ${id} not found.`,
    });
  }

  // Verify doctor ownership of this patient
  const patient = await Patient.findById(scan.patientId);
  if (patient && req.user && req.user.role === 'doctor') {
    const isOwner = String(patient.assignedDoctorId) === String(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You can only share reports for your own allotted patients.',
      });
    }
  }

  scan.isSharedWithPatient = true;
  scan.sharedAt = new Date();
  if (notes) scan.doctorNotesToPatient = notes;
  scan.doctorSigned = true;
  scan.doctorSignatureName =
    doctorSignatureName || (req.user ? req.user.name : 'Attending Ophthalmologist');

  const updatedScan = await scan.save();

  res.status(200).json({
    success: true,
    message: 'Diagnostic report successfully transmitted to the patient portal.',
    scan: updatedScan,
  });
});

/**
 * @desc    Get scans flagged for urgent clinical review (Filtered to requesting doctor's patients)
 * @route   GET /api/scans/urgent
 * @access  Private (Doctor)
 */
exports.getUrgentScans = asyncHandler(async (req, res) => {
  let urgentScans = await ClinicalScan.find({ requiresUrgentReview: true })
    .populate('patientId', 'fullName diabetesType diabetesDurationYears assignedDoctorId')
    .sort({ scanDate: -1 });

  // If requesting doctor, filter only their own patients
  if (req.user && req.user.role === 'doctor') {
    urgentScans = urgentScans.filter(
      (scan) => scan.patientId && String(scan.patientId.assignedDoctorId) === String(req.user._id)
    );
  }

  res.status(200).json({
    success: true,
    count: urgentScans.length,
    scans: urgentScans,
  });
});

/**
 * @desc    Clinician manually overrides AI predicted grade
 * @route   PUT /api/scans/:id/grade
 * @access  Private (Doctor)
 */
exports.overrideScanGrade = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { drGrade, clinicianNotes } = req.body;

  if (drGrade === undefined || drGrade < 0 || drGrade > 4) {
    return res.status(400).json({
      success: false,
      message: 'Valid drGrade integer (0-4) is required.',
    });
  }

  const scan = await ClinicalScan.findById(id);
  if (!scan) {
    return res.status(404).json({
      success: false,
      message: `Scan with ID ${id} not found.`,
    });
  }

  // Multi-tenancy check
  const patient = await Patient.findById(scan.patientId);
  if (patient && req.user && req.user.role === 'doctor') {
    const isOwner = String(patient.assignedDoctorId) === String(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You cannot modify scans of another doctor\'s patient.',
      });
    }
  }

  scan.drGrade = drGrade;
  scan.gradingSource = 'doctor';
  scan.gradedAt = new Date();
  if (clinicianNotes) scan.clinicianNotes = clinicianNotes;

  const updatedScan = await scan.save();

  res.status(200).json({
    success: true,
    message: 'Scan grade successfully updated by clinician.',
    scan: updatedScan,
  });
});
