import crypto from 'crypto';

interface TokenPayload {
  email: string;
  exp: number;
  purpose: 'access_link' | 'session';
}

function getSecret(): string {
  const secret = process.env.GTM_COOKIE_SECRET;
  if (!secret) {
    throw new Error('GTM_COOKIE_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Sign a payload with HMAC-SHA256.
 * Returns: base64url(payload).base64url(hmac)
 */
export function signToken(payload: TokenPayload, secret: string): string {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('base64url');
  return `${payloadStr}.${hmac}`;
}

/**
 * Verify a signed token. Returns the payload if valid, null otherwise.
 */
export function verifyToken(token: string, secret: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, providedHmac] = parts;

  // Recompute HMAC
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('base64url');

  // Timing-safe comparison
  const providedBuf = Buffer.from(providedHmac, 'base64url');
  const expectedBuf = Buffer.from(expectedHmac, 'base64url');

  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  // Decode payload
  try {
    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString('utf-8')
    );

    // Check expiration
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create a 7-day access token for magic link.
 */
export function createAccessToken(email: string): string {
  const secret = getSecret();
  return signToken(
    {
      email: email.toLowerCase(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      purpose: 'access_link',
    },
    secret
  );
}

/**
 * Create a 90-day session token for cookie.
 */
export function createSessionToken(email: string): string {
  const secret = getSecret();
  return signToken(
    {
      email: email.toLowerCase(),
      exp: Date.now() + 90 * 24 * 60 * 60 * 1000,
      purpose: 'session',
    },
    secret
  );
}

/**
 * Read and verify the session cookie from a request.
 * Returns the email if valid, null otherwise.
 */
export function getSessionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)gtm_session=([^;]+)/);
  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const payload = verifyToken(token, secret);
  if (!payload || payload.purpose !== 'session') return null;

  return payload.email;
}
