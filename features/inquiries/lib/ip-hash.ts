/**
 * Daily-rotating one-way hash of a visitor address for rate limiting
 * (docs/database/schema.md#website). sha256(ip + salt + UTC date): the same
 * visitor hashes identically within a day and cannot be matched across days.
 */
export async function hashClientIp(ip: string, salt: string, now: Date = new Date()): Promise<string> {
  const day = now.toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${salt}|${day}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
