/**
 * config/db.js
 *
 * Establishes and exports the MongoDB connection via Mongoose.
 * Called once at server startup from server.js.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/diabetic_vision_db';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000, // 3s timeout so server startup doesn't hang if Mongo is offline
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database name    : ${conn.connection.name}`);
  } catch (error) {
    console.error(`⚠️ MongoDB connection notice: ${error.message}`);
    console.error(`   (Backend will run in resilient mode. Start MongoDB to enable full persistence)`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
