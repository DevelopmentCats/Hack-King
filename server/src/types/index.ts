import { User, Profile, VirtualMachine, Software, Vulnerability, Attack, Message, Achievement, Session, Notification } from '@prisma/client';

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Auth types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  username: string;
  email?: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// User types
export interface UserProfile extends Profile {
  user?: User;
}

export interface UserProgressUpdate {
  programmingSkill?: number;
  networkingSkill?: number;
  cryptographySkill?: number;
  securitySkill?: number;
}

// Virtual Machine types
export interface VirtualMachineWithDetails extends VirtualMachine {
  owner?: User;
  vulnerabilities?: Vulnerability[];
  softwareInstalled?: Software[];
}

// Attack types
export interface AttackWithDetails extends Attack {
  attacker?: User;
  defender?: User;
  targetMachine?: VirtualMachine;
}

// Mission types
export interface MissionAttempt {
  id: string;
  missionId: string;
  startedAt: Date;
  completedAt?: Date;
  isSuccessful?: boolean;
  score?: number;
  timeSpent?: number;
  commandsUsed: string[];
}

export interface MissionObjective {
  id: string;
  description: string;
  type: string;
  order: number;
  isOptional: boolean;
  hints?: string;
}

// Socket.io types
export interface SocketAuthPayload {
  token: string;
}

export interface TerminalCommandPayload {
  attemptId: string;
  command: string;
  timestamp: number;
}

export interface TerminalResponsePayload {
  attemptId: string;
  commandId: string;
  command: string;
  output: string;
  status: 'success' | 'error' | 'partial';
  timestamp: number;
  objectiveCompleted?: {
    objectiveId: string;
    description: string;
  };
}

// Notification types
export interface NotificationWithUser extends Notification {
  user?: User;
}

// Error types
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}