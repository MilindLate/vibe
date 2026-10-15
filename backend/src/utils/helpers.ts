// src/utils/helpers.ts
import crypto from 'crypto';

/** Generate a URL-safe random ID */
export function generateId(length = 16): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

/** Convert string to URL-friendly slug */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Strip HTML tags from a string */
export function sanitizeHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Format seconds to mm:ss or hh:mm:ss */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format large numbers: 1200 → "1.2K", 1500000 → "1.5M" */
export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/** Calculate pagination offset */
export function paginate(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  return { skip: (safePage - 1) * safeLimit, take: safeLimit };
}

/** Extract hashtags from text: "Hello #world #foo" → ["world", "foo"] */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

/** Extract @mentions from text */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

/** Build S3 object key for a video artifact */
export function buildVideoKey(userId: string, videoId: string, resolution: string): string {
  return `videos/${userId}/${videoId}/${resolution}.mp4`;
}

/** Build S3 key for HLS playlist */
export function buildHlsKey(userId: string, videoId: string): string {
  return `videos/${userId}/${videoId}/hls/master.m3u8`;
}

/** Build S3 key for thumbnail */
export function buildThumbnailKey(userId: string, videoId: string, size: string): string {
  return `thumbnails/${userId}/${videoId}/${size}.jpg`;
}

/** Build S3 key for avatar */
export function buildAvatarKey(userId: string, ext: string): string {
  return `avatars/${userId}/avatar.${ext}`;
}

/**
 * Calculate engagement score for trending algorithm.
 * views×0.1 + likes×0.3 + comments×0.3 + shares×0.3
 */
export function calculateEngagementScore(
  views: number,
  likes: number,
  comments: number,
  shares: number
): number {
  return views * 0.1 + likes * 0.3 + comments * 0.3 + shares * 0.3;
}

/** Time-decay multiplier: newer content scores higher */
export function timeDecayScore(score: number, createdAt: Date): number {
  const ageHours = (Date.now() - createdAt.getTime()) / 3_600_000;
  const decay = Math.pow(0.95, ageHours / 24); // ~5% drop per day
  return score * decay;
}

/** Sleep for n milliseconds (for use in retry/backoff) */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry a fn up to `attempts` times with exponential backoff */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelay = 500
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < attempts - 1) await delay(baseDelay * Math.pow(2, i));
    }
  }
  throw lastError;
}

/** Split array into chunks of size n */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/** Validate URL */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Generate secure random token for email verification / password reset */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
