import type { Request } from "express";
import { safeEqual } from "./crypto.js";

/**
 * The browser talks to the Next.js app, which proxies /api/* to this server (so the
 * session cookie is first-party). Every proxied request therefore arrives from a
 * Vercel egress IP; the real client IP travels in `x-intore-client-ip`, set by the
 * proxy from Vercel's own x-forwarded-for.
 *
 * With PROXY_SECRET configured on both sides, that header is only trusted when the
 * matching `x-intore-proxy-secret` is present — direct callers can't spoof their IP.
 * Without it the header is trusted as-is (warned at boot): spoofing then only dodges
 * the per-IP limiter, while per-account lockout, backoff and CAPTCHA still apply.
 * Falling back to req.ip instead would put every user behind one shared IP budget.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-intore-client-ip"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value && isTrustedProxy(req)) {
    return value.split(",")[0]!.trim().slice(0, 64);
  }
  return req.ip ?? "unknown";
}

function isTrustedProxy(req: Request): boolean {
  const expected = process.env.PROXY_SECRET;
  if (!expected) return true;
  const provided = req.headers["x-intore-proxy-secret"];
  return typeof provided === "string" && safeEqual(provided, expected);
}
