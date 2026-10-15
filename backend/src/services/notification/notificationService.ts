// src/services/notification/notificationService.ts
import { prisma } from '../../config/database';
import { redis, RedisKeys } from '../../config/redis';
import { emitNotification } from '../../config/socketio';
import { paginate } from '../../utils/helpers';

export class NotificationService {
  async getNotifications(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return { notifications, page, limit, hasMore: notifications.length === take };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const cached = await redis.get(RedisKeys.notifUnread(userId));
    if (cached !== null) return parseInt(cached, 10);
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    await redis.setex(RedisKeys.notifUnread(userId), 300, count.toString());
    return count;
  }

  async markAsRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    await redis.del(RedisKeys.notifUnread(userId));
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    await redis.set(RedisKeys.notifUnread(userId), '0');
  }

  async deleteNotification(notificationId: string, userId: string) {
    await prisma.notification.deleteMany({ where: { id: notificationId, userId } });
    await redis.del(RedisKeys.notifUnread(userId));
  }
}

export const notificationService = new NotificationService();
