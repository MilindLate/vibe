// src/routes/adminRoutes.ts
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const adminRoutes = Router();

// GET /api/admin/stats – summary numbers (admin only)
adminRoutes.get(
  '/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'ADMIN') throw new AppError('Forbidden: Admin access required', 403);
    const [usersCount, videosCount] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
    ]);
    res.json({ success: true, data: { usersCount, videosCount } });
  })
);

// GET /api/admin/users
adminRoutes.get(
  '/users',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'ADMIN') throw new AppError('Forbidden: Admin access required', 403);
    const users = await prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    res.json({ success: true, data: users });
  })
);

// GET /api/admin/videos
adminRoutes.get(
  '/videos',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'ADMIN') throw new AppError('Forbidden: Admin access required', 403);
    const videos = await prisma.video.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });
    res.json({ success: true, data: videos });
  })
);
