import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../types';

// Simple in-memory rate limiter
// In production, you would use Redis or another distributed store
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up expired records every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request should be rate limited
   * @param key Identifier for the client (e.g., IP address)
   * @returns true if the request should be allowed, false if it should be limited
   */
  check(key: string): boolean {
    const now = Date.now();
    const record = this.store.get(key);

    // If no record exists or the record has expired, create a new one
    if (!record || now > record.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    // If the client has exceeded the limit, reject the request
    if (record.count >= this.maxRequests) {
      return false;
    }

    // Increment the request count
    record.count += 1;
    return true;
  }

  /**
   * Get the time remaining until the rate limit resets
   * @param key Identifier for the client
   * @returns Time in milliseconds until reset, or 0 if no record exists
   */
  getResetTime(key: string): number {
    const record = this.store.get(key);
    if (!record) return 0;
    
    const now = Date.now();
    return Math.max(0, record.resetTime - now);
  }

  /**
   * Clean up expired records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Create rate limiters for different endpoints
const authLimiter = new RateLimiter(10, 60 * 1000); // 10 requests per minute
const apiLimiter = new RateLimiter(60, 60 * 1000);  // 60 requests per minute

/**
 * Rate limiting middleware factory
 * @param limiter The rate limiter to use
 */
export const rateLimit = (limiter: RateLimiter) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address as the client identifier
    // In production, you might want to use a combination of IP and user ID
    const clientKey = req.ip || 'unknown';
    
    if (limiter.check(clientKey)) {
      next();
    } else {
      const resetTime = limiter.getResetTime(clientKey);
      res.set('Retry-After', Math.ceil(resetTime / 1000).toString());
      
      next(new AppError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many requests, please try again later',
        429
      ));
    }
  };
};

// Export pre-configured rate limiters
export const authRateLimit = rateLimit(authLimiter);
export const apiRateLimit = rateLimit(apiLimiter);