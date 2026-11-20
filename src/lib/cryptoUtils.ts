/**
 * Client-side cryptographic utilities using Web Crypto API (SHA-256)
 * Used for hashing user passwords and Bank Security PINs so secrets are never stored in plain text.
 */

export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback deterministic hash only if SubtleCrypto is unavailable in non-secure context
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

export async function hashSecret(plainText: string, salt = 'ma-flower-mill-bogra'): Promise<string> {
  const digest = await sha256Hex(`${salt}::${plainText}`);
  return `sha256$${salt}$${digest}`;
}

export async function verifySecret(plainText: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  if (storedHash.startsWith('sha256$')) {
    const parts = storedHash.split('$');
    const salt = parts[1] || 'ma-flower-mill-bogra';
    const expected = await hashSecret(plainText, salt);
    return expected === storedHash;
  }
  return false;
}
