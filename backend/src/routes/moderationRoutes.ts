// src/routes/moderationRoutes.ts
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const moderationRoutes = Router();

// POST /api/moderation/reports — Submit a report
moderationRoutes.post('/reports', authenticate, asyncHandler(async (req, res) => {
  const { targetId, targetType, reason, description } = req.body;
  if (!targetId || !targetType || !reason) throw new AppError('targetId, targetType, and reason are required', 400);

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.userId,
      targetId,
      targetType,
      reason,
      description,
    },
  });
  res.status(201).json({ success: true, data: report });
}));

// GET /api/moderation/reports — Admin: get all reports
moderationRoutes.get('/reports', authenticate, authorize('MODERATOR', 'ADMIN'), asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query as Record<string, string>;
  const { skip, take } = { skip: (+page - 1) * +limit, take: +limit };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: { ...(status ? { status: status as any } : {}) },
      include: {
        reporter: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.report.count({ where: { ...(status ? { status: status as any } : {}) } }),
  ]);

  res.json({ success: true, data: { reports, total, page: +page, limit: +limit } });
}));

// PATCH /api/moderation/reports/:id — Admin: review a report
moderationRoutes.patch('/reports/:id', authenticate, authorize('MODERATOR', 'ADMIN'), asyncHandler(async (req, res) => {
  const { status, resolution } = req.body;

  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: {
      status,
      resolution,
      reviewedById: req.user!.userId,
      resolvedAt: new Date(),
    },
  });

  // If approved: take action on content
  if (status === 'RESOLVED' && req.body.action) {
    const { action } = req.body;
    if (action === 'remove_video' && report.targetType === 'VIDEO') {
      await prisma.video.update({ where: { id: report.targetId }, data: { status: 'REMOVED' } });
    } else if (action === 'ban_user' && report.targetType === 'USER') {
      await prisma.user.update({ where: { id: report.targetId }, data: { status: 'BANNED' } });
    } else if (action === 'suspend_user' && report.targetType === 'USER') {
      await prisma.user.update({ where: { id: report.targetId }, data: { status: 'SUSPENDED' } });
    }
  }

  res.json({ success: true, data: report });
}));
