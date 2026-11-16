/**
 * models/User.js
 *
 * User account model supporting Role-Based Access Control (RBAC):
 *  - 'doctor' : Manages an assigned roster of patients, ingests fundus scans, runs AI, shares reports.
 *  - 'patient': Views personal metabolic progression and receives retinal screening reports from their assigned doctor.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password in query results by default
    },

    role: {
      type: String,
      enum: {
        values: ['doctor', 'patient', 'admin'],
        message: '{VALUE} is not a valid user role',
      },
      required: [true, 'User role is required'],
      default: 'patient',
    },

    // ── Clinician Fields (if role === 'doctor') ──────────────
    specialization: {
      type: String,
      trim: true,
      default: 'Ophthalmologist / Retina Specialist',
    },

    hospitalOrClinic: {
      type: String,
      trim: true,
      default: 'Tele-Oculomics Center',
    },

    // ── Patient-Specific Fields (if role === 'patient') ──────
    /**
     * The specific Doctor allotted to this patient.
     * Enforces strict multi-tenant privacy: Doctor A cannot access Doctor B's patients.
     */
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /**
     * Linked medical profile in the Patient collection.
     */
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// ── Hash password before saving ──────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare user entered password with hashed password ────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Generate JWT signed authentication token ──────────────────
userSchema.methods.generateAuthToken = function () {
  const secret = process.env.JWT_SECRET || 'diavision_super_secret_jwt_key_2026';
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      name: this.name,
      email: this.email,
    },
    secret,
    { expiresIn: '30d' }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
