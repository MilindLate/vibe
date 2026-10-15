// src/routes/videoRoutes.ts
import { Router } from 'express';
import { videoService } from '../services/video/videoService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { uploadVideo } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rateLimiter';
import { extractHashtags } from '../utils/helpers';

export const videoRoutes = Router();

// POST /api/videos — Upload video
videoRoutes.post(
  '/',
  authenticate,
  uploadLimiter,
  uploadVideo,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('Video file is required', 400);

    const { title, description, privacyLevel, musicId, hashtags,
      allowComments, allowDuet, allowStitch } = req.body;

    if (!title) throw new AppError('Title is required', 400);

    const video = await videoService.uploadVideo({
      userId: req.user!.userId,
      title,
      description,
      fileBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      privacyLevel,
      musicId,
      hashtags: hashtags ? JSON.parse(hashtags) : extractHashtags(description || ''),
      allowComments: allowComments !== 'false',
      allowDuet: allowDuet !== 'false',
      allowStitch: allowStitch !== 'false',
    });

    res.status(201).json({ success: true, data: video });
  })
);

// GET /api/videos/trending
videoRoutes.get(
  '/trending',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query as Record<string, string>;
    const result = await videoService.getTrendingVideos(+page, +limit);
    res.json({ success: true, data: result });
  })
);

// GET /api/videos/:id
videoRoutes.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const video = await videoService.getVideo(req.params.id, req.user?.userId);
    res.json({ success: true, data: video });
  })
);

// PATCH /api/videos/:id
videoRoutes.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const video = await videoService.updateVideo(req.params.id, req.user!.userId, req.body);
    res.json({ success: true, data: video });
  })
);

// DELETE /api/videos/:id
videoRoutes.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await videoService.deleteVideo(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Video deleted' });
  })
);

// POST /api/videos/:id/like
videoRoutes.post(
  '/:id/like',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await videoService.likeVideo(req.params.id, req.user!.userId);
    res.json({ success: true, data: result });
  })
);

// DELETE /api/videos/:id/like
videoRoutes.delete(
  '/:id/like',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await videoService.unlikeVideo(req.params.id, req.user!.userId);
    res.json({ success: true, data: result });
  })
);

// GET /api/videos/hashtag/:tag
videoRoutes.get(
  '/hashtag/:tag',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query as Record<string, string>;
    const result = await videoService.getVideosByHashtag(req.params.tag, +page, +limit);
    res.json({ success: true, data: result });
  })
);

// GET /api/videos/user/:userId
videoRoutes.get(
  '/user/:userId',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query as Record<string, string>;
    const result = await videoService.getUserVideos(req.params.userId, req.user?.userId, +page, +limit);
    res.json({ success: true, data: result });
  })
);
