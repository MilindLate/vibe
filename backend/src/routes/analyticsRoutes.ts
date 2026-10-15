// src/routes/analyticsRoutes.ts
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { paginate } from '../utils/helpers';

export const analyticsRoutes = Router();

// POST /api/analytics/view — Track a video view
analyticsRoutes.post('/view', asyncHandler(async (req, res) => {
  const { videoId, watchDuration, completionRate } = req.body;
  if (!videoId) return res.json({ success: true });

  await prisma.videoView.create({
    data: {
      videoId,
      userId: (req as any).user?.userId,
      watchDuration: watchDuration || 0,
      completionRate: Math.min(1, Math.max(0, completionRate || 0)),
    },
  });
  res.json({ success: true });
}));

// GET /api/analytics/video/:videoId — Creator analytics for a video
analyticsRoutes.get('/video/:videoId', authenticate, asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await prisma.video.findUnique({
    where: { id: videoId, userId: req.user!.userId },
    select: { id: true, title: true, viewsCount: true, likesCount: true, commentsCount: true, sharesCount: true, createdAt: true },
  });
  if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

  const views = await prisma.videoView.aggregate({
    where: { videoId },
    _avg: { watchDuration: true, completionRate: true },
    _count: true,
  });

  // Views per day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000);
  const dailyViews = await prisma.videoView.groupBy({
    by: ['createdAt'],
    where: { videoId, createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  });

  res.json({
    success: true,
    data: {
      video,
      avgWatchDuration: views._avg.watchDuration || 0,
      avgCompletionRate: views._avg.completionRate || 0,
      totalViews: views._count,
      dailyViews,
    },
  });
}));

// GET /api/analytics/profile — Creator profile analytics
analyticsRoutes.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { followersCount: true, followingCount: true, likesCount: true, videosCount: true },
  });

  const topVideos = await prisma.video.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { id: true, title: true, thumbnailUrl: true, viewsCount: true, likesCount: true },
    orderBy: { viewsCount: 'desc' },
    take: 5,
  });

  res.json({ success: true, data: { ...user, topVideos } });
}));
