// src/config/index.ts
import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const optional = (key: string, defaultVal: string): string =>
  process.env[key] || defaultVal;

export const config = {
  app: {
    env: optional('NODE_ENV', 'development'),
    port: parseInt(optional('PORT', '3000'), 10),
    apiUrl: optional('API_URL', 'http://localhost:3000'),
    frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
    corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173').split(','),
    isDev: optional('NODE_ENV', 'development') === 'development',
    isProd: optional('NODE_ENV', 'development') === 'production',
  },
  database: {
    url: optional('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/vibe_db'),
    poolMin: parseInt(optional('DATABASE_POOL_MIN', '2'), 10),
    poolMax: parseInt(optional('DATABASE_POOL_MAX', '10'), 10),
  },
  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
    password: optional('REDIS_PASSWORD', ''),
    tls: optional('REDIS_TLS', 'false') === 'true',
  },
  jwt: {
    accessSecret: optional('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
  s3: {
    endpoint: optional('S3_ENDPOINT', 'http://localhost:9000'),
    accessKey: optional('S3_ACCESS_KEY', 'minioadmin'),
    secretKey: optional('S3_SECRET_KEY', 'minioadmin'),
    bucketVideos: optional('S3_BUCKET_VIDEOS', 'vibe-videos'),
    bucketThumbnails: optional('S3_BUCKET_THUMBNAILS', 'vibe-thumbnails'),
    bucketAvatars: optional('S3_BUCKET_AVATARS', 'vibe-avatars'),
    region: optional('S3_REGION', 'us-east-1'),
    forcePathStyle: optional('S3_FORCE_PATH_STYLE', 'true') === 'true',
  },
  kafka: {
    brokers: optional('KAFKA_BROKERS', 'localhost:9092').split(','),
    clientId: optional('KAFKA_CLIENT_ID', 'vibe-backend'),
    groupId: optional('KAFKA_GROUP_ID', 'vibe-consumer-group'),
    topics: {
      videoUploaded: 'video-uploaded',
      videoProcessed: 'video-processed',
      userActivity: 'user-activity',
      notifications: 'notifications',
      feedUpdates: 'feed-updates',
      moderationEvents: 'moderation-events',
      analyticsEvents: 'analytics-events',
    },
  },
  elasticsearch: {
    url: optional('ELASTICSEARCH_URL', 'http://localhost:9200'),
    username: optional('ELASTICSEARCH_USERNAME', ''),
    password: optional('ELASTICSEARCH_PASSWORD', ''),
    indices: {
      videos: 'videos',
      users: 'users',
      hashtags: 'hashtags',
    },
  },
  smtp: {
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    secure: optional('SMTP_SECURE', 'false') === 'true',
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('EMAIL_FROM', 'noreply@vibe-clone.com'),
  },
  firebase: {
    projectId: optional('FIREBASE_PROJECT_ID', ''),
    privateKey: optional('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
    clientEmail: optional('FIREBASE_CLIENT_EMAIL', ''),
  },
  rateLimit: {
    auth: {
      max: parseInt(optional('RATE_LIMIT_AUTH_MAX', '5'), 10),
      windowMs: parseInt(optional('RATE_LIMIT_AUTH_WINDOW_MS', '60000'), 10),
    },
    api: {
      max: parseInt(optional('RATE_LIMIT_API_MAX', '100'), 10),
      windowMs: parseInt(optional('RATE_LIMIT_API_WINDOW_MS', '60000'), 10),
    },
    upload: {
      max: parseInt(optional('RATE_LIMIT_UPLOAD_MAX', '10'), 10),
      windowMs: parseInt(optional('RATE_LIMIT_UPLOAD_WINDOW_MS', '3600000'), 10),
    },
  },
  video: {
    maxSizeMb: parseInt(optional('VIDEO_MAX_SIZE_MB', '500'), 10),
    allowedFormats: optional('VIDEO_ALLOWED_FORMATS', 'mp4,mov,avi,mkv,webm').split(','),
    resolutions: optional('VIDEO_RESOLUTIONS', '360,480,720,1080')
      .split(',')
      .map(Number),
    ffmpegPath: optional('FFMPEG_PATH', '/usr/bin/ffmpeg'),
    ffprobePath: optional('FFPROBE_PATH', '/usr/bin/ffprobe'),
  },
  mlService: {
    url: optional('ML_SERVICE_URL', 'http://localhost:8000'),
  },
  features: {
    liveStreaming: optional('FEATURE_LIVE_STREAMING', 'false') === 'true',
    duet: optional('FEATURE_DUET', 'true') === 'true',
    stitch: optional('FEATURE_STITCH', 'true') === 'true',
  },
};

export type Config = typeof config;
