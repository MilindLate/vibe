// src/routes/feedRoutes.ts
import { Router } from 'express';
import { feedService } from '../services/feed/feedService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const feedRoutes = Router();

// GET /api/feed/foryou
feedRoutes.get(
  '/foryou',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query as Record<string, string>;
    const result = await feedService.getForYouFeed(req.user?.userId, +page, +limit);
    res.json({ success: true, data: result });
  })
);

// GET /api/feed/following
feedRoutes.get(
  '/following',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query as Record<string, string>;
    const result = await feedService.getFollowingFeed(req.user!.userId, +page, +limit);
    res.json({ success: true, data: result });
  })
);

// GET /api/feed/discover
feedRoutes.get(
  '/discover',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const result = await feedService.getDiscoverFeed(req.user?.userId);
    res.json({ success: true, data: result });
  })
);
