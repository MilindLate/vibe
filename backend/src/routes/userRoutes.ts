// src/routes/userRoutes.ts
import { Router } from 'express';
import Joi from 'joi';
import { userService } from '../services/user/userService';
import { authenticate, optionalAuth, verifyRefreshToken } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimiter';
import { uploadAvatar } from '../middleware/upload';

export const userRoutes = Router();

const validate = (schema: Joi.ObjectSchema) =>
  (req: any, _res: any, next: any) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) return next(new AppError(error.details.map((d) => d.message).join(', '), 422));
    next();
  };

// POST /api/users/register
userRoutes.post(
  '/register',
  authLimiter,
  validate(
    Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).max(128).required(),
      displayName: Joi.string().min(1).max(50).required(),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await userService.register(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

// POST /api/users/login
userRoutes.post(
  '/login',
  authLimiter,
  validate(
    Joi.object({
      emailOrUsername: Joi.string().required(),
      password: Joi.string().required(),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await userService.login(req.body);
    res.json({ success: true, data: result });
  })
);

// POST /api/users/refresh
userRoutes.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);
    const payload = verifyRefreshToken(refreshToken);
    const tokens = await userService.refreshToken(refreshToken, payload.userId);
    res.json({ success: true, data: tokens });
  })
);

// POST /api/users/logout
userRoutes.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization!.slice(7);
    const { refreshToken } = req.body;
    await userService.logout(req.user!.userId, token, refreshToken);
    res.json({ success: true, message: 'Logged out successfully' });
  })
);

// GET /api/users/me
userRoutes.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.user!.username, req.user!.userId);
    res.json({ success: true, data: profile });
  })
);

// GET /api/users/:username
userRoutes.get(
  '/:username',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.params.username, req.user?.userId);
    res.json({ success: true, data: profile });
  })
);

// PATCH /api/users/me
userRoutes.patch(
  '/me',
  authenticate,
  validate(
    Joi.object({
      displayName: Joi.string().min(1).max(50),
      bio: Joi.string().max(300).allow(''),
      isPrivate: Joi.boolean(),
    }).min(1)
  ),
  asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user!.userId, req.body);
    res.json({ success: true, data: user });
  })
);

// POST /api/users/me/avatar
userRoutes.post(
  '/me/avatar',
  authenticate,
  uploadAvatar,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No file uploaded', 400);
    const url = await userService.updateAvatar(
      req.user!.userId,
      req.file.buffer,
      req.file.mimetype
    );
    res.json({ success: true, data: { avatarUrl: url } });
  })
);

// POST /api/users/forgot-password
userRoutes.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    await userService.forgotPassword(req.body.email);
    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  })
);

// POST /api/users/reset-password
userRoutes.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) throw new AppError('Token and password required', 400);
    await userService.resetPassword(token, password);
    res.json({ success: true, message: 'Password reset successful' });
  })
);

// PATCH /api/users/me/password
userRoutes.patch(
  '/me/password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) throw new AppError('Old and new passwords required', 400);
    await userService.changePassword(req.user!.userId, oldPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  })
);

// GET /api/users/search?q=...&page=...&limit=...
userRoutes.get(
  '/search',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query as Record<string, string>;
    if (!q) throw new AppError('Query parameter q is required', 400);
    const result = await userService.searchUsers(q, +page, +limit, req.user?.userId);
    res.json({ success: true, data: result });
  })
);

// POST /api/users/:userId/block
userRoutes.post(
  '/:userId/block',
  authenticate,
  asyncHandler(async (req, res) => {
    await userService.blockUser(req.user!.userId, req.params.userId);
    res.json({ success: true, message: 'User blocked' });
  })
);

// DELETE /api/users/:userId/block
userRoutes.delete(
  '/:userId/block',
  authenticate,
  asyncHandler(async (req, res) => {
    await userService.unblockUser(req.user!.userId, req.params.userId);
    res.json({ success: true, message: 'User unblocked' });
  })
);
