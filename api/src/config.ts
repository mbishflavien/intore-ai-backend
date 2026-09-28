/** Central runtime config. Fail fast instead of failing confusingly later. */
export const API_PORT = Number.parseInt(process.env.API_PORT ?? "4000", 10);

export function getAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isDev(): boolean {
  return !process.env.NODE_ENV || process.env.NODE_ENV === "development";
}

/** Fail fast on missing/insecure config instead of failing confusingly later. */
export function validateRuntimeConfig(): void {
  if (!process.env.JWT_SECRET && !isDev()) {
    throw new Error("JWT_SECRET must be set in non-development environments (refusing insecure fallback)");
  }
  if (!process.env.MONGODB_URI && process.env.ALLOW_IN_MEMORY_DB !== "true") {
    throw new Error(
      "MONGODB_URI is unset — refusing to boot on ephemeral in-memory storage. " +
        "Set MONGODB_URI or explicitly opt into ephemeral mode with ALLOW_IN_MEMORY_DB=true.",
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[config] ⚠️ GEMINI_API_KEY unset — Gemini reasoning will use the offline fallback.");
  }
  if (!process.env.ALLOWED_ORIGINS) {
    console.warn("[config] ⚠️ ALLOWED_ORIGINS unset — CORS defaults to local frontend origins only.");
  }
}
