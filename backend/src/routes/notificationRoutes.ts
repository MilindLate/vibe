// src/routes/notificationRoutes.ts
import { Router } from 'express';
import { notificationService } from '../services/notification/notificationService';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const notificationRoutes = Router();

notificationRoutes.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query as Record<string, string>;
  const result = await notificationService.getNotifications(req.user!.userId, +page, +limit);
  res.json({ success: true, data: result });
}));

notificationRoutes.get('/unread-count', authenticate, asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user!.userId);
  res.json({ success: true, data: { count } });
}));

notificationRoutes.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user!.userId);
  res.json({ success: true });
}));

notificationRoutes.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user!.userId);
  res.json({ success: true });
}));

notificationRoutes.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user!.userId);
  res.json({ success: true });
}));
