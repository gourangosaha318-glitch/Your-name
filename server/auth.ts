import type { Request, Response, NextFunction } from 'express';
import { db } from './db';

export type ServerUserRole = 'OWNER' | 'MANAGER' | 'TESTER';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: ServerUserRole;
  isActive: boolean;
}

export interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
  sessionToken?: string;
  clientIp?: string;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

export function extractSessionToken(req: Request): string | null {
  const headerToken = req.headers['x-mill-session'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const parts = cookieHeader.split(';');
    for (const part of parts) {
      const [k, ...v] = part.trim().split('=');
      if (k === 'mill_session') {
        return decodeURIComponent(v.join('='));
      }
    }
  }
  return null;
}

export function extractBankToken(req: Request): string | null {
  const bankHeader = req.headers['x-bank-token'];
  if (typeof bankHeader === 'string' && bankHeader.trim()) {
    return bankHeader.trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const parts = cookieHeader.split(';');
    for (const part of parts) {
      const [k, ...v] = part.trim().split('=');
      if (k === 'mill_bank_token') {
        return decodeURIComponent(v.join('='));
      }
    }
  }
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'অননুমোদিত প্রবেশ! অনুগ্রহ করে লগইন করুন।' });
  }

  const now = Date.now();
  const row = db
    .prepare(
      `SELECT s.token, s.expires_at, u.id, u.username, u.email, u.full_name, u.role, u.is_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as
    | {
        token: string;
        expires_at: number;
        id: string;
        username: string;
        email: string;
        full_name: string;
        role: ServerUserRole;
        is_active: number;
      }
    | undefined;

  if (!row || row.expires_at < now) {
    if (row) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    return res.status(401).json({ error: 'সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।' });
  }

  if (row.is_active !== 1) {
    return res.status(403).json({ error: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।' });
  }

  req.user = {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active === 1,
  };
  req.sessionToken = token;
  req.clientIp = getClientIp(req);
  next();
}

export function requireRole(...allowedRoles: ServerUserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'অননুমোদিত প্রবেশ।' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'এই অংশে প্রবেশ বা কাজ করার অনুমতি আপনার ভূমিকার (Role) জন্য অনুমোদিত নয়।',
      });
    }
    next();
  };
}

export function requireBankPin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'অননুমোদিত প্রবেশ।' });
  }
  if (req.user.role === 'TESTER') {
    return res.status(403).json({ error: 'টেস্টার অ্যাকাউন্ট থেকে ব্যাংক মডিউল প্রবেশ সম্পূর্ণ নিষিদ্ধ।' });
  }
  const token = extractBankToken(req);
  if (!token) {
    return res.status(423).json({
      error: 'ব্যাংক নিরাপত্তা পিন (PIN) যাচাই প্রয়োজন।',
      bankLocked: true,
    });
  }
  const now = Date.now();
  const bs = db
    .prepare('SELECT token, user_id, expires_at FROM bank_sessions WHERE token = ?')
    .get(token) as { token: string; user_id: string; expires_at: number } | undefined;

  if (!bs || bs.user_id !== req.user.id || bs.expires_at < now) {
    if (bs) {
      db.prepare('DELETE FROM bank_sessions WHERE token = ?').run(token);
    }
    return res.status(423).json({
      error: 'ব্যাংক নিরাপত্তা সেশনের মেয়াদ শেষ হয়েছে। আবার পিন দিন।',
      bankLocked: true,
    });
  }
  next();
}
