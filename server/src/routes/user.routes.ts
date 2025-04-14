import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { updateProfileSchema, updateSkillsSchema, inventoryQuerySchema, achievementsQuerySchema } from '../models/validation.models';
import { apiRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /users/me
 * @desc Get current user profile
 * @access Private
 */
router.get(
  '/me',
  apiRateLimit,
  userController.getCurrentUser
);

/**
 * @route PATCH /users/me/profile
 * @desc Update user profile
 * @access Private
 */
router.patch(
  '/me/profile',
  apiRateLimit,
  validate(updateProfileSchema),
  userController.updateProfile
);

/**
 * @route GET /users/me/progress
 * @desc Get user progress
 * @access Private
 */
router.get(
  '/me/progress',
  apiRateLimit,
  userController.getUserProgress
);

/**
 * @route POST /users/me/skills
 * @desc Allocate skill points
 * @access Private
 */
router.post(
  '/me/skills',
  apiRateLimit,
  validate(updateSkillsSchema),
  userController.allocateSkillPoints
);

/**
 * @route GET /users/me/wallet
 * @desc Get user wallet
 * @access Private
 */
router.get(
  '/me/wallet',
  apiRateLimit,
  userController.getUserWallet
);

/**
 * @route GET /users/me/inventory
 * @desc Get user inventory
 * @access Private
 */
router.get(
  '/me/inventory',
  apiRateLimit,
  validate(inventoryQuerySchema, 'query'),
  userController.getUserInventory
);

/**
 * @route GET /users/me/achievements
 * @desc Get user achievements
 * @access Private
 */
router.get(
  '/me/achievements',
  apiRateLimit,
  validate(achievementsQuerySchema, 'query'),
  userController.getUserAchievements
);

/**
 * @route GET /users/me/missions
 * @desc Get user mission history
 * @access Private
 */
router.get(
  '/me/missions',
  apiRateLimit,
  userController.getUserAchievements
);

export default router;