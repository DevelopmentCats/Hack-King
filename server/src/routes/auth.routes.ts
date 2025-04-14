import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../models/validation.models';
import { validateRefreshToken, authenticate } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  authController.register
);

/**
 * @route POST /auth/login
 * @desc Login a user
 * @access Public
 */
router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  authController.login
);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token
 * @access Public (with refresh token)
 */
router.post(
  '/refresh',
  authRateLimit,
  validate(refreshTokenSchema),
  validateRefreshToken,
  authController.refreshToken
);

/**
 * @route POST /auth/logout
 * @desc Logout a user
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  validate(refreshTokenSchema),
  authController.logout
);

export default router;