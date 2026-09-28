import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express";

function keyByIpAndUser(req: Request): string {
  // Per-IP is the abuse boundary (IPv6-safe via ipKeyGenerator);
  // per-user keeps one bad actor from eating the shared IP budget.
  return `${ipKeyGenerator(req.ip ?? "unknown")}:${req.user?.id ?? "anon"}`;
}

/**
 * Secure defaults:
 * - legacy headers disabled (no X-RateLimit-* fingerprinting), standard
 *   `RateLimit-*` draft headers only.
 * - JSON 429 body matching the previous custom limiter contract.
 */
function jsonHandler(_req: unknown, res: unknown, _next: unknown, options: { statusCode: number }): void {
  const r = res as { status(options: number): { json(body: unknown): void } };
  r.status(options.statusCode).json({ error: "Too many requests. Please slow down and try again." });
}

// Preserves the pre-Express custom-limiter budgets so the demo seed script
// (~18 logins in a burst) keeps working: auth 30/min, ingest 20/min.
export const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: keyByIpAndUser,
  handler: jsonHandler,
});

export const registerLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: keyByIpAndUser,
  handler: jsonHandler,
});

export const ingestLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: keyByIpAndUser,
  handler: jsonHandler,
});

/** General API abuse guard. Generous so normal UI polling (30s) never trips it. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: keyByIpAndUser,
  handler: jsonHandler,
});
