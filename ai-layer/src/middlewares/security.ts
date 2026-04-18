// ============================================================
// MIDDLEWARES/SECURITY.TS — Security Layer [NEW]
// Protection: Rate limiting, Helmet headers, Input sanitization
// Required for production / billion-user scale
// ============================================================

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

// ── IN-MEMORY RATE LIMITER ────────────────────────────────────
// Production: ganti dengan Redis-backed rate limiter (e.g. rate-limiter-flexible)
interface RateBucket {
  count:     number;
  resetAt:   number;
}
const rateBuckets = new Map<string, RateBucket>();

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim())
    ?? req.socket.remoteAddress
    ?? "unknown";
  return ip;
}

// ── RATE LIMITER FACTORY ──────────────────────────────────────
export function rateLimit(options: {
  windowMs:    number;  // milliseconds
  max:         number;  // max requests per window
  message?:    string;
}) {
  const { windowMs, max, message = "Too many requests — please slow down" } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getClientKey(req);
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count++;
    if (bucket.count > max) {
      logger.warn({ ip: key, count: bucket.count, path: req.path }, "[Security] Rate limit exceeded");
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
}

// Cleanup old buckets every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt < now) rateBuckets.delete(key);
  }
}, 5 * 60 * 1000);

// ── SECURITY HEADERS (Helmet-equivalent) ─────────────────────
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
  );
  // Remove server fingerprint
  res.removeHeader("X-Powered-By");
  next();
}

// ── SANITIZE BODY — Strip dangerous keys from req.body ───────
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    // Remove prototype pollution attempts
    const dangerous = ["__proto__", "constructor", "prototype"];
    for (const key of dangerous) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (req.body as Record<string, unknown>)[key];
    }
    // Truncate excessively long string values
    for (const key of Object.keys(req.body as Record<string, unknown>)) {
      const val = (req.body as Record<string, unknown>)[key];
      if (typeof val === "string" && val.length > 1024) {
        (req.body as Record<string, unknown>)[key] = val.slice(0, 1024);
      }
    }
  }
  next();
}

// ── SAFE ERROR RESPONSE — Never expose internal errors ───────
export function safeErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error({ err, path: req.path, method: req.method }, "[Error] Unhandled error");
  // Never expose raw error details in production
  const isProd = process.env["NODE_ENV"] === "production";
  res.status(500).json({
    error:   "Internal server error",
    ...(isProd ? {} : { detail: String(err) }),
  });
}
