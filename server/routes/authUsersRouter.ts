import { Router } from 'express';
import { db, appendAuditLog, getTodayStr, runInTx } from '../db';
import { generateId, generateSecureToken, hashPasswordScrypt, verifyPasswordScrypt } from '../crypto';
import { AuthedRequest, getClientIp, requireAuth, requireRole, ServerUserRole } from '../auth';

export const authUsersRouter = Router();

const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 hours

function createUserSession(userId: string): string {
  const token = generateSecureToken();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    expiresAt,
    new Date().toISOString()
  );
  return token;
}

function setSessionCookie(res: any, token: string) {
  res.cookie('mill_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  });
}

function sanitizeUserRow(row: any) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role as ServerUserRole,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || undefined,
  };
}

authUsersRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const normalized = String(username || '').trim().toLowerCase();
  const pass = String(password || '');
  const ip = getClientIp(req);

  if (!normalized || !pass) {
    return res.status(400).json({ error: 'ইউজারনেম এবং পাসওয়ার্ড দিন।' });
  }

  const row = db
    .prepare('SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?')
    .get(normalized, normalized) as any;

  if (!row) {
    appendAuditLog({
      userId: 'unknown',
      username: normalized,
      role: 'TESTER',
      action: 'FAILED_LOGIN',
      recordType: 'Auth',
      recordId: 'unknown',
      ipAddress: ip,
      details: `অজানা ইউজারনেম "${normalized}" দিয়ে লগইন প্রচেষ্টা ব্যর্থ হয়েছে।`,
    });
    return res.status(401).json({ error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়!' });
  }

  if (row.is_active !== 1) {
    appendAuditLog({
      userId: row.id,
      username: row.username,
      role: row.role,
      action: 'FAILED_LOGIN',
      recordType: 'Auth',
      recordId: row.id,
      ipAddress: ip,
      details: `নিষ্ক্রিয় অ্যাকাউন্ট (${row.username}) দিয়ে লগইন প্রচেষ্টা প্রত্যাখ্যাত হয়েছে।`,
    });
    return res.status(403).json({ error: 'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। মালিকের সাথে যোগাযোগ করুন।' });
  }

  const ok = verifyPasswordScrypt(pass, row.password_hash);
  if (!ok) {
    appendAuditLog({
      userId: row.id,
      username: row.username,
      role: row.role,
      action: 'FAILED_LOGIN',
      recordType: 'Auth',
      recordId: row.id,
      ipAddress: ip,
      details: `ভুল পাসওয়ার্ড দিয়ে লগইন চেষ্টা (${row.username})।`,
    });
    return res.status(401).json({ error: 'পাসওয়ার্ড সঠিক নয়!' });
  }

  const nowStr = new Date().toLocaleString('en-GB');
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowStr, row.id);
  const token = createUserSession(row.id);
  setSessionCookie(res, token);

  appendAuditLog({
    userId: row.id,
    username: row.username,
    role: row.role,
    action: 'LOGIN',
    recordType: 'Auth',
    recordId: row.id,
    ipAddress: ip,
    details: `${row.full_name} (${row.role}) সফটওয়্যারে সফলভাবে লগইন করেছেন।`,
  });

  res.json({
    token,
    user: sanitizeUserRow({ ...row, last_login_at: nowStr }),
  });
});

authUsersRouter.post('/auth/demo-login', (req, res) => {
  const { role = 'OWNER' } = req.body || {};
  const validRole: ServerUserRole = ['OWNER', 'MANAGER', 'TESTER'].includes(role) ? role : 'OWNER';
  const ip = getClientIp(req);

  const row = db
    .prepare('SELECT * FROM users WHERE role = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1')
    .get(validRole) as any;

  if (!row) {
    return res.status(404).json({ error: `${validRole} ভূমিকায় কোনো সক্রিয় অ্যাকাউন্ট পাওয়া যায়নি।` });
  }

  const nowStr = new Date().toLocaleString('en-GB');
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowStr, row.id);
  const token = createUserSession(row.id);
  setSessionCookie(res, token);

  appendAuditLog({
    userId: row.id,
    username: row.username,
    role: row.role,
    action: 'LOGIN',
    recordType: 'Auth',
    recordId: row.id,
    ipAddress: ip,
    details: `${row.full_name} (${row.role}) ডেমো অ্যাক্সেসে লগইন করেছেন।`,
  });

  res.json({
    token,
    user: sanitizeUserRow({ ...row, last_login_at: nowStr }),
  });
});

authUsersRouter.post('/auth/logout', requireAuth, (req: AuthedRequest, res) => {
  const u = req.user!;
  if (req.sessionToken) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  }
  res.clearCookie('mill_session');
  res.clearCookie('mill_bank_token');
  appendAuditLog({
    userId: u.id,
    username: u.username,
    role: u.role,
    action: 'LOGOUT',
    recordType: 'Auth',
    recordId: u.id,
    ipAddress: req.clientIp,
    details: `${u.fullName} সফটওয়্যার থেকে লগআউট করেছেন।`,
  });
  res.json({ success: true });
});

authUsersRouter.get('/auth/me', requireAuth, (req: AuthedRequest, res) => {
  const u = req.user!;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id) as any;
  res.json({ user: sanitizeUserRow(row) });
});

// ================= OWNER-ONLY USER MANAGEMENT =================
authUsersRouter.get('/users', requireAuth, requireRole('OWNER'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY rowid DESC').all() as any[];
  res.json({ users: rows.map(sanitizeUserRow) });
});

authUsersRouter.post('/users', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { username, email, fullName, role, password } = req.body || {};
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanName = String(fullName || '').trim();
  const cleanPass = String(password || '').trim();
  const cleanRole: ServerUserRole = ['OWNER', 'MANAGER', 'TESTER'].includes(role) ? role : 'MANAGER';

  if (!cleanUser || !cleanName || cleanPass.length < 4) {
    return res.status(400).json({ error: 'সঠিক ইউজারনেম, পূর্ণ নাম এবং কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন।' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE lower(username) = ?').get(cleanUser);
  if (exists) {
    return res.status(409).json({ error: 'এই ইউজারনেমটি ইতিমধ্যেই ব্যবহৃত হচ্ছে।' });
  }

  const id = generateId('user');
  const cleanEmail = String(email || `${cleanUser}@maflowermill.com`).trim().toLowerCase();
  const today = getTodayStr();
  const hash = hashPasswordScrypt(cleanPass);

  db.prepare(
    `INSERT INTO users (id, username, email, full_name, role, password_hash, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(id, cleanUser, cleanEmail, cleanName, cleanRole, hash, today);

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CREATE_USER',
    recordType: 'User',
    recordId: id,
    ipAddress: req.clientIp,
    details: `নতুন ইউজার তৈরি: ${cleanName} (@${cleanUser}) - ভূমিকা: ${cleanRole}`,
    newValue: JSON.stringify({ username: cleanUser, role: cleanRole }),
  });

  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json({ user: sanitizeUserRow(created) });
});

authUsersRouter.patch('/users/:id/username', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const { username, fullName } = req.body || {};
  const clean = String(username || '').trim().toLowerCase();

  if (!clean) return res.status(400).json({ error: 'সঠিক ইউজারনেম লিখুন।' });
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!target) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });

  const dup = db.prepare('SELECT id FROM users WHERE lower(username) = ? AND id != ?').get(clean, id);
  if (dup) return res.status(409).json({ error: 'এই ইউজারনেমটি অন্য কেউ ব্যবহার করছে।' });

  const nextFull = String(fullName || '').trim() || target.full_name;
  db.prepare('UPDATE users SET username = ?, full_name = ? WHERE id = ?').run(clean, nextFull, id);

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'UPDATE_USERNAME',
    recordType: 'User',
    recordId: id,
    ipAddress: req.clientIp,
    details: `ইউজারনেম পরিবর্তন: @${target.username} -> @${clean}`,
    previousValue: target.username,
    newValue: clean,
  });

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ user: sanitizeUserRow(updated) });
});

authUsersRouter.patch('/users/:id/password', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const { password } = req.body || {};
  const cleanPass = String(password || '').trim();
  if (cleanPass.length < 4) {
    return res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!target) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });

  const hash = hashPasswordScrypt(cleanPass);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  // Invalidate active sessions of target if changing another user's password
  if (id !== actor.id) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CHANGE_PASSWORD',
    recordType: 'User',
    recordId: id,
    ipAddress: req.clientIp,
    details: `@${target.username} এর পাসওয়ার্ড নিরাপদভাবে পরিবর্তন করা হয়েছে।`,
  });

  res.json({ success: true });
});

authUsersRouter.patch('/users/:id/role', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const { role } = req.body || {};
  if (!['OWNER', 'MANAGER', 'TESTER'].includes(role)) {
    return res.status(400).json({ error: 'অবৈধ ভূমিকা (Role)।' });
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!target) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });
  if (target.id === actor.id && role !== 'OWNER') {
    return res.status(400).json({ error: 'নিজের মালিক ভূমিকা পরিবর্তন করা যাবে না।' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CHANGE_ROLE',
    recordType: 'User',
    recordId: id,
    ipAddress: req.clientIp,
    details: `@${target.username} এর ভূমিকা পরিবর্তন: ${target.role} -> ${role}`,
    previousValue: target.role,
    newValue: role,
  });

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ user: sanitizeUserRow(updated) });
});

authUsersRouter.patch('/users/:id/status', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!target) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });
  if (target.id === actor.id) {
    return res.status(400).json({ error: 'নিজের সক্রিয় অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না।' });
  }

  const nextActive = target.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(nextActive, id);
  if (nextActive === 0) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: nextActive === 1 ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    recordType: 'User',
    recordId: id,
    ipAddress: req.clientIp,
    details: `@${target.username} অ্যাকাউন্ট ${nextActive === 1 ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`,
  });

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ user: sanitizeUserRow(updated) });
});

// ================= AUDIT LOGS (OWNER ONLY, APPEND-ONLY) =================
authUsersRouter.get('/audit-logs', requireAuth, requireRole('OWNER'), (req, res) => {
  const limit = Math.min(500, Math.max(10, Number(req.query.limit) || 200));
  const action = String(req.query.action || '').trim();
  const role = String(req.query.role || '').trim();

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const args: any[] = [];
  if (action) {
    sql += ' AND action = ?';
    args.push(action);
  }
  if (role) {
    sql += ' AND role = ?';
    args.push(role);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  args.push(limit);

  const rows = db.prepare(sql).all(...args) as any[];
  res.json({
    logs: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      role: r.role,
      action: r.action,
      recordType: r.record_type,
      recordId: r.record_id,
      date: r.date,
      time: r.time,
      ipAddress: r.ip_address,
      details: r.details,
      previousValue: r.previous_value || undefined,
      newValue: r.new_value || undefined,
    })),
  });
});

// ================= SETTINGS & BACKUP/RESTORE =================
authUsersRouter.get('/settings', requireAuth, requireRole('OWNER', 'MANAGER'), (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM mill_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  rows.forEach((r) => {
    settings[r.key] = r.value;
  });
  const sec = db.prepare('SELECT session_timeout_minutes FROM bank_security WHERE id = 1').get() as any;
  settings.bank_session_timeout_minutes = String(sec?.session_timeout_minutes || 15);
  res.json({ settings });
});

authUsersRouter.put('/settings', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const updates = req.body || {};
  const upsert = db.prepare(
    `INSERT INTO mill_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );

  runInTx(() => {
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'bank_session_timeout_minutes') {
        const mins = Math.max(1, Math.min(120, Number(v) || 15));
        db.prepare('UPDATE bank_security SET session_timeout_minutes = ?, updated_at = ? WHERE id = 1').run(
          mins,
          new Date().toISOString()
        );
      } else {
        upsert.run(k, String(v));
      }
    }
    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'UPDATE_SETTINGS',
      recordType: 'Settings',
      recordId: 'mill_settings',
      ipAddress: req.clientIp,
      details: 'মিলের সিস্টেম সেটিংস হালনাগাদ করা হয়েছে।',
      newValue: JSON.stringify(updates),
    });
  });

  res.json({ success: true });
});

authUsersRouter.get('/backup/export', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const tables = [
    'products',
    'stock_history',
    'memos',
    'gate_passes',
    'expense_vouchers',
    'supplier_categories',
    'suppliers',
    'supplier_transactions',
    'customers',
    'customer_transactions',
    'wheat_purchases',
    'productions',
    'employee_transactions',
    'bank_accounts',
    'bank_transactions',
    'daily_submissions',
    'mill_settings',
    'audit_logs',
  ];
  const dump: Record<string, any[]> = {};
  for (const t of tables) {
    dump[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  // Never export raw password hashes blindly unless needed — export sanitized user metadata
  dump.users_metadata = db
    .prepare('SELECT id, username, email, full_name, role, is_active, created_at FROM users')
    .all();

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'EXPORT_BACKUP',
    recordType: 'Backup',
    recordId: 'full-export',
    ipAddress: req.clientIp,
    details: 'সম্পূর্ণ ডাটাবেস ব্যাকআপ JSON ডাউনলোড করা হয়েছে।',
  });

  res.json({
    version: '2.0.0',
    mill: 'মা ফ্লাওয়ার মিল, ঘোড়াধাপহাট, বগুড়া',
    exportedAt: new Date().toISOString(),
    data: dump,
  });
});

authUsersRouter.post('/backup/restore', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'সঠিক ব্যাকআপ JSON ফাইল প্রদান করুন।' });
  }

  // Non-destructive upsert restore for operational tables so Owner never loses active admin access
  const safeTables = [
    'products',
    'supplier_categories',
    'suppliers',
    'customers',
    'mill_settings',
  ];

  let restoredRows = 0;
  runInTx(() => {
    for (const table of safeTables) {
      const rows = data[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
        db.prepare(sql).run(...cols.map((c) => row[c]));
        restoredRows++;
      }
    }
    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'RESTORE_BACKUP',
      recordType: 'Backup',
      recordId: 'restore',
      ipAddress: req.clientIp,
      details: `ব্যাকআপ থেকে ${restoredRows} টি রেকর্ড নিরাপদভাবে পুনরুদ্ধার করা হয়েছে।`,
    });
  });

  res.json({ success: true, restoredRows });
});
