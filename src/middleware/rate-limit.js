import { AppError } from "../errors.js";

export function createRateLimiter({ windowMs, max, now = Date.now }) {
  const clients = new Map();
  let requests = 0;

  return function rateLimit(req, res, next) {
    const timestamp = now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let entry = clients.get(key);
    if (!entry || timestamp >= entry.resetAt) {
      entry = { count: 0, resetAt: timestamp + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;
    requests += 1;

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (requests % 1000 === 0) {
      for (const [client, value] of clients) {
        if (timestamp >= value.resetAt) clients.delete(client);
      }
    }

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - timestamp) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return next(new AppError(429, "RATE_LIMITED", "Too many requests; retry later"));
    }
    next();
  };
}
