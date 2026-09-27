import type { IncomingMessage } from "node:http";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

import type { PublicUser, User, UserRole } from "../../packages/shared/src/index.js";

const DEV_JWT_FALLBACK = "umurava-hr-ai-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 10;

function getJwtSecret(): Uint8Array {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length > 0) {
    return new TextEncoder().encode(configured);
  }
  // Secure default: refuse to boot on the fallback secret outside development.
  // validateRuntimeConfig() in server.ts enforces this at startup; this is the
  // second line of defense if auth.ts is ever used standalone.
  if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
    console.warn("[auth] ⚠️ JWT_SECRET unset — using insecure dev fallback. Set JWT_SECRET for any shared deploy.");
    return new TextEncoder().encode(DEV_JWT_FALLBACK);
  }
  throw new Error("JWT_SECRET must be set (refusing insecure fallback outside development)");
}

export function isDevJwtFallback(): boolean {
  return !process.env.JWT_SECRET;
}

interface JwtPayload {
  sub: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export async function generateToken(user: User): Promise<string> {
  return new SignJWT({
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      username: String(payload.username ?? ""),
      firstName: String(payload.firstName ?? ""),
      lastName: String(payload.lastName ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export function extractToken(request: IncomingMessage): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

export async function getUserFromRequest(
  request: IncomingMessage,
): Promise<PublicUser | null> {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    username: payload.username,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    role: payload.role,
    createdAt: new Date().toISOString(),
  };
}

/** Legacy format from the pre-bcrypt era: `<salt>:<sha256hex>`. */
export function isLegacyPasswordHash(storedHash: string): boolean {
  return !storedHash.startsWith("$2");
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
