/**
 * server.js — Application Entry Point
 *
 * Responsibilities:
 *  1. Load environment variables from .env
 *  2. Connect to MongoDB
 *  3. Bootstrap the Express app with global middleware
 *  4. Mount route namespaces (stubs for now — to be expanded in Phase 2+)
 *  5. Start the HTTP server
 *
 * What this file should NOT do:
 *  - Contain any business logic (that belongs in controllers)
 *  - Contain any schema definitions (that belongs in models)
 *  - Contain any route handler callbacks (that belongs in routes)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./src/config/db');

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
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : 'http://localhost:3000',
    credentials: true,
  })
);

/**
 * JSON body parser — handles all application/json request bodies.
 * Limit set to 1mb; large payloads (images) go through Multer, not this.
 */
app.use(express.json({ limit: '1mb' }));

/**
 * URL-encoded body parser for traditional HTML form submissions.
 */
app.use(express.urlencoded({ extended: false }));

/**
 * Serve the uploads folder as a static directory so the React frontend
 * can render fundus images directly via their stored path.
 * Example URL: GET /uploads/scans/1718000000000-fundus.jpg
 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes (Stubs — to be completed in Phase 2+) ─────────────
/**
 * Route namespaces are intentionally kept as stubs here.
 * Each will be a separate Express Router defined in src/routes/.
 * We mount them now so the server structure is clear.
 */

// Health-check endpoint — always keep this. Used by load balancers & monitoring.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'diabetic-vision-backend',
    timestamp: new Date().toISOString(),
    mongoState: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Placeholder — will be replaced with actual routers in Phase 2
app.get('/api', (req, res) => {
  res.status(200).json({
    message: '🩺 Diabetic Vision Health Management System API',
    version: '1.0.0',
    phase: 'Phase 1 — Backend Foundation',
    endpoints: {
      patients: '/api/patients         [COMING IN PHASE 2]',
      healthLogs: '/api/health-logs    [COMING IN PHASE 2]',
      scans: '/api/scans               [COMING IN PHASE 4]',
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
/**
 * Express error-handling middleware must have exactly 4 arguments.
 * Any next(error) call in routes/controllers lands here.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose validation errors get a 400
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, errors: messages });
  }

  // Mongoose duplicate key error (e.g., duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // Default 500
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

module.exports = app; // exported for future integration testing
