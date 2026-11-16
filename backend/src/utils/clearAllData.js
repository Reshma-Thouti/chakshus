/**
 * utils/clearAllData.js
 *
 * Completely wipes all historical data, portal accounts, patients, scans, and logs
 * from the database, giving a clean 100% fresh slate.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const ClinicalScan = require('../models/ClinicalScan');
const DailyHealthLog = require('../models/DailyHealthLog');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const clearAll = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/diabetic_vision_db';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('Connected to MongoDB. Purging all collections...');

    const userResult = await User.deleteMany({});
    const patientResult = await Patient.deleteMany({});
    const scanResult = await ClinicalScan.deleteMany({});
    const logResult = await DailyHealthLog.deleteMany({});

    console.log(`✓ Deleted ${userResult.deletedCount} User accounts.`);
    console.log(`✓ Deleted ${patientResult.deletedCount} Patient records.`);
    console.log(`✓ Deleted ${scanResult.deletedCount} Clinical Scans.`);
    console.log(`✓ Deleted ${logResult.deletedCount} Daily Health Logs.`);
    console.log('\n✅ Database is now 100% EMPTY and clean. No portals or accounts exist.');
    console.log('   Users must register a new account before login will work.\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error clearing database:', err.message);
  }
};

clearAll();
