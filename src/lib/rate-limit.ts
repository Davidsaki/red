// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Lazy init so the build/dev server doesn't require Upstash env vars, and so
// rate limiting fails open (allows the request) when unconfigured instead of
// crashing — Turnstile remains the primary defense either way.
let _ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (_ratelimit !== undefined) return _ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL/TOKEN not set');
    _ratelimit = null;
    return null;
  }

  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'red-ratelimit',
  });
  return _ratelimit;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// Checks each identifier against its own sliding window (e.g. IP and email
// tracked separately) so hitting either limit blocks the request. Returns
// true when the request should be blocked.
export async function isRateLimited(...identifiers: string[]): Promise<boolean> {
  const ratelimit = getRatelimit();
  if (!ratelimit) return false;

  for (const id of identifiers) {
    const { success } = await ratelimit.limit(id);
    if (!success) return true;
  }
  return false;
}
