const buckets = new Map();

export function createRateLimiter({ windowMs = 60_000, max = 120, message = 'Too many requests — please try again shortly.' } = {}) {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    const key = `${req.ip || req.socket.remoteAddress || 'unknown'}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || now >= current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ message });
    }

    return next();
  };
}

// Keep the in-memory map bounded in a single-instance deployment.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60_000).unref?.();
