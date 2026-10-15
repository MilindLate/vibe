// src/services/search/searchService.ts
import { prisma } from '../../config/database';
import { redis, RedisKeys } from '../../config/redis';
import { paginate } from '../../utils/helpers';

export class SearchService {
  /** Combined search across videos, users, hashtags */
  async searchAll(query: string, page = 1, limit = 10) {
    const [users, videos, hashtags] = await Promise.all([
      this.searchUsers(query, 1, 5),
      this.searchVideos(query, 1, 10),
      this.searchHashtags(query, 1, 10),
    ]);
    // Record search for trending
    await redis.zincrby(RedisKeys.trendingSearches(), 1, query.toLowerCase());
    return { users: users.users, videos: videos.videos, hashtags: hashtags.hashtags, query };
  }

  async searchUsers(query: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, username: true, displayName: true,
        avatarUrl: true, isVerified: true, followersCount: true, bio: true,
      },
      orderBy: { followersCount: 'desc' },
      skip,
      take,
    });
    return { users, page, limit, hasMore: users.length === take };
  }

  async searchVideos(query: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const videos = await prisma.video.findMany({
      where: {
        status: 'ACTIVE',
        privacyLevel: 'PUBLIC',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        user: { select: { username: true, displayName: true, avatarUrl: true } },
        hashtags: { include: { hashtag: { select: { name: true } } } },
      },
      orderBy: { viewsCount: 'desc' },
      skip,
      take,
    });
    return {
      videos: videos.map((v) => ({ ...v, hashtags: v.hashtags.map((vh) => vh.hashtag.name) })),
      page, limit, hasMore: videos.length === take,
    };
  }

  async searchHashtags(query: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const hashtags = await prisma.hashtag.findMany({
      where: { name: { contains: query.toLowerCase(), mode: 'insensitive' } },
      orderBy: { videosCount: 'desc' },
      skip,
      take,
    });
    return { hashtags, page, limit, hasMore: hashtags.length === take };
  }

  async getTrendingSearches(limit = 10): Promise<string[]> {
    return redis.zrevrange(RedisKeys.trendingSearches(), 0, limit - 1);
  }

  async getAutocompleteSuggestions(query: string): Promise<string[]> {
    const [users, hashtags] = await Promise.all([
      prisma.user.findMany({
        where: { username: { startsWith: query, mode: 'insensitive' }, status: 'ACTIVE' },
        select: { username: true },
        take: 5,
        orderBy: { followersCount: 'desc' },
      }),
      prisma.hashtag.findMany({
        where: { name: { startsWith: query.toLowerCase() } },
        select: { name: true },
        take: 5,
        orderBy: { videosCount: 'desc' },
      }),
    ]);
    return [
      ...users.map((u) => u.username),
      ...hashtags.map((h) => `#${h.name}`),
    ];
  }
}

export const searchService = new SearchService();
