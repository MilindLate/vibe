// src/routes/searchRoutes.ts
import { Router } from 'express';
import { searchService } from '../services/search/searchService';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { searchLimiter } from '../middleware/rateLimiter';

export const searchRoutes = Router();

// GET /api/search?q=...
searchRoutes.get('/', searchLimiter, optionalAuth, asyncHandler(async (req, res) => {
  const { q, type = 'all', page = 1, limit = 20 } = req.query as Record<string, string>;
  if (!q) throw new AppError('Query parameter q is required', 400);

  let result;
  switch (type) {
    case 'users':    result = await searchService.searchUsers(q, +page, +limit); break;
    case 'videos':   result = await searchService.searchVideos(q, +page, +limit); break;
    case 'hashtags': result = await searchService.searchHashtags(q, +page, +limit); break;
    default:         result = await searchService.searchAll(q, +page, +limit);
  }
  res.json({ success: true, data: result });
}));

// GET /api/search/trending
searchRoutes.get('/trending', asyncHandler(async (_req, res) => {
  const searches = await searchService.getTrendingSearches(20);
  res.json({ success: true, data: searches });
}));

// GET /api/search/autocomplete?q=...
searchRoutes.get('/autocomplete', asyncHandler(async (req, res) => {
  const { q } = req.query as Record<string, string>;
  if (!q || q.length < 1) return res.json({ success: true, data: [] });
  const suggestions = await searchService.getAutocompleteSuggestions(q);
  res.json({ success: true, data: suggestions });
}));
