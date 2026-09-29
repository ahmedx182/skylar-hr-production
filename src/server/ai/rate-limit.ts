import "server-only";
import { RateLimitError } from "@/lib/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  key: string;
  maxRequests: number;
  windowMs: number;
}

export function assertWithinRateLimit({ key, maxRequests, windowMs }: RateLimitOptions): void {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= maxRequests) {
    const retryInSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    throw new RateLimitError(`Too many requests. Try again in ${retryInSeconds} seconds.`);
  }

  existing.count += 1;
}

export function clearAiRateLimitBucketsForTests(): void {
  buckets.clear();
}
