// src/config/socketio.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis, redisSub, redisPub, RedisKeys } from './redis';
import { verifyAccessToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { config } from './index';

let io: Server;

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function setupSocketIO(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: config.app.corsOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // Redis adapter for horizontal scaling
  io.adapter(createAdapter(redisPub, redisSub));

  // ─── Auth Middleware ───────────────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.slice(7);
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).username = payload.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', async (socket: Socket) => {
    const userId: string = (socket as any).userId;
    logger.info(`Socket connected: ${userId}`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Mark user as online in Redis (expires after 35s, ping keeps it alive)
    await redis.setex(RedisKeys.userOnline(userId), 35, socket.id);

    // ─── Messaging Events ────────────────────────────────────────────────────
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('send-message', async (data: { conversationId: string; content: string }) => {
      // Message persistence is handled via REST API; this just broadcasts in real-time
      io.to(`conv:${data.conversationId}`).emit('new-message', {
        senderId: userId,
        conversationId: data.conversationId,
        content: data.content,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('typing-start', (conversationId: string) => {
      redis.setex(RedisKeys.typingIndicator(conversationId, userId), 5, '1');
      socket.to(`conv:${conversationId}`).emit('typing', { userId, conversationId, isTyping: true });
    });

    socket.on('typing-stop', (conversationId: string) => {
      redis.del(RedisKeys.typingIndicator(conversationId, userId));
      socket.to(`conv:${conversationId}`).emit('typing', { userId, conversationId, isTyping: false });
    });

    socket.on('mark-read', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('messages-read', { userId, conversationId });
    });

    // ─── Presence Ping ───────────────────────────────────────────────────────
    socket.on('ping', () => {
      redis.setex(RedisKeys.userOnline(userId), 35, socket.id);
      socket.emit('pong');
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      await redis.del(RedisKeys.userOnline(userId));
      logger.info(`Socket disconnected: ${userId}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

/** Emit a notification to a user in real-time */
export function emitNotification(userId: string, notification: object): void {
  if (io) io.to(`user:${userId}`).emit('notification', notification);
}

/** Emit a new message to a conversation room */
export function emitMessage(conversationId: string, message: object): void {
  if (io) io.to(`conv:${conversationId}`).emit('new-message', message);
}

/** Check if a user is currently online */
export async function isUserOnline(userId: string): Promise<boolean> {
  const result = await redis.exists(RedisKeys.userOnline(userId));
  return result === 1;
}
