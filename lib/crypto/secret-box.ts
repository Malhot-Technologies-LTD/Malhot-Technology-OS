import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encrypts third-party access tokens before they reach the database
 * (docs/architecture/integrations.md: per-user tokens are stored encrypted).
 *
 * AES-256-GCM from Node's crypto module, nothing hand-rolled: a fresh 12-byte
 * IV per value, and the auth tag rejects anything tampered with. The stored
 * form is `v1.<iv>.<tag>.<ciphertext>`, base64url, so a future key or cipher
 * change can be told apart from this one.
 *
 * A database leak alone yields nothing usable; the key lives only in the
 * environment (SOCIAL_TOKEN_KEY).
 */

const VERSION = "v1";

function keyFrom(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32) throw new Error("SOCIAL_TOKEN_KEY must be 32 random bytes, base64-encoded.");
  return key;
}

export function seal(plaintext: string, base64Key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(base64Key), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function open(sealed: string, base64Key: string): string {
  const [version, iv, tag, ciphertext] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error("Unrecognised sealed value.");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(base64Key), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
