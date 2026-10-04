import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/** URL-safe random token with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Session/challenge tokens and backup codes are high-entropy, so a fast hash is the right primitive. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

let cachedKey: Buffer | null = null;

/**
 * Key for encrypting TOTP secrets at rest. MFA_ENCRYPTION_KEY (32+ chars) wins;
 * otherwise a key is derived from JWT_SECRET with HKDF under a distinct label, so
 * the session secret itself is never used directly as an encryption key.
 * Rotating whichever secret is in use invalidates enrolled authenticators.
 */
function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const material = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!material) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MFA_ENCRYPTION_KEY or JWT_SECRET must be set to store 2FA secrets");
    }
    cachedKey = Buffer.from(hkdfSync("sha256", "intore-dev-only", "intore-mfa", "totp-secret-v1", 32));
    return cachedKey;
  }
  cachedKey = Buffer.from(hkdfSync("sha256", material, "intore-mfa", "totp-secret-v1", 32));
  return cachedKey;
}

/** AES-256-GCM; output is base64(iv | tag | ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
