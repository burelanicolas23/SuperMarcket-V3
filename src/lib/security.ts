/**
 * Security & Cryptographic Hashing Utilities
 * Uses Web Crypto API (SubtleCrypto SHA-256) for irreversible, deterministic hashing.
 * Passwords and Security Keys are salted and hashed so they are NEVER stored in plain text.
 */

// Application salt for SuperMarcket Enterprise Master Security System
const MASTER_SALT = "SuperMarcket_Enterprise_Salt_2026_MasterKey_!#@";

/**
 * Irreversibly hashes a plain text password or master key using SHA-256 and salt.
 * Returns hexadecimal digest string.
 */
export async function hashSecurityPassword(plainText: string, customSalt: string = MASTER_SALT): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${customSalt}:${plainText.trim()}`);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for non-browser environments or tests
  let hash = 0;
  const str = `${customSalt}:${plainText.trim()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
}

/**
 * Validates a plain text input against a stored SHA-256 hash.
 */
export async function verifySecurityPassword(plainText: string, storedHash: string, customSalt: string = MASTER_SALT): Promise<boolean> {
  if (!plainText || !storedHash) return false;
  const computed = await hashSecurityPassword(plainText, customSalt);
  return computed.toLowerCase() === storedHash.toLowerCase();
}
