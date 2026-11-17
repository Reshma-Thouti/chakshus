/**
 * controllers/healthLogController.js
 *
 * Daily health log biometric tracking controller.
 * Multi-tenancy protected:
 *  - Doctors can only view logs of their allotted patients.
 *  - Patients can log their own glucose/BP telemetry and view their history.
 */

const DailyHealthLog = require('../models/DailyHealthLog');
const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/errorHandler');

/**
 * @desc    Submit daily health log
 * @route   POST /api/health-logs
 * @access  Private (Patient or Doctor)
 */
exports.createHealthLog = asyncHandler(async (req, res) => {
  const {
    patientId,
    logDate,
    fastingGlucose,
    postMealGlucose,
    randomGlucose,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    weightKg,
    heartRateBpm,
    notes,
    entrySource,
  } = req.body;

  if (!patientId) {
    return res.status(400).json({
      success: false,
      message: 'patientId is required for submitting a health log.',
    });
  }

  // Multi-tenancy check
  if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    if (req.user && req.user.role === 'patient') {
      const allowedProfileId = String(req.user.patientProfileId || req.user._id);
      if (allowedProfileId !== String(patientId) && String(req.user._id) !== String(patientId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only record health telemetry for your own profile.',
        });
      }
    }
  }

  // Normalize date to midnight UTC to prevent same-day duplicate entries
  const parsedDate = logDate ? new Date(logDate) : new Date();
  parsedDate.setUTCHours(0, 0, 0, 0);

  const log = await DailyHealthLog.create({
    patientId,
    logDate: parsedDate,
    fastingGlucose,
    postMealGlucose,
    randomGlucose,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    weightKg,
    heartRateBpm,
    notes,
    entrySource: entrySource || (req.user && req.user.role === 'patient' ? 'patient' : 'manual'),
  });

  res.status(201).json({
    success: true,
    message: 'Daily health log recorded successfully.',
    log,
  });
});

/**
 * @desc    Get health logs for a patient
 * @route   GET /api/health-logs/:patientId
 * @access  Private (Doctor or Patient)
 */
exports.getHealthLogsByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { limit = 30, startDate, endDate } = req.query;

  // Multi-tenancy check
  if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
    const patient = await Patient.findById(patientId);
    if (patient) {
      if (req.user && req.user.role === 'doctor') {
        const isOwner = String(patient.assignedDoctorId) === String(req.user._id);
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            message: 'Access forbidden: You cannot view health logs of another doctor\'s patient.',
          });
        }
      }
    }
  }

  const query = { patientId };

  if (startDate || endDate) {
    query.logDate = {};
    if (startDate) query.logDate.$gte = new Date(startDate);
    if (endDate) query.logDate.$lte = new Date(endDate);
  }

  const logs = await DailyHealthLog.find(query)
    .sort({ logDate: -1 })
    .limit(parseInt(limit, 10));

  res.status(200).json({
    success: true,
    count: logs.length,
    logs,
  });
});

/**
 * @desc    Update a specific health log entry
 * @route   PUT /api/health-logs/:id
 * @access  Private
 */
exports.updateHealthLog = asyncHandler(async (req, res) => {
  const log = await DailyHealthLog.findById(req.params.id);

  if (!log) {
    return res.status(404).json({
      success: false,
      message: `Health log entry with ID ${req.params.id} not found.`,
    });
  }

  // Multi-tenancy check: Verify authorization to modify this patient's records
  if (req.user) {
    if (req.user.role === 'doctor') {
      const patient = await Patient.findById(log.patientId);
      if (patient && String(patient.assignedDoctorId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not authorized to update another doctor's patient health records.",
        });
      }
    } else if (req.user.role === 'patient') {
      const patientProfileId = String(req.user.patientProfileId || req.user._id);
      if (patientProfileId !== String(log.patientId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only update your own health telemetry.',
        });
      }
    }
  }

  Object.assign(log, req.body);
  await log.save();

  res.status(200).json({
    success: true,
    message: 'Health log entry updated.',
    log,
  });
});

/**
 * @desc    Delete a health log entry
 * @route   DELETE /api/health-logs/:id
 * @access  Private
 */
exports.deleteHealthLog = asyncHandler(async (req, res) => {
  const log = await DailyHealthLog.findById(req.params.id);

  if (!log) {
    return res.status(404).json({
      success: false,
      message: `Health log entry with ID ${req.params.id} not found.`,
    });
  }

  // Multi-tenancy check: Verify authorization to delete this patient's records
  if (req.user) {
    if (req.user.role === 'doctor') {
      const patient = await Patient.findById(log.patientId);
      if (patient && String(patient.assignedDoctorId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not authorized to delete another doctor's patient health records.",
        });
      }
    } else if (req.user.role === 'patient') {
      const patientProfileId = String(req.user.patientProfileId || req.user._id);
      if (patientProfileId !== String(log.patientId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only delete your own health telemetry.',
        });
      }
    }
  }

  await DailyHealthLog.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Health log entry deleted.',
  });
});
