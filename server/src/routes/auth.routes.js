const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema,
} = require('../validators/auth.validator');

// Public auth endpoints with rate limiting
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);

// Protected profile endpoints
router.get('/me', verifyAuth, authController.getMe);
router.patch('/me', verifyAuth, validate(updateProfileSchema), authController.updateMe);
router.patch(
  '/me/password',
  verifyAuth,
  authLimiter,
  validate(updatePasswordSchema),
  authController.changePassword
);

module.exports = router;
