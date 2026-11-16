/**
 * models/DailyHealthLog.js
 *
 * Time-series biometric readings submitted by or on behalf of a patient
 * on a daily basis. This collection is the primary data source for
 * longitudinal glucose trend analysis and progression charts.
 *
 * Schema Design Rationale:
 *  - patientId is a hard reference (ObjectId) to enforce referential integrity
 *    at the application layer. We use a Mongoose ref so .populate() works.
 *  - logDate is stored as a Date (not DateTime) so each day's entry is
 *    naturally distinct. A compound unique index on (patientId, logDate)
 *    prevents duplicate entries for the same patient on the same day.
 *  - Blood pressure is split into systolic and diastolic rather than
 *    stored as a string "120/80" — this enables range queries and aggregation.
 *  - All glucose values are in mg/dL (the standard used in India and the US).
 *    If mmol/L is needed, a conversion factor of 18.0182 applies.
 *  - All measurement fields are optional because patients may not capture
 *    every reading every day — we should not block log submission.
 */

const mongoose = require('mongoose');

const dailyHealthLogSchema = new mongoose.Schema(
  {
    // ── Relationship ─────────────────────────────────────────
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'A health log must belong to a patient'],
      index: true, // frequently queried for patient-specific time series
    },

    // ── Log Date ─────────────────────────────────────────────
    /**
     * The calendar date this log entry represents.
     * Time component is ignored — only the date matters.
     * Default is today so the frontend can omit it for quick logging.
     */
    logDate: {
      type: Date,
      required: [true, 'Log date is required'],
      default: () => {
        // Strip time component — store midnight UTC for consistency
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        return d;
      },
    },

    // ── Glucose Readings (mg/dL) ─────────────────────────────
    /**
     * Fasting Plasma Glucose (FPG): measured after ≥8 hours of fasting.
     * Clinical thresholds: Normal < 100 | Pre-diabetic 100–125 | Diabetic ≥ 126
     */
    fastingGlucose: {
      type: Number,
      min: [20, 'Fasting glucose below 20 mg/dL is physiologically implausible'],
      max: [600, 'Fasting glucose above 600 mg/dL — please verify entry'],
    },

    /**
     * Post-Prandial Glucose (PPG): measured 2 hours after a meal.
     * Clinical thresholds: Normal < 140 | Pre-diabetic 140–199 | Diabetic ≥ 200
     */
    postMealGlucose: {
      type: Number,
      min: [20, 'Post-meal glucose below 20 mg/dL is implausible'],
      max: [800, 'Post-meal glucose above 800 mg/dL — please verify entry'],
    },

    /**
     * Random blood glucose: taken at any time, without regard to meals.
     * Useful when fasting or post-meal context is unknown.
     */
    randomGlucose: {
      type: Number,
      min: [20, 'Random glucose below 20 mg/dL is implausible'],
      max: [800, 'Random glucose above 800 mg/dL — please verify entry'],
    },

    // ── Blood Pressure (mmHg) ────────────────────────────────
    /**
     * Systolic BP: peak pressure during ventricular contraction.
     * Normal: < 120 | Elevated: 120–129 | Stage 1 HTN: 130–139 | Stage 2: ≥ 140
     */
    bloodPressureSystolic: {
      type: Number,
      min: [60, 'Systolic BP below 60 mmHg is implausible'],
      max: [300, 'Systolic BP above 300 mmHg — please verify entry'],
    },

    /**
     * Diastolic BP: minimum pressure when heart is at rest between beats.
     * Normal: < 80 | Stage 1 HTN: 80–89 | Stage 2: ≥ 90
     */
    bloodPressureDiastolic: {
      type: Number,
      min: [30, 'Diastolic BP below 30 mmHg is implausible'],
      max: [200, 'Diastolic BP above 200 mmHg — please verify entry'],
    },

    // ── Additional Clinical Metrics ──────────────────────────
    /**
     * Body weight in kilograms on this log date.
     * Used to track BMI trends alongside glucose control.
     */
    weightKg: {
      type: Number,
      min: [20, 'Weight below 20 kg is implausible for an adult'],
      max: [300, 'Weight above 300 kg — please verify entry'],
    },

    /**
     * Heart rate in beats per minute (BPM).
     */
    heartRateBpm: {
      type: Number,
      min: [30, 'Heart rate below 30 BPM is implausible'],
      max: [250, 'Heart rate above 250 BPM — please verify entry'],
    },

    // ── Patient Notes ────────────────────────────────────────
    /**
     * Free-text field for the patient to record context:
     * e.g., "Skipped breakfast", "Had a cold", "Unusual stress day"
     * This qualitative context is important for clinical interpretation.
     */
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },

    // ── Data Source ──────────────────────────────────────────
    /**
     * How was this entry submitted?
     *  'manual'  — patient entered numbers via the web form
     *  'device'  — imported from a glucometer or wearable API (future)
     *  'doctor'  — entered by clinical staff during a visit
     */
    entrySource: {
      type: String,
      enum: ['manual', 'device', 'doctor', 'patient'],
      default: 'manual',
    },
  },
  {
    timestamps: true, // createdAt = submission timestamp, logDate = reading date

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

// ── Compound unique index ────────────────────────────────────
// One log entry per patient per calendar day
dailyHealthLogSchema.index({ patientId: 1, logDate: 1 }, { unique: true });

// ── Index for time-range queries ─────────────────────────────
// e.g., "fetch last 30 days of logs for patient X"
dailyHealthLogSchema.index({ patientId: 1, logDate: -1 });

const DailyHealthLog = mongoose.model('DailyHealthLog', dailyHealthLogSchema);

module.exports = DailyHealthLog;
