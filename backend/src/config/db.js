/**
 * config/db.js
 *
 * Establishes and exports the MongoDB connection via Mongoose.
 * Called once at server startup from server.js.
 *
 * Design decisions:
 *  - Mongoose 8.x removed many deprecated options (useNewUrlParser, etc.),
 *    so the connect call is clean with just the URI.
 *  - We log the connected host so the developer always knows which
 *    database they are actually talking to (local vs Atlas).
 *  - On connection error we log and exit — a backend without a DB
 *    is non-functional and should fail loudly.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database name    : ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    // Exit with failure code so the process manager (e.g. PM2) can restart
    process.exit(1);
  }
};

module.exports = connectDB;
