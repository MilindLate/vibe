// src/routes/socialRoutes.ts
import { Router } from 'express';
import { socialService } from '../services/social/socialService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const socialRoutes = Router();

// POST /api/social/follow/:userId
socialRoutes.post('/:userId/follow', authenticate, asyncHandler(async (req, res) => {
  const result = await socialService.followUser(req.user!.userId, req.params.userId);
  res.json({ success: true, data: result });
}));

// DELETE /api/social/follow/:userId
socialRoutes.delete('/:userId/follow', authenticate, asyncHandler(async (req, res) => {
  await socialService.unfollowUser(req.user!.userId, req.params.userId);
  res.json({ success: true, message: 'Unfollowed' });
}));

// GET /api/social/:userId/followers
socialRoutes.get('/:userId/followers', optionalAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query as Record<string, string>;
  const result = await socialService.getFollowers(req.params.userId, req.user?.userId, +page, +limit);
  res.json({ success: true, data: result });
}));

// GET /api/social/:userId/following
socialRoutes.get('/:userId/following', optionalAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query as Record<string, string>;
  const result = await socialService.getFollowing(req.params.userId, +page, +limit);
  res.json({ success: true, data: result });
}));

// POST /api/social/videos/:videoId/comments
socialRoutes.post('/videos/:videoId/comments', authenticate, asyncHandler(async (req, res) => {
  const { content, parentId } = req.body;
  if (!content) throw new AppError('Comment content is required', 400);
  const comment = await socialService.addComment(req.params.videoId, req.user!.userId, content, parentId);
  res.status(201).json({ success: true, data: comment });
}));

// DELETE /api/social/comments/:commentId
socialRoutes.delete('/comments/:commentId', authenticate, asyncHandler(async (req, res) => {
  await socialService.deleteComment(req.params.commentId, req.user!.userId);
  res.json({ success: true, message: 'Comment deleted' });
}));

// GET /api/social/videos/:videoId/comments
socialRoutes.get('/videos/:videoId/comments', optionalAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query as Record<string, string>;
  const result = await socialService.getComments(req.params.videoId, +page, +limit, req.user?.userId);
  res.json({ success: true, data: result });
}));

// POST /api/social/comments/:commentId/like
socialRoutes.post('/comments/:commentId/like', authenticate, asyncHandler(async (req, res) => {
  const result = await socialService.likeComment(req.params.commentId, req.user!.userId);
  res.json({ success: true, data: result });
}));

// DELETE /api/social/comments/:commentId/like
socialRoutes.delete('/comments/:commentId/like', authenticate, asyncHandler(async (req, res) => {
  const result = await socialService.unlikeComment(req.params.commentId, req.user!.userId);
  res.json({ success: true, data: result });
}));

// POST /api/social/videos/:videoId/share
socialRoutes.post('/videos/:videoId/share', asyncHandler(async (req, res) => {
  await socialService.shareVideo(req.params.videoId);
  res.json({ success: true, message: 'Share tracked' });
}));

// GET /api/social/suggested-users
socialRoutes.get('/suggested-users', authenticate, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query as Record<string, string>;
  const users = await socialService.getSuggestedUsers(req.user!.userId, +limit);
  res.json({ success: true, data: users });
}));
