import { z } from 'zod';

// Auth validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username cannot exceed 30 characters'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// User profile validation schemas
export const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name cannot exceed 50 characters').optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  avatarUrl: z.string().url('Invalid URL format').optional()
});

export const updateSkillsSchema = z.object({
  programmingSkill: z.number().int().min(0, 'Skill points cannot be negative').optional(),
  networkingSkill: z.number().int().min(0, 'Skill points cannot be negative').optional(),
  cryptographySkill: z.number().int().min(0, 'Skill points cannot be negative').optional(),
  securitySkill: z.number().int().min(0, 'Skill points cannot be negative').optional()
}).refine(data => {
  const sum = (data.programmingSkill || 0) + 
              (data.networkingSkill || 0) + 
              (data.cryptographySkill || 0) + 
              (data.securitySkill || 0);
  return sum > 0;
}, {
  message: 'At least one skill must be updated',
  path: ['_all']
});

// Mission validation schemas
export const getMissionsQuerySchema = z.object({
  categoryId: z.string().optional(),
  difficulty: z.string().transform(val => parseInt(val, 10)).optional(),
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('10')
});

export const missionObjectiveSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  result: z.string().optional()
});

// Shop validation schemas
export const shopQuerySchema = z.object({
  category: z.string().optional(),
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('10')
});

export const purchaseItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1)
});

// Inventory validation schemas
export const inventoryQuerySchema = z.object({
  type: z.string().optional(),
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('10')
});

// Achievement validation schemas
export const achievementsQuerySchema = z.object({
  category: z.string().optional(),
  status: z.enum(['completed', 'in-progress']).optional(),
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('10')
});

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(3, 'Team name must be at least 3 characters').max(30, 'Team name cannot exceed 30 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  logoUrl: z.string().url('Invalid URL format').optional()
});

export const updateTeamMemberSchema = z.object({
  role: z.enum(['LEADER', 'MODERATOR', 'MEMBER'])
});

// Message validation schemas
export const sendMessageSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  content: z.string().min(1, 'Message content is required').max(1000, 'Message cannot exceed 1000 characters')
});

export const messagesQuerySchema = z.object({
  unreadOnly: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('10')
});

// Leaderboard validation schemas
export const leaderboardQuerySchema = z.object({
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'all-time']).default('weekly'),
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('10')
});