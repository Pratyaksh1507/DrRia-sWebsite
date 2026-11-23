export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimiter {
  check(key: string, limit?: number, windowMs?: number): Promise<RateLimitResult> | RateLimitResult;
}

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; lastReset: number }>();

  check(key: string, limit = 15, windowMs = 60000): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key) || { count: 0, lastReset: now };

    if (now - entry.lastReset > windowMs) {
      entry.count = 1;
      entry.lastReset = now;
    } else {
      entry.count += 1;
    }

    this.store.set(key, entry);

    const success = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);
    const reset = entry.lastReset + windowMs;

    return {
      success,
      limit,
      remaining,
      reset,
    };
  }

  reset(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

// Global default in-memory rate limiter (ready to swap with Upstash Redis client)
export const rateLimiter = new InMemoryRateLimiter();

export function checkRateLimit(key: string, limit = 15, windowMs = 60000): boolean {
  return rateLimiter.check(key, limit, windowMs).success;
}

