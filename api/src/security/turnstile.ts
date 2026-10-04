/**
 * Cloudflare Turnstile server-side verification.
 * Configure TURNSTILE_SECRET_KEY (Render) + NEXT_PUBLIC_TURNSTILE_SITE_KEY (Vercel).
 * For local development use Cloudflare's always-pass test pair:
 *   site 1x00000000000000000000AA / secret 1x0000000000000000000000000000000AA
 */
export function captchaConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyCaptcha(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Not configured: lockout + backoff still apply (warned at boot).
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    // Fail closed: if the CAPTCHA can't be verified, the attempt doesn't proceed.
    return false;
  }
}
