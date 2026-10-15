// src/app.ts
import express from 'express';

// Enable BigInt serialization in Express/JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Route imports
import { userRoutes } from './routes/userRoutes';
import { videoRoutes } from './routes/videoRoutes';
import { feedRoutes } from './routes/feedRoutes';
import { socialRoutes } from './routes/socialRoutes';
import { searchRoutes } from './routes/searchRoutes';
import { notificationRoutes } from './routes/notificationRoutes';
import { messagingRoutes } from './routes/messagingRoutes';
import { analyticsRoutes } from './routes/analyticsRoutes';
import { moderationRoutes } from './routes/moderationRoutes';
import { adminRoutes } from './routes/adminRoutes';

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', '*'],
        mediaSrc: ["'self'", 'blob:', '*'],
        connectSrc: ["'self'", '*'],
      },
    },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || config.app.corsOrigins.includes(origin) || config.app.isDev) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// ─── Body parsing & compression ───────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Serve Local Uploads ──────────────────────────────────────────────────────
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── Request ID & logging ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.headers['x-request-id'],
  });
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Swagger docs ─────────────────────────────────────────────────────────────
if (config.app.isDev) {
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Vibe Platform API',
        version: '1.0.0',
        description: 'Production-ready Vibe-like social media platform API',
      },
      servers: [{ url: config.app.apiUrl }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.ts'],
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export { app };
