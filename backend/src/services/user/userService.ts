// src/services/user/userService.ts
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { redis, RedisKeys } from '../../config/redis';
import { generateTokens, revokeToken } from '../../middleware/auth';
import { generateId, generateSecureToken, buildAvatarKey, paginate } from '../../utils/helpers';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  emailOrUsername: string;
  password: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  isPrivate?: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class UserService {
  /** Register a new user */
  async register(input: RegisterInput) {
    const { username, email, password, displayName } = input;

    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    if (existing?.email === email) throw new AppError('Email already registered', 409);
    if (existing?.username === username) throw new AppError('Username already taken', 409);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { username, email, passwordHash, displayName },
      select: {
        id: true, username: true, email: true, displayName: true,
        avatarUrl: true, isVerified: true, role: true, createdAt: true,
      },
    });

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Store refresh token in Redis (7 days)
    await redis.setex(`refresh:${user.id}:${(refreshToken as string).slice(-16)}`, 7 * 86400, '1');

    return { user, accessToken, refreshToken };
  }

  /** Login with email/username + password */
  async login(input: LoginInput) {
    const { emailOrUsername, password } = input;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
        status: 'ACTIVE',
      },
    });

    if (!user) throw new AppError('Invalid credentials', 401);

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new AppError('Invalid credentials', 401);

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    await redis.setex(`refresh:${user.id}:${(refreshToken as string).slice(-16)}`, 7 * 86400, '1');

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  /** Refresh access token using a valid refresh token */
  async refreshToken(refreshToken: string, userId: string) {
    const exists = await redis.get(`refresh:${userId}:${(refreshToken as string).slice(-16)}`);
    if (!exists) throw new AppError('Refresh token invalid or expired', 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') throw new AppError('User not found or suspended', 401);

    const tokens = generateTokens({ userId: user.id, username: user.username, role: user.role });

    // Rotate: delete old, store new
    await redis.del(`refresh:${userId}:${(refreshToken as string).slice(-16)}`);
    await redis.setex(`refresh:${user.id}:${(tokens.refreshToken as string).slice(-16)}`, 7 * 86400, '1');

    return tokens;
  }

  /** Logout — revoke tokens */
  async logout(userId: string, accessToken: string, refreshToken?: string) {
    await revokeToken(accessToken, 900);
    if (refreshToken) await redis.del(`refresh:${userId}:${(refreshToken as string).slice(-16)}`);
  }

  /** Get user profile by username */
  async getProfile(username: string, viewerId?: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, displayName: true, bio: true,
        avatarUrl: true, coverUrl: true, isVerified: true, isPrivate: true,
        followersCount: true, followingCount: true, likesCount: true,
        videosCount: true, createdAt: true, role: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);

    let isFollowing = false;
    let isBlocked = false;
    if (viewerId && viewerId !== user.id) {
      const [follow, block] = await Promise.all([
        prisma.follow.findFirst({ where: { followerId: viewerId, followingId: user.id } }),
        prisma.userBlock.findFirst({ where: { blockerId: viewerId, blockedId: user.id } }),
      ]);
      isFollowing = follow?.status === 'ACCEPTED';
      isBlocked = !!block;
    }

    return { ...user, isFollowing, isBlocked, isOwnProfile: viewerId === user.id };
  }

  /** Update profile fields */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true, username: true, displayName: true, bio: true,
        avatarUrl: true, coverUrl: true, isPrivate: true,
      },
    });
    return user;
  }

  /** Update avatar — returns new avatarUrl */
  async updateAvatar(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const { storageService } = await import('../storage/storageService');
    const ext = mimeType.split('/')[1] || 'jpg';
    const key = buildAvatarKey(userId, ext);
    const url = await storageService.upload(key, fileBuffer, mimeType, 'avatars');
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });
    return url;
  }

  /** Change password */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 400);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  /** Send password reset email */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent — don't reveal email existence

    const token = generateSecureToken();
    await redis.setex(RedisKeys.resetToken(token), 3600, user.id); // 1 hour TTL

    logger.info(`Password reset token generated for ${email}`, { userId: user.id });
    // In production: send email with reset link containing this token
    return token; // Returned for testing; in prod, send via email only
  }

  /** Reset password with token from email */
  async resetPassword(token: string, newPassword: string) {
    const userId = await redis.get(RedisKeys.resetToken(token));
    if (!userId) throw new AppError('Reset token invalid or expired', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await redis.del(RedisKeys.resetToken(token));
  }

  /** Search users */
  async searchUsers(query: string, page = 1, limit = 20, viewerId?: string) {
    const { skip, take } = paginate(page, limit);
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, username: true, displayName: true,
        avatarUrl: true, isVerified: true, followersCount: true,
      },
      skip,
      take,
      orderBy: { followersCount: 'desc' },
    });

    return { users, page, limit, hasMore: users.length === take };
  }

  /** Block a user */
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new AppError('Cannot block yourself', 400);
    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    // Remove follows in both directions
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    });
  }

  /** Unblock a user */
  async unblockUser(blockerId: string, blockedId: string) {
    await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
  }
}

export const userService = new UserService();
