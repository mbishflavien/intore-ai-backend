import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";

/** Validate req.body against a Zod schema. 400 + details on failure. */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Invalid request body",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
        return;
      }
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request body" });
    }
  };
}

/** Validate req.query against a Zod schema. 400 + details on failure. */
export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      (req as unknown as { validatedQuery: T }).validatedQuery = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Invalid query parameters",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
        return;
      }
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid query parameters" });
    }
  };
}
