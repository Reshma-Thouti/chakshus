/**
 * middleware/uploadMiddleware.js
 *
 * Multer configuration for retinal fundus photograph uploads.
 *
 * Design Decisions:
 *  - Disk storage is used so images are permanently available for
 *    subsequent review by ophthalmologists and static serving.
 *  - Filenames are prefixed with timestamps and random hex strings to avoid
 *    collisions when multiple clinicians upload scans simultaneously.
 *  - Strict MIME validation prevents non-image files from being processed.
 *  - File size is capped (default: 10MB) via environment configuration.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure destination directory exists
const uploadDirectory = path.join(__dirname, '../../uploads/scans');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// ── Storage Engine ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    // Generate secure unique filename: timestamp-randomHex.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `fundus-${uniqueSuffix}${ext}`);
  },
});

// ── File Filter (MIME verification) ──────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type '${file.mimetype}'. Only JPEG, PNG, TIFF, and BMP fundus images are accepted.`
      ),
      false
    );
  }
};

// ── Multer Instance ──────────────────────────────────────────
const maxSizeBytes = parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 10 * 1024 * 1024; // 10MB default

const uploadFundus = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
    files: 1, // 1 scan per request
  },
  fileFilter,
});

module.exports = uploadFundus;
