import type { Request } from "express";
import { clientIp } from "./clientIp.js";
import { securityStore, type AuthEvent } from "./store.js";

export type AuthEventType =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "login_backoff"
  | "captcha_failed"
  | "mfa_challenge_issued"
  | "mfa_success"
  | "mfa_failed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_backup_code_used"
  | "mfa_backup_codes_regenerated"
  | "register_success"
  | "register_rejected_password"
  | "logout"
  | "logout_all"
  | "rate_limited"
  | "account_deleted";

/**
 * Structured auth audit trail: one JSON line on stdout (visible in Render logs) and a
 * row in `auth_events` (90-day TTL). Never records passwords, codes or tokens; login
 * identifiers are truncated so a mistyped password in the username box isn't kept whole.
 */
export function logAuthEvent(
  req: Request,
  type: AuthEventType,
  extra: { userId?: string; identifier?: string; detail?: string } = {},
): void {
  const event: AuthEvent = {
    type,
    at: new Date(),
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] ?? "").slice(0, 200),
    ...(extra.userId ? { userId: extra.userId } : {}),
    ...(extra.identifier ? { identifier: extra.identifier.trim().toLowerCase().slice(0, 64) } : {}),
    ...(extra.detail ? { detail: extra.detail.slice(0, 200) } : {}),
  };
  const level = type.endsWith("_failed") || type.includes("locked") || type === "rate_limited" ? "warn" : "info";
  console[level](JSON.stringify({ auth_event: type, ...event, at: event.at.toISOString() }));
  securityStore.events.append(event).catch((error) => {
    console.error("[security] failed to persist auth event:", error instanceof Error ? error.message : error);
  });
}
