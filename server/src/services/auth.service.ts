import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma.service';
import { AppError, ErrorCode, TokenPayload, AuthResponse } from '../types';

export class AuthService {
  /**
   * Register a new user
   */
  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError(ErrorCode.CONFLICT, 'Email already in use', 409);
      } else {
        throw new AppError(ErrorCode.CONFLICT, 'Username already taken', 409);
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        profile: {
          create: {
            // Initialize default profile values
            level: 1,
            experience: 0,
            reputation: 0,
            hackingSkill: 1,
            defenseSkill: 1,
            cryptoBalance: 1000
          }
        }
      }
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.username, user.isAdmin);

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      accessToken,
      refreshToken
    };
  }

  /**
   * Login a user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid email or password', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.username, user.isAdmin);

    // Update last login time
    await prisma.profile.update({
      where: { userId: user.id },
      data: { lastLogin: new Date() }
    });

    return {
      userId: user.id,
      username: user.username,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(userId: string, sessionId: string): Promise<{ accessToken: string, refreshToken: string }> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'User not found', 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.username, user.isAdmin);

    // Update refresh token in database
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      }
    });

    return { accessToken, refreshToken };
  }

  /**
   * Logout a user by invalidating their refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token: refreshToken }
    });
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string, username: string, isAdmin: boolean): Promise<{ accessToken: string, refreshToken: string }> {
    // Create token payload
    const payload: TokenPayload = {
      userId,
      username,
      isAdmin
    };

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '30m' }
    );

    // Generate refresh token (long-lived)
    const refreshToken = uuidv4();
    
    // Store refresh token in database
    await prisma.session.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        ipAddress: '',
        userAgent: ''
      }
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as TokenPayload;
    } catch (error) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid or expired token', 401);
    }
  }
}

export default new AuthService();