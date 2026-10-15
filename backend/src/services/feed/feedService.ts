// src/services/feed/feedService.ts
import { prisma } from '../../config/database';
import { redis, RedisKeys } from '../../config/redis';
import { calculateEngagementScore, timeDecayScore, paginate } from '../../utils/helpers';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const FEED_CACHE_TTL = 3600; // 1 hour
const FEED_SIZE = 50; // videos per feed segment
const PRE_FETCH_COUNT = 3; // videos to pre-load

export class FeedService {
  /**
   * For You Page (FYP) — algorithmic feed.
   * Fetches candidates from Redis or DB, scores them, applies diversity rules.
   */
  async getForYouFeed(userId: string | undefined, page = 1, limit = 10) {
    const cacheKey = userId ? RedisKeys.feedFYP(userId) : 'feed:fyp:anonymous';

    // Try to get pre-computed feed from Redis sorted set
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const cachedIds = await redis.zrevrange(cacheKey, start, end);

    if (cachedIds.length > 0) {
      const videos = await this.fetchVideosByIds(cachedIds, userId);
      return { videos, page, limit, hasMore: videos.length === limit, source: 'cache' };
    }

    // Generate fresh feed
    const videos = await this.generateFYP(userId, limit * 3);

    // Cache to Redis sorted set with engagement scores
    if (videos.length > 0) {
      const pipeline = redis.pipeline();
      videos.forEach((v, idx) => {
        pipeline.zadd(cacheKey, FEED_SIZE - idx, v.id);
      });
      pipeline.expire(cacheKey, FEED_CACHE_TTL);
      await pipeline.exec();
    }

    const paged = videos.slice(start, end + 1);
    return { videos: paged, page, limit, hasMore: paged.length === limit, source: 'generated' };
  }

  /** Generate For You Page feed for a user */
  private async generateFYP(userId: string | undefined, count: number) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    let watchedIds: string[] = [];

    if (userId) {
      // Get recently watched videos to exclude
      watchedIds = await redis.smembers(`watched:${userId}`);
    }

    const videos = await prisma.video.findMany({
      where: {
        status: 'ACTIVE',
        privacyLevel: 'PUBLIC',
        createdAt: { gte: since },
        id: { notIn: watchedIds.slice(0, 200) },
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
        hashtags: { include: { hashtag: { select: { name: true } } } },
        music: { select: { id: true, title: true, artist: true } },
      },
      take: count * 3, // Over-fetch for diversity filtering
    });

    if (!videos.length) return [];

    // Get user interests for personalization
    let interests: Record<string, number> = {};
    if (userId) {
      const rawInterests = await prisma.userInterest.findMany({
        where: { userId },
        select: { category: true, score: true },
      });
      interests = Object.fromEntries(rawInterests.map((i) => [i.category, i.score]));
    }

    // Score each video
    const scored = videos.map((video) => {
      const engagement = calculateEngagementScore(
        video.viewsCount, video.likesCount, video.commentsCount, video.sharesCount
      );
      const decayed = timeDecayScore(engagement, video.createdAt);

      // Interest bonus
      const tags = video.hashtags.map((vh) => vh.hashtag.name);
      const interestBonus = tags.reduce((sum, tag) => sum + (interests[tag] || 0), 0);

      return { ...video, score: decayed + interestBonus * 10 };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Apply diversity: no more than 2 consecutive from same creator
    const diverse: typeof scored = [];
    const creatorCount: Record<string, number> = {};
    for (const v of scored) {
      if (diverse.length >= count) break;
      creatorCount[v.userId] = (creatorCount[v.userId] || 0) + 1;
      if (creatorCount[v.userId] <= 2) {
        diverse.push(v);
      }
    }

    return diverse.map((v) => ({
      ...v,
      hashtags: v.hashtags.map((vh) => vh.hashtag.name),
    }));
  }

  /** Following feed — chronological from followed users */
  async getFollowingFeed(userId: string, page = 1, limit = 10) {
    const { skip, take } = paginate(page, limit);
    const cacheKey = RedisKeys.feedFollowing(userId);

    // Try Redis timeline cache
    const cachedIds = await redis.zrevrange(cacheKey, skip, skip + take - 1);
    if (cachedIds.length > 0) {
      const videos = await this.fetchVideosByIds(cachedIds, userId);
      return { videos, page, limit, hasMore: videos.length === take };
    }

    // Get followed user IDs
    const follows = await prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      select: { followingId: true },
    });
    const followingIds = follows.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return { videos: [], page, limit, hasMore: false };
    }

    const videos = await prisma.video.findMany({
      where: {
        userId: { in: followingIds },
        status: 'ACTIVE',
        privacyLevel: { in: ['PUBLIC', 'FOLLOWERS'] },
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
        hashtags: { include: { hashtag: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return {
      videos: videos.map((v) => ({ ...v, hashtags: v.hashtags.map((vh) => vh.hashtag.name) })),
      page,
      limit,
      hasMore: videos.length === take,
    };
  }

  /** Discover feed — trending hashtags, videos, suggested creators */
  async getDiscoverFeed(viewerId?: string) {
    const [trendingHashtags, suggestedCreators] = await Promise.all([
      prisma.hashtag.findMany({
        orderBy: { videosCount: 'desc' },
        take: 20,
        select: { id: true, name: true, videosCount: true, viewsCount: true, coverUrl: true },
      }),
      prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          videosCount: { gt: 0 },
          ...(viewerId ? { id: { not: viewerId } } : {}),
        },
        orderBy: { followersCount: 'desc' },
        take: 10,
        select: {
          id: true, username: true, displayName: true,
          avatarUrl: true, isVerified: true, followersCount: true,
        },
      }),
    ]);

    return { trendingHashtags, suggestedCreators };
  }

  /** Fan-out new video to followers' feed timelines */
  async distributeVideoToFollowers(videoId: string, userId: string) {
    // Only fan-out if creator has fewer than 10K followers (avoid thundering herd)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { followersCount: true } });
    if (!user || user.followersCount > 10_000) return;

    const followers = await prisma.follow.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      select: { followerId: true },
    });

    const pipeline = redis.pipeline();
    const score = Date.now() / 1000;
    for (const { followerId } of followers) {
      const timelineKey = RedisKeys.feedFollowing(followerId);
      pipeline.zadd(timelineKey, score, videoId);
      pipeline.zremrangebyrank(timelineKey, 0, -(FEED_SIZE + 1)); // Keep last N
      pipeline.expire(timelineKey, FEED_CACHE_TTL);
    }
    await pipeline.exec();

    logger.info(`Distributed video ${videoId} to ${followers.length} follower feeds`);
  }

  /** Fetch full video data for a list of IDs */
  private async fetchVideosByIds(ids: string[], viewerId?: string) {
    const videos = await prisma.video.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
        hashtags: { include: { hashtag: { select: { name: true } } } },
        music: { select: { id: true, title: true, artist: true } },
      },
    });

    // Preserve original order
    const map = new Map(videos.map((v) => [v.id, v]));
    return ids.map((id) => map.get(id)).filter(Boolean).map((v) => ({
      ...v!,
      hashtags: v!.hashtags.map((vh) => vh.hashtag.name),
    }));
  }
}

export const feedService = new FeedService();
