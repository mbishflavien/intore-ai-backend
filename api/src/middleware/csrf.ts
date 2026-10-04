import type { NextFunction, Request, Response } from "express";
import { getAllowedOrigins } from "../config.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defense in depth. SameSite=Strict session cookies are the primary control;
 * this additionally rejects state-changing requests whose Origin (or, failing that,
 * Referer) is present and not an allowed app origin. Requests with neither header
 * (curl, server-to-server) carry no browser cookies to abuse and pass through.
 */
export function csrfOriginCheck(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin ?? originOf(req.headers.referer);
  if (!origin || getAllowedOrigins().includes(origin)) return next();
  res.status(403).json({ error: "Cross-site request blocked" });
}

function originOf(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
