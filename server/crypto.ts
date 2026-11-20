import crypto from 'node:crypto';

export function hashPasswordScrypt(plainText: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainText, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPasswordScrypt(plainText: string, storedHash: string): boolean {
  if (!storedHash || !plainText) return false;
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, originalHex] = parts;
    const derivedBuf = crypto.scryptSync(plainText, salt, 64);
    const originalBuf = Buffer.from(originalHex, 'hex');
    if (derivedBuf.length !== originalBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, originalBuf);
  }
  return false;
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}
