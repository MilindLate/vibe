// backend/src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

export const prisma = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

prisma.$on('query' as never, (e: any) => {
  if (e.duration > 1000) {
    logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
  }
});

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma error', { message: e.message });
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
