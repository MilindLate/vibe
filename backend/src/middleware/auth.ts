// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import { redis, RedisKeys } from '../config/redis';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  tokenType: 'access' | 'refresh';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Generate access + refresh token pair */
export function generateTokens(payload: Omit<JwtPayload, 'tokenType'>) {
  const accessToken = jwt.sign(
    { ...payload, tokenType: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn as any }
  );
  const refreshToken = jwt.sign(
    { ...payload, tokenType: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  );
  return { accessToken, refreshToken };
}

/** Verify an access token, throws on invalid */
export function verifyAccessToken(token: string): JwtPayload {
  const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  if (payload.tokenType !== 'access') throw new AppError('Invalid token type', 401);
  return payload;
}

/** Verify a refresh token */
export function verifyRefreshToken(token: string): JwtPayload {
  const payload = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
  if (payload.tokenType !== 'refresh') throw new AppError('Invalid token type', 401);
  return payload;
}

/** Required auth — 401 if no valid token */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    // Check if token has been revoked (logout)
    const revoked = await redis.get(`revoked:${token.slice(-16)}`);
    if (revoked) throw new AppError('Token revoked', 401);

    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth — attaches user if token present, but never 401 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);
      const revoked = await redis.get(`revoked:${token.slice(-16)}`);
      if (!revoked) req.user = payload;
    }
  } catch {
    // Ignore errors — optional auth
  }
  next();
}

/** Role-based authorization middleware */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}

/** Revoke a token (store last 16 chars as revocation marker) */
export async function revokeToken(token: string, expiresInSeconds = 900): Promise<void> {
  await redis.setex(`revoked:${token.slice(-16)}`, expiresInSeconds, '1');
}
