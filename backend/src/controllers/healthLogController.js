/**
 * controllers/healthLogController.js
 *
 * Daily health log biometric tracking controller.
 */

const DailyHealthLog = require('../models/DailyHealthLog');
const asyncHandler = require('../middleware/errorHandler');

/**
 * @desc    Submit daily health log
 * @route   POST /api/health-logs
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
    entrySource: entrySource || 'manual',
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
 */
exports.getHealthLogsByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { limit = 30, startDate, endDate } = req.query;

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
 */
exports.updateHealthLog = asyncHandler(async (req, res) => {
  const log = await DailyHealthLog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!log) {
    return res.status(404).json({
      success: false,
      message: `Health log entry not found with ID ${req.params.id}`,
    });
  }

  res.status(200).json({
    success: true,
    log,
  });
});

/**
 * @desc    Delete a health log entry
 * @route   DELETE /api/health-logs/:id
 */
exports.deleteHealthLog = asyncHandler(async (req, res) => {
  const log = await DailyHealthLog.findByIdAndDelete(req.params.id);

  if (!log) {
    return res.status(404).json({
      success: false,
      message: `Health log entry not found with ID ${req.params.id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Health log entry removed.',
  });
});
