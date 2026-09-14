// In-memory sliding-window rate limiter for unauthenticated, brute-forceable
// endpoints (currently: gallery PIN verification). Keyed by whatever the
// caller passes in — we key on `slug + IP` so one guesser can't lock out
// every visitor to a gallery, but also can't hammer a single gallery's PIN
// from one address.
//
// This is intentionally simple and dependency-free rather than pulling in
// Redis or a hosted rate-limit service: the app already runs as a single
// Next.js deployment with no other shared-state infra, and a 6-digit PIN
// (1,000,000 possibilities) only needs to survive naive scripted guessing,
// not a distributed attack. The one real limitation is that this state is
// per server instance — on a multi-instance/serverless deployment with many
// concurrent cold starts, the effective limit is "N attempts per instance"
// rather than a single global counter. If that ever matters in production,
// swap the Map below for a shared store (Redis, Upstash, a MongoDB
// TTL-indexed collection) behind the same `checkRateLimit` signature.

const buckets = new Map();

// Sweep old entries occasionally so this Map can't grow without bound on a
// long-lived server process.
let lastSweep = Date.now();
function sweep(windowMs) {
  const now = Date.now();
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > windowMs) buckets.delete(key);
  }
}

/**
 * @param {string} key - unique identifier for this rate-limited action, e.g. `${slug}:${ip}`
 * @param {{ max?: number, windowMs?: number }} options
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export function checkRateLimit(key, { max = 8, windowMs = 10 * 60 * 1000 } = {}) {
  sweep(windowMs);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - bucket.windowStart) };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, retryAfterMs: 0 };
}

// Best-effort client IP extraction behind a proxy (Vercel sets x-forwarded-for).
export function clientIpFromRequest(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
