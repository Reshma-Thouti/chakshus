/**
 * models/Patient.js
 *
 * Represents the baseline demographic and medical profile of a diabetic patient.
 *
 * Schema Design Rationale:
 *  - diabetesType is an enum with 'Type 1' and 'Type 2' to prevent free-text
 *    inconsistencies. 'MODY' and 'Gestational' can be added later.
 *  - diabetesDurationYears is stored as a Number (not computed from a date)
 *    because clinicians record it as a "years since diagnosis" integer
 *    at the time of registration — it does not need to auto-increment.
 *  - timestamps: true adds createdAt (registration date) and updatedAt
 *    automatically, which serves as the patient's enrollment timestamp.
 *  - The 'email' field is unique and sparse — sparse allows multiple
 *    documents to omit email without triggering a unique-index conflict.
 */

const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Patient full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },

    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female', 'Other', 'Prefer not to say'],
        message: '{VALUE} is not a valid gender option',
      },
      required: [true, 'Gender is required'],
    },

    email: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs with no email field
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },

    // ── Clinical Baseline ────────────────────────────────────
    diabetesType: {
      type: String,
      enum: {
        values: ['Type 1', 'Type 2', 'MODY', 'Gestational', 'Other'],
        message: '{VALUE} is not a recognised diabetes type',
      },
      required: [true, 'Diabetes type is required'],
    },

    /**
     * Number of years since the patient was first diagnosed with diabetes.
     * Longer duration = higher cumulative risk of Diabetic Retinopathy.
     * Clinicians enter this as a whole or decimal number at registration.
     */
    diabetesDurationYears: {
      type: Number,
      required: [true, 'Diabetes duration is required'],
      min: [0, 'Duration cannot be negative'],
      max: [80, 'Duration value seems unrealistic — please verify'],
    },

    /**
     * HbA1c (Glycated Haemoglobin) at registration, expressed as a percentage.
     * This is the gold-standard long-term glucose control metric.
     * Normal: < 5.7% | Pre-diabetic: 5.7–6.4% | Diabetic: ≥ 6.5%
     */
    baselineHbA1c: {
      type: Number,
      min: [3.0, 'HbA1c below 3% is physiologically implausible'],
      max: [20.0, 'HbA1c above 20% is physiologically implausible'],
    },

    // ── Comorbidities (boolean flags for risk stratification) ─
    hasHypertension: {
      type: Boolean,
      default: false,
    },

    hasKidneyDisease: {
      type: Boolean,
      default: false,
    },

    // ── Administrative ───────────────────────────────────────
    /**
     * The doctor/clinician responsible for this patient.
     * Stored as a free-text ID or username string in Phase 1.
     * Will be refactored to a User ObjectId reference in a later phase
     * when authentication is added.
     */
    assignedDoctorId: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    // Automatically adds `createdAt` (enrollment date) and `updatedAt`
    timestamps: true,

    // Adds a `toJSON` transform so `_id` is serialized as `id` for the frontend
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Virtual: Age computed from dateOfBirth ───────────────────
// Not stored in DB — computed on the fly when the document is serialized.
patientSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const dob = new Date(this.dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
});

// ── Index ────────────────────────────────────────────────────
// Compound index for quick lookup of a doctor's patient list
patientSchema.index({ assignedDoctorId: 1, isActive: 1 });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
