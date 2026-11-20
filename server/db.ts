import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { generateId, hashPasswordScrypt } from './crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = path.join(DATA_DIR, 'mill.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create automatic non-destructive backup snapshot on startup if DB already exists
if (fs.existsSync(DB_PATH)) {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const autoBackupPath = path.join(BACKUP_DIR, `mill_startup_${stamp}.db`);
    fs.copyFileSync(DB_PATH, autoBackupPath);
    // Keep only last 10 automatic startup backups
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('mill_startup_') && f.endsWith('.db'))
      .sort();
    while (files.length > 10) {
      const oldest = files.shift();
      if (oldest) fs.unlinkSync(path.join(BACKUP_DIR, oldest));
    }
  } catch (err) {
    console.warn('Startup backup skipped:', err);
  }
}

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function getTodayStr(): string {
  return new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
}

export function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-GB');
}

export function getNowTimeStr(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function runInTx<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // ignore rollback errors
    }
    throw err;
  }
}

export function appendAuditLog(params: {
  userId: string;
  username: string;
  role: string;
  action: string;
  recordType: string;
  recordId: string;
  ipAddress?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}) {
  const id = generateId('aud');
  const date = getTodayStr();
  const time = getNowTimeStr();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO audit_logs
      (id, user_id, username, role, action, record_type, record_id, date, time, ip_address, details, previous_value, new_value, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.userId,
    params.username,
    params.role,
    params.action,
    params.recordType,
    params.recordId,
    date,
    time,
    params.ipAddress || '127.0.0.1',
    params.details,
    params.previousValue || null,
    params.newValue || null,
    createdAt
  );
}

export function initDatabaseSchemaAndSeed() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('OWNER', 'MANAGER', 'TESTER')),
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bank_security (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      pin_hash TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER DEFAULT 0,
      session_timeout_minutes INTEGER NOT NULL DEFAULT 15,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_access_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      success INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      bank_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      branch TEXT NOT NULL,
      account_type TEXT NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      tx_no TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      bank_account_id TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      bank_charges REAL NOT NULL DEFAULT 0,
      charges_deducted INTEGER NOT NULL DEFAULT 0,
      actual_received REAL,
      purpose TEXT,
      withdrawn_by TEXT,
      destination TEXT,
      related_voucher_no TEXT,
      deposited_from TEXT,
      deposit_method TEXT,
      related_cash_account TEXT,
      reference_number TEXT,
      to_bank_account_id TEXT,
      to_bank_name TEXT,
      notes TEXT,
      created_by TEXT NOT NULL,
      owner_approval_status TEXT DEFAULT 'approved',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      stock REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0,
      min_reorder_level REAL NOT NULL DEFAULT 0,
      godown TEXT NOT NULL,
      color TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      reference TEXT NOT NULL,
      stock_in REAL NOT NULL DEFAULT 0,
      stock_out REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memos (
      memo_no TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      items_json TEXT NOT NULL,
      bag_count REAL NOT NULL DEFAULT 0,
      bag_based_total REAL NOT NULL DEFAULT 0,
      retail_flour_total REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      transport_cost REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      due_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      bank_account_id TEXT,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'draft', 'cancelled')),
      created_by TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      created_by_role TEXT NOT NULL,
      tester_tag TEXT,
      stock_deducted INTEGER NOT NULL DEFAULT 0,
      gate_pass_id TEXT,
      gate_pass_no TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gate_passes (
      id TEXT PRIMARY KEY,
      gate_pass_no TEXT UNIQUE NOT NULL,
      memo_no TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total_bags REAL NOT NULL DEFAULT 0,
      receiver_name TEXT,
      vehicle_number TEXT,
      created_by TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      created_by_role TEXT NOT NULL,
      tester_tag TEXT,
      authorized_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_vouchers (
      id TEXT PRIMARY KEY,
      voucher_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_by TEXT NOT NULL,
      receiver_person TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('Cash', 'Bank', 'Other')),
      bank_account_id TEXT,
      bank_account_name TEXT,
      attachment_data_url TEXT,
      attachment_name TEXT,
      created_by TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      created_by_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      owner_signature TEXT,
      approved_by TEXT,
      approved_at TEXT,
      rejected_by TEXT,
      rejected_at TEXT,
      rejection_reason TEXT,
      notes TEXT,
      adjustments_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS supplier_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      supplier_type TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      opening_balance REAL NOT NULL DEFAULT 0,
      total_purchases REAL NOT NULL DEFAULT 0,
      total_payments REAL NOT NULL DEFAULT 0,
      current_due REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS supplier_transactions (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      supplier_type TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_no TEXT NOT NULL,
      quantity_kg REAL,
      rate REAL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      bank_account_id TEXT,
      note TEXT NOT NULL,
      created_by TEXT NOT NULL,
      running_due REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      opening_balance REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0,
      total_payments REAL NOT NULL DEFAULT 0,
      current_due REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_no TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'Cash',
      note TEXT NOT NULL,
      created_by TEXT NOT NULL,
      running_due REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wheat_purchases (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      rate_per_kg REAL NOT NULL,
      total_cost REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      bank_account_id TEXT,
      memo_no TEXT NOT NULL,
      note TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS productions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      shift TEXT NOT NULL,
      wheat_used_kg REAL NOT NULL,
      flour_bags REAL NOT NULL DEFAULT 0,
      maida_bags REAL NOT NULL DEFAULT 0,
      bran_bags REAL NOT NULL DEFAULT 0,
      suji_bags REAL NOT NULL DEFAULT 0,
      operator_name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employee_transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      designation TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_submissions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      record_type TEXT NOT NULL,
      record_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      details TEXT NOT NULL,
      previous_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mill_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const nowIso = new Date().toISOString();

  // 1. Seed Users ONLY if empty
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      `INSERT INTO users (id, username, email, full_name, role, password_hash, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertUser.run(
      'owner-001',
      'owner',
      'admin@maflowermill.com',
      'প্রশাসক (মালিক)',
      'OWNER',
      hashPasswordScrypt('mill123456'),
      1,
      today
    );
    insertUser.run(
      'manager-001',
      'manager',
      'manager@maflowermill.com',
      'মিজানুর রহমান',
      'MANAGER',
      hashPasswordScrypt('manager123'),
      1,
      today
    );
    insertUser.run(
      'tester-001',
      'tester',
      'tester@maflowermill.com',
      'রাশেদ আহমেদ (অপারেটর)',
      'TESTER',
      hashPasswordScrypt('tester123'),
      1,
      today
    );
  }

  // 2. Seed Bank Security PIN (default '4321') ONLY if missing
  const bankSec = db.prepare('SELECT id FROM bank_security WHERE id = 1').get();
  if (!bankSec) {
    db.prepare(
      `INSERT INTO bank_security (id, pin_hash, failed_attempts, locked_until, session_timeout_minutes, updated_at)
       VALUES (1, ?, 0, 0, 15, ?)`
    ).run(hashPasswordScrypt('4321'), nowIso);
  }

  // 3. Seed Mill Settings
  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM mill_settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    const setKv = db.prepare('INSERT OR IGNORE INTO mill_settings (key, value) VALUES (?, ?)');
    setKv.run('mill_name', 'মা ফ্লাওয়ার মিল');
    setKv.run('mill_location', 'ঘোড়াধাপহাট, বগুড়া');
    setKv.run('mill_phone', '01712345678');
    setKv.run('mill_tagline', 'সঠিক ওজনে মানসম্মত আটা, ময়দা, ভুসি ও সুজি প্রস্তুতকারক');
    setKv.run('opening_cash_balance', '85400');
  }

  // 4. Seed Products + Opening Stock History ONLY if empty
  const prodCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  if (prodCount === 0) {
    const seedProducts = [
      { id: 'prod-1', name: 'আটা (৫০ কেজি বস্তা)', category: 'আটা', stock: 100, unit: 'বস্তা', unitPrice: 1200, min: 25, godown: '১ নং গুদাম', color: '#ea580c' },
      { id: 'prod-2', name: 'ময়দা (৫০ কেজি বস্তা)', category: 'ময়দা', stock: 120, unit: 'বস্তা', unitPrice: 1200, min: 20, godown: '১ নং গুদাম', color: '#0d9488' },
      { id: 'prod-3', name: 'ভুসি (৩৫ কেজি বস্তা)', category: 'ভুসি', stock: 80, unit: 'বস্তা', unitPrice: 850, min: 15, godown: '২ নং গুদাম', color: '#0284c7' },
      { id: 'prod-4', name: 'সুজি (৫০ কেজি বস্তা)', category: 'সুজি', stock: 40, unit: 'বস্তা', unitPrice: 1400, min: 10, godown: '১ নং গুদাম', color: '#7e22ce' },
      { id: 'prod-5', name: 'কাঁচা গম (আমদানি)', category: 'গম', stock: 10500, unit: 'কেজি', unitPrice: 25, min: 2000, godown: 'প্রধান সাইলো', color: '#d97706' },
    ];
    const insProd = db.prepare(
      `INSERT INTO products (id, name, category, stock, unit, unit_price, min_reorder_level, godown, color, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insHist = db.prepare(
      `INSERT INTO stock_history (id, date, time, product_id, product_name, transaction_type, reference, stock_in, stock_out, balance, created_by, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    seedProducts.forEach((p, idx) => {
      insProd.run(p.id, p.name, p.category, p.stock, p.unit, p.unitPrice, p.min, p.godown, p.color, today);
      insHist.run(
        `sh-init-${idx + 1}`,
        yesterday,
        '09:00 AM',
        p.id,
        p.name,
        'Opening Stock',
        'OPEN-001',
        p.stock,
        0,
        p.stock,
        'প্রশাসক (মালিক)',
        'প্রারম্ভিক গুদাম স্টক',
        new Date(Date.now() - 86400000).toISOString()
      );
    });
  }

  // 5. Seed Default 5 Supplier Categories
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM supplier_categories').get() as { c: number }).c;
  if (catCount === 0) {
    const defaultCats = [
      'বস্তা সরবরাহকারী',
      'কার্ড সরবরাহকারী',
      'গম সরবরাহকারী',
      'পরিবহন সরবরাহকারী',
      'অন্যান্য সরবরাহকারী',
    ];
    const insCat = db.prepare(
      `INSERT INTO supplier_categories (id, name, is_default, created_at) VALUES (?, ?, 1, ?)`
    );
    defaultCats.forEach((c, idx) => insCat.run(`supcat-${idx + 1}`, c, today));
  }

  // 6. Seed Suppliers
  const supCount = (db.prepare('SELECT COUNT(*) as c FROM suppliers').get() as { c: number }).c;
  if (supCount === 0) {
    const insSup = db.prepare(
      `INSERT INTO suppliers (id, name, supplier_type, phone, address, opening_balance, total_purchases, total_payments, current_due, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insSup.run('sup-1', 'মেসার্স শাহ সুলতান গ্রেইন ট্রেডার্স', 'গম সরবরাহকারী', '01722443322', 'বগুড়া সদর', 0, 124000, 100000, 24000, 'নিয়মিত গম সরবরাহকারী', today);
    insSup.run('sup-2', 'মোঃ আনোয়ার হোসেন (আনোয়ার এগ্রো)', 'গম সরবরাহকারী', '01718998877', 'নওগাঁ সদর', 0, 75000, 75000, 0, 'ক্যাশ পার্টি', today);
    insSup.run('sup-3', 'বগুড়া পলিমার ও বস্তা হাউস', 'বস্তা সরবরাহকারী', '01819334455', 'বড়গোলা, বগুড়া', 0, 32000, 25000, 7000, '৫০ কেজি পিপি বস্তা সরবরাহকারী', today);
    insSup.run('sup-4', 'পদ্মা প্রিন্টিং অ্যান্ড কার্ড প্রেস', 'কার্ড সরবরাহকারী', '01911223399', 'সাতমাথা, বগুড়া', 0, 8500, 8500, 0, 'মেমো ও বস্তার কার্ড প্রিন্টিং', today);
    insSup.run('sup-5', 'উত্তরবঙ্গ ট্রান্সপোর্ট এজেন্সি', 'পরিবহন সরবরাহকারী', '01755667788', 'চারমাথা, বগুড়া', 0, 18000, 12000, 6000, 'ট্রাক ভাড়া ও গম পরিবহন', today);

    const insSupTx = db.prepare(
      `INSERT INTO supplier_transactions (id, supplier_id, supplier_name, supplier_type, date, time, type, reference_no, quantity_kg, rate, amount, payment_method, note, created_by, running_due, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insSupTx.run('suptx-1', 'sup-1', 'মেসার্স শাহ সুলতান গ্রেইন ট্রেডার্স', 'গম সরবরাহকারী', today, '10:30 AM', 'Purchase', 'WP-1001', 5000, 24.8, 124000, 'Cash', '৫,০০০ কেজি গম ক্রয় (আংশিক পরিশোধ ৳ ১,০০,০০০)', 'মিজানুর রহমান', 24000, nowIso);
    insSupTx.run('suptx-2', 'sup-2', 'মোঃ আনোয়ার হোসেন (আনোয়ার এগ্রো)', 'গম সরবরাহকারী', yesterday, '02:15 PM', 'Purchase', 'WP-1000', 3000, 25.0, 75000, 'Cash', '৩,০০০ কেজি গম ক্রয় (নগদ পরিশোধ)', 'মিজানুর রহমান', 0, nowIso);
    insSupTx.run('suptx-3', 'sup-3', 'বগুড়া পলিমার ও বস্তা হাউস', 'বস্তা সরবরাহকারী', today, '11:00 AM', 'Purchase', 'SUP-201', null, null, 32000, 'Cash', '২,০০০ পিস বস্তা ক্রয় (পরিশোধ ৳ ২৫,০০০)', 'প্রশাসক (মালিক)', 7000, nowIso);
  }

  // 7. Seed Customers
  const custCount = (db.prepare('SELECT COUNT(*) as c FROM customers').get() as { c: number }).c;
  if (custCount === 0) {
    const insCust = db.prepare(
      `INSERT INTO customers (id, name, shop_name, phone, address, opening_balance, total_sales, total_payments, current_due, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insCust.run('cust-1', 'মোঃ জামিল হোসেন', 'মেসার্স ভাই ভাই ট্রেডার্স', '01711223344', 'নওদাপাড়া বাজার, বগুড়া', 0, 60000, 50000, 10000, 'নিয়মিত পাইকারি ক্রেতা', today);
    insCust.run('cust-2', 'হাজী আকরাম আলী', 'আল-মদিনা বেকারি', '01822334455', 'চারমাথা কেন্দ্রীয় বাস টার্মিনাল, বগুড়া', 0, 48000, 48000, 0, 'বেকারি ময়দার নিয়মিত ক্রেতা', today);
    insCust.run('cust-3', 'আব্দুল করিম', 'করিম স্টোর', '01933445566', 'ঘোড়াধাপহাট বাজার, বগুড়া', 0, 25500, 20000, 5500, 'ভুসি ও আটা ক্রেতা', today);

    const insCustTx = db.prepare(
      `INSERT INTO customer_transactions (id, customer_id, customer_name, date, time, type, reference_no, amount, paid_amount, payment_method, note, created_by, running_due, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insCustTx.run('custtx-1', 'cust-1', 'মেসার্স ভাই ভাই ট্রেডার্স', today, '11:20 AM', 'Sale', 'MEMO-1042', 60000, 50000, 'Cash', '৫০ বস্তা আটা বিক্রয় মেমো #1042', 'মিজানুর রহমান', 10000, nowIso);
    insCustTx.run('custtx-2', 'cust-2', 'আল-মদিনা বেকারি', today, '12:15 PM', 'Sale', 'MEMO-1041', 48000, 48000, 'Cash', '৪০ বস্তা ময়দা বিক্রয় মেমো #1041', 'মিজানুর রহমান', 0, nowIso);
    insCustTx.run('custtx-3', 'cust-3', 'করিম স্টোর', yesterday, '04:00 PM', 'Sale', 'MEMO-1040', 25500, 20000, 'Cash', '৩০ বস্তা ভুসি বিক্রয় মেমো #1040', 'মিজানুর রহমান', 5500, nowIso);
  }

  // 8. Seed Bank Accounts & Initial Transactions
  const bankCount = (db.prepare('SELECT COUNT(*) as c FROM bank_accounts').get() as { c: number }).c;
  if (bankCount === 0) {
    const insBank = db.prepare(
      `INSERT INTO bank_accounts (id, bank_name, account_name, account_number, branch, account_type, opening_balance, current_balance, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    );
    insBank.run('bank-1', 'ইসলামী ব্যাংক বাংলাদেশ লি.', 'মা ফ্লাওয়ার মিল', '205015412008941', 'বগুড়া প্রধান শাখা', 'Current', 300000, 350000, 'মিলের প্রধান চলতি হিসাব', today);
    insBank.run('bank-2', 'ডাচ-বাংলা ব্যাংক লি.', 'মা ফ্লাওয়ার মিল', '1151204589123', 'বগুড়া চারমাথা শাখা', 'Business', 180000, 180000, 'ব্যাপারী পেমেন্ট ও সংগ্রহ অ্যাকাউন্ট', today);
    insBank.run('bank-3', 'বিকাশ মার্চেন্ট অ্যাকাউন্ট', 'মা ফ্লাওয়ার মিল কাউন্টার', '01712345678', 'ডিজিটাল পেমেন্ট', 'Mobile Merchant', 15200, 15200, 'খুচরা ডিজিটাল পেমেন্ট', today);

    const insBtx = db.prepare(
      `INSERT INTO bank_transactions (id, tx_no, date, time, bank_account_id, bank_name, type, amount, bank_charges, charges_deducted, actual_received, deposited_from, deposit_method, related_cash_account, reference_number, notes, created_by, owner_approval_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`
    );
    insBtx.run('btx-1', 'BTX-1001', today, '10:45 AM', 'bank-1', 'ইসলামী ব্যাংক বাংলাদেশ লি.', 'Deposit', 50000, 0, 0, 50000, 'বিক্রয় ক্যাশ জমা', 'Cash Deposit', 'মিলের মূল ক্যাশ বাক্স', 'DEP-9921', 'বিক্রয় নগদ ব্যাংকে জমা', 'প্রশাসক (মালিক)', nowIso);
  }

  // 9. Seed Wheat Purchases & Productions
  const wpCount = (db.prepare('SELECT COUNT(*) as c FROM wheat_purchases').get() as { c: number }).c;
  if (wpCount === 0) {
    db.prepare(
      `INSERT INTO wheat_purchases (id, date, time, supplier_id, supplier_name, quantity_kg, rate_per_kg, total_cost, paid_amount, payment_method, memo_no, note, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('wp-1', today, '10:30 AM', 'sup-1', 'মেসার্স শাহ সুলতান গ্রেইন ট্রেডার্স', 5000, 24.8, 124000, 100000, 'Cash', 'WP-1001', 'ভালো মানের গম ক্রয়', 'মিজানুর রহমান', nowIso);
  }

  const prodLogCount = (db.prepare('SELECT COUNT(*) as c FROM productions').get() as { c: number }).c;
  if (prodLogCount === 0) {
    db.prepare(
      `INSERT INTO productions (id, date, time, shift, wheat_used_kg, flour_bags, maida_bags, bran_bags, suji_bags, operator_name, created_by, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('pr-1', today, '01:00 PM', 'সকাল শিফট', 5000, 42, 35, 22, 10, 'রফিকুল ইসলাম', 'মিজানুর রহমান', 'আজকের প্রথম শিফটের গম ভাঙানো ও উৎপাদন', nowIso);
  }

  // 10. Seed Expense Vouchers
  const vCount = (db.prepare('SELECT COUNT(*) as c FROM expense_vouchers').get() as { c: number }).c;
  if (vCount === 0) {
    const insV = db.prepare(
      `INSERT INTO expense_vouchers (id, voucher_no, date, time, category, description, amount, paid_by, receiver_person, payment_method, bank_account_id, bank_account_name, created_by, created_by_id, created_by_role, status, owner_signature, approved_by, approved_at, notes, adjustments_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)`
    );
    insV.run(
      'ev-1',
      'EV-2025-1001',
      today,
      '11:30 AM',
      'বিদ্যুৎ বিল',
      'মিলের রোল ও সাইলো বিদ্যুৎ বিল পরিশোধ',
      5000,
      'মিজানুর রহমান',
      'পল্লী বিদ্যুৎ সমিতি, বগুড়া',
      'Cash',
      null,
      null,
      'মিজানুর রহমান',
      'manager-001',
      'MANAGER',
      'approved',
      'প্রশাসক (মালিক) [অনুমোদিত]',
      'প্রশাসক (মালিক)',
      `${today} 12:05 PM`,
      'অনুমোদিত নিয়মিত বিল',
      nowIso
    );
    insV.run(
      'ev-2',
      'EV-2025-1002',
      today,
      '01:45 PM',
      'মেশিন মেইনটেন্যান্স',
      'মিলের বেল্ট ও বেয়ারিং অয়েলিং এবং মেরামত',
      1800,
      'মিজানুর রহমান',
      'করিম ইঞ্জিনিয়ারিং ওয়ার্কস',
      'Cash',
      null,
      null,
      'মিজানুর রহমান',
      'manager-001',
      'MANAGER',
      'pending',
      null,
      null,
      null,
      'মালিকের অনুমোদনের জন্য অপেক্ষমাণ',
      nowIso
    );
  }

  // 11. Seed Employee Daily Transactions
  const empCount = (db.prepare('SELECT COUNT(*) as c FROM employee_transactions').get() as { c: number }).c;
  if (empCount === 0) {
    const insEmp = db.prepare(
      `INSERT INTO employee_transactions (id, date, time, employee_name, designation, type, amount, note, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insEmp.run('emp-1', today, '10:00 AM', 'রফিকুল ইসলাম', 'উৎপাদন কর্মী (মিলার)', 'Advance', 1000, 'সাপ্তাহিক খোরাকি অগ্রিম', 'মিজানুর রহমান', nowIso);
    insEmp.run('emp-2', today, '12:30 PM', 'মোঃ হানিফ মিয়া', 'বিক্রয় ও ডেলিভারি কর্মী', 'Collection', 15000, 'বাজার বকেয়া আদায় জমা', 'মিজানুর রহমান', nowIso);
  }

  // 12. Seed Sales Memos & Gate Passes (preserving খুচরা ময়দা entries!)
  const memoCount = (db.prepare('SELECT COUNT(*) as c FROM memos').get() as { c: number }).c;
  if (memoCount === 0) {
    const insMemo = db.prepare(
      `INSERT INTO memos (memo_no, date, time, customer_id, customer_name, customer_phone, customer_address, items_json, bag_count, bag_based_total, retail_flour_total, discount, transport_cost, grand_total, paid_amount, due_amount, payment_method, status, created_by, created_by_id, created_by_role, stock_deducted, gate_pass_id, gate_pass_no, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, 1, ?, ?, ?)`
    );
    const insGp = db.prepare(
      `INSERT INTO gate_passes (id, gate_pass_no, memo_no, date, time, items_json, total_bags, receiver_name, vehicle_number, created_by, created_by_id, created_by_role, authorized_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
    );

    const rfItems = [
      { id: 'rf-init-1', product: 'খুচরা ময়দা', itemType: 'retail_flour', quantity: 0, unit: 'খুচরা (টাকা)', rate: 0, total: 7500, note: 'সকাল শিফট খুচরা বিক্রি' },
      { id: 'rf-init-2', product: 'খুচরা ময়দা', itemType: 'retail_flour', quantity: 0, unit: 'খুচরা (টাকা)', rate: 0, total: 4500, note: 'বিকাল শিফট খুচরা বিক্রি' },
    ];
    insMemo.run('1043', today, '01:15 PM', null, 'খুচরা দোকান ও নগদ বিক্রয় (দৈনিক)', '', 'ঘোড়াধাপহাট মিল কাউন্টার', JSON.stringify(rfItems), 0, 0, 12000, 0, 0, 12000, 12000, 0, 'Cash', 'মিজানুর রহমান', 'manager-001', 'MANAGER', null, null, nowIso);

    const m1042Items = [
      { id: 'bag-init-1', product: 'আটা (৫০ কেজি বস্তা)', itemType: 'bag', quantity: 50, unit: 'বস্তা', rate: 1200, total: 60000 },
    ];
    insMemo.run('1042', today, '11:20 AM', 'cust-1', 'মেসার্স ভাই ভাই ট্রেডার্স, নওদাপাড়া', '01711223344', 'নওদাপাড়া বাজার, বগুড়া', JSON.stringify(m1042Items), 50, 60000, 0, 0, 0, 60000, 50000, 10000, 'Cash', 'মিজানুর রহমান', 'manager-001', 'MANAGER', 'gp-1002', 'GP-1002', nowIso);
    insGp.run('gp-1002', 'GP-1002', '1042', today, '11:25 AM', JSON.stringify([{ productName: 'আটা (৫০ কেজি বস্তা)', bags: 50 }]), 50, 'মোঃ রফিক (ড্রাইভার)', 'বগুড়া-ট-১১-২৪৮৫', 'মিজানুর রহমান', 'manager-001', 'MANAGER', 'প্রশাসক (মালিক)', nowIso);

    const m1041Items = [
      { id: 'bag-init-2', product: 'ময়দা (৫০ কেজি বস্তা)', itemType: 'bag', quantity: 40, unit: 'বস্তা', rate: 1200, total: 48000 },
    ];
    insMemo.run('1041', today, '12:15 PM', 'cust-2', 'আল-মদিনা বেকারি, চারমাথা', '01822334455', 'চারমাথা সেন্ট্রাল বাস টার্মিনাল, বগুড়া', JSON.stringify(m1041Items), 40, 48000, 0, 0, 0, 48000, 48000, 0, 'Cash', 'মিজানুর রহমান', 'manager-001', 'MANAGER', 'gp-1001', 'GP-1001', nowIso);
    insGp.run('gp-1001', 'GP-1001', '1041', today, '12:20 PM', JSON.stringify([{ productName: 'ময়দা (৫০ কেজি বস্তা)', bags: 40 }]), 40, 'আব্দুল হাই (ভ্যান)', 'ভ্যান-৪২', 'মিজানুর রহমান', 'manager-001', 'MANAGER', 'প্রশাসক (মালিক)', nowIso);

    const m1040Items = [
      { id: 'bag-init-3', product: 'ভুসি (৩৫ কেজি বস্তা)', itemType: 'bag', quantity: 30, unit: 'বস্তা', rate: 850, total: 25500 },
    ];
    insMemo.run('1040', yesterday, '04:00 PM', 'cust-3', 'করিম স্টোর, ঘোড়াধাপহাট', '01933445566', 'ঘোড়াধাপহাট বাজার, বগুড়া', JSON.stringify(m1040Items), 30, 25500, 0, 0, 0, 25500, 20000, 5500, 'Cash', 'মিজানুর রহমান', 'manager-001', 'MANAGER', null, null, nowIso);
  }
}
