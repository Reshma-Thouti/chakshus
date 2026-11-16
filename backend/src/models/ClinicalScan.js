/**
 * models/ClinicalScan.js
 *
 * Stores metadata for each fundus photograph (retinal scan) uploaded
 * by a clinician, along with the AI-predicted Diabetic Retinopathy (DR) grade.
 *
 * IMPORTANT: The actual image binary is NOT stored in MongoDB.
 * MongoDB is not an image store. The file is saved to disk (or cloud storage
 * in production) by Multer, and only the file path/URL is stored here.
 * This is the standard pattern for binary assets in MERN stacks.
 *
 * DR Grading Scale (International Clinical DR Severity Scale):
 *  Grade 0 — No DR              : No abnormalities detected
 *  Grade 1 — Mild NPDR          : Microaneurysms only
 *  Grade 2 — Moderate NPDR      : More than mild NPDR
 *  Grade 3 — Severe NPDR        : Extensive hemorrhages / IRMA
 *  Grade 4 — Proliferative DR   : Neovascularization / vitreous hemorrhage
 *
 * Schema Design Rationale:
 *  - drGrade is an integer enum 0–4. Storing as Number enables
 *    aggregation queries (e.g., average grade over time, grade distribution).
 *  - gradingSource distinguishes AI predictions from manual clinician overrides,
 *    preserving an audit trail.
 *  - confidenceScore captures the ML model's softmax probability for the
 *    predicted class (0.0–1.0). Low confidence should trigger human review.
 *  - imagePath stores the relative server path; in production this becomes
 *    a cloud storage URL (S3, GCS).
 */

const mongoose = require('mongoose');

const clinicalScanSchema = new mongoose.Schema(
  {
    // ── Relationship ─────────────────────────────────────────
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'A clinical scan must belong to a patient'],
      index: true,
    },

    // ── Scan Metadata ────────────────────────────────────────
    /**
     * The date the fundus photograph was physically taken.
     * This may differ from createdAt (the upload date).
     */
    scanDate: {
      type: Date,
      required: [true, 'Scan date is required'],
      default: Date.now,
    },

    /**
     * Which eye was photographed.
     * Bilateral scans should be two separate ClinicalScan documents.
     */
    eye: {
      type: String,
      enum: {
        values: ['Left', 'Right', 'Both'],
        message: '{VALUE} is not a valid eye selection',
      },
      required: [true, 'Eye (Left/Right/Both) must be specified'],
    },

    // ── Image File Reference ─────────────────────────────────
    /**
     * Relative path on the server filesystem where Multer saved the file.
     * Example: "uploads/scans/1718000000000-fundus-left.jpg"
     * In production, replace with a cloud storage URL.
     */
    imagePath: {
      type: String,
      required: [true, 'Image path is required after file upload'],
      trim: true,
    },

    /**
     * Original filename as uploaded by the user (before Multer renames it).
     * Stored for display purposes in the UI.
     */
    originalFileName: {
      type: String,
      trim: true,
    },

    /**
     * MIME type of the uploaded file, e.g., 'image/jpeg', 'image/png'.
     * Validated on upload by Multer middleware.
     */
    mimeType: {
      type: String,
      trim: true,
    },

    /**
     * File size in bytes. Stored for audit and storage quota tracking.
     */
    fileSizeBytes: {
      type: Number,
      min: 0,
    },

    // ── AI Prediction Results ────────────────────────────────
    /**
     * Diabetic Retinopathy severity grade predicted by the ML model.
     * Integer in range [0, 4] following the ICDR severity scale.
     * null = not yet graded (image uploaded but ML service not yet called).
     */
    drGrade: {
      type: Number,
      enum: {
        values: [null, 0, 1, 2, 3, 4],
        message: 'DR grade must be an integer between 0 and 4',
      },
      default: null,
    },

    /**
     * Human-readable label derived from drGrade.
     * Computed and stored to avoid repeated enum lookups in the UI.
     */
    drGradeLabel: {
      type: String,
      enum: [
        null,
        'No DR',
        'Mild NPDR',
        'Moderate NPDR',
        'Severe NPDR',
        'Proliferative DR',
      ],
      default: null,
    },

    /**
     * Confidence score (0.0 – 1.0) returned by the ML model's softmax layer
     * for the predicted class. A score below 0.70 should flag for human review.
     */
    confidenceScore: {
      type: Number,
      min: [0.0, 'Confidence score cannot be below 0'],
      max: [1.0, 'Confidence score cannot exceed 1'],
      default: null,
    },

    /**
     * Full probability distribution returned by the ML model.
     * Stored as an array of 5 floats: [P(0), P(1), P(2), P(3), P(4)]
     * This allows the UI to display a grade probability bar chart.
     */
    gradeProbabilities: {
      type: [Number],
      validate: {
        validator: (arr) => arr.length === 0 || arr.length === 5,
        message: 'gradeProbabilities must be an array of exactly 5 values',
      },
      default: [],
    },

    // ── Grading Source & Audit ───────────────────────────────
    /**
     * Who or what assigned the drGrade:
     *  'ai'      — assigned automatically by the FastAPI ML microservice
     *  'doctor'  — manually assigned or overridden by a clinician
     *  'pending' — image uploaded but grading has not yet occurred
     */
    gradingSource: {
      type: String,
      enum: ['ai', 'doctor', 'pending'],
      default: 'pending',
    },

    /**
     * Timestamp when the grading was completed (whether by AI or doctor).
     * null until grading occurs.
     */
    gradedAt: {
      type: Date,
      default: null,
    },

    /**
     * Optional clinician notes or findings from the scan review.
     * e.g., "Moderate peripheral hemorrhages, recommend laser consult"
     */
    clinicianNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Clinician notes cannot exceed 1000 characters'],
    },

    /**
     * Flag to request urgent clinical review.
     * Auto-set to true when drGrade >= 3 or confidenceScore < 0.65.
     */
    requiresUrgentReview: {
      type: Boolean,
      default: false,
    },

    // ── Uploaded By & Sharing ───────────────────────────────
    uploadedByDoctorId: {
      type: String,
      trim: true,
    },

    /**
     * Set to true when doctor clicks "Send Report to Patient Portal".
     * Only shared reports are visible to the patient in their portal.
     */
    isSharedWithPatient: {
      type: Boolean,
      default: false,
      index: true,
    },

    sharedAt: {
      type: Date,
      default: null,
    },

    doctorNotesToPatient: {
      type: String,
      trim: true,
      default: '',
    },

    doctorSigned: {
      type: Boolean,
      default: false,
    },

    doctorSignatureName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt = upload timestamp

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

// ── Pre-save Hook ────────────────────────────────────────────
/**
 * Automatically populate drGradeLabel from drGrade,
 * and set requiresUrgentReview based on grade and confidence thresholds.
 * This keeps business logic in the model, not scattered across controllers.
 */
const DR_GRADE_LABELS = [
  'No DR',
  'Mild NPDR',
  'Moderate NPDR',
  'Severe NPDR',
  'Proliferative DR',
];

clinicalScanSchema.pre('save', function (next) {
  // Sync the human-readable label whenever drGrade changes
  if (this.drGrade !== null && this.drGrade >= 0 && this.drGrade <= 4) {
    this.drGradeLabel = DR_GRADE_LABELS[this.drGrade];
  }

  // Auto-flag for urgent review: Grade ≥ 3 OR low confidence
  if (this.drGrade !== null) {
    const lowConfidence =
      this.confidenceScore !== null && this.confidenceScore < 0.65;
    this.requiresUrgentReview = this.drGrade >= 3 || lowConfidence;
  }

  next();
});

// ── Indexes ──────────────────────────────────────────────────
// Most recent scans for a patient listed first
clinicalScanSchema.index({ patientId: 1, scanDate: -1 });

// Find all scans requiring urgent review — clinical dashboard query
clinicalScanSchema.index({ requiresUrgentReview: 1, gradingSource: 1 });

const ClinicalScan = mongoose.model('ClinicalScan', clinicalScanSchema);

module.exports = ClinicalScan;
