/**
 * utils/seedData.js
 *
 * Populates sample doctors and patients demonstrating multi-tenancy:
 *  - Dr. Ananya Sharma (owns Ramesh Kumar & Sunita Patel)
 *  - Dr. Vikram Malhotra (owns Rajesh Verma)
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const ClinicalScan = require('../models/ClinicalScan');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const seedDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/diabetic_vision_db';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('Connected to MongoDB for seeding...');

    // Clear existing
    await User.deleteMany({});
    await Patient.deleteMany({});

    // 1. Create Doctors
    const docA = await User.create({
      name: 'Dr. Ananya Sharma',
      email: 'dr.sharma@diavision.com',
      password: 'password123',
      role: 'doctor',
      specialization: 'Senior Retinal Specialist',
      hospitalOrClinic: 'Apex Eye & Tele-Oculomics Institute',
    });

    const docB = await User.create({
      name: 'Dr. Vikram Malhotra',
      email: 'dr.malhotra@diavision.com',
      password: 'password123',
      role: 'doctor',
      specialization: 'Vitreoretinal Surgeon',
      hospitalOrClinic: 'Metro Vision Super-Specialty',
    });

    // 2. Create Patients for Doctor A
    const pat1Record = await Patient.create({
      fullName: 'Ramesh Kumar',
      dateOfBirth: new Date('1968-04-12'),
      gender: 'Male',
      email: 'ramesh.kumar@example.com',
      phone: '+91 98765 43210',
      diabetesType: 'Type 2',
      diabetesDurationYears: 8,
      baselineHbA1c: 8.4,
      hasHypertension: true,
      hasKidneyDisease: false,
      assignedDoctorId: String(docA._id),
    });

    await User.create({
      name: 'Ramesh Kumar',
      email: 'ramesh.kumar@example.com',
      password: 'password123',
      role: 'patient',
      assignedDoctorId: docA._id,
      patientProfileId: pat1Record._id,
    });

    const pat2Record = await Patient.create({
      fullName: 'Sunita Patel',
      dateOfBirth: new Date('1976-08-23'),
      gender: 'Female',
      email: 'sunita.patel@example.com',
      phone: '+91 98111 22334',
      diabetesType: 'Type 2',
      diabetesDurationYears: 4,
      baselineHbA1c: 7.2,
      hasHypertension: false,
      hasKidneyDisease: false,
      assignedDoctorId: String(docA._id),
    });

    await User.create({
      name: 'Sunita Patel',
      email: 'sunita.patel@example.com',
      password: 'password123',
      role: 'patient',
      assignedDoctorId: docA._id,
      patientProfileId: pat2Record._id,
    });

    // 3. Create Patient for Doctor B
    const pat3Record = await Patient.create({
      fullName: 'Rajesh Verma',
      dateOfBirth: new Date('1960-11-05'),
      gender: 'Male',
      email: 'rajesh.verma@example.com',
      phone: '+91 99887 76655',
      diabetesType: 'Type 1',
      diabetesDurationYears: 15,
      baselineHbA1c: 9.1,
      hasHypertension: true,
      hasKidneyDisease: true,
      assignedDoctorId: String(docB._id),
    });

    await User.create({
      name: 'Rajesh Verma',
      email: 'rajesh.verma@example.com',
      password: 'password123',
      role: 'patient',
      assignedDoctorId: docB._id,
      patientProfileId: pat3Record._id,
    });

    console.log('✅ Seeding completed successfully!');
    console.log('   Doctor A: dr.sharma@diavision.com (owns Ramesh & Sunita)');
    console.log('   Doctor B: dr.malhotra@diavision.com (owns Rajesh)');
    console.log('   All passwords: password123');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding notice:', err.message);
  }
};

if (require.main === module) {
  seedDB();
}

module.exports = seedDB;
