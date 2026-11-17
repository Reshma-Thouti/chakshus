/**
 * src/config/adminConfig.js
 *
 * Predefined System Administrator Credentials in Code.
 * When an administrator attempts to authenticate or onboard, the system
 * checks whether the entered details match the authorized values below.
 */

const ADMIN_DETAILS = {
  name: process.env.ADMIN_NAME || 'Chakshus System Administrator',
  email: (process.env.ADMIN_EMAIL || 'admin@chakshus.org').toLowerCase().trim(),
  password: process.env.ADMIN_PASSWORD || 'Admin@Chakshus2026',
  role: 'admin',
  securityPin: process.env.ADMIN_SECURITY_PIN || '7788',
};

/**
 * Validates whether entered credentials match the authorized administrator details.
 * @param {string} email
 * @param {string} password
 * @param {string} [pin] - Optional security pin if provided
 * @returns {{ isValid: boolean, error?: string }}
 */
function validateAdminDetails(email, password, pin) {
  if (!email || !password) {
    return { isValid: false, error: 'Administrator email and password are required.' };
  }

  const normalizedEnteredEmail = email.toLowerCase().trim();

  if (normalizedEnteredEmail !== ADMIN_DETAILS.email) {
    return {
      isValid: false,
      error: `Invalid Administrator Email: '${email}' does not match the authorized admin email defined in code.`,
    };
  }

  if (password !== ADMIN_DETAILS.password) {
    return {
      isValid: false,
      error: 'Invalid Administrator Password: The entered password does not match the admin credentials in code.',
    };
  }

  if (!pin) {
    return {
      isValid: false,
      error: 'Security PIN is mandatory for System Administrator authentication.',
    };
  }

  if (String(pin).trim() !== String(ADMIN_DETAILS.securityPin).trim()) {
    return {
      isValid: false,
      error: 'Invalid Security PIN: The entered PIN does not match the system administrator PIN.',
    };
  }

  return { isValid: true };
}

module.exports = {
  ADMIN_DETAILS,
  validateAdminDetails,
};
