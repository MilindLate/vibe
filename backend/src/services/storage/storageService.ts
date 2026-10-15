// src/services/storage/storageService.ts
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { logger } from '../../utils/logger';

class StorageService {
  private baseDir: string;
  private buckets: Record<string, string>;

  constructor() {
    this.baseDir = path.join(__dirname, '../../..', 'public', 'uploads');
    this.buckets = {
      videos: 'videos',
      thumbnails: 'thumbnails',
      avatars: 'avatars',
    };
  }

  /** Ensure buckets (folders) exist */
  async ensureBuckets(): Promise<void> {
    for (const bucket of Object.values(this.buckets)) {
      const dir = path.join(this.baseDir, bucket);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created local storage directory: ${dir}`);
      }
    }
  }

  /** Upload buffer to Local Disk */
  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
    bucketType: keyof typeof this.buckets = 'videos'
  ): Promise<string> {
    await this.ensureBuckets();
    const bucket = this.buckets[bucketType] || 'videos';
    const filePath = path.join(this.baseDir, bucket, key);
    
    // Create subdirectories if key has slashes
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    const url = `${config.app.apiUrl}/uploads/${bucket}/${key}`;
    logger.debug(`Saved locally: ${url}`);
    return url;
  }

  /** Upload a local file path to Local Disk */
  async uploadFile(
    key: string,
    sourceFilePath: string,
    contentType: string,
    bucketType: keyof typeof this.buckets = 'videos'
  ): Promise<string> {
    await this.ensureBuckets();
    const bucket = this.buckets[bucketType] || 'videos';
    const targetFilePath = path.join(this.baseDir, bucket, key);

    fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
    fs.copyFileSync(sourceFilePath, targetFilePath);

    const url = `${config.app.apiUrl}/uploads/${bucket}/${key}`;
    return url;
  }

  /** Delete a file from Local Disk */
  async delete(key: string, bucketType: keyof typeof this.buckets = 'videos'): Promise<void> {
    const bucket = this.buckets[bucketType];
    const filePath = path.join(this.baseDir, bucket, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /** Generate URL */
  async getSignedUrl(
    key: string,
    bucketType: keyof typeof this.buckets = 'videos',
    expiresInSeconds = 3600
  ): Promise<string> {
    const bucket = this.buckets[bucketType];
    return `${config.app.apiUrl}/uploads/${bucket}/${key}`;
  }
}

export const storageService = new StorageService();
