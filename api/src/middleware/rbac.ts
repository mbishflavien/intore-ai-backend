import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../../../packages/shared/src/index.js";

/**
 * Route-level RBAC. Must run after attachUser (+ requireAuth).
 * Example: requireRole("recruiter") / requireRole("applicant", "recruiter").
 */
export function requireRole(...allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      const label = allowed.length === 1 ? `Only ${allowed[0]}s can access this` : "Forbidden for this role";
      res.status(403).json({ error: label });
      return;
    }
    next();
  };
}

export const requireRecruiter = requireRole("recruiter");
export const requireApplicant = requireRole("applicant");
