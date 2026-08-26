type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 20_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
}

/** In-memory sliding window. Returns true when the request is allowed. */
export function consumeRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): boolean {
  const now = Date.now();
  prune(now);
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (current.count >= opts.limit) return false;
  current.count += 1;
  return true;
}

export function resetRateLimitForTests() {
  buckets.clear();
}
