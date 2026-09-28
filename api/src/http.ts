import type { Request } from "express";

/** Single route param as string. Empty string when missing (callers 404). */
export function param(req: Request, name: string): string {
  const v = (req.params as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}
