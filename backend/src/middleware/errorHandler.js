/**
 * middleware/errorHandler.js
 *
 * Centralised async error wrapper.
 * Wraps async controller functions so they don't need individual try/catch blocks.
 *
 * Usage in controllers:
 *   const asyncHandler = require('../middleware/errorHandler');
 *   exports.getPatient = asyncHandler(async (req, res, next) => { ... });
 *
 * Any thrown error or rejected promise is caught and passed to Express's
 * global error handler in server.js via next(error).
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
