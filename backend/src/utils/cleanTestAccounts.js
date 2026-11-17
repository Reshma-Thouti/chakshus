const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const ClinicalScan = require('../models/ClinicalScan');
const DailyHealthLog = require('../models/DailyHealthLog');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function purge() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Atlas.');

  // Delete all non-admin users (all doctors and patients)
  const delUsers = await User.deleteMany({ role: { $ne: 'admin' } });
  const delPatients = await Patient.deleteMany({});
  const delScans = await ClinicalScan.deleteMany({});
  const delLogs = await DailyHealthLog.deleteMany({});

  console.log(`✓ Deleted ${delUsers.deletedCount} test Doctor and Patient accounts.`);
  console.log(`✓ Deleted ${delPatients.deletedCount} test Patient records.`);
  console.log(`✓ Deleted ${delScans.deletedCount} test Clinical Scans.`);
  console.log(`✓ Deleted ${delLogs.deletedCount} test Health Logs.`);

  const remainingDoctors = await User.countDocuments({ role: 'doctor' });
  const remainingPatients = await Patient.countDocuments({});
  console.log('Current doctors in DB:', remainingDoctors);
  console.log('Current patients in DB:', remainingPatients);

  await mongoose.disconnect();
}

purge().catch(console.error);
