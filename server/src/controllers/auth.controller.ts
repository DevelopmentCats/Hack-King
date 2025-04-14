import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { ApiResponse } from '../types';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, password } = req.body;
      
      const result = await authService.register(email, username, password);
      
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login a user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login(email, password);
      
      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
      });
      
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
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !res.locals.sessionId) {
        return next(new Error('User not authenticated'));
      }
      
      const result = await authService.refreshToken(req.user.userId, res.locals.sessionId);
      
      // Set new refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
      });
      
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
   * Logout a user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      await authService.logout(refreshToken);
      
      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      
      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Successfully logged out'
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();