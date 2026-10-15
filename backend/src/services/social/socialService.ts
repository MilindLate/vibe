// src/services/social/socialService.ts
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { extractMentions, paginate } from '../../utils/helpers';
import { emitNotification } from '../../config/socketio';
import { logger } from '../../utils/logger';

export class SocialService {
  // ─── Follow ─────────────────────────────────────────────────────────────────

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new AppError('Cannot follow yourself', 400);

    // Check block
    const blocked = await prisma.userBlock.findFirst({
      where: { OR: [{ blockerId: followerId, blockedId: followingId }, { blockerId: followingId, blockedId: followerId }] },
    });
    if (blocked) throw new AppError('Unable to follow this user', 403);

    const target = await prisma.user.findUnique({
      where: { id: followingId },
      select: { isPrivate: true, username: true },
    });
    if (!target) throw new AppError('User not found', 404);

    const status = target.isPrivate ? 'PENDING' : 'ACCEPTED';

    try {
      await prisma.follow.create({ data: { followerId, followingId, status } });

      if (status === 'ACCEPTED') {
        await prisma.user.update({ where: { id: followingId }, data: { followersCount: { increment: 1 } } });
        await prisma.user.update({ where: { id: followerId }, data: { followingCount: { increment: 1 } } });

        // Notify
        const notification = await prisma.notification.create({
          data: { userId: followingId, actorId: followerId, type: 'FOLLOW', referenceType: 'user' },
        });
        emitNotification(followingId, notification);
      } else {
        const notification = await prisma.notification.create({
          data: { userId: followingId, actorId: followerId, type: 'FOLLOW_REQUEST', referenceType: 'user' },
        });
        emitNotification(followingId, notification);
      }

      return { status };
    } catch (err: any) {
      if (err.code === 'P2002') return { status }; // Already following
      throw err;
    }
  }

  async unfollowUser(followerId: string, followingId: string) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!follow) return;

    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (follow.status === 'ACCEPTED') {
      await prisma.user.update({ where: { id: followingId }, data: { followersCount: { decrement: 1 } } });
      await prisma.user.update({ where: { id: followerId }, data: { followingCount: { decrement: 1 } } });
    }
  }

  async getFollowers(userId: string, viewerId: string | undefined, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const followers = await prisma.follow.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      include: {
        follower: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    return { followers: followers.map((f) => f.follower), page, limit, hasMore: followers.length === take };
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const following = await prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      include: {
        following: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    return { following: following.map((f) => f.following), page, limit, hasMore: following.length === take };
  }

  // ─── Comments ────────────────────────────────────────────────────────────────

  async addComment(videoId: string, userId: string, content: string, parentId?: string) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true, allowComments: true, status: true },
    });
    if (!video) throw new AppError('Video not found', 404);
    if (!video.allowComments) throw new AppError('Comments are disabled on this video', 403);
    if (video.status !== 'ACTIVE') throw new AppError('Video not available', 410);

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.videoId !== videoId) throw new AppError('Parent comment not found', 404);
    }

    const comment = await prisma.comment.create({
      data: { videoId, userId, content, parentId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await prisma.video.update({ where: { id: videoId }, data: { commentsCount: { increment: 1 } } });

    // Notify video owner
    if (video.userId !== userId) {
      const notification = await prisma.notification.create({
        data: {
          userId: video.userId,
          actorId: userId,
          type: 'COMMENT',
          referenceId: videoId,
          referenceType: 'video',
        },
      });
      emitNotification(video.userId, notification);
    }

    // Notify mentioned users
    const mentions = extractMentions(content);
    for (const username of mentions.slice(0, 5)) {
      const mentioned = await prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (mentioned && mentioned.id !== userId) {
        const n = await prisma.notification.create({
          data: { userId: mentioned.id, actorId: userId, type: 'MENTION', referenceId: comment.id, referenceType: 'comment' },
        });
        emitNotification(mentioned.id, n);
      }
    }

    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { video: { select: { userId: true } } },
    });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.userId !== userId && comment.video.userId !== userId) {
      throw new AppError('Not authorized to delete this comment', 403);
    }

    await prisma.comment.delete({ where: { id: commentId } });
    await prisma.video.update({ where: { id: comment.videoId }, data: { commentsCount: { decrement: 1 } } });
  }

  async getComments(videoId: string, page = 1, limit = 20, viewerId?: string) {
    const { skip, take } = paginate(page, limit);
    const comments = await prisma.comment.findMany({
      where: { videoId, parentId: null }, // top-level only
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
        replies: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          take: 3,
          orderBy: { likesCount: 'desc' },
        },
        _count: { select: { replies: true } },
      },
      skip,
      take,
      orderBy: { likesCount: 'desc' },
    });
    return { comments, page, limit, hasMore: comments.length === take };
  }

  async likeComment(commentId: string, userId: string) {
    try {
      await prisma.like.create({ data: { userId, commentId } });
      await prisma.comment.update({ where: { id: commentId }, data: { likesCount: { increment: 1 } } });
      return { liked: true };
    } catch (err: any) {
      if (err.code === 'P2002') return { liked: true };
      throw err;
    }
  }

  async unlikeComment(commentId: string, userId: string) {
    const deleted = await prisma.like.deleteMany({ where: { userId, commentId } });
    if (deleted.count > 0) {
      await prisma.comment.update({ where: { id: commentId }, data: { likesCount: { decrement: 1 } } });
    }
    return { liked: false };
  }

  async shareVideo(videoId: string) {
    await prisma.video.update({ where: { id: videoId }, data: { sharesCount: { increment: 1 } } });
  }

  async getSuggestedUsers(userId: string, limit = 10) {
    // Find users that the people I follow also follow (2nd-degree connections)
    const following = await prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const suggested = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        id: { notIn: [...followingIds, userId] },
        followersCount: { gt: 100 },
      },
      select: {
        id: true, username: true, displayName: true,
        avatarUrl: true, isVerified: true, followersCount: true,
      },
      orderBy: { followersCount: 'desc' },
      take: limit,
    });

    return suggested;
  }
}

export const socialService = new SocialService();
