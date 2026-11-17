/**
 * controllers/adminController.js
 *
 * Enterprise Master Administrative Controller for चक्षुस् (Chakshus).
 * Provides cross-system access for administrators:
 *  - System telemetry (Total Patients, Doctors, Scans, High-Risk Alerts)
 *  - Unified Doctor Roster & Allotment inspection
 *  - Master Patient Registry across all clinicians
 *  - Retinal AI Diagnostic Archive across the entire platform
 *  - Dynamic Patient-to-Doctor re-allotment
 */

const User = require('../models/User');
const Patient = require('../models/Patient');
const ClinicalScan = require('../models/ClinicalScan');
const DailyHealthLog = require('../models/DailyHealthLog');
const asyncHandler = require('../middleware/errorHandler');

/**
 * @desc    Get system-wide administrative statistics & activity telemetry
 * @route   GET /api/admin/overview
 * @access  Private (Admin)
 */
exports.getAdminOverview = asyncHandler(async (req, res) => {
  const [
    totalPatients,
    totalDoctors,
    pendingRequestsCount,
    totalScans,
    totalLogs,
    urgentScansCount,
    grade0Count,
    grade1Count,
    grade2Count,
    grade3Count,
    grade4Count,
    recentScans,
    recentPatients,
    recentDoctors,
  ] = await Promise.all([
    Patient.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'doctor', isApproved: true }),
    User.countDocuments({ approvalStatus: 'pending', role: { $in: ['doctor', 'patient'] } }),
    ClinicalScan.countDocuments({}),
    DailyHealthLog.countDocuments({}),
    ClinicalScan.countDocuments({
      $or: [{ requiresUrgentReview: true }, { drGrade: { $gte: 3 } }],
    }),
    ClinicalScan.countDocuments({ drGrade: 0 }),
    ClinicalScan.countDocuments({ drGrade: 1 }),
    ClinicalScan.countDocuments({ drGrade: 2 }),
    ClinicalScan.countDocuments({ drGrade: 3 }),
    ClinicalScan.countDocuments({ drGrade: 4 }),
    ClinicalScan.find({}).sort({ createdAt: -1 }).limit(6).lean(),
    Patient.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).lean(),
    User.find({ role: 'doctor', isApproved: true }).select('-password').sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  // Enrich recent scans with patient details
  const patientIds = recentScans.map((s) => s.patientId).filter(Boolean);
  const patientsMap = {};
  if (patientIds.length > 0) {
    const pts = await Patient.find({ _id: { $in: patientIds } }).select('_id fullName email');
    pts.forEach((p) => {
      patientsMap[String(p._id)] = p;
    });
  }

  const enrichedRecentScans = recentScans.map((scan) => ({
    ...scan,
    patientName: patientsMap[String(scan.patientId)]?.fullName || 'Anonymous Patient',
  }));

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalPatients,
        totalDoctors,
        pendingRequestsCount,
        totalScans,
        totalLogs,
        urgentScansCount,
      },
      drDistribution: {
        grade0: grade0Count,
        grade1: grade1Count,
        grade2: grade2Count,
        grade3: grade3Count,
        grade4: grade4Count,
      },
      recentScans: enrichedRecentScans,
      recentPatients,
      recentDoctors,
    },
  });
});

/**
 * @desc    Get all doctors with their assigned patient counts and workload
 * @route   GET /api/admin/doctors
 * @access  Private (Admin)
 */
exports.getAdminDoctors = asyncHandler(async (req, res) => {
  const doctors = await User.find({ role: 'doctor', isApproved: true })
    .select('-password')
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate assigned patients count per doctor
  const doctorIds = doctors.map((d) => String(d._id));
  const patientCounts = await Patient.aggregate([
    { $match: { assignedDoctorId: { $in: doctorIds }, isActive: true } },
    { $group: { _id: '$assignedDoctorId', count: { $sum: 1 } } },
  ]);

  const patientCountMap = {};
  patientCounts.forEach((pc) => {
    patientCountMap[String(pc._id)] = pc.count;
  });

  const doctorsWithWorkload = doctors.map((doc) => ({
    ...doc,
    patientCount: patientCountMap[String(doc._id)] || 0,
  }));

  res.status(200).json({
    success: true,
    count: doctorsWithWorkload.length,
    doctors: doctorsWithWorkload,
  });
});

/**
 * @desc    Get master patient registry across all doctors with enriched clinician details
 * @route   GET /api/admin/patients
 * @access  Private (Admin)
 */
exports.getAdminPatients = asyncHandler(async (req, res) => {
  const patients = await Patient.find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  // Load all doctors into map
  const doctors = await User.find({ role: 'doctor' })
    .select('_id name email specialization hospitalOrClinic')
    .lean();

  const doctorMap = {};
  doctors.forEach((d) => {
    doctorMap[String(d._id)] = d;
  });

  // Aggregate scans count per patient
  const scanCounts = await ClinicalScan.aggregate([
    { $group: { _id: '$patientId', count: { $sum: 1 } } },
  ]);

  const scanCountMap = {};
  scanCounts.forEach((sc) => {
    scanCountMap[String(sc._id)] = sc.count;
  });

  const enrichedPatients = patients.map((pt) => {
    const doc = doctorMap[String(pt.assignedDoctorId)];
    return {
      ...pt,
      assignedDoctorName: doc ? doc.name : 'Unassigned / Independent',
      assignedDoctorSpecialization: doc?.specialization || 'N/A',
      assignedDoctorClinic: doc?.hospitalOrClinic || 'N/A',
      scanCount: scanCountMap[String(pt._id)] || 0,
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedPatients.length,
    patients: enrichedPatients,
  });
});

/**
 * @desc    Get all clinical retinal scans across all patients and doctors
 * @route   GET /api/admin/scans
 * @access  Private (Admin)
 */
exports.getAdminScans = asyncHandler(async (req, res) => {
  const scans = await ClinicalScan.find({})
    .sort({ scanDate: -1, createdAt: -1 })
    .lean();

  // Fetch unique patient and doctor IDs
  const patientIds = [...new Set(scans.map((s) => s.patientId).filter(Boolean))];
  const doctorIds = [...new Set(scans.map((s) => s.uploadedByDoctorId).filter(Boolean))];

  const [patients, doctors] = await Promise.all([
    Patient.find({ _id: { $in: patientIds } }).select('_id fullName email assignedDoctorId').lean(),
    User.find({ _id: { $in: doctorIds } }).select('_id name hospitalOrClinic').lean(),
  ]);

  const patientMap = {};
  patients.forEach((p) => {
    patientMap[String(p._id)] = p;
  });

  const doctorMap = {};
  doctors.forEach((d) => {
    doctorMap[String(d._id)] = d;
  });

  const enrichedScans = scans.map((s) => {
    const pt = patientMap[String(s.patientId)];
    const doc = doctorMap[String(s.uploadedByDoctorId)] || (pt ? doctorMap[String(pt.assignedDoctorId)] : null);
    return {
      ...s,
      patientName: pt?.fullName || 'Unknown Patient',
      doctorName: doc?.name || (s.uploadedByDoctorId ? `Doctor #${s.uploadedByDoctorId.slice(-4)}` : 'System Clinical'),
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedScans.length,
    scans: enrichedScans,
  });
});

/**
 * @desc    Reassign a patient to a different doctor
 * @route   PUT /api/admin/patients/:id/reassign
 * @access  Private (Admin)
 */
exports.reassignPatientDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newDoctorId } = req.body;

  if (!newDoctorId) {
    return res.status(400).json({
      success: false,
      message: 'newDoctorId is required to reassign patient.',
    });
  }

  // 1. Verify target doctor exists
  const targetDoctor = await User.findOne({ _id: newDoctorId, role: 'doctor' });
  if (!targetDoctor) {
    return res.status(404).json({
      success: false,
      message: 'Target doctor not found in the system.',
    });
  }

  // 2. Find and update patient profile
  const patient = await Patient.findById(id);
  if (!patient) {
    return res.status(404).json({
      success: false,
      message: `Patient not found with ID ${id}`,
    });
  }

  const previousDoctorId = patient.assignedDoctorId;
  patient.assignedDoctorId = String(targetDoctor._id);
  await patient.save();

  // 3. Update patient's User account if they have one registered
  await User.updateOne(
    { $or: [{ patientProfileId: patient._id }, { email: patient.email }] },
    { assignedDoctorId: targetDoctor._id }
  );

  res.status(200).json({
    success: true,
    message: `Patient ${patient.fullName} successfully reassigned to Dr. ${targetDoctor.name}.`,
    patient,
    previousDoctorId,
    newDoctor: {
      id: targetDoctor._id,
      name: targetDoctor.name,
      hospitalOrClinic: targetDoctor.hospitalOrClinic,
    },
  });
});

/**
 * @desc    Delete a patient (Admin privilege)
 * @route   DELETE /api/admin/patients/:id
 * @access  Private (Admin)
 */
exports.deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const patient = await Patient.findById(id);
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }

  // Soft delete
  patient.isActive = false;
  await patient.save();

  res.status(200).json({
    success: true,
    message: `Patient record for ${patient.fullName} has been archived.`,
  });
});

/**
 * @desc    Get all registration access requests (pending, approved, rejected)
 * @route   GET /api/admin/requests
 * @access  Private (Admin)
 */
exports.getRegistrationRequests = asyncHandler(async (req, res) => {
  const requests = await User.find({ role: { $in: ['doctor', 'patient'] } })
    .select('-password')
    .populate('patientProfileId')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: requests.length,
    requests,
  });
});

/**
 * @desc    Approve a pending doctor or patient registration request
 * @route   PUT /api/admin/requests/:id/approve
 * @access  Private (Admin)
 */
exports.approveRegistrationRequest = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User request not found' });
  }

  user.isApproved = true;
  user.approvalStatus = 'approved';
  user.approvedAt = new Date();
  await user.save();

  // If patient, activate their medical profile record
  if (user.patientProfileId) {
    await Patient.findByIdAndUpdate(user.patientProfileId, { isActive: true });
  }

  res.status(200).json({
    success: true,
    message: `Account request for ${user.name} (${user.role}) has been approved! They can now log in.`,
    user,
  });
});

/**
 * @desc    Reject a pending registration request (permanently deletes user data from DB)
 * @route   PUT /api/admin/requests/:id/reject
 * @access  Private (Admin)
 */
exports.rejectRegistrationRequest = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User request not found' });
  }

  const userName = user.name;
  const userEmail = user.email;

  // If patient, remove linked patient medical profile
  if (user.patientProfileId) {
    await Patient.findByIdAndDelete(user.patientProfileId);
  }

  // Permanently delete the user account from the database
  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: `Registration request for ${userName} (${userEmail}) has been rejected and permanently deleted from the database.`,
  });
});

/**
 * @desc    Delete/Remove a registration request permanently
 * @route   DELETE /api/admin/requests/:id
 * @access  Private (Admin)
 */
exports.deleteRegistrationRequest = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User request not found' });
  }

  // If patient, remove linked patient profile
  if (user.patientProfileId) {
    await Patient.findByIdAndDelete(user.patientProfileId);
  }

  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: `Registration request for ${user.name} (${user.email}) permanently removed.`,
  });
});
