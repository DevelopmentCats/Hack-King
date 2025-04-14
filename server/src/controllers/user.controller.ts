import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { ApiResponse } from '../types';

export class UserController {
  /**
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const profile = await userService.getUserProfile(req.user.userId);
      
      const response: ApiResponse<typeof profile> = {
        success: true,
        data: profile
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { displayName, bio, avatarUrl } = req.body;
      
      const updatedProfile = await userService.updateProfile(req.user.userId, {
        displayName,
        bio,
        avatarUrl
      });
      
      const response: ApiResponse<typeof updatedProfile> = {
        success: true,
        data: updatedProfile
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user progress
   */
  async getUserProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const progress = await userService.getUserProgress(req.user.userId);
      
      const response: ApiResponse<typeof progress> = {
        success: true,
        data: progress
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Allocate skill points
   */
  async allocateSkillPoints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { programmingSkill, networkingSkill, cryptographySkill, securitySkill } = req.body;
      
      const updatedSkills = await userService.updateSkills(req.user.userId, {
        programmingSkill,
        networkingSkill,
        cryptographySkill,
        securitySkill
      });
      
      const response: ApiResponse<typeof updatedSkills> = {
        success: true,
        data: updatedSkills
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user wallet
   */
  async getUserWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const wallet = await userService.getUserWallet(req.user.userId);
      
      const response: ApiResponse<typeof wallet> = {
        success: true,
        data: wallet
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user inventory
   */
  async getUserInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { type } = req.query;
      
      const inventory = await userService.getUserInventory(
        req.user.userId,
        typeof type === 'string' ? type : undefined
      );
      
      const response: ApiResponse<typeof inventory> = {
        success: true,
        data: inventory
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { status } = req.query;
      
      const achievements = await userService.getUserAchievements(
        req.user.userId,
        typeof status === 'string' ? status as 'completed' | 'in-progress' : undefined
      );
      
      const response: ApiResponse<typeof achievements> = {
        success: true,
        data: achievements
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();