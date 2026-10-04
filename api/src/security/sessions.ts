import type { CookieOptions, Request, Response } from "express";
import { clientIp } from "./clientIp.js";
import { randomToken, sha256 } from "./crypto.js";
import { securityStore, type SessionRecord } from "./store.js";

/**
 * Server-side sessions. The browser holds only an opaque random token in an
 * HttpOnly; Secure; SameSite=Strict cookie — unreadable from JavaScript, so XSS can't
 * exfiltrate it — and the server stores its SHA-256, so a database leak doesn't yield
 * usable sessions either. Sessions are revocable (logout, logout-all, account delete).
 *
 * In production the cookies use the __Host- prefix: the browser then enforces Secure,
 * Path=/ and no Domain attribute, so no subdomain can plant or overwrite them.
 */
const SESSION_TTL_MS = 7 * 24 * 60 * 60_000;
const SESSION_IDLE_MS = 24 * 60 * 60_000;
const TOUCH_INTERVAL_MS = 5 * 60_000;
export const MFA_CHALLENGE_TTL_MS = 5 * 60_000;

const secure = () => process.env.NODE_ENV === "production";
export const sessionCookieName = () => (secure() ? "__Host-intore_session" : "intore_session");
export const mfaCookieName = () => (secure() ? "__Host-intore_mfa" : "intore_mfa");

function cookieOptions(maxAgeMs: number): CookieOptions {
  return { httpOnly: true, secure: secure(), sameSite: "strict", path: "/", maxAge: maxAgeMs };
}

export async function startSession(req: Request, res: Response, userId: string): Promise<void> {
  const token = randomToken();
  const now = new Date();
  await securityStore.sessions.put({
    id: sha256(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] ?? "").slice(0, 200),
  });
  res.cookie(sessionCookieName(), token, cookieOptions(SESSION_TTL_MS));
}

/** Resolves the session for this request, enforcing absolute and idle expiry. */
export async function readSession(req: Request): Promise<SessionRecord | null> {
  const token = req.cookies?.[sessionCookieName()];
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  const session = await securityStore.sessions.get(sha256(token));
  if (!session) return null;
  const now = Date.now();
  if (now - session.lastSeenAt.getTime() > SESSION_IDLE_MS) {
    await securityStore.sessions.delete(session.id);
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    session.lastSeenAt = new Date(now);
    await securityStore.sessions.put(session);
  }
  return session;
}

export async function endSession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[sessionCookieName()];
  if (typeof token === "string") await securityStore.sessions.delete(sha256(token));
  res.clearCookie(sessionCookieName(), { ...cookieOptions(0), maxAge: undefined });
}

export async function endAllSessions(userId: string): Promise<void> {
  await securityStore.sessions.deleteByUser(userId);
  await securityStore.mfaChallenges.deleteByUser(userId);
}

/** Password verified, second factor pending: a short-lived, attempt-limited challenge. */
export async function startMfaChallenge(res: Response, userId: string): Promise<void> {
  const token = randomToken();
  await securityStore.mfaChallenges.put({
    id: sha256(token),
    userId,
    attempts: 0,
    expiresAt: new Date(Date.now() + MFA_CHALLENGE_TTL_MS),
  });
  res.cookie(mfaCookieName(), token, cookieOptions(MFA_CHALLENGE_TTL_MS));
}

export async function readMfaChallenge(req: Request) {
  const token = req.cookies?.[mfaCookieName()];
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  return securityStore.mfaChallenges.get(sha256(token));
}

export async function endMfaChallenge(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[mfaCookieName()];
  if (typeof token === "string") await securityStore.mfaChallenges.delete(sha256(token));
  res.clearCookie(mfaCookieName(), { ...cookieOptions(0), maxAge: undefined });
}
