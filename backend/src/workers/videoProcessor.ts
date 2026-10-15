// src/workers/videoProcessor.ts
import { Worker, Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { prisma } from '../config/database';
import { storageService } from '../services/storage/storageService';
import { buildVideoKey, buildHlsKey, buildThumbnailKey } from '../utils/helpers';
import { logger } from '../utils/logger';
import { config } from '../config';

ffmpeg.setFfmpegPath(config.video.ffmpegPath);
ffmpeg.setFfprobePath(config.video.ffprobePath);

interface TranscodeJob {
  videoId: string;
  userId: string;
  videoUrl: string;
  rawKey: string;
}

const RESOLUTIONS = [
  { name: '360p', width: 640, height: 360, bitrate: '800k' },
  { name: '480p', width: 854, height: 480, bitrate: '1500k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2500k' },
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
];

/** Extract video metadata using ffprobe */
function getMetadata(filePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/** Generate thumbnail at specific time */
function generateThumbnail(inputPath: string, outputPath: string, timeInSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '854x480',
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
}

/** Transcode to a specific resolution */
function transcodeToResolution(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number,
  bitrate: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size(`${width}x${height}`)
      .videoBitrate(bitrate)
      .audioBitrate('128k')
      .outputOptions([
        '-preset fast',
        '-crf 22',
        '-movflags +faststart', // Enable streaming from start
        '-pix_fmt yuv420p',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

export function createVideoWorker() {
  const connection = {
    host: new URL(config.redis.url).hostname,
    port: parseInt(new URL(config.redis.url).port || '6379'),
  };

  const worker = new Worker<TranscodeJob>(
    'video-processing',
    async (job: Job<TranscodeJob>) => {
      const { videoId, userId, videoUrl } = job.data;
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `video-${videoId}-`));
      const inputPath = path.join(tmpDir, 'input.mp4');

      try {
        logger.info(`Processing video ${videoId}`);
        await job.updateProgress(5);

        // Download original video from S3 to temp
        const response = await fetch(videoUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(inputPath, buffer);
        await job.updateProgress(20);

        // Extract metadata
        const metadata = await getMetadata(inputPath);
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        const duration = metadata.format.duration || 0;
        const width = videoStream?.width || 0;
        const height = videoStream?.height || 0;

        // Generate thumbnail at 1 second
        const thumbPath = path.join(tmpDir, 'thumb.jpg');
        await generateThumbnail(inputPath, thumbPath, Math.min(1, duration * 0.1));
        const thumbKey = buildThumbnailKey(userId, videoId, '480p');
        const thumbnailUrl = await storageService.uploadFile(thumbKey, thumbPath, 'image/jpeg', 'thumbnails');
        await job.updateProgress(35);

        // Transcode to multiple resolutions
        const qualities: Record<string, string> = {};
        const targetResolutions = RESOLUTIONS.filter((r) => r.height <= Math.max(height, 360));

        for (let i = 0; i < targetResolutions.length; i++) {
          const res = targetResolutions[i];
          const outputPath = path.join(tmpDir, `${res.name}.mp4`);
          await transcodeToResolution(inputPath, outputPath, res.width, res.height, res.bitrate);

          const key = buildVideoKey(userId, videoId, res.name);
          const url = await storageService.uploadFile(key, outputPath, 'video/mp4', 'videos');
          qualities[res.name] = url;

          await job.updateProgress(35 + Math.round(((i + 1) / targetResolutions.length) * 55));
        }

        // Update DB with processed data
        await prisma.video.update({
          where: { id: videoId },
          data: {
            status: 'ACTIVE',
            thumbnailUrl,
            duration: parseFloat(duration.toString()),
            width,
            height,
            qualities: qualities as any,
            hlsUrl: qualities['720p'] || qualities['480p'] || Object.values(qualities)[0] || null,
            publishedAt: new Date(),
          },
        });

        await job.updateProgress(100);
        logger.info(`Video ${videoId} processed successfully`);
      } catch (err) {
        logger.error(`Failed to process video ${videoId}`, { err });
        await prisma.video.update({
          where: { id: videoId },
          data: { status: 'FAILED' },
        }).catch(() => {});
        throw err;
      } finally {
        // Cleanup temp dir
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    },
    {
      connection,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => logger.info(`Video job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`Video job ${job?.id} failed`, { err }));

  return worker;
}
