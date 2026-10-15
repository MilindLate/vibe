// src/services/video/videoService.ts
import { prisma } from '../../config/database';
import { redis, RedisKeys } from '../../config/redis';
import { storageService } from '../storage/storageService';
import { AppError } from '../../middleware/errorHandler';
import {
  buildVideoKey, buildThumbnailKey, generateId,
  calculateEngagementScore, timeDecayScore, extractHashtags, paginate,
} from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { Queue } from 'bullmq';
import { config } from '../../config';

// BullMQ queues
const videoQueue = new Queue('video-processing', {
  connection: { host: new URL(config.redis.url).hostname, port: parseInt(new URL(config.redis.url).port || '6379') },
});

export interface UploadVideoInput {
  userId: string;
  title: string;
  description?: string;
  fileBuffer: Buffer;
  mimeType: string;
  originalName: string;
  fileSize: number;
  musicId?: string;
  isOriginalSound?: boolean;
  allowComments?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
  privacyLevel?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  hashtags?: string[];
}

export class VideoService {
  /** Upload video: store to S3, create DB record, queue processing */
  async uploadVideo(input: UploadVideoInput) {
    const {
      userId, title, description, fileBuffer, mimeType, fileSize,
      musicId, isOriginalSound = false, allowComments = true,
      allowDuet = true, allowStitch = true, privacyLevel = 'PUBLIC', hashtags = [],
    } = input;

    const videoId = generateId(16);
    const ext = mimeType.split('/')[1] || 'mp4';
    const rawKey = buildVideoKey(userId, videoId, 'raw');

    // Upload raw video to S3
    const videoUrl = await storageService.upload(rawKey, fileBuffer, mimeType, 'videos');

    // Extract hashtags from title + description + explicit list
    const allTags = [
      ...hashtags,
      ...extractHashtags(title),
      ...extractHashtags(description || ''),
    ];
    const uniqueTags = [...new Set(allTags)];

    // Create video record
    const video = await prisma.video.create({
      data: {
        id: videoId,
        userId,
        title,
        description,
        videoUrl,
        fileSize: BigInt(fileSize),
        format: ext,
        status: 'PROCESSING',
        privacyLevel,
        musicId,
        isOriginalSound,
        allowComments,
        allowDuet,
        allowStitch,
        duration: 0,
      },
    });

    // Upsert hashtags and link
    for (const tag of uniqueTags) {
      const hashtag = await prisma.hashtag.upsert({
        where: { name: tag },
        create: { name: tag, videosCount: 1 },
        update: { videosCount: { increment: 1 } },
      });
      await prisma.videoHashtag.upsert({
        where: { videoId_hashtagId: { videoId: video.id, hashtagId: hashtag.id } },
        create: { videoId: video.id, hashtagId: hashtag.id },
        update: {},
      }).catch(() => {}); // Ignore duplicate
    }

    // Increment user video count
    await prisma.user.update({
      where: { id: userId },
      data: { videosCount: { increment: 1 } },
    });

    // Queue transcoding job
    await videoQueue.add('transcode', { videoId, userId, videoUrl, rawKey }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    logger.info(`Video uploaded and queued for processing: ${videoId}`);
    return video;
  }

  /** Get video by ID, track view */
  async getVideo(videoId: string, viewerId?: string) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
        hashtags: { include: { hashtag: { select: { name: true } } } },
        music: { select: { id: true, title: true, artist: true, audioUrl: true } },
      },
    });
    if (!video) throw new AppError('Video not found', 404);
    if (video.status === 'REMOVED') throw new AppError('Video not available', 410);

    // Privacy check
    if (video.privacyLevel === 'PRIVATE' && video.userId !== viewerId) {
      throw new AppError('This video is private', 403);
    }

    // Track view (deduplicate per user per video per hour via Redis)
    if (viewerId) {
      const viewKey = `viewd:${viewerId}:${videoId}`;
      const alreadyViewed = await redis.exists(viewKey);
      if (!alreadyViewed) {
        await redis.setex(viewKey, 3600, '1');
        await prisma.video.update({
          where: { id: videoId },
          data: { viewsCount: { increment: 1 } },
        });
      }
    } else {
      // Anonymous view — always count
      await prisma.video.update({
        where: { id: videoId },
        data: { viewsCount: { increment: 1 } },
      });
    }

    return {
      ...video,
      hashtags: video.hashtags.map((vh) => vh.hashtag.name),
    };
  }

  /** Update video metadata */
  async updateVideo(
    videoId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string;
      privacyLevel?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
      allowComments?: boolean;
    }
  ) {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new AppError('Video not found', 404);
    if (video.userId !== userId) throw new AppError('Not authorized', 403);

    return prisma.video.update({ where: { id: videoId }, data: updates });
  }

  /** Soft-delete video */
  async deleteVideo(videoId: string, userId: string) {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new AppError('Video not found', 404);
    if (video.userId !== userId) throw new AppError('Not authorized', 403);

    await prisma.video.update({ where: { id: videoId }, data: { status: 'REMOVED' } });
    await prisma.user.update({ where: { id: userId }, data: { videosCount: { decrement: 1 } } });

    logger.info(`Video ${videoId} soft-deleted by user ${userId}`);
  }

  /** Get videos by user */
  async getUserVideos(profileUserId: string, viewerId: string | undefined, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const isOwn = viewerId === profileUserId;

    const videos = await prisma.video.findMany({
      where: {
        userId: profileUserId,
        status: 'ACTIVE',
        ...(isOwn ? {} : { privacyLevel: { in: ['PUBLIC', 'FOLLOWERS'] } }),
      },
      select: {
        id: true, title: true, thumbnailUrl: true, duration: true,
        viewsCount: true, likesCount: true, commentsCount: true,
        privacyLevel: true, createdAt: true, status: true,
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return { videos, page, limit, hasMore: videos.length === take };
  }

  /** Get videos by hashtag */
  async getVideosByHashtag(hashtagName: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const hashtag = await prisma.hashtag.findUnique({ where: { name: hashtagName.toLowerCase() } });
    if (!hashtag) return { hashtag: null, videos: [], page, limit, hasMore: false };

    const videoHashtags = await prisma.videoHashtag.findMany({
      where: { hashtagId: hashtag.id },
      include: {
        video: {
          include: {
            user: { select: { username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      skip,
      take,
      orderBy: { video: { viewsCount: 'desc' } },
    });

    return {
      hashtag,
      videos: videoHashtags.map((vh) => vh.video),
      page,
      limit,
      hasMore: videoHashtags.length === take,
    };
  }

  /** Get trending videos */
  async getTrendingVideos(page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);

    // Try cache first
    const cacheKey = `trending:videos:${page}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000); // last 7 days
    const videos = await prisma.video.findMany({
      where: { status: 'ACTIVE', privacyLevel: 'PUBLIC', createdAt: { gte: since } },
      select: {
        id: true, title: true, thumbnailUrl: true, duration: true,
        viewsCount: true, likesCount: true, commentsCount: true, sharesCount: true,
        createdAt: true,
        user: { select: { username: true, displayName: true, avatarUrl: true } },
      },
      skip,
      take,
    });

    // Sort by time-decayed engagement score
    const ranked = videos
      .map((v) => ({
        ...v,
        score: timeDecayScore(
          calculateEngagementScore(v.viewsCount, v.likesCount, v.commentsCount, v.sharesCount),
          v.createdAt
        ),
      }))
      .sort((a, b) => b.score - a.score);

    const result = { videos: ranked, page, limit, hasMore: ranked.length === take };
    await redis.setex(cacheKey, 300, JSON.stringify(result)); // Cache 5 min
    return result;
  }

  /** Like a video */
  async likeVideo(videoId: string, userId: string) {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new AppError('Video not found', 404);

    try {
      await prisma.like.create({ data: { userId, videoId } });
      await prisma.video.update({ where: { id: videoId }, data: { likesCount: { increment: 1 } } });
      await prisma.user.update({
        where: { id: video.userId },
        data: { likesCount: { increment: 1 } },
      });
      return { liked: true };
    } catch (err: any) {
      if (err.code === 'P2002') return { liked: true }; // Already liked
      throw err;
    }
  }

  /** Unlike a video */
  async unlikeVideo(videoId: string, userId: string) {
    const deleted = await prisma.like.deleteMany({ where: { userId, videoId } });
    if (deleted.count > 0) {
      await prisma.video.update({ where: { id: videoId }, data: { likesCount: { decrement: 1 } } });
      const video = await prisma.video.findUnique({ where: { id: videoId }, select: { userId: true } });
      if (video) {
        await prisma.user.update({ where: { id: video.userId }, data: { likesCount: { decrement: 1 } } });
      }
    }
    return { liked: false };
  }

  /** Check if user has liked a video */
  async isLiked(videoId: string, userId: string): Promise<boolean> {
    const like = await prisma.like.findFirst({ where: { userId, videoId } });
    return !!like;
  }
}

export const videoService = new VideoService();
