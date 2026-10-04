import type { NextFunction, Request, Response } from "express";
import type { PublicUser } from "../../../packages/shared/src/index.js";
import { db } from "../repos.js";
import { toPublicUser } from "../repositories.js";
import { readSession } from "../security/sessions.js";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
      sessionId?: string;
    }
  }
}

/**
 * Attach the authenticated user (if any) to req.user from the session cookie.
 * The user is re-read from the database on every request, so role changes and
 * deleted accounts take effect immediately (nothing is trusted from the client).
 * Never rejects — use requireAuth/requireRole to enforce.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await readSession(req);
    if (!session) return next();
    const user = await db.user.findById(session.userId);
    if (!user) return next();
    req.user = toPublicUser(user);
    req.sessionId = session.id;
    return next();
  } catch (error) {
    console.error("[auth] session lookup failed:", error instanceof Error ? error.message : error);
    return next();
  }
}

/** 401 when no valid session is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
