import { Request, Response, NextFunction } from 'express';
import missionService from '../services/mission.service';
import { ApiResponse } from '../types';

export class MissionController {
  /**
   * Get mission categories
   */
  async getMissionCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // For now, we'll return hardcoded categories
      // In a real implementation, these would come from a database
      const categories = [
        {
          id: 'network-security',
          name: 'Network Security',
          description: 'Missions focused on network penetration and security',
          iconUrl: null,
          difficulty: 3
        },
        {
          id: 'cryptography',
          name: 'Cryptography',
          description: 'Encryption and decryption challenges',
          iconUrl: null,
          difficulty: 4
        },
        {
          id: 'web-security',
          name: 'Web Security',
          description: 'Web application security and exploitation',
          iconUrl: null,
          difficulty: 2
        }
      ];
      
      const response: ApiResponse<{ categories: typeof categories }> = {
        success: true,
        data: { categories }
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available missions
   */
  async getAvailableMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { categoryId, difficulty, page, limit } = req.query;
      
      const missions = await missionService.getAvailableMissions(req.user.userId, {
        categoryId: typeof categoryId === 'string' ? categoryId : undefined,
        difficulty: typeof difficulty === 'string' ? parseInt(difficulty, 10) : undefined,
        page: typeof page === 'string' ? parseInt(page, 10) : 1,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 10
      });
      
      const response: ApiResponse<typeof missions> = {
        success: true,
        data: missions
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get mission details
   */
  async getMissionDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { missionId } = req.params;
      
      const mission = await missionService.getMissionDetails(missionId, req.user.userId);
      
      const response: ApiResponse<typeof mission> = {
        success: true,
        data: mission
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start mission
   */
  async startMission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { missionId } = req.params;
      
      const attempt = await missionService.startMission(missionId, req.user.userId);
      
      const response: ApiResponse<typeof attempt> = {
        success: true,
        data: attempt
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit mission objective
   */
  async submitObjective(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { missionId, attemptId, objectiveId } = req.params;
      const { command, result } = req.body;
      
      const submission = await missionService.submitObjective(
        missionId,
        attemptId,
        objectiveId,
        { command, result },
        req.user.userId
      );
      
      const response: ApiResponse<typeof submission> = {
        success: true,
        data: submission
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete mission
   */
  async completeMission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { missionId, attemptId } = req.params;
      
      const result = await missionService.completeMission(missionId, attemptId, req.user.userId);
      
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get mission history
   */
  async getMissionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }
      
      const { status, page, limit } = req.query;
      
      const history = await missionService.getMissionHistory(req.user.userId, {
        status: typeof status === 'string' ? status as 'completed' | 'failed' | 'in-progress' : undefined,
        page: typeof page === 'string' ? parseInt(page, 10) : 1,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 10
      });
      
      const response: ApiResponse<typeof history> = {
        success: true,
        data: history
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new MissionController();