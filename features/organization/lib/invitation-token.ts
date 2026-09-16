/**
 * Invitation tokens: 256 bits of randomness, sent in the link, stored only as a
 * SHA-256 hash (docs/architecture/authentication-architecture.md#invitations).
 * Web Crypto so the same code runs in Node scripts, Route Handlers and tests.
 */

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateInvitationToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** Shape check before hashing so obviously malformed URLs never reach the database. */
export function isWellFormedInvitationToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export async function hashInvitationToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
