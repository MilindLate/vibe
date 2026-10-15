// src/routes/messagingRoutes.ts
import { Router } from 'express';
import { messagingService } from '../services/messaging/messagingService';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const messagingRoutes = Router();

messagingRoutes.post('/conversations', authenticate, asyncHandler(async (req, res) => {
  const { participantIds, type, name } = req.body;
  if (!participantIds?.length) throw new AppError('participantIds required', 400);
  const conversation = await messagingService.createConversation(
    req.user!.userId, participantIds, type || 'DIRECT', name
  );
  res.status(201).json({ success: true, data: conversation });
}));

messagingRoutes.get('/conversations', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query as Record<string, string>;
  const result = await messagingService.getConversations(req.user!.userId, +page, +limit);
  res.json({ success: true, data: result });
}));

messagingRoutes.get('/conversations/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const { cursor, limit = 30 } = req.query as Record<string, string>;
  const result = await messagingService.getMessages(req.params.id, req.user!.userId, cursor, +limit);
  res.json({ success: true, data: result });
}));

messagingRoutes.post('/conversations/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const { content, mediaUrl } = req.body;
  if (!content && !mediaUrl) throw new AppError('Message content required', 400);
  const message = await messagingService.sendMessage(req.params.id, req.user!.userId, content, mediaUrl);
  res.status(201).json({ success: true, data: message });
}));

messagingRoutes.post('/conversations/:id/read', authenticate, asyncHandler(async (req, res) => {
  await messagingService.markAsRead(req.params.id, req.user!.userId);
  res.json({ success: true });
}));

messagingRoutes.delete('/messages/:id', authenticate, asyncHandler(async (req, res) => {
  await messagingService.deleteMessage(req.params.id, req.user!.userId);
  res.json({ success: true });
}));
