import { ipKeyGenerator, rateLimit, type Options } from "express-rate-limit";
import type { Request, Response } from "express";
import { logAuthEvent } from "../security/audit.js";
import { clientIp } from "../security/clientIp.js";
import { isDev } from "../config.js";

const FIFTEEN_MINUTES = 15 * 60_000;
/** Local development only (seed scripts log in many accounts); production uses the limits as written. */
const AUTH_SCALE = isDev() ? 20 : 1;

/** IPv6-safe per-client-IP key (the real client, not the proxy — see security/clientIp.ts). */
function keyByIp(req: Request): string {
  return ipKeyGenerator(clientIp(req));
}

function keyByIpAndUser(req: Request): string {
  // Per-IP is the abuse boundary; per-user keeps one bad actor from eating a shared IP's budget.
  return `${keyByIp(req)}:${req.user?.id ?? "anon"}`;
}

/** No legacy X-RateLimit-* fingerprinting; standard RateLimit-* and Retry-After headers only. */
function limiter(name: string, options: Partial<Options>) {
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: keyByIp,
    handler: (req: Request, res: Response, _next, opts) => {
      if (name !== "api") logAuthEvent(req, "rate_limited", { detail: `${name} ${req.method} ${req.path}` });
      res.status(opts.statusCode).json({ error: "Too many attempts. Please wait and try again." });
    },
    ...options,
  });
}

/** Login: 5 failed attempts per IP per 15 min (successful logins don't count). */
export const loginLimiter = limiter("login", { windowMs: FIFTEEN_MINUTES, limit: 5 * AUTH_SCALE, skipSuccessfulRequests: true });

/** Signup: 5 accounts per IP per 15 min. */
export const registerLimiter = limiter("register", { windowMs: FIFTEEN_MINUTES, limit: 5 * AUTH_SCALE });

/** Second factor (login challenge + MFA management): 5 failed codes per IP per 15 min. */
export const otpLimiter = limiter("otp", { windowMs: FIFTEEN_MINUTES, limit: 5 * AUTH_SCALE, skipSuccessfulRequests: true });

/**
 * Reserved for /forgot-password and /reset-password (not implemented yet): 5 per IP per
 * 15 min, counting every request so reset emails can't be used to flood an inbox.
 */
export const passwordResetLimiter = limiter("password-reset", { windowMs: FIFTEEN_MINUTES, limit: 5 });

export const ingestLimiter = limiter("ingest", { windowMs: 60_000, limit: 20, keyGenerator: keyByIpAndUser });

/** General API abuse guard. Generous so normal UI polling (30s) never trips it. */
export const apiLimiter = limiter("api", { windowMs: 60_000, limit: 300, keyGenerator: keyByIpAndUser });
