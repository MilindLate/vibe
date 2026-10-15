// src/middleware/rateLimiter.ts
import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { config } from '../config';
import { AppError } from './errorHandler';

interface RateLimitOptions {
  max: number;
  windowMs: number;
  keyPrefix: string;
  message?: string;
}

function createLimiter(opts: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.userId;
    const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    const effectiveMax = config.app.isDev && isLoopback ? opts.max * 10 : opts.max;
    const key = `${opts.keyPrefix}:${userId || ip}`;
    const windowSec = Math.ceil(opts.windowMs / 1000);

    try {
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSec);
      const results = await pipeline.exec();
      const count = (results?.[0]?.[1] as number) || 1;

      res.setHeader('X-RateLimit-Limit', effectiveMax);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, effectiveMax - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + windowSec);

      if (count > effectiveMax) {
        res.setHeader('Retry-After', windowSec);
        next(new AppError(opts.message || 'Too many requests, please try again later', 429));
        return;
      }
      next();
    } catch {
      // If Redis is down, fail open (don't block requests)
      next();
    }
  };
}

/** Auth endpoints: 5 requests / minute */
export const authLimiter = createLimiter({
  max: config.rateLimit.auth.max,
  windowMs: config.rateLimit.auth.windowMs,
  keyPrefix: 'rl:auth',
  message: 'Too many auth attempts. Please wait before trying again.',
});

/** Upload endpoints: 10 / hour */
export const uploadLimiter = createLimiter({
  max: config.rateLimit.upload.max,
  windowMs: config.rateLimit.upload.windowMs,
  keyPrefix: 'rl:upload',
  message: 'Upload limit reached. You can upload 10 videos per hour.',
});

/** General API: 100 / minute */
export const apiLimiter = createLimiter({
  max: config.rateLimit.api.max,
  windowMs: config.rateLimit.api.windowMs,
  keyPrefix: 'rl:api',
});

/** Search: 30 / minute */
export const searchLimiter = createLimiter({
  max: 30,
  windowMs: 60_000,
  keyPrefix: 'rl:search',
});
