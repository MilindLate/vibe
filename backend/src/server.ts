// src/server.ts
import http from 'http';
import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { disconnectRedis } from './config/redis';
import { setupSocketIO } from './config/socketio';

let server: http.Server;

async function startServer(): Promise<void> {
  // Connect to databases
  await connectDatabase();
  logger.info('All database connections established');

  // Create HTTP server
  server = http.createServer(app);

  // Attach Socket.IO
  setupSocketIO(server);

  // Start listening
  server.listen(config.app.port, () => {
    logger.info(`Server running on port ${config.app.port}`, {
      env: config.app.env,
      url: config.app.apiUrl,
    });
    if (config.app.isDev) {
      logger.info(`API Docs: ${config.app.apiUrl}/api-docs`);
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${config.app.port} is already in use`);
    } else {
      logger.error('Server error', { err });
    }
    process.exit(1);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  // Disconnect databases
  await disconnectDatabase();
  await disconnectRedis();

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

// Graceful shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err });
  process.exit(1);
});

startServer().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
