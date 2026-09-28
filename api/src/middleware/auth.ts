import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../auth.js";
import type { PublicUser } from "../../../packages/shared/src/index.js";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

function tokenFromHeader(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

/**
 * Attach the authenticated user (if any) to req.user.
 * Never rejects — use requireAuth/requireRole to enforce.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = tokenFromHeader(req);
    if (!token) return next();
    const payload = await verifyToken(token);
    if (!payload) return next();
    req.user = {
      id: payload.sub,
      username: payload.username,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: payload.role,
      createdAt: new Date().toISOString(),
    };
    return next();
  } catch {
    return next();
  }
}

/** 401 when no valid JWT is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
