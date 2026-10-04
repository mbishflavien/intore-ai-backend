import { Router, type Response } from "express";
import type { User, UserMfa, UserRole } from "../../../packages/shared/src/index.js";
import { hashPassword, needsRehash, verifyPassword } from "../auth.js";
import { db } from "../repos.js";
import { toPublicUser } from "../repositories.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { loginLimiter, otpLimiter, registerLimiter } from "../middleware/rateLimit.js";
import { deleteAccountSchema, loginSchema, mfaDisableSchema, otpCodeSchema, registerSchema } from "../schemas/index.js";
import { logAuthEvent } from "../security/audit.js";
import { clientIp } from "../security/clientIp.js";
import { randomToken } from "../security/crypto.js";
import { CAPTCHA_AFTER_FAILURES, checkLoginAllowed, recordLoginFailure, recordLoginSuccess } from "../security/loginGuard.js";
import { checkPassword } from "../security/passwordPolicy.js";
import {
  endAllSessions,
  endMfaChallenge,
  endSession,
  readMfaChallenge,
  startMfaChallenge,
  startSession,
  sessionCookieName,
} from "../security/sessions.js";
import { securityStore } from "../security/store.js";
import { consumeBackupCode, createEnrollment, generateBackupCodes, PENDING_SETUP_TTL_MS, verifyTotp } from "../security/totp.js";
import { captchaConfigured, verifyCaptcha } from "../security/turnstile.js";

export const authRouter = Router();

const MAX_MFA_ATTEMPTS = 5;
const INVALID_LOGIN = "Invalid email/username or password";

// Compared against when the account doesn't exist, so response timing doesn't reveal it.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken()));

authRouter.post("/register", registerLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const body = req.body as { username: string; firstName: string; lastName: string; email: string; password: string; role: UserRole; captchaToken?: string };
    if (captchaConfigured() && !(await verifyCaptcha(body.captchaToken, clientIp(req)))) {
      logAuthEvent(req, "captcha_failed", { identifier: body.username, detail: "register" });
      res.status(400).json({ error: "Please complete the CAPTCHA.", captchaRequired: true });
      return;
    }
    const strength = await checkPassword(body.password, body);
    if (!strength.ok) {
      logAuthEvent(req, "register_rejected_password", { identifier: body.username });
      res.status(400).json({ error: strength.errors[0], passwordErrors: strength.errors });
      return;
    }
    const existingUsername = await db.user.findByUsername(body.username);
    if (existingUsername) { res.status(409).json({ error: "Username already taken" }); return; }
    const existingEmail = await db.user.findByEmail(body.email);
    if (existingEmail) { res.status(409).json({ error: "Email already registered" }); return; }

    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      username: body.username,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role: body.role,
      createdAt: now,
      updatedAt: now,
    };
    await db.user.create(user);
    await startSession(req, res, user.id);
    logAuthEvent(req, "register_success", { userId: user.id });
    res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("[auth] register failed:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", loginLimiter, validateBody(loginSchema), async (req, res) => {
  try {
    const body = req.body as { emailOrUsername: string; password: string; captchaToken?: string };
    const identifier = body.emailOrUsername;

    const guard = await checkLoginAllowed(identifier);
    if (!guard.allowed) {
      logAuthEvent(req, guard.reason === "locked" ? "login_locked" : "login_backoff", { identifier, detail: `retry in ${guard.retryAfterSeconds}s` });
      res.setHeader("Retry-After", String(guard.retryAfterSeconds));
      res.status(429).json({
        error: guard.reason === "locked"
          ? "Too many failed attempts. This account is temporarily locked — try again later."
          : `Please wait ${guard.retryAfterSeconds}s before trying again.`,
        retryAfterSeconds: guard.retryAfterSeconds,
        captchaRequired: guard.captchaRequired,
      });
      return;
    }

    if (guard.captchaRequired && captchaConfigured() && !(await verifyCaptcha(body.captchaToken, clientIp(req)))) {
      logAuthEvent(req, "captcha_failed", { identifier, detail: "login" });
      res.status(400).json({ error: "Please complete the CAPTCHA to continue.", captchaRequired: true });
      return;
    }

    const user = await db.user.findByEmailOrUsername(identifier);
    const passwordOk = user
      ? await verifyPassword(body.password, user.passwordHash)
      : (await verifyPassword(body.password, await getDummyHash()), false);

    if (!user || !passwordOk) {
      const attempt = await recordLoginFailure(identifier);
      logAuthEvent(req, "login_failed", { identifier, userId: user?.id, detail: `failures=${attempt.failures} lockouts=${attempt.lockouts}` });
      // Generic message either way: never reveal whether the identifier exists.
      if (attempt.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
        const retryAfterSeconds = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 1000);
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(429).json({ error: "Too many failed attempts. This account is temporarily locked — try again later.", retryAfterSeconds, captchaRequired: true });
        return;
      }
      res.status(401).json({ error: INVALID_LOGIN, captchaRequired: attempt.failures >= CAPTCHA_AFTER_FAILURES || attempt.lockouts > 0 });
      return;
    }

    await recordLoginSuccess(identifier);
    if (needsRehash(user.passwordHash)) {
      try {
        await db.user.updatePasswordHash(user.id, await hashPassword(body.password));
      } catch (error) {
        console.error("Failed to migrate password hash for user", user.id, error);
      }
    }

    if (user.mfa?.enabled) {
      await startMfaChallenge(res, user.id);
      logAuthEvent(req, "mfa_challenge_issued", { userId: user.id });
      res.status(200).json({ mfaRequired: true });
      return;
    }

    await startSession(req, res, user.id);
    logAuthEvent(req, "login_success", { userId: user.id });
    res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("[auth] login failed:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/** Second step of sign-in: authenticator code or backup code for the pending challenge. */
authRouter.post("/verify-otp", otpLimiter, validateBody(otpCodeSchema), async (req, res) => {
  try {
    const challenge = await readMfaChallenge(req);
    const user = challenge ? await db.user.findById(challenge.userId) : null;
    if (!challenge || !user?.mfa?.enabled || !user.mfa.secretEnc) {
      res.status(401).json({ error: "Your sign-in has expired. Please sign in again.", restart: true });
      return;
    }

    const code = (req.body as { code: string }).code;
    const result = await verifySecondFactor(user.mfa, code);
    if (!result) {
      challenge.attempts += 1;
      logAuthEvent(req, "mfa_failed", { userId: user.id, detail: `attempt ${challenge.attempts}` });
      if (challenge.attempts >= MAX_MFA_ATTEMPTS) {
        await endMfaChallenge(req, res);
        res.status(401).json({ error: "Too many incorrect codes. Please sign in again.", restart: true });
        return;
      }
      await securityStore.mfaChallenges.put(challenge);
      res.status(401).json({ error: "That code isn't valid.", attemptsRemaining: MAX_MFA_ATTEMPTS - challenge.attempts });
      return;
    }

    if (result.usedBackupCode) logAuthEvent(req, "mfa_backup_code_used", { userId: user.id, detail: `${result.mfa.backupCodeHashes.length} left` });
    await db.user.updateMfa(user.id, result.mfa);
    await endMfaChallenge(req, res);
    await startSession(req, res, user.id);
    logAuthEvent(req, "mfa_success", { userId: user.id });
    res.status(200).json({ user: toPublicUser({ ...user, mfa: result.mfa }) });
  } catch (error) {
    console.error("[auth] verify-otp failed:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

/** TOTP (replay-protected) or a single-use backup code; returns the updated MFA state. */
async function verifySecondFactor(mfa: UserMfa, code: string, allowBackup = true): Promise<{ mfa: UserMfa; usedBackupCode: boolean } | null> {
  if (!mfa.secretEnc) return null;
  const digits = code.replace(/\s/g, "");
  if (/^\d{6}$/.test(digits)) {
    const step = verifyTotp(mfa.secretEnc, digits, mfa.lastUsedStep);
    return step === null ? null : { mfa: { ...mfa, lastUsedStep: step }, usedBackupCode: false };
  }
  if (!allowBackup) return null;
  const remaining = consumeBackupCode(mfa, code);
  return remaining === null ? null : { mfa: { ...mfa, backupCodeHashes: remaining }, usedBackupCode: true };
}

authRouter.post("/logout", async (req, res) => {
  if (req.user) logAuthEvent(req, "logout", { userId: req.user.id });
  await endSession(req, res);
  await endMfaChallenge(req, res);
  res.status(200).json({ success: true });
});

authRouter.post("/logout-all", requireAuth, async (req, res) => {
  await endAllSessions(req.user!.id);
  clearSessionCookie(res);
  logAuthEvent(req, "logout_all", { userId: req.user!.id });
  res.status(200).json({ success: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

authRouter.delete("/delete", requireAuth, validateBody(deleteAccountSchema), async (req, res) => {
  try {
    const user = await db.user.findById(req.user!.id);
    if (!user || !(await verifyPassword((req.body as { password: string }).password, user.passwordHash))) {
      res.status(401).json({ error: "Password is incorrect" });
      return;
    }
    await db.user.delete(user.id);
    await endAllSessions(user.id);
    clearSessionCookie(res);
    logAuthEvent(req, "account_deleted", { userId: user.id });
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("[auth] delete failed:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ---------- two-factor management (signed-in user) ----------

authRouter.get("/mfa", requireAuth, async (req, res) => {
  const user = await db.user.findById(req.user!.id);
  res.status(200).json({
    enabled: Boolean(user?.mfa?.enabled),
    backupCodesRemaining: user?.mfa?.enabled ? user.mfa.backupCodeHashes.length : 0,
  });
});

/** Step 1: issue a new secret (shown once as QR + text). Not active until confirmed. */
authRouter.post("/mfa/setup", requireAuth, otpLimiter, async (req, res) => {
  try {
    const user = await db.user.findById(req.user!.id);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (user.mfa?.enabled) { res.status(409).json({ error: "Two-factor authentication is already on." }); return; }
    const enrollment = await createEnrollment(user.email || user.username);
    await db.user.updateMfa(user.id, {
      enabled: false,
      pendingSecretEnc: enrollment.secretEnc,
      pendingCreatedAt: new Date().toISOString(),
      backupCodeHashes: [],
    });
    res.status(200).json({ qrDataUrl: enrollment.qrDataUrl, otpauthUrl: enrollment.otpauthUrl, secret: enrollment.secret });
  } catch (error) {
    console.error("[auth] mfa setup failed:", error);
    res.status(500).json({ error: "Couldn't start two-factor setup" });
  }
});

/** Step 2: confirm with a code from the app; returns backup codes exactly once. */
authRouter.post("/mfa/enable", requireAuth, otpLimiter, validateBody(otpCodeSchema), async (req, res) => {
  try {
    const user = await db.user.findById(req.user!.id);
    const pending = user?.mfa?.pendingSecretEnc;
    const createdAt = user?.mfa?.pendingCreatedAt ? Date.parse(user.mfa.pendingCreatedAt) : 0;
    if (!user || !pending || user.mfa?.enabled || Date.now() - createdAt > PENDING_SETUP_TTL_MS) {
      res.status(400).json({ error: "Setup expired. Start two-factor setup again.", restart: true });
      return;
    }
    const step = verifyTotp(pending, (req.body as { code: string }).code.replace(/\s/g, ""));
    if (step === null) {
      logAuthEvent(req, "mfa_failed", { userId: user.id, detail: "enrollment" });
      res.status(400).json({ error: "That code isn't valid. Check your device's clock and try the newest code." });
      return;
    }
    const { codes, hashes } = generateBackupCodes();
    await db.user.updateMfa(user.id, {
      enabled: true,
      secretEnc: pending,
      backupCodeHashes: hashes,
      lastUsedStep: step,
      enabledAt: new Date().toISOString(),
    });
    logAuthEvent(req, "mfa_enabled", { userId: user.id });
    res.status(200).json({ enabled: true, backupCodes: codes });
  } catch (error) {
    console.error("[auth] mfa enable failed:", error);
    res.status(500).json({ error: "Couldn't turn on two-factor authentication" });
  }
});

/** Replace all backup codes; requires a current authenticator code (not a backup code). */
authRouter.post("/mfa/backup-codes", requireAuth, otpLimiter, validateBody(otpCodeSchema), async (req, res) => {
  try {
    const user = await db.user.findById(req.user!.id);
    if (!user?.mfa?.enabled) { res.status(400).json({ error: "Two-factor authentication is off." }); return; }
    const result = await verifySecondFactor(user.mfa, (req.body as { code: string }).code, false);
    if (!result) {
      logAuthEvent(req, "mfa_failed", { userId: user.id, detail: "backup-code regeneration" });
      res.status(400).json({ error: "That code isn't valid." });
      return;
    }
    const { codes, hashes } = generateBackupCodes();
    await db.user.updateMfa(user.id, { ...result.mfa, backupCodeHashes: hashes });
    logAuthEvent(req, "mfa_backup_codes_regenerated", { userId: user.id });
    res.status(200).json({ backupCodes: codes });
  } catch (error) {
    console.error("[auth] backup code regeneration failed:", error);
    res.status(500).json({ error: "Couldn't create new backup codes" });
  }
});

/** Turning 2FA off needs both the password and a current code (or backup code). */
authRouter.post("/mfa/disable", requireAuth, otpLimiter, validateBody(mfaDisableSchema), async (req, res) => {
  try {
    const body = req.body as { password: string; code: string };
    const user = await db.user.findById(req.user!.id);
    if (!user?.mfa?.enabled) { res.status(400).json({ error: "Two-factor authentication is already off." }); return; }
    const passwordOk = await verifyPassword(body.password, user.passwordHash);
    const second = passwordOk ? await verifySecondFactor(user.mfa, body.code) : null;
    if (!passwordOk || !second) {
      logAuthEvent(req, "mfa_failed", { userId: user.id, detail: "disable" });
      res.status(400).json({ error: "Password or code is incorrect." });
      return;
    }
    await db.user.updateMfa(user.id, null);
    logAuthEvent(req, "mfa_disabled", { userId: user.id });
    res.status(200).json({ enabled: false });
  } catch (error) {
    console.error("[auth] mfa disable failed:", error);
    res.status(500).json({ error: "Couldn't turn off two-factor authentication" });
  }
});

function clearSessionCookie(res: Response): void {
  res.clearCookie(sessionCookieName(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
}
