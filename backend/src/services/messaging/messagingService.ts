// src/services/messaging/messagingService.ts
import { prisma } from '../../config/database';
import { redis, RedisKeys } from '../../config/redis';
import { emitMessage, isUserOnline } from '../../config/socketio';
import { AppError } from '../../middleware/errorHandler';
import { paginate } from '../../utils/helpers';

export class MessagingService {
  async createConversation(initiatorId: string, participantIds: string[], type: 'DIRECT' | 'GROUP' = 'DIRECT', name?: string) {
    const allIds = [...new Set([initiatorId, ...participantIds])];
    if (type === 'DIRECT' && allIds.length !== 2) throw new AppError('Direct conversations require exactly 2 participants', 400);

    // Check for existing direct conversation
    if (type === 'DIRECT') {
      const [a, b] = allIds;
      const existing = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: { every: { userId: { in: allIds } } },
        },
        include: { participants: true },
      });
      if (existing && existing.participants.length === 2) return existing;
    }

    const conversation = await prisma.conversation.create({
      data: {
        type,
        name,
        participants: { create: allIds.map((userId) => ({ userId })) },
      },
      include: { participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } } },
    });

    return conversation;
  }

  async sendMessage(conversationId: string, senderId: string, content: string, mediaUrl?: string) {
    // Verify sender is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
    });
    if (!participant) throw new AppError('Not a participant in this conversation', 403);

    const message = await prisma.message.create({
      data: { conversationId, senderId, content, mediaUrl },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    // Update conversation last message time
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Emit real-time message
    emitMessage(conversationId, message);

    return message;
  }

  async getConversations(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      skip,
      take,
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    const conversations = await Promise.all(
      participations.map(async (p) => {
        const unread = await prisma.message.count({
          where: { conversationId: p.conversationId, readAt: null, senderId: { not: userId } },
        });
        return { ...p.conversation, unreadCount: unread };
      })
    );

    return { conversations, page, limit, hasMore: conversations.length === take };
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 30) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new AppError('Not a participant in this conversation', 403);

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      messages: messages.reverse(),
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new AppError('Message not found', 404);
    if (msg.senderId !== userId) throw new AppError('Not authorized', 403);
    await prisma.message.update({ where: { id: messageId }, data: { isDeleted: true, content: null } });
  }

  async setTypingIndicator(conversationId: string, userId: string, isTyping: boolean) {
    const key = RedisKeys.typingIndicator(conversationId, userId);
    if (isTyping) await redis.setex(key, 5, '1');
    else await redis.del(key);
  }
}

export const messagingService = new MessagingService();
