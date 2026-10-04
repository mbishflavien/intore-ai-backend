import { randomInt } from "node:crypto";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import type { UserMfa } from "../../../packages/shared/src/index.js";
import { decryptSecret, encryptSecret, sha256 } from "./crypto.js";

/** RFC 6238 TOTP: 6 digits, 30 s period, SHA-1 (what every authenticator app supports). */
const PERIOD = 30;
const ISSUER = "IntoreAI";
/** Accept the previous/next 30 s step to absorb clock drift — codes live ~90 s at most. */
const WINDOW = 1;
/** A setup secret not confirmed within this long must be regenerated. */
export const PENDING_SETUP_TTL_MS = 15 * 60_000;
export const BACKUP_CODE_COUNT = 10;

function totpFor(secretBase32: string, label: string): TOTP {
  return new TOTP({ issuer: ISSUER, label, algorithm: "SHA1", digits: 6, period: PERIOD, secret: Secret.fromBase32(secretBase32) });
}

export async function createEnrollment(label: string): Promise<{ secretEnc: string; otpauthUrl: string; qrDataUrl: string; secret: string }> {
  const secret = new Secret({ size: 20 }).base32;
  const otpauthUrl = totpFor(secret, label).toString();
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });
  return { secretEnc: encryptSecret(secret), otpauthUrl, qrDataUrl, secret };
}

/**
 * Verifies a 6-digit code against an encrypted secret. Returns the matched time-step,
 * or null. Steps at or below `lastUsedStep` are rejected, so a code (even one observed
 * over a shoulder) can be used only once.
 */
export function verifyTotp(secretEnc: string, code: string, lastUsedStep?: number): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const totp = totpFor(decryptSecret(secretEnc), "verify");
  const delta = totp.validate({ token: code, window: WINDOW });
  if (delta === null) return null;
  const step = Math.floor(Date.now() / 1000 / PERIOD) + delta;
  if (lastUsedStep !== undefined && step <= lastUsedStep) return null;
  return step;
}

/** 10 single-use codes like "k7x2m-9qw4p"; only SHA-256 hashes are stored. */
export function generateBackupCodes(): { codes: string[]; hashes: string[] } {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const chars = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
  return { codes, hashes: codes.map(hashBackupCode) };
}

export function normalizeBackupCode(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hashBackupCode(code: string): string {
  return sha256(`backup:${normalizeBackupCode(code)}`);
}

/** Consumes a backup code: returns the remaining hashes, or null if it didn't match. */
export function consumeBackupCode(mfa: UserMfa, code: string): string[] | null {
  if (normalizeBackupCode(code).length !== 10) return null;
  const hash = hashBackupCode(code);
  if (!mfa.backupCodeHashes.includes(hash)) return null;
  return mfa.backupCodeHashes.filter((candidate) => candidate !== hash);
}
