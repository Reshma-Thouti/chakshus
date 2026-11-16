/**
 * controllers/scanController.js
 *
 * Handles fundus photograph uploads, invokes the Python ML microservice
 * to predict Diabetic Retinopathy severity (0-4), and persists the
 * clinical scan diagnosis to MongoDB.
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
 * @access  Clinician
 */
exports.uploadAndAnalyzeScan = asyncHandler(async (req, res) => {
  // 1. Validate file existence
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No retinal image file provided. Please upload a fundus photograph.',
    });
  }

  const { patientId, scanDate, eye, uploadedByDoctorId } = req.body;

  // 2. Validate patient reference
  if (!patientId) {
    // Clean up uploaded file if validation fails
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: 'patientId is required to associate scan with a patient.',
    });
  }

  // Verify patient exists in DB (if patientId is valid ObjectId)
  if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
    const patientExists = await Patient.findById(patientId);
    if (!patientExists) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${patientId} not found.`,
      });
    }
  }

  // 3. Prepare payload for Python FastAPI ML microservice
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
  const fileBuffer = fs.readFileSync(req.file.path);

  // Use standard FormData with Blob (Node.js 18+)
  const formData = new FormData();
  const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
  formData.append('file', fileBlob, req.file.originalname);

  let mlResponse;
  try {
    // 4. Send image to Python ML microservice (POST /predict)
    const response = await axios.post(`${mlServiceUrl}/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 second timeout for model inference
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
      uploadedByDoctorId: uploadedByDoctorId || 'Doctor',
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
    uploadedByDoctorId: uploadedByDoctorId || 'Doctor',
  });

  const savedScan = await scanRecord.save();

  res.status(201).json({
    success: true,
    message: 'Fundus scan successfully analyzed and recorded.',
    scan: savedScan,
  });
});

/**
 * @desc    Get all scans for a specific patient
 * @route   GET /api/scans/:patientId
 * @access  Clinician
 */
exports.getScansByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const scans = await ClinicalScan.find({ patientId }).sort({ scanDate: -1 });

  res.status(200).json({
    success: true,
    count: scans.length,
    scans,
  });
});

/**
 * @desc    Get scans flagged for urgent clinical review (Grade >= 3 or low confidence)
 * @route   GET /api/scans/urgent
 * @access  Clinician
 */
exports.getUrgentScans = asyncHandler(async (req, res) => {
  const urgentScans = await ClinicalScan.find({ requiresUrgentReview: true })
    .populate('patientId', 'fullName diabetesType diabetesDurationYears')
    .sort({ scanDate: -1 });

  res.status(200).json({
    success: true,
    count: urgentScans.length,
    scans: urgentScans,
  });
});

/**
 * @desc    Clinician manually overrides AI predicted grade
 * @route   PUT /api/scans/:id/grade
 * @access  Clinician
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
