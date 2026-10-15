// src/middleware/upload.ts
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from './errorHandler';
import { config } from '../config';

const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4'];

const videoFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (VIDEO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid video format. Allowed: ${config.video.allowedFormats.join(', ')}`, 400));
  }
};

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid image format. Allowed: jpg, png, gif, webp', 400));
  }
};

const audioFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (AUDIO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid audio format. Allowed: mp3, wav, ogg, aac', 400));
  }
};

/** Video upload — 500 MB max, stored in memory for S3 streaming */
export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.video.maxSizeMb * 1024 * 1024 },
  fileFilter: videoFilter,
}).single('video');

/** Image upload — 10 MB max */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('image');

/** Avatar upload — 5 MB max */
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('avatar');

/** Audio upload — 50 MB max */
export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: audioFilter,
}).single('audio');
