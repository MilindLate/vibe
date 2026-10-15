// backend/src/config/redis.ts
import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

const redisOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  retryStrategy: (times: number) => (times > 5 ? null : Math.min(times * 500, 3000)),
};

export const redis = new Redis(config.redis.url, redisOptions);
export const redisPub = new Redis(config.redis.url, redisOptions);
export const redisSub = new Redis(config.redis.url, redisOptions);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { err: err.message }));

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  await redisPub.quit();
  await redisSub.quit();
}

/** Centralized Redis key templates to prevent typos */
export const RedisKeys = {
  session:            (userId: string) => `session:${userId}`,
  feedFYP:            (userId: string) => `feed:fyp:${userId}`,
  feedFollowing:      (userId: string) => `feed:following:${userId}`,
  videoViews:         (videoId: string) => `views:${videoId}`,
  viewHistory:        (userId: string) => `view_history:${userId}`,
  trendingVideos:     () => `trending:videos`,
  trendingSearches:   () => `trending:searches`,
  userInterests:      (userId: string) => `interests:${userId}`,
  notifUnread:        (userId: string) => `notif:unread:${userId}`,
  userOnline:         (userId: string) => `online:${userId}`,
  typingIndicator:    (convId: string, userId: string) => `typing:${convId}:${userId}`,
  resetToken:         (token: string) => `reset:${token}`,
  verifyToken:        (token: string) => `verify:${token}`,
  videoEmbed:         (videoId: string) => `embed:video:${videoId}`,
  userEmbed:          (userId: string) => `embed:user:${userId}`,
  revokedToken:       (last16: string) => `revoked:${last16}`,
};
