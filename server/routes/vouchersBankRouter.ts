import { Router } from 'express';
import { db, appendAuditLog, getTodayStr, getNowTimeStr, runInTx } from '../db';
import { generateId, generateSecureToken, hashPasswordScrypt, verifyPasswordScrypt } from '../crypto';
import {
  AuthedRequest,
  extractBankToken,
  requireAuth,
  requireBankPin,
  requireRole,
} from '../auth';

export const vouchersBankRouter = Router();

function serializeVoucher(r: any) {
  return {
    id: r.id,
    voucherNo: r.voucher_no,
    date: r.date,
    time: r.time,
    category: r.category,
    description: r.description,
    amount: r.amount,
    paidBy: r.paid_by,
    receiverPerson: r.receiver_person,
    paymentMethod: r.payment_method,
    bankAccountId: r.bank_account_id || undefined,
    bankAccountName: r.bank_account_name || undefined,
    attachmentDataUrl: r.attachment_data_url || undefined,
    attachmentName: r.attachment_name || undefined,
    createdBy: r.created_by,
    createdById: r.created_by_id,
    createdByRole: r.created_by_role,
    status: r.status,
    ownerSignature: r.owner_signature || undefined,
    approvedBy: r.approved_by || undefined,
    approvedAt: r.approved_at || undefined,
    rejectedBy: r.rejected_by || undefined,
    rejectedAt: r.rejected_at || undefined,
    rejectionReason: r.rejection_reason || undefined,
    notes: r.notes || undefined,
    adjustments: JSON.parse(r.adjustments_json || '[]'),
  };
}

// ================= EXPENSE VOUCHERS (খরচের ভাউচার) =================
vouchersBankRouter.get('/vouchers', requireAuth, requireRole('OWNER', 'MANAGER'), (req, res) => {
  const status = String(req.query.status || '').trim();
  let sql = 'SELECT * FROM expense_vouchers';
  const args: any[] = [];
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    sql += ' WHERE status = ?';
    args.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...args) as any[];
  res.json({ vouchers: rows.map(serializeVoucher) });
});

vouchersBankRouter.post('/vouchers', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  const amount = Math.max(0, Number(body.amount) || 0);
  if (!body.category || !body.description || amount <= 0 || !body.receiverPerson) {
    return res.status(400).json({ error: 'খরচের খাত, বিবরণ, পরিমাণ এবং প্রাপকের নাম দিন।' });
  }

  const paymentMethod = ['Cash', 'Bank', 'Other'].includes(body.paymentMethod)
    ? body.paymentMethod
    : 'Cash';

  let bankAccountName: string | null = null;
  if (paymentMethod === 'Bank' && body.bankAccountId) {
    const ba = db.prepare('SELECT bank_name FROM bank_accounts WHERE id = ?').get(body.bankAccountId) as any;
    bankAccountName = ba?.bank_name || null;
  }

  const existing = db.prepare('SELECT voucher_no FROM expense_vouchers').all() as { voucher_no: string }[];
  const maxNum = existing.reduce((m, r) => {
    const parts = String(r.voucher_no).split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    return !isNaN(last) && last > m ? last : m;
  }, 1002);

  const voucherNo = `EV-${new Date().getFullYear()}-${maxNum + 1}`;
  const id = generateId('ev');
  const dateStr = String(body.date || getTodayStr()).trim();
  const timeStr = getNowTimeStr();

  // Always created as Pending Owner Approval
  db.prepare(
    `INSERT INTO expense_vouchers
      (id, voucher_no, date, time, category, description, amount, paid_by, receiver_person, payment_method, bank_account_id, bank_account_name, attachment_data_url, attachment_name, created_by, created_by_id, created_by_role, status, notes, adjustments_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, '[]', ?)`
  ).run(
    id,
    voucherNo,
    dateStr,
    timeStr,
    String(body.category).trim(),
    String(body.description).trim(),
    amount,
    String(body.paidBy || actor.fullName).trim(),
    String(body.receiverPerson).trim(),
    paymentMethod,
    body.bankAccountId || null,
    bankAccountName,
    body.attachmentDataUrl || null,
    body.attachmentName || null,
    actor.fullName,
    actor.id,
    actor.role,
    body.notes ? String(body.notes).trim() : null,
    new Date().toISOString()
  );

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CREATE_EXPENSE_VOUCHER',
    recordType: 'ExpenseVoucher',
    recordId: voucherNo,
    ipAddress: req.clientIp,
    details: `খরচের ভাউচার #${voucherNo} তৈরি (Pending Owner Approval): ${body.category} - ৳${amount}`,
  });

  const created = db.prepare('SELECT * FROM expense_vouchers WHERE id = ?').get(id);
  res.status(201).json({ voucher: serializeVoucher(created) });
});

vouchersBankRouter.post('/vouchers/:id/approve', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const { signature, notes } = req.body || {};

  const v = db.prepare('SELECT * FROM expense_vouchers WHERE id = ?').get(id) as any;
  if (!v) return res.status(404).json({ error: 'ভাউচার পাওয়া যায়নি।' });
  if (v.status !== 'pending') {
    return res.status(400).json({ error: 'শুধুমাত্র অপেক্ষমাণ (Pending) ভাউচার অনুমোদন করা যায়।' });
  }

  const ownerSig = String(signature || '').trim() || `${actor.fullName} [ডিজিটাল অনুমোদন]`;
  const nowStr = `${getTodayStr()} ${getNowTimeStr()}`;

  try {
    runInTx(() => {
      db.prepare(
        `UPDATE expense_vouchers SET
          status = 'approved',
          owner_signature = ?,
          approved_by = ?,
          approved_at = ?,
          notes = COALESCE(?, notes)
         WHERE id = ?`
      ).run(ownerSig, actor.fullName, nowStr, notes ? String(notes).trim() : null, id);

      // If paid via Bank, atomically deduct from the selected bank account and log bank transaction
      if (v.payment_method === 'Bank' && v.bank_account_id) {
        const ba = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(v.bank_account_id) as any;
        if (ba) {
          if (ba.current_balance < v.amount) {
            throw new Error(`ব্যাংক অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই (${ba.bank_name}: ৳${ba.current_balance})`);
          }
          const nextBal = Number(ba.current_balance) - Number(v.amount);
          db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(nextBal, ba.id);
          db.prepare(
            `INSERT INTO bank_transactions
              (id, tx_no, date, time, bank_account_id, bank_name, type, amount, bank_charges, charges_deducted, actual_received, purpose, withdrawn_by, destination, related_voucher_no, notes, created_by, owner_approval_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Withdraw', ?, 0, 0, ?, ?, ?, 'Business Expense', ?, ?, ?, 'approved', ?)`
          ).run(
            generateId('btx'),
            `BTX-${Date.now().toString().slice(-5)}`,
            getTodayStr(),
            getNowTimeStr(),
            ba.id,
            ba.bank_name,
            v.amount,
            v.amount,
            v.description,
            v.paid_by,
            v.voucher_no,
            `অনুমোদিত খরচের ভাউচার #${v.voucher_no}`,
            actor.fullName,
            new Date().toISOString()
          );
        }
      }

      appendAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'APPROVE_EXPENSE_VOUCHER',
        recordType: 'ExpenseVoucher',
        recordId: v.voucher_no,
        ipAddress: req.clientIp,
        details: `মালিক ভাউচার #${v.voucher_no} (৳${v.amount}) অনুমোদন করেছেন। স্বাক্ষর: ${ownerSig}`,
      });
    });

    const updated = db.prepare('SELECT * FROM expense_vouchers WHERE id = ?').get(id);
    res.json({ voucher: serializeVoucher(updated) });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'ভাউচার অনুমোদন ব্যর্থ হয়েছে।' });
  }
});

vouchersBankRouter.post('/vouchers/:id/reject', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const { reason } = req.body || {};
  const cleanReason = String(reason || '').trim();
  if (!cleanReason) {
    return res.status(400).json({ error: 'ভাউচার বাতিলের কারণ উল্লেখ করুন।' });
  }

  const v = db.prepare('SELECT * FROM expense_vouchers WHERE id = ?').get(id) as any;
  if (!v) return res.status(404).json({ error: 'ভাউচার পাওয়া যায়নি।' });
  if (v.status !== 'pending') {
    return res.status(400).json({ error: 'শুধুমাত্র অপেক্ষমাণ ভাউচার প্রত্যাখ্যান করা যায়।' });
  }

  const nowStr = `${getTodayStr()} ${getNowTimeStr()}`;
  db.prepare(
    `UPDATE expense_vouchers SET status = 'rejected', rejected_by = ?, rejected_at = ?, rejection_reason = ? WHERE id = ?`
  ).run(actor.fullName, nowStr, cleanReason, id);

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'REJECT_EXPENSE_VOUCHER',
    recordType: 'ExpenseVoucher',
    recordId: v.voucher_no,
    ipAddress: req.clientIp,
    details: `মালিক ভাউচার #${v.voucher_no} প্রত্যাখ্যান করেছেন। কারণ: ${cleanReason}`,
  });

  const updated = db.prepare('SELECT * FROM expense_vouchers WHERE id = ?').get(id);
  res.json({ voucher: serializeVoucher(updated) });
});

// Approved vouchers are immutable; corrections create a VoucherAdjustment record with audit trail
vouchersBankRouter.post('/vouchers/:id/adjust', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const { newAmount, reason } = req.body || {};
  const cleanReason = String(reason || '').trim();
  const nextAmt = Math.max(0, Number(newAmount) || 0);

  if (!cleanReason || nextAmt <= 0) {
    return res.status(400).json({ error: 'নতুন পরিমাণ এবং সংশোধনের কারণ দিন।' });
  }

  const v = db.prepare('SELECT * FROM expense_vouchers WHERE id = ?').get(id) as any;
  if (!v) return res.status(404).json({ error: 'ভাউচার পাওয়া যায়নি।' });
  if (v.status !== 'approved') {
    return res.status(400).json({ error: 'শুধুমাত্র অনুমোদিত ভাউচারের জন্য সংশোধনী (Adjustment) রেকর্ড তৈরি করা হয়।' });
  }

  const adjustments = JSON.parse(v.adjustments_json || '[]');
  const prevAmt = Number(v.amount);
  const adjRecord = {
    id: generateId('vadj'),
    date: getTodayStr(),
    time: getNowTimeStr(),
    previousAmount: prevAmt,
    newAmount: nextAmt,
    reason: cleanReason,
    createdBy: actor.fullName,
  };
  adjustments.push(adjRecord);

  runInTx(() => {
    db.prepare('UPDATE expense_vouchers SET amount = ?, adjustments_json = ? WHERE id = ?').run(
      nextAmt,
      JSON.stringify(adjustments),
      id
    );

    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'ADJUST_APPROVED_VOUCHER',
      recordType: 'ExpenseVoucher',
      recordId: v.voucher_no,
      ipAddress: req.clientIp,
      details: `অনুমোদিত ভাউচার #${v.voucher_no} সংশোধন রেকর্ড: ৳${prevAmt} -> ৳${nextAmt} | কারণ: ${cleanReason}`,
      previousValue: String(prevAmt),
      newValue: String(nextAmt),
    });
  });

  const updated = db.prepare('SELECT * FROM expense_vouchers WHERE id = ?').get(id);
  res.json({ voucher: serializeVoucher(updated) });
});

// ================= HIGH-SECURITY BANK MANAGEMENT =================
vouchersBankRouter.get('/bank/security-status', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const sec = db.prepare('SELECT failed_attempts, locked_until, session_timeout_minutes FROM bank_security WHERE id = 1').get() as any;
  const token = extractBankToken(req);
  let isUnlocked = false;
  let expiresAt = 0;

  if (token) {
    const bs = db.prepare('SELECT user_id, expires_at FROM bank_sessions WHERE token = ?').get(token) as any;
    if (bs && bs.user_id === req.user!.id && bs.expires_at > Date.now()) {
      isUnlocked = true;
      expiresAt = bs.expires_at;
    }
  }

  const now = Date.now();
  const lockedUntil = Number(sec?.locked_until || 0) > now ? Number(sec.locked_until) : 0;

  res.json({
    isUnlocked,
    expiresAt,
    lockedUntil,
    failedAttempts: Number(sec?.failed_attempts || 0),
    sessionTimeoutMinutes: Number(sec?.session_timeout_minutes || 15),
  });
});

function normalizePinDigits(raw: unknown): string {
  const map: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  };
  return String(raw || '')
    .trim()
    .replace(/[০-৯]/g, (ch) => map[ch] || ch);
}

vouchersBankRouter.post('/bank/verify-pin', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { pin } = req.body || {};
  const cleanPin = normalizePinDigits(pin);
  const sec = db.prepare('SELECT * FROM bank_security WHERE id = 1').get() as any;
  const now = Date.now();
  const dateStr = getTodayStr();
  const timeStr = getNowTimeStr();

  if (sec.locked_until && sec.locked_until > now) {
    const minsLeft = Math.ceil((sec.locked_until - now) / 60000);
    db.prepare(
      `INSERT INTO bank_access_logs (id, user_id, username, role, date, time, success, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(generateId('bal'), actor.id, actor.username, actor.role, dateStr, timeStr, 'লক থাকা অবস্থায় প্রবেশের চেষ্টা ব্যর্থ', new Date().toISOString());

    return res.status(429).json({
      error: `অতিরিক্ত ভুল পিনের কারণে ব্যাংক সিস্টেম লক রয়েছে। ${minsLeft} মিনিট পর আবার চেষ্টা করুন।`,
      lockedUntil: sec.locked_until,
    });
  }

  const ok = verifyPasswordScrypt(cleanPin, sec.pin_hash);
  if (!ok) {
    const nextFailed = Number(sec.failed_attempts || 0) + 1;
    const lockUntil = nextFailed >= 5 ? now + 5 * 60 * 1000 : 0; // Lock 5 mins after 5 failures

    db.prepare('UPDATE bank_security SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = 1').run(
      lockUntil ? 0 : nextFailed,
      lockUntil,
      new Date().toISOString()
    );

    db.prepare(
      `INSERT INTO bank_access_logs (id, user_id, username, role, date, time, success, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      generateId('bal'),
      actor.id,
      actor.username,
      actor.role,
      dateStr,
      timeStr,
      lockUntil ? '৫ বার ভুল পিন — সিস্টেম ৫ মিনিটের জন্য লক করা হয়েছে' : `ভুল ব্যাংক পিন প্রচেষ্টা (#${nextFailed})`,
      new Date().toISOString()
    );

    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'BANK_PIN_FAILED',
      recordType: 'BankSecurity',
      recordId: 'pin-check',
      ipAddress: req.clientIp,
      details: `ভুল ব্যাংক নিরাপত্তা পিন প্রদান (প্রচেষ্টা #${nextFailed})।`,
    });

    return res.status(401).json({
      error: lockUntil
        ? '৫ বার ভুল পিন দেওয়ায় ব্যাংক নিরাপত্তা ৫ মিনিটের জন্য লক করা হয়েছে!'
        : `ব্যাংক পিন সঠিক নয়! (${5 - nextFailed} বার চেষ্টা বাকি আছে)`,
      failedAttempts: lockUntil ? 5 : nextFailed,
      lockedUntil: lockUntil,
    });
  }

  const timeoutMs = (Number(sec.session_timeout_minutes) || 15) * 60 * 1000;
  const bankToken = generateSecureToken();
  const expiresAt = now + timeoutMs;

  db.prepare('UPDATE bank_security SET failed_attempts = 0, locked_until = 0, updated_at = ? WHERE id = 1').run(
    new Date().toISOString()
  );
  db.prepare('INSERT INTO bank_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    bankToken,
    actor.id,
    expiresAt,
    new Date().toISOString()
  );

  db.prepare(
    `INSERT INTO bank_access_logs (id, user_id, username, role, date, time, success, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(generateId('bal'), actor.id, actor.username, actor.role, dateStr, timeStr, 'ব্যাংক নিরাপত্তা পিন সফলভাবে যাচাইকৃত', new Date().toISOString());

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'BANK_ACCESS_UNLOCKED',
    recordType: 'BankSecurity',
    recordId: 'pin-check',
    ipAddress: req.clientIp,
    details: `${actor.fullName} ব্যাংক নিরাপত্তা পিন দিয়ে ব্যাংক মডিউল আনলক করেছেন।`,
  });

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('mill_bank_token', bankToken, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: timeoutMs,
  });

  res.json({ bankToken, expiresAt, sessionTimeoutMinutes: sec.session_timeout_minutes });
});

vouchersBankRouter.post('/bank/lock', requireAuth, (req, res) => {
  const token = extractBankToken(req);
  if (token) {
    db.prepare('DELETE FROM bank_sessions WHERE token = ?').run(token);
  }
  res.clearCookie('mill_bank_token');
  res.json({ success: true });
});

vouchersBankRouter.post('/bank/change-pin', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { currentPin, newPin } = req.body || {};
  const cleanCurrent = normalizePinDigits(currentPin);
  const cleanNew = normalizePinDigits(newPin);
  if (cleanNew.length < 4) {
    return res.status(400).json({ error: 'নতুন ব্যাংক পিন কমপক্ষে ৪ অক্ষরের হতে হবে।' });
  }

  const sec = db.prepare('SELECT * FROM bank_security WHERE id = 1').get() as any;
  if (!verifyPasswordScrypt(cleanCurrent, sec.pin_hash)) {
    return res.status(401).json({ error: 'বর্তমান ব্যাংক নিরাপত্তা পিন সঠিক নয়।' });
  }

  db.prepare('UPDATE bank_security SET pin_hash = ?, failed_attempts = 0, locked_until = 0, updated_at = ? WHERE id = 1').run(
    hashPasswordScrypt(cleanNew),
    new Date().toISOString()
  );

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CHANGE_BANK_PIN',
    recordType: 'BankSecurity',
    recordId: 'pin-change',
    ipAddress: req.clientIp,
    details: 'মালিক ব্যাংক নিরাপত্তা পিন পরিবর্তন করেছেন।',
  });

  res.json({ success: true });
});

vouchersBankRouter.get('/bank/access-logs', requireAuth, requireRole('OWNER'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM bank_access_logs ORDER BY created_at DESC LIMIT 100').all() as any[];
  res.json({
    logs: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      role: r.role,
      date: r.date,
      time: r.time,
      success: r.success === 1,
      message: r.message,
    })),
  });
});

// Bank Accounts & Transactions (Strictly requires valid Bank Security PIN session!)
vouchersBankRouter.get('/bank/accounts', requireAuth, requireRole('OWNER', 'MANAGER'), requireBankPin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM bank_accounts ORDER BY rowid ASC').all() as any[];
  res.json({
    accounts: rows.map((r) => ({
      id: r.id,
      bankName: r.bank_name,
      accountName: r.account_name,
      accountNumber: r.account_number,
      branch: r.branch,
      accountType: r.account_type,
      openingBalance: r.opening_balance,
      currentBalance: r.current_balance,
      status: r.status,
      notes: r.notes || undefined,
      createdAt: r.created_at,
    })),
  });
});

vouchersBankRouter.post('/bank/accounts', requireAuth, requireRole('OWNER'), requireBankPin, (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  if (!body.bankName || !body.accountName || !body.accountNumber) {
    return res.status(400).json({ error: 'ব্যাংকের নাম, অ্যাকাউন্ট নাম এবং নম্বর দিন।' });
  }
  const openBal = Math.max(0, Number(body.openingBalance) || 0);
  const id = generateId('bank');
  const today = getTodayStr();

  db.prepare(
    `INSERT INTO bank_accounts (id, bank_name, account_name, account_number, branch, account_type, opening_balance, current_balance, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  ).run(
    id,
    String(body.bankName).trim(),
    String(body.accountName).trim(),
    String(body.accountNumber).trim(),
    String(body.branch || 'বগুড়া শাখা').trim(),
    String(body.accountType || 'Current'),
    openBal,
    openBal,
    body.notes ? String(body.notes).trim() : null,
    today
  );

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CREATE_BANK_ACCOUNT',
    recordType: 'BankAccount',
    recordId: id,
    ipAddress: req.clientIp,
    details: `নতুন ব্যাংক অ্যাকাউন্ট যুক্ত: ${body.bankName} (${body.accountNumber}) প্রারম্ভিক স্থিতি: ৳${openBal}`,
  });

  const created = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(id) as any;
  res.status(201).json({
    account: {
      id: created.id,
      bankName: created.bank_name,
      accountName: created.account_name,
      accountNumber: created.account_number,
      branch: created.branch,
      accountType: created.account_type,
      openingBalance: created.opening_balance,
      currentBalance: created.current_balance,
      status: created.status,
      notes: created.notes || undefined,
      createdAt: created.created_at,
    },
  });
});

vouchersBankRouter.get('/bank/transactions', requireAuth, requireRole('OWNER', 'MANAGER'), requireBankPin, (req, res) => {
  const bankAccountId = String(req.query.bankAccountId || '').trim();
  const type = String(req.query.type || '').trim();

  let sql = 'SELECT * FROM bank_transactions WHERE 1=1';
  const args: any[] = [];
  if (bankAccountId && bankAccountId !== 'all') {
    sql += ' AND (bank_account_id = ? OR to_bank_account_id = ?)';
    args.push(bankAccountId, bankAccountId);
  }
  if (type && type !== 'all') {
    sql += ' AND type = ?';
    args.push(type);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...args) as any[];
  res.json({
    transactions: rows.map((r) => ({
      id: r.id,
      txNo: r.tx_no,
      date: r.date,
      time: r.time,
      bankAccountId: r.bank_account_id,
      bankName: r.bank_name,
      type: r.type,
      amount: r.amount,
      bankCharges: r.bank_charges,
      chargesDeductedFromWithdrawal: r.charges_deducted === 1,
      actualAmountReceived: r.actual_received,
      purpose: r.purpose || undefined,
      withdrawnBy: r.withdrawn_by || undefined,
      destination: r.destination || undefined,
      relatedVoucherNo: r.related_voucher_no || undefined,
      depositedFrom: r.deposited_from || undefined,
      depositMethod: r.deposit_method || undefined,
      relatedCashAccount: r.related_cash_account || undefined,
      referenceNumber: r.reference_number || undefined,
      toBankAccountId: r.to_bank_account_id || undefined,
      toBankName: r.to_bank_name || undefined,
      notes: r.notes || undefined,
      createdBy: r.created_by,
      ownerApprovalStatus: r.owner_approval_status,
    })),
  });
});

vouchersBankRouter.post('/bank/transactions', requireAuth, requireRole('OWNER', 'MANAGER'), requireBankPin, (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  const type = body.type;
  const amount = Math.max(0, Number(body.amount) || 0);
  const bankCharges = Math.max(0, Number(body.bankCharges) || 0);
  const chargesDeducted = Boolean(body.chargesDeductedFromWithdrawal);

  if (!['Deposit', 'Withdraw', 'Transfer', 'Bank Charges', 'Interest', 'Adjustment'].includes(type)) {
    return res.status(400).json({ error: 'সঠিক ব্যাংক লেনদেনের ধরন নির্বাচন করুন।' });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'টাকার পরিমাণ শূন্যের বেশি হতে হবে।' });
  }

  const sourceAcc = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(body.bankAccountId) as any;
  if (!sourceAcc) {
    return res.status(404).json({ error: 'ব্যাংক অ্যাকাউন্ট পাওয়া যায়নি।' });
  }

  const dateStr = String(body.date || getTodayStr()).trim();
  const timeStr = getNowTimeStr();
  const txNo = `BTX-${Date.now().toString().slice(-6)}`;
  const id = generateId('btx');

  try {
    runInTx(() => {
      let actualReceived = amount;
      let toBankName: string | null = null;

      if (type === 'Deposit' || type === 'Interest') {
        const nextBal = Number(sourceAcc.current_balance) + amount - bankCharges;
        db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(nextBal, sourceAcc.id);
      } else if (type === 'Withdraw') {
        // If charges are deducted from withdrawal, bank debit is amount, cash received is amount - bankCharges.
        // If charges are separate, bank debit is amount + bankCharges, cash received is amount.
        const totalBankDebit = chargesDeducted ? amount : amount + bankCharges;
        actualReceived = chargesDeducted ? Math.max(0, amount - bankCharges) : amount;

        if (sourceAcc.current_balance < totalBankDebit) {
          throw new Error(`ব্যাংকে পর্যাপ্ত ব্যালেন্স নেই (বর্তমান: ৳${sourceAcc.current_balance})`);
        }
        const nextBal = Number(sourceAcc.current_balance) - totalBankDebit;
        db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(nextBal, sourceAcc.id);
      } else if (type === 'Bank Charges') {
        if (sourceAcc.current_balance < amount) {
          throw new Error('ব্যাংক চার্জ কাটার মতো পর্যাপ্ত ব্যালেন্স নেই।');
        }
        db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(
          Number(sourceAcc.current_balance) - amount,
          sourceAcc.id
        );
      } else if (type === 'Transfer') {
        const destAcc = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(body.toBankAccountId) as any;
        if (!destAcc || destAcc.id === sourceAcc.id) {
          throw new Error('ভিন্ন একটি প্রাপক ব্যাংক অ্যাকাউন্ট নির্বাচন করুন।');
        }
        const totalDebit = amount + bankCharges;
        if (sourceAcc.current_balance < totalDebit) {
          throw new Error(`প্রেরক ব্যাংকে পর্যাপ্ত ব্যালেন্স নেই (বর্তমান: ৳${sourceAcc.current_balance})`);
        }
        toBankName = destAcc.bank_name;
        db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(
          Number(sourceAcc.current_balance) - totalDebit,
          sourceAcc.id
        );
        db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(
          Number(destAcc.current_balance) + amount,
          destAcc.id
        );
      } else if (type === 'Adjustment') {
        const adjDelta = Number(body.adjustmentSign) < 0 ? -amount : amount;
        const nextBal = Math.max(0, Number(sourceAcc.current_balance) + adjDelta);
        db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(nextBal, sourceAcc.id);
      }

      db.prepare(
        `INSERT INTO bank_transactions
          (id, tx_no, date, time, bank_account_id, bank_name, type, amount, bank_charges, charges_deducted, actual_received, purpose, withdrawn_by, destination, related_voucher_no, deposited_from, deposit_method, related_cash_account, reference_number, to_bank_account_id, to_bank_name, notes, created_by, owner_approval_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        txNo,
        dateStr,
        timeStr,
        sourceAcc.id,
        sourceAcc.bank_name,
        type,
        amount,
        type === 'Bank Charges' ? amount : bankCharges,
        chargesDeducted ? 1 : 0,
        actualReceived,
        body.purpose || null,
        body.withdrawnBy || null,
        body.destination || null,
        body.relatedVoucherNo || null,
        body.depositedFrom || null,
        body.depositMethod || null,
        body.relatedCashAccount || null,
        body.referenceNumber || null,
        body.toBankAccountId || null,
        toBankName,
        body.notes || null,
        actor.fullName,
        'approved',
        new Date().toISOString()
      );

      appendAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: `BANK_${type.toUpperCase().replace(/\s+/g, '_')}`,
        recordType: 'BankTransaction',
        recordId: txNo,
        ipAddress: req.clientIp,
        details: `${sourceAcc.bank_name} — ${type}: ৳${amount} (চার্জ: ৳${bankCharges}, প্রাপ্ত নগদ: ৳${actualReceived})`,
      });
    });

    const created = db.prepare('SELECT * FROM bank_transactions WHERE id = ?').get(id) as any;
    res.status(201).json({
      transaction: {
        id: created.id,
        txNo: created.tx_no,
        date: created.date,
        time: created.time,
        bankAccountId: created.bank_account_id,
        bankName: created.bank_name,
        type: created.type,
        amount: created.amount,
        bankCharges: created.bank_charges,
        chargesDeductedFromWithdrawal: created.charges_deducted === 1,
        actualAmountReceived: created.actual_received,
        purpose: created.purpose || undefined,
        withdrawnBy: created.withdrawn_by || undefined,
        destination: created.destination || undefined,
        relatedVoucherNo: created.related_voucher_no || undefined,
        depositedFrom: created.deposited_from || undefined,
        depositMethod: created.deposit_method || undefined,
        relatedCashAccount: created.related_cash_account || undefined,
        referenceNumber: created.reference_number || undefined,
        toBankAccountId: created.to_bank_account_id || undefined,
        toBankName: created.to_bank_name || undefined,
        notes: created.notes || undefined,
        createdBy: created.created_by,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'ব্যাংক লেনদেন ব্যর্থ হয়েছে।' });
  }
});
