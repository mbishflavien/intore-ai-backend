// Password hashing. Sessions live in security/sessions.ts (opaque server-side tokens, no JWTs).
import bcrypt from "bcryptjs";
const BCRYPT_ROUNDS = 12;

/** Legacy format from the pre-bcrypt era: `<salt>:<sha256hex>`. */
export function isLegacyPasswordHash(storedHash: string): boolean {
  return !storedHash.startsWith("$2");
}

/** Legacy SHA-256 hashes and bcrypt hashes below the current cost are upgraded on next login. */
export function needsRehash(storedHash: string): boolean {
  return isLegacyPasswordHash(storedHash) || bcrypt.getRounds(storedHash) < BCRYPT_ROUNDS;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyLegacyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }
  const data = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex === hash;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (isLegacyPasswordHash(storedHash)) {
    return verifyLegacyPassword(password, storedHash);
  }
  return bcrypt.compare(password, storedHash);
}
