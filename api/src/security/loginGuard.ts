import { sha256 } from "./crypto.js";
import { securityStore, type LoginAttemptRecord } from "./store.js";

/**
 * Per-identifier brute-force protection, layered on top of the per-IP limiter.
 * State is keyed by the normalized identifier the user typed (whether or not the
 * account exists), so responses never reveal which usernames are registered.
 *
 *   failures 1-2  normal
 *   failures 3-4  CAPTCHA required + exponential backoff (1s, 2s between attempts)
 *   failure 5     account locked: 15 min, doubling on each repeat lockout (max 24h);
 *                 CAPTCHA stays required for that identifier afterwards
 *   success       counters reset
 */
export const CAPTCHA_AFTER_FAILURES = 3;
export const LOCK_AFTER_FAILURES = 5;
const BASE_LOCK_MS = 15 * 60_000;
const MAX_LOCK_MS = 24 * 60 * 60_000;
/** How long a quiet identifier keeps its history (and lockout escalation). */
const RECORD_TTL_MS = 24 * 60 * 60_000;

export type GuardDecision =
  | { allowed: true; captchaRequired: boolean; record: LoginAttemptRecord }
  | { allowed: false; reason: "locked" | "backoff"; retryAfterSeconds: number; captchaRequired: boolean };

function keyFor(identifier: string): string {
  return `login:${sha256(identifier.trim().toLowerCase())}`;
}

function fresh(id: string): LoginAttemptRecord {
  return { id, failures: 0, lastFailureAt: null, lockedUntil: null, lockouts: 0, expiresAt: new Date(Date.now() + RECORD_TTL_MS) };
}

export function backoffMs(failures: number): number {
  if (failures < CAPTCHA_AFTER_FAILURES) return 0;
  return 1000 * 2 ** (failures - CAPTCHA_AFTER_FAILURES);
}

export async function checkLoginAllowed(identifier: string): Promise<GuardDecision> {
  const id = keyFor(identifier);
  const record = (await securityStore.loginAttempts.get(id)) ?? fresh(id);
  const now = Date.now();
  // Once an identifier has been locked, every later attempt needs a CAPTCHA too.
  const captchaRequired = record.failures >= CAPTCHA_AFTER_FAILURES || record.lockouts > 0;

  if (record.lockedUntil && record.lockedUntil.getTime() > now) {
    return { allowed: false, reason: "locked", retryAfterSeconds: Math.ceil((record.lockedUntil.getTime() - now) / 1000), captchaRequired };
  }
  const wait = record.lastFailureAt ? record.lastFailureAt.getTime() + backoffMs(record.failures) - now : 0;
  if (wait > 0) {
    return { allowed: false, reason: "backoff", retryAfterSeconds: Math.ceil(wait / 1000), captchaRequired };
  }
  return { allowed: true, captchaRequired, record };
}

/** Returns the updated record so the caller can report lockout / CAPTCHA state. */
export async function recordLoginFailure(identifier: string): Promise<LoginAttemptRecord> {
  const id = keyFor(identifier);
  const record = (await securityStore.loginAttempts.get(id)) ?? fresh(id);
  const now = new Date();
  record.failures += 1;
  record.lastFailureAt = now;
  if (record.failures >= LOCK_AFTER_FAILURES) {
    const duration = Math.min(BASE_LOCK_MS * 2 ** record.lockouts, MAX_LOCK_MS);
    record.lockedUntil = new Date(now.getTime() + duration);
    record.lockouts += 1;
    record.failures = 0;
    record.lastFailureAt = null;
  }
  record.expiresAt = new Date(Math.max(now.getTime() + RECORD_TTL_MS, record.lockedUntil?.getTime() ?? 0));
  await securityStore.loginAttempts.put(record);
  return record;
}

export async function recordLoginSuccess(identifier: string): Promise<void> {
  await securityStore.loginAttempts.delete(keyFor(identifier));
}
