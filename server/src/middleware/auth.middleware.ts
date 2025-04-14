import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.service';
import { AppError, ErrorCode, TokenPayload } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid token format', 401);
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as TokenPayload;
      req.user = decoded;
      next();
    } catch (error) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid or expired token', 401);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
    }

    if (!req.user.isAdmin) {
      throw new AppError(ErrorCode.FORBIDDEN, 'Admin access required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate refresh token
 */
export const validateRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Refresh token is required', 401);
    }

    // Check if token exists in database
    const session = await prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!session) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid refresh token', 401);
    }

    // Check if token is expired
    if (new Date() > session.expiresAt) {
      // Delete expired token
      await prisma.session.delete({
        where: { id: session.id }
      });
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Refresh token expired', 401);
    }

    // Attach user to request
    req.user = {
      userId: session.user.id,
      username: session.user.username,
      isAdmin: session.user.isAdmin
    };

    // Store session ID for later use
    res.locals.sessionId = session.id;
    
    next();
  } catch (error) {
    next(error);
  }
};