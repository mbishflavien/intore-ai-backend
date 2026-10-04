import { createHash } from "node:crypto";
import { COMMON_PASSWORDS } from "./commonPasswords.js";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordContext {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface PasswordCheck {
  ok: boolean;
  errors: string[];
}

/** Synchronous rules: length, character classes, common-password list, personal info. */
export function checkPasswordRules(password: string, context: PasswordContext = {}): PasswordCheck {
  const errors: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) errors.push(`Use at least ${PASSWORD_MIN_LENGTH} characters`);
  if (password.length > PASSWORD_MAX_LENGTH) errors.push(`Use at most ${PASSWORD_MAX_LENGTH} characters`);
  if (!/[a-z]/.test(password)) errors.push("Add a lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("Add an uppercase letter");
  if (!/[0-9]/.test(password)) errors.push("Add a number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Add a symbol");
  if (/(.)\1{3,}/.test(password)) errors.push("Avoid repeating the same character 4+ times");

  const lower = password.toLowerCase();
  // "Password123!" → "password": decorating a common word with digits/symbols doesn't make it strong.
  const core = lower.replace(/^[^a-z]+|[^a-z]+$/g, "");
  if (COMMON_PASSWORDS.has(lower) || (core.length >= 4 && COMMON_PASSWORDS.has(core))) {
    errors.push("This password is too common");
  }

  const personal = [context.username, context.email?.split("@")[0], context.firstName, context.lastName]
    .map((value) => value?.trim().toLowerCase() ?? "")
    .filter((value) => value.length >= 4);
  if (personal.some((value) => lower.includes(value))) {
    errors.push("Don't include your name, username or email");
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Have I Been Pwned range API (k-anonymity: only the first 5 hex chars of the SHA-1
 * leave this server). Returns the breach count, or null if the service couldn't be
 * reached — the caller fails open on outages because the local rules already apply.
 */
export async function pwnedCount(password: string, timeoutMs = 3000): Promise<number | null> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "IntoreAI-password-check" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    for (const line of (await response.text()).split("\n")) {
      const [candidate, count] = line.trim().split(":");
      if (candidate === suffix) return Number.parseInt(count ?? "0", 10) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

/** Full server-side policy: local rules, then the breach corpus. */
export async function checkPassword(password: string, context: PasswordContext = {}): Promise<PasswordCheck> {
  const result = checkPasswordRules(password, context);
  if (!result.ok) return result;
  const breaches = await pwnedCount(password);
  if (breaches === null) {
    console.warn("[security] Have I Been Pwned unreachable — breach check skipped for this password.");
  } else if (breaches > 0) {
    return { ok: false, errors: ["This password has appeared in a data breach. Choose a different one."] };
  }
  return result;
}
