/**
 * server.js — Application Entry Point
 *
 * Responsibilities:
 *  1. Load environment variables from .env
 *  2. Connect to MongoDB
 *  3. Bootstrap the Express app with global middleware
 *  4. Mount route namespaces (/api/patients, /api/health-logs, /api/scans)
 *  5. Provide static serving for uploaded retinal scans
 *  6. Global error handling and server startup
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const healthLogRoutes = require('./src/routes/healthLogRoutes');
const scanRoutes = require('./src/routes/scanRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// ── Connect to MongoDB ───────────────────────────────────────
connectDB();

// ── Initialise Express ───────────────────────────────────────
const app = express();

// ── Global Middleware ────────────────────────────────────────
/**
 * CORS: Allow requests from the React dev server (port 3000) during
 * development. In production, replace origin with the deployed frontend URL.
 */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins or vercel deployments during cloud setup
      callback(null, true);
    },
    credentials: true,
  })
);

/**
 * JSON body parser — handles all application/json request bodies.
 * Limit set to 1mb; large payloads (images) go through Multer, not this.
 */
app.use(express.json({ limit: '1mb' }));

/**
 * URL-encoded body parser for traditional form submissions.
 */
app.use(express.urlencoded({ extended: false }));

/**
 * Serve the uploads folder as a static directory so the React frontend
 * can render fundus images directly via their stored path.
 * Example URL: GET /uploads/scans/fundus-1718000000000-a1b2.jpg
 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Mount Application Routes ─────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/health-logs', healthLogRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/admin', adminRoutes);

// Root entry route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'चक्षुस् (Chakshus) - Diabetic Retinopathy Diagnostic API',
    mongoStatus: require('mongoose').connection.readyState === 1 ? 'connected' : 'connecting',
    healthCheck: '/api/health',
    endpoints: '/api',
  });
});

// Health-check endpoint — used by monitoring & load balancers
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'diabetic-vision-backend',
    timestamp: new Date().toISOString(),
    mongoState: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  });
});

// API Root Information
app.get('/api', (req, res) => {
  res.status(200).json({
    message: '🩺 Diabetic Vision Health Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      patients: '/api/patients',
      healthLogs: '/api/health-logs',
      scans: '/api/scans',
      health: '/api/health',
    },
  });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── Global Error Handler ─────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Multer-specific errors (file size, file filter)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Uploaded retinal image exceeds the 10 MB limit.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  // Multer file filter or unsupported format errors
  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Only JPEG, PNG'))) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, errors: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // Default 500 error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('🩺  Diabetic Vision Health Management System');
  console.log('─────────────────────────────────────────────');
  console.log(`🚀  Backend API running at: http://localhost:${PORT}`);
  console.log(`🔗  Health check         : http://localhost:${PORT}/api/health`);
  console.log(`🌿  Environment          : ${process.env.NODE_ENV || 'development'}`);
  console.log('─────────────────────────────────────────────');
  console.log('');
});

module.exports = app;
