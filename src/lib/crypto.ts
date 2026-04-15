import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption for at-rest secrets (OAuth tokens stored in tech_stack).
 *
 * Format: `enc:v1:<base64(iv || ciphertext || authTag)>`
 *   - iv: 12 bytes (GCM standard)
 *   - ciphertext: variable
 *   - authTag: 16 bytes
 *
 * The `enc:v1:` prefix lets us detect legacy plaintext values during migration
 * and keep a forward-compatible path if we rotate to v2 later.
 *
 * Key source: `SHIELDBASE_ENCRYPTION_KEY` env var, 32 random bytes base64-encoded.
 * Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 */

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.SHIELDBASE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("SHIELDBASE_ENCRYPTION_KEY not configured");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`SHIELDBASE_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length})`);
  }
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, ciphertext, authTag]);
  return PREFIX + payload.toString("base64");
}

export function decrypt(value: string): string {
  if (!isEncrypted(value)) {
    // Legacy plaintext — return as-is so reads during migration don't break.
    return value;
  }
  const key = getKey();
  const payload = Buffer.from(value.slice(PREFIX.length), "base64");
  if (payload.length < 12 + 16) {
    throw new Error("Encrypted payload too short");
  }
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(12, payload.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Encrypt a token only if it's not already encrypted and not empty.
 * Safe to call multiple times — idempotent on already-encrypted values.
 */
export function encryptToken(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  if (isEncrypted(plaintext)) return plaintext;
  return encrypt(plaintext);
}

/**
 * Decrypt a token if encrypted. Falls back to the raw value if it's plaintext
 * (supports the migration window where some rows are still unencrypted).
 */
export function decryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  return decrypt(value);
}
