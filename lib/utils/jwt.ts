/**
 * Decode JWT token and extract expiry time
 */
export function decodeJWT(token: string): { exp?: number; iat?: number } {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return {};

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return {};
  }
}

/**
 * Check if token is expired or will expire soon
 * @param token - JWT token
 * @param bufferSeconds - Refresh buffer time in seconds (default: 60 seconds)
 */
export function isTokenExpiringSoon(token: string | null, bufferSeconds = 60): boolean {
  if (!token) return true;

  const decoded = decodeJWT(token);
  if (!decoded.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;

  // Token is expiring if it expires in less than buffer seconds
  return expiresIn < bufferSeconds;
}

/**
 * Get seconds until token expires
 */
export function getTokenExpiryTime(token: string | null): number | null {
  if (!token) return null;

  const decoded = decodeJWT(token);
  if (!decoded.exp) return null;

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp - now;
}
