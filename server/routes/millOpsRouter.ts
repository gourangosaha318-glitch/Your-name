import { Router } from 'express';
import { db, appendAuditLog, getTodayStr, getNowTimeStr, runInTx } from '../db';
import { generateId } from '../crypto';
import { AuthedRequest, requireAuth, requireRole } from '../auth';

export const millOpsRouter = Router();

function insertStockHistory(params: {
  date: string;
  time: string;
  productId: string;
  transactionType: string;
  reference: string;
  stockIn: number;
  stockOut: number;
  createdBy: string;
  note: string;
}) {
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(params.productId) as any;
  if (!prod) return;
  const nextBal = Math.max(0, Number(prod.stock) + params.stockIn - params.stockOut);
  db.prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?').run(nextBal, params.date, prod.id);
  db.prepare(
    `INSERT INTO stock_history
      (id, date, time, product_id, product_name, transaction_type, reference, stock_in, stock_out, balance, created_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    generateId('sh'),
    params.date,
    params.time,
    prod.id,
    prod.name,
    params.transactionType,
    params.reference,
    params.stockIn,
    params.stockOut,
    nextBal,
    params.createdBy,
    params.note,
    new Date().toISOString()
  );
}

// ================= WHEAT PURCHASES =================
millOpsRouter.get('/wheat-purchases', requireAuth, requireRole('OWNER', 'MANAGER'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM wheat_purchases ORDER BY created_at DESC').all() as any[];
  res.json({
    purchases: rows.map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      quantityKg: r.quantity_kg,
      ratePerKg: r.rate_per_kg,
      totalCost: r.total_cost,
      paidAmount: r.paid_amount,
      paymentMethod: r.payment_method,
      bankAccountId: r.bank_account_id || undefined,
      memoNo: r.memo_no,
      note: r.note || '',
      createdBy: r.created_by,
    })),
  });
});

millOpsRouter.post('/wheat-purchases', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  const qtyKg = Math.max(0, Number(body.quantityKg) || 0);
  const rate = Math.max(0, Number(body.ratePerKg) || 0);
  const totalCost = qtyKg * rate;
  const paidAmount = Math.max(0, Number(body.paidAmount) || 0);
  const paymentMethod = ['Cash', 'Bank', 'Due'].includes(body.paymentMethod) ? body.paymentMethod : 'Cash';
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(body.supplierId) as any;

  if (!supplier || qtyKg <= 0 || rate <= 0) {
    return res.status(400).json({ error: 'সঠিক গম সরবরাহকারী, কেজি পরিমাণ এবং দর দিন।' });
  }

  const dateStr = String(body.date || getTodayStr()).trim();
  const timeStr = getNowTimeStr();
  const id = generateId('wp');
  const memoNo = String(body.memoNo || `WP-${Date.now().toString().slice(-4)}`).trim();

  try {
    runInTx(() => {
      db.prepare(
        `INSERT INTO wheat_purchases
          (id, date, time, supplier_id, supplier_name, quantity_kg, rate_per_kg, total_cost, paid_amount, payment_method, bank_account_id, memo_no, note, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        dateStr,
        timeStr,
        supplier.id,
        supplier.name,
        qtyKg,
        rate,
        totalCost,
        paidAmount,
        paymentMethod,
        body.bankAccountId || null,
        memoNo,
        String(body.note || '').trim(),
        actor.fullName,
        new Date().toISOString()
      );

      // Add raw wheat KG to stock & history
      const wheatProd = db.prepare("SELECT * FROM products WHERE category = 'গম' LIMIT 1").get() as any;
      if (wheatProd) {
        insertStockHistory({
          date: dateStr,
          time: timeStr,
          productId: wheatProd.id,
          transactionType: 'Stock Added',
          reference: memoNo,
          stockIn: qtyKg,
          stockOut: 0,
          createdBy: actor.fullName,
          note: `গম ক্রয় (${supplier.name}) — ৳${totalCost}`,
        });
      }

      // Update Supplier ledger
      const dueDelta = totalCost - paidAmount;
      const nextPur = Number(supplier.total_purchases) + totalCost;
      const nextPay = Number(supplier.total_payments) + paidAmount;
      const nextDue = Math.max(0, Number(supplier.current_due) + dueDelta);
      db.prepare('UPDATE suppliers SET total_purchases = ?, total_payments = ?, current_due = ? WHERE id = ?').run(
        nextPur,
        nextPay,
        nextDue,
        supplier.id
      );

      db.prepare(
        `INSERT INTO supplier_transactions
          (id, supplier_id, supplier_name, supplier_type, date, time, type, reference_no, quantity_kg, rate, amount, payment_method, bank_account_id, note, created_by, running_due, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Purchase', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        generateId('suptx'),
        supplier.id,
        supplier.name,
        supplier.supplier_type,
        dateStr,
        timeStr,
        memoNo,
        qtyKg,
        rate,
        totalCost,
        paymentMethod,
        body.bankAccountId || null,
        `গম ক্রয় ${qtyKg} কেজি (পরিশোধ: ৳${paidAmount})`,
        actor.fullName,
        nextDue,
        new Date().toISOString()
      );

      // Deduct from Bank if paid via Bank
      if (paymentMethod === 'Bank' && body.bankAccountId && paidAmount > 0) {
        const ba = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(body.bankAccountId) as any;
        if (ba) {
          if (ba.current_balance < paidAmount) {
            throw new Error(`ব্যাংকে পর্যাপ্ত ব্যালেন্স নেই (${ba.bank_name})`);
          }
          db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(
            Number(ba.current_balance) - paidAmount,
            ba.id
          );
          db.prepare(
            `INSERT INTO bank_transactions
              (id, tx_no, date, time, bank_account_id, bank_name, type, amount, bank_charges, charges_deducted, actual_received, purpose, withdrawn_by, destination, reference_number, notes, created_by, owner_approval_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Withdraw', ?, 0, 0, ?, ?, ?, 'Business Expense', ?, ?, ?, 'approved', ?)`
          ).run(
            generateId('btx'),
            `BTX-${Date.now().toString().slice(-5)}`,
            dateStr,
            timeStr,
            ba.id,
            ba.bank_name,
            paidAmount,
            paidAmount,
            `গম ক্রয় পেমেন্ট (${supplier.name})`,
            actor.fullName,
            memoNo,
            `গম ক্রয় চালান #${memoNo}`,
            actor.fullName,
            new Date().toISOString()
          );
        }
      }

      appendAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'CREATE_WHEAT_PURCHASE',
        recordType: 'WheatPurchase',
        recordId: memoNo,
        ipAddress: req.clientIp,
        details: `গম ক্রয়: ${qtyKg} কেজি @ ৳${rate}/কেজি = ৳${totalCost} (সরবরাহকারী: ${supplier.name})`,
      });
    });

    const created = db.prepare('SELECT * FROM wheat_purchases WHERE id = ?').get(id) as any;
    res.status(201).json({
      purchase: {
        id: created.id,
        date: created.date,
        time: created.time,
        supplierId: created.supplier_id,
        supplierName: created.supplier_name,
        quantityKg: created.quantity_kg,
        ratePerKg: created.rate_per_kg,
        totalCost: created.total_cost,
        paidAmount: created.paid_amount,
        paymentMethod: created.payment_method,
        memoNo: created.memo_no,
        note: created.note || '',
        createdBy: created.created_by,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'গম ক্রয় সংরক্ষণ ব্যর্থ হয়েছে।' });
  }
});

// ================= GRINDING & PRODUCTION =================
millOpsRouter.get('/production', requireAuth, requireRole('OWNER', 'MANAGER'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM productions ORDER BY created_at DESC').all() as any[];
  res.json({
    productions: rows.map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      shift: r.shift,
      wheatUsedKg: r.wheat_used_kg,
      flourBags: r.flour_bags,
      maidaBags: r.maida_bags,
      branBags: r.bran_bags,
      sujiBags: r.suji_bags,
      operatorName: r.operator_name,
      createdBy: r.created_by,
      note: r.note || '',
    })),
  });
});

millOpsRouter.post('/production', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  const wheatUsedKg = Math.max(0, Number(body.wheatUsedKg) || 0);
  const flourBags = Math.max(0, Math.floor(Number(body.flourBags) || 0));
  const maidaBags = Math.max(0, Math.floor(Number(body.maidaBags) || 0));
  const branBags = Math.max(0, Math.floor(Number(body.branBags) || 0));
  const sujiBags = Math.max(0, Math.floor(Number(body.sujiBags) || 0));

  if (wheatUsedKg <= 0 && flourBags + maidaBags + branBags + sujiBags <= 0) {
    return res.status(400).json({ error: 'ভাঙানো গম বা উৎপাদিত বস্তার পরিমাণ দিন।' });
  }

  const dateStr = String(body.date || getTodayStr()).trim();
  const timeStr = getNowTimeStr();
  const id = generateId('pr');
  const refNo = `PROD-${Date.now().toString().slice(-5)}`;
  const shift = String(body.shift || 'সকাল শিফট').trim();
  const operatorName = String(body.operatorName || 'রফিকুল ইসলাম').trim();

  try {
    runInTx(() => {
      const wheatProd = db.prepare("SELECT * FROM products WHERE category = 'গম' LIMIT 1").get() as any;
      if (wheatProd && wheatUsedKg > 0) {
        if (wheatProd.stock < wheatUsedKg) {
          throw new Error(`সাইলোতে পর্যাপ্ত কাঁচা গম নেই (মজুদ: ${wheatProd.stock} কেজি)`);
        }
        insertStockHistory({
          date: dateStr,
          time: timeStr,
          productId: wheatProd.id,
          transactionType: 'Production',
          reference: refNo,
          stockIn: 0,
          stockOut: wheatUsedKg,
          createdBy: actor.fullName,
          note: `${shift} — গম ভাঙানো (${operatorName})`,
        });
      }

      const mappings = [
        { cat: 'আটা', bags: flourBags },
        { cat: 'ময়দা', bags: maidaBags },
        { cat: 'ভুসি', bags: branBags },
        { cat: 'সুজি', bags: sujiBags },
      ];
      for (const m of mappings) {
        if (m.bags <= 0) continue;
        const p = db.prepare("SELECT * FROM products WHERE category = ? AND unit = 'বস্তা' LIMIT 1").get(m.cat) as any;
        if (p) {
          insertStockHistory({
            date: dateStr,
            time: timeStr,
            productId: p.id,
            transactionType: 'Production',
            reference: refNo,
            stockIn: m.bags,
            stockOut: 0,
            createdBy: actor.fullName,
            note: `${shift} উৎপাদন (${operatorName})`,
          });
        }
      }

      db.prepare(
        `INSERT INTO productions
          (id, date, time, shift, wheat_used_kg, flour_bags, maida_bags, bran_bags, suji_bags, operator_name, created_by, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        dateStr,
        timeStr,
        shift,
        wheatUsedKg,
        flourBags,
        maidaBags,
        branBags,
        sujiBags,
        operatorName,
        actor.fullName,
        String(body.note || '').trim(),
        new Date().toISOString()
      );

      appendAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'CREATE_PRODUCTION',
        recordType: 'Production',
        recordId: refNo,
        ipAddress: req.clientIp,
        details: `উৎপাদন (${shift}): গম ${wheatUsedKg} কেজি -> আটা ${flourBags}, ময়দা ${maidaBags}, ভুসি ${branBags}, সুজি ${sujiBags} বস্তা`,
      });
    });

    const created = db.prepare('SELECT * FROM productions WHERE id = ?').get(id) as any;
    res.status(201).json({
      production: {
        id: created.id,
        date: created.date,
        time: created.time,
        shift: created.shift,
        wheatUsedKg: created.wheat_used_kg,
        flourBags: created.flour_bags,
        maidaBags: created.maida_bags,
        branBags: created.bran_bags,
        sujiBags: created.suji_bags,
        operatorName: created.operator_name,
        createdBy: created.created_by,
        note: created.note || '',
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'উৎপাদন সংরক্ষণ ব্যর্থ হয়েছে।' });
  }
});

// ================= SUPPLIER CATEGORIES & SUPPLIERS =================
millOpsRouter.get('/supplier-categories', requireAuth, requireRole('OWNER', 'MANAGER'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM supplier_categories ORDER BY rowid ASC').all() as any[];
  res.json({
    categories: rows.map((r) => ({
      id: r.id,
      name: r.name,
      isDefault: r.is_default === 1,
      createdAt: r.created_at,
    })),
  });
});

millOpsRouter.post('/supplier-categories', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'সরবরাহকারী ক্যাটাগরির নাম লিখুন।' });
  const dup = db.prepare('SELECT id FROM supplier_categories WHERE name = ?').get(name);
  if (dup) return res.status(409).json({ error: 'এই ক্যাটাগরিটি ইতিমধ্যেই রয়েছে।' });

  const id = generateId('supcat');
  db.prepare('INSERT INTO supplier_categories (id, name, is_default, created_at) VALUES (?, ?, 0, ?)').run(
    id,
    name,
    getTodayStr()
  );
  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CREATE_SUPPLIER_CATEGORY',
    recordType: 'SupplierCategory',
    recordId: id,
    ipAddress: req.clientIp,
    details: `নতুন সরবরাহকারী ক্যাটাগরি যোগ: ${name}`,
  });
  res.status(201).json({ category: { id, name, isDefault: false, createdAt: getTodayStr() } });
});

millOpsRouter.delete('/supplier-categories/:id', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const cat = db.prepare('SELECT * FROM supplier_categories WHERE id = ?').get(req.params.id) as any;
  if (!cat) return res.status(404).json({ error: 'ক্যাটাগরি পাওয়া যায়নি।' });
  if (cat.is_default === 1) {
    return res.status(400).json({ error: 'ডিফল্ট সরবরাহকারী ক্যাটাগরি মুছে ফেলা যাবে না।' });
  }
  db.prepare('DELETE FROM supplier_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

millOpsRouter.get('/suppliers', requireAuth, requireRole('OWNER', 'MANAGER'), (_req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY rowid DESC').all() as any[];
  const txs = db.prepare('SELECT * FROM supplier_transactions ORDER BY created_at DESC').all() as any[];
  res.json({
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      supplierType: s.supplier_type,
      phone: s.phone || '',
      address: s.address || '',
      openingBalance: s.opening_balance,
      totalPurchases: s.total_purchases,
      totalPayments: s.total_payments,
      currentDue: s.current_due,
      notes: s.notes || '',
      createdAt: s.created_at,
    })),
    transactions: txs.map((t) => ({
      id: t.id,
      supplierId: t.supplier_id,
      supplierName: t.supplier_name,
      supplierType: t.supplier_type,
      date: t.date,
      time: t.time,
      type: t.type,
      referenceNo: t.reference_no,
      quantityKg: t.quantity_kg || undefined,
      rate: t.rate || undefined,
      amount: t.amount,
      paymentMethod: t.payment_method,
      note: t.note,
      createdBy: t.created_by,
      runningDue: t.running_due,
    })),
  });
});

millOpsRouter.post('/suppliers', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  if (!body.name || !body.supplierType) {
    return res.status(400).json({ error: 'সরবরাহকারীর নাম ও ধরন (ক্যাটাগরি) দিন।' });
  }
  const openDue = Math.max(0, Number(body.openingBalance) || 0);
  const id = generateId('sup');
  const today = getTodayStr();

  db.prepare(
    `INSERT INTO suppliers (id, name, supplier_type, phone, address, opening_balance, total_purchases, total_payments, current_due, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
  ).run(
    id,
    String(body.name).trim(),
    String(body.supplierType).trim(),
    String(body.phone || '').trim(),
    String(body.address || '').trim(),
    openDue,
    openDue,
    String(body.notes || '').trim(),
    today
  );

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CREATE_SUPPLIER',
    recordType: 'Supplier',
    recordId: id,
    ipAddress: req.clientIp,
    details: `নতুন সরবরাহকারী যুক্ত: ${body.name} (${body.supplierType})`,
  });

  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
  res.status(201).json({
    supplier: {
      id: s.id,
      name: s.name,
      supplierType: s.supplier_type,
      phone: s.phone,
      address: s.address,
      openingBalance: s.opening_balance,
      totalPurchases: s.total_purchases,
      totalPayments: s.total_payments,
      currentDue: s.current_due,
      notes: s.notes,
      createdAt: s.created_at,
    },
  });
});

millOpsRouter.post('/suppliers/:id/transactions', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id) as any;
  if (!supplier) return res.status(404).json({ error: 'সরবরাহকারী পাওয়া যায়নি।' });

  const body = req.body || {};
  const txType = body.type;
  const amount = Math.max(0, Number(body.amount) || 0);
  if (!['Purchase', 'Payment', 'Advance Payment', 'Due', 'Adjustment', 'Refund'].includes(txType) || amount <= 0) {
    return res.status(400).json({ error: 'সঠিক লেনদেনের ধরন ও টাকার পরিমাণ দিন।' });
  }

  const dateStr = String(body.date || getTodayStr()).trim();
  const timeStr = getNowTimeStr();
  const refNo = String(body.referenceNo || `STX-${Date.now().toString().slice(-5)}`).trim();
  const paymentMethod = String(body.paymentMethod || 'Cash');

  try {
    runInTx(() => {
      let nextPurchases = Number(supplier.total_purchases);
      let nextPayments = Number(supplier.total_payments);
      let nextDue = Number(supplier.current_due);

      if (txType === 'Purchase' || txType === 'Due') {
        nextPurchases += amount;
        nextDue += amount;
      } else if (txType === 'Payment' || txType === 'Advance Payment') {
        nextPayments += amount;
        nextDue = nextDue - amount; // negative means advance balance
      } else if (txType === 'Refund') {
        nextDue += amount;
      } else if (txType === 'Adjustment') {
        const sign = Number(body.adjustmentSign) < 0 ? -1 : 1;
        nextDue += sign * amount;
      }

      db.prepare('UPDATE suppliers SET total_purchases = ?, total_payments = ?, current_due = ? WHERE id = ?').run(
        nextPurchases,
        nextPayments,
        nextDue,
        supplier.id
      );

      db.prepare(
        `INSERT INTO supplier_transactions
          (id, supplier_id, supplier_name, supplier_type, date, time, type, reference_no, amount, payment_method, bank_account_id, note, created_by, running_due, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        generateId('suptx'),
        supplier.id,
        supplier.name,
        supplier.supplier_type,
        dateStr,
        timeStr,
        txType,
        refNo,
        amount,
        paymentMethod,
        body.bankAccountId || null,
        String(body.note || txType).trim(),
        actor.fullName,
        nextDue,
        new Date().toISOString()
      );

      if ((txType === 'Payment' || txType === 'Advance Payment') && paymentMethod === 'Bank' && body.bankAccountId) {
        const ba = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(body.bankAccountId) as any;
        if (ba) {
          if (ba.current_balance < amount) {
            throw new Error(`ব্যাংক অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (${ba.bank_name})`);
          }
          db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(
            Number(ba.current_balance) - amount,
            ba.id
          );
          db.prepare(
            `INSERT INTO bank_transactions
              (id, tx_no, date, time, bank_account_id, bank_name, type, amount, bank_charges, charges_deducted, actual_received, purpose, withdrawn_by, destination, reference_number, notes, created_by, owner_approval_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Withdraw', ?, 0, 0, ?, ?, ?, 'Business Expense', ?, ?, ?, 'approved', ?)`
          ).run(
            generateId('btx'),
            `BTX-${Date.now().toString().slice(-5)}`,
            dateStr,
            timeStr,
            ba.id,
            ba.bank_name,
            amount,
            amount,
            `সরবরাহকারী পেমেন্ট (${supplier.name})`,
            actor.fullName,
            refNo,
            String(body.note || ''),
            actor.fullName,
            new Date().toISOString()
          );
        }
      }

      appendAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'SUPPLIER_TRANSACTION',
        recordType: 'SupplierLedger',
        recordId: refNo,
        ipAddress: req.clientIp,
        details: `${supplier.name} (${supplier.supplier_type}) — ${txType}: ৳${amount}`,
      });
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'সরবরাহকারী লেনদেন ব্যর্থ হয়েছে।' });
  }
});

// ================= CUSTOMERS & CUSTOMER LEDGER =================
millOpsRouter.get('/customers', requireAuth, requireRole('OWNER', 'MANAGER'), (_req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY rowid DESC').all() as any[];
  const txs = db.prepare('SELECT * FROM customer_transactions ORDER BY created_at DESC').all() as any[];
  res.json({
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      shopName: c.shop_name,
      phone: c.phone || '',
      address: c.address || '',
      openingBalance: c.opening_balance,
      totalSales: c.total_sales,
      totalPayments: c.total_payments,
      currentDue: c.current_due,
      notes: c.notes || '',
    })),
    transactions: txs.map((t) => ({
      id: t.id,
      customerId: t.customer_id,
      customerName: t.customer_name,
      date: t.date,
      time: t.time,
      type: t.type,
      referenceNo: t.reference_no,
      amount: t.amount,
      paidAmount: t.paid_amount,
      paymentMethod: t.payment_method,
      note: t.note,
      createdBy: t.created_by,
      runningDue: t.running_due,
    })),
  });
});

millOpsRouter.post('/customers', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  if (!body.name && !body.shopName) {
    return res.status(400).json({ error: 'ক্রেতা বা দোকানের নাম দিন।' });
  }
  const openDue = Math.max(0, Number(body.openingBalance) || 0);
  const id = generateId('cust');

  db.prepare(
    `INSERT INTO customers (id, name, shop_name, phone, address, opening_balance, total_sales, total_payments, current_due, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
  ).run(
    id,
    String(body.name || body.shopName).trim(),
    String(body.shopName || body.name).trim(),
    String(body.phone || '').trim(),
    String(body.address || '').trim(),
    openDue,
    openDue,
    String(body.notes || '').trim(),
    getTodayStr()
  );

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CREATE_CUSTOMER',
    recordType: 'Customer',
    recordId: id,
    ipAddress: req.clientIp,
    details: `নতুন ক্রেতা যুক্ত: ${body.shopName || body.name}`,
  });

  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  res.status(201).json({
    customer: {
      id: c.id,
      name: c.name,
      shopName: c.shop_name,
      phone: c.phone,
      address: c.address,
      openingBalance: c.opening_balance,
      totalSales: c.total_sales,
      totalPayments: c.total_payments,
      currentDue: c.current_due,
      notes: c.notes,
    },
  });
});

millOpsRouter.post('/customers/:id/transactions', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
  if (!customer) return res.status(404).json({ error: 'ক্রেতা পাওয়া যায়নি।' });

  const body = req.body || {};
  const txType = body.type;
  const amount = Math.max(0, Number(body.amount) || 0);
  if (!['Sale', 'Payment', 'Advance', 'Adjustment', 'Return'].includes(txType) || amount <= 0) {
    return res.status(400).json({ error: 'সঠিক লেনদেনের ধরন ও পরিমাণ দিন।' });
  }

  const dateStr = String(body.date || getTodayStr()).trim();
  const timeStr = getNowTimeStr();
  const refNo = String(body.referenceNo || `CTX-${Date.now().toString().slice(-5)}`).trim();
  const paymentMethod = String(body.paymentMethod || 'Cash');

  runInTx(() => {
    let nextSales = Number(customer.total_sales);
    let nextPaid = Number(customer.total_payments);
    let nextDue = Number(customer.current_due);
    let paidAmt = 0;

    if (txType === 'Sale') {
      nextSales += amount;
      nextDue += amount;
    } else if (txType === 'Payment' || txType === 'Advance' || txType === 'Return') {
      paidAmt = amount;
      nextPaid += amount;
      nextDue = nextDue - amount;
    } else if (txType === 'Adjustment') {
      const sign = Number(body.adjustmentSign) < 0 ? -1 : 1;
      nextDue += sign * amount;
    }

    db.prepare('UPDATE customers SET total_sales = ?, total_payments = ?, current_due = ? WHERE id = ?').run(
      nextSales,
      nextPaid,
      nextDue,
      customer.id
    );

    db.prepare(
      `INSERT INTO customer_transactions
        (id, customer_id, customer_name, date, time, type, reference_no, amount, paid_amount, payment_method, note, created_by, running_due, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      generateId('ctx'),
      customer.id,
      customer.shop_name,
      dateStr,
      timeStr,
      txType,
      refNo,
      amount,
      paidAmt,
      paymentMethod,
      String(body.note || txType).trim(),
      actor.fullName,
      nextDue,
      new Date().toISOString()
    );

    if ((txType === 'Payment' || txType === 'Advance') && paymentMethod === 'Bank' && body.bankAccountId) {
      const ba = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(body.bankAccountId) as any;
      if (ba) {
        db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(
          Number(ba.current_balance) + amount,
          ba.id
        );
        db.prepare(
          `INSERT INTO bank_transactions
            (id, tx_no, date, time, bank_account_id, bank_name, type, amount, bank_charges, charges_deducted, actual_received, deposited_from, deposit_method, reference_number, notes, created_by, owner_approval_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'Deposit', ?, 0, 0, ?, ?, 'Customer Bank Payment', ?, ?, ?, 'approved', ?)`
        ).run(
          generateId('btx'),
          `BTX-${Date.now().toString().slice(-5)}`,
          dateStr,
          timeStr,
          ba.id,
          ba.bank_name,
          amount,
          amount,
          `ক্রেতা বকেয়া আদায় (${customer.shop_name})`,
          refNo,
          String(body.note || ''),
          actor.fullName,
          new Date().toISOString()
        );
      }
    }

    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'CUSTOMER_TRANSACTION',
      recordType: 'CustomerLedger',
      recordId: refNo,
      ipAddress: req.clientIp,
      details: `${customer.shop_name} — ${txType}: ৳${amount}`,
    });
  });

  res.status(201).json({ success: true });
});

// ================= EMPLOYEES =================
millOpsRouter.get('/employees', requireAuth, requireRole('OWNER', 'MANAGER'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM employee_transactions ORDER BY created_at DESC').all() as any[];
  res.json({
    transactions: rows.map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      employeeName: r.employee_name,
      designation: r.designation,
      type: r.type,
      amount: r.amount,
      note: r.note || '',
      createdBy: r.created_by,
    })),
  });
});

millOpsRouter.post('/employees', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  const amount = Math.max(0, Number(body.amount) || 0);
  if (!body.employeeName || amount <= 0) {
    return res.status(400).json({ error: 'কর্মচারীর নাম ও টাকার পরিমাণ দিন।' });
  }
  const id = generateId('emp');
  const dateStr = String(body.date || getTodayStr()).trim();
  const timeStr = getNowTimeStr();

  db.prepare(
    `INSERT INTO employee_transactions (id, date, time, employee_name, designation, type, amount, note, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    dateStr,
    timeStr,
    String(body.employeeName).trim(),
    String(body.designation || 'মিল কর্মী').trim(),
    String(body.type || 'Salary/Wage'),
    amount,
    String(body.note || '').trim(),
    actor.fullName,
    new Date().toISOString()
  );

  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'CREATE_EMPLOYEE_TX',
    recordType: 'EmployeeTx',
    recordId: id,
    ipAddress: req.clientIp,
    details: `কর্মচারী লেনদেন (${body.employeeName} — ${body.type}): ৳${amount}`,
  });

  const created = db.prepare('SELECT * FROM employee_transactions WHERE id = ?').get(id) as any;
  res.status(201).json({
    transaction: {
      id: created.id,
      date: created.date,
      time: created.time,
      employeeName: created.employee_name,
      designation: created.designation,
      type: created.type,
      amount: created.amount,
      note: created.note || '',
      createdBy: created.created_by,
    },
  });
});

// ================= FULL DAILY REPORT ALL-IN-ONE (27 REQUIRED ITEMS) =================
millOpsRouter.get('/reports/daily', requireAuth, requireRole('OWNER', 'MANAGER'), (req, res) => {
  const selectedDate = String(req.query.date || getTodayStr()).trim();

  const openCashRow = db.prepare("SELECT value FROM mill_settings WHERE key = 'opening_cash_balance'").get() as any;
  const openingCashBalance = Number(openCashRow?.value || 85400);

  // Wheat purchases for date
  const wheatPurchases = db.prepare('SELECT * FROM wheat_purchases WHERE date = ?').all(selectedDate) as any[];
  const wheatPurchaseKg = wheatPurchases.reduce((s, r) => s + Number(r.quantity_kg || 0), 0);
  const wheatPurchaseCost = wheatPurchases.reduce((s, r) => s + Number(r.total_cost || 0), 0);
  const wheatPurchasePaidCash = wheatPurchases
    .filter((r) => r.payment_method === 'Cash')
    .reduce((s, r) => s + Number(r.paid_amount || 0), 0);

  // Supplier payments for date
  const supplierPayments = db
    .prepare("SELECT * FROM supplier_transactions WHERE date = ? AND type IN ('Payment', 'Advance Payment')")
    .all(selectedDate) as any[];
  const supplierPaymentsFromPurchases = wheatPurchases.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
  const supplierPaymentsDirect = supplierPayments.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalSupplierPayments = supplierPaymentsDirect + supplierPaymentsFromPurchases;
  const supplierCashPaid =
    supplierPayments.filter((r) => r.payment_method === 'Cash').reduce((s, r) => s + Number(r.amount || 0), 0) +
    wheatPurchasePaidCash;

  // Grinding & Production for date
  const productions = db.prepare('SELECT * FROM productions WHERE date = ?').all(selectedDate) as any[];
  const totalGrindingKg = productions.reduce((s, r) => s + Number(r.wheat_used_kg || 0), 0);
  const prodAtta = productions.reduce((s, r) => s + Number(r.flour_bags || 0), 0);
  const prodMaida = productions.reduce((s, r) => s + Number(r.maida_bags || 0), 0);
  const prodBran = productions.reduce((s, r) => s + Number(r.bran_bags || 0), 0);
  const prodSuji = productions.reduce((s, r) => s + Number(r.suji_bags || 0), 0);
  const totalProductionBags = prodAtta + prodMaida + prodBran + prodSuji;

  // Sales memos for date (completed only)
  const memos = db.prepare("SELECT * FROM memos WHERE date = ? AND status = 'completed'").all(selectedDate) as any[];
  const productSalesMap: Record<string, { product: string; bags: number; amount: number }> = {};
  let totalSalesAmount = 0;
  let bagBasedSales = 0;
  let totalBagsSold = 0;
  let transportTotal = 0;
  let discountTotal = 0;
  let cashSales = 0;
  let bankSales = 0;
  let dueSales = 0;
  let retailFlourSales = 0;

  for (const m of memos) {
    totalSalesAmount += Number(m.grand_total || 0);
    transportTotal += Number(m.transport_cost || 0);
    discountTotal += Number(m.discount || 0);
    dueSales += Number(m.due_amount || 0);
    if (m.payment_method === 'Bank') {
      bankSales += Number(m.paid_amount || 0);
    } else {
      cashSales += Number(m.paid_amount || 0);
    }
    const items = JSON.parse(m.items_json || '[]');
    for (const it of items) {
      const name = String(it.product || 'অন্যান্য');
      if (it.itemType === 'retail_flour' || name.includes('খুচরা')) {
        retailFlourSales += Number(it.total || 0);
        continue;
      }
      if (!productSalesMap[name]) {
        productSalesMap[name] = { product: name, bags: 0, amount: 0 };
      }
      const bags = Number(it.quantity || 0);
      const amt = Number(it.total || 0);
      productSalesMap[name].bags += bags;
      productSalesMap[name].amount += amt;
      totalBagsSold += bags;
      bagBasedSales += amt;
    }
  }

  // Customer payments received (separate payment transactions on date)
  const custPayments = db
    .prepare("SELECT * FROM customer_transactions WHERE date = ? AND type IN ('Payment', 'Advance')")
    .all(selectedDate) as any[];
  const customerPaymentsReceived = custPayments.reduce((s, r) => s + Number(r.amount || 0), 0);
  const customerCashReceived = custPayments
    .filter((r) => r.payment_method === 'Cash')
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  // Expense vouchers for date
  const vouchers = db.prepare('SELECT * FROM expense_vouchers WHERE date = ?').all(selectedDate) as any[];
  const approvedVouchers = vouchers.filter((v) => v.status === 'approved');
  const pendingVouchers = vouchers.filter((v) => v.status === 'pending');
  const rejectedVouchers = vouchers.filter((v) => v.status === 'rejected');
  const totalDailyExpenses = approvedVouchers.reduce((s, v) => s + Number(v.amount || 0), 0);
  const cashExpenses = approvedVouchers
    .filter((v) => v.payment_method === 'Cash')
    .reduce((s, v) => s + Number(v.amount || 0), 0);

  // Bank deposit, withdrawal & charges for date
  const bankTxs = db.prepare('SELECT * FROM bank_transactions WHERE date = ?').all(selectedDate) as any[];
  const bankDepositTotal = bankTxs
    .filter((t) => t.type === 'Deposit')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const bankWithdrawTotal = bankTxs
    .filter((t) => t.type === 'Withdraw')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const bankChargesTotal = bankTxs.reduce((s, t) => s + Number(t.bank_charges || 0), 0);
  const bankWithdrawToCash = bankTxs
    .filter((t) => t.type === 'Withdraw' && (!t.destination || t.destination === 'Cash'))
    .reduce((s, t) => s + Number(t.actual_received || t.amount || 0), 0);
  const bankDepositFromCash = bankTxs
    .filter((t) => t.type === 'Deposit' && (t.deposit_method === 'Cash Deposit' || t.related_cash_account))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // Employee daily transactions
  const employeeTxs = db.prepare('SELECT * FROM employee_transactions WHERE date = ?').all(selectedDate) as any[];
  const empCashCollection = employeeTxs
    .filter((e) => e.type === 'Collection')
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const empCashPaid = employeeTxs
    .filter((e) => e.type !== 'Collection')
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  // Cash flow summary
  const cashReceived = cashSales + customerCashReceived + bankWithdrawToCash + empCashCollection;
  const cashPaid = supplierCashPaid + cashExpenses + bankDepositFromCash + empCashPaid;
  const closingCashBalance = openingCashBalance + cashReceived - cashPaid;

  // Customer & Supplier due summaries
  const customers = db.prepare('SELECT id, shop_name, name, phone, current_due FROM customers ORDER BY current_due DESC').all() as any[];
  const totalCustomerDue = customers.reduce((s, c) => s + Math.max(0, Number(c.current_due || 0)), 0);

  const suppliers = db.prepare('SELECT id, name, supplier_type, phone, current_due FROM suppliers ORDER BY current_due DESC').all() as any[];
  const totalSupplierDue = suppliers.reduce((s, s2) => s + Math.max(0, Number(s2.current_due || 0)), 0);

  // Stock summary
  const products = db.prepare('SELECT * FROM products ORDER BY rowid ASC').all() as any[];

  // Daily Profit/Loss calculation ONLY from accurately recorded accounting figures:
  // Revenue = Total Sales Amount; Direct Cost = Wheat Used (avg wheat rate * wheatUsedKg) + Approved Expenses + Bank Charges
  const wheatProd = products.find((p) => p.category === 'গম');
  const wheatRate = Number(wheatProd?.unit_price || 25);
  const grindingWheatCost = totalGrindingKg * wheatRate;
  const calculableProfitLoss =
    totalSalesAmount > 0 && (totalGrindingKg > 0 || totalDailyExpenses > 0)
      ? totalSalesAmount - grindingWheatCost - totalDailyExpenses - bankChargesTotal
      : null;

  res.json({
    date: selectedDate,
    openingCashBalance,
    wheatPurchaseKg,
    wheatPurchaseCost,
    wheatSupplierPayments: supplierPaymentsFromPurchases,
    totalGrindingKg,
    productionSummary: {
      totalBags: totalProductionBags,
      atta: prodAtta,
      maida: prodMaida,
      bran: prodBran,
      suji: prodSuji,
    },
    productWiseSales: Object.values(productSalesMap),
    bagBasedSales,
    totalBagsSold,
    transportTotal,
    discountTotal,
    retailFlourSales,
    totalSalesAmount,
    cashSales,
    bankSales,
    dueSales,
    customerPaymentsReceived,
    totalSupplierPayments,
    totalDailyExpenses,
    vouchers: vouchers.map((v) => ({
      voucherNo: v.voucher_no,
      category: v.category,
      description: v.description,
      amount: v.amount,
      paymentMethod: v.payment_method,
      status: v.status,
      approvedBy: v.approved_by,
    })),
    approvedVouchersCount: approvedVouchers.length,
    pendingVouchersCount: pendingVouchers.length,
    rejectedVouchersCount: rejectedVouchers.length,
    pendingExpensesTotal: pendingVouchers.reduce((s, v) => s + Number(v.amount || 0), 0),
    bankSummary: {
      depositTotal: bankDepositTotal,
      withdrawTotal: bankWithdrawTotal,
      chargesTotal: bankChargesTotal,
      transactionsCount: bankTxs.length,
    },
    employeeTransactions: employeeTxs.map((e) => ({
      employeeName: e.employee_name,
      designation: e.designation,
      type: e.type,
      amount: e.amount,
      note: e.note,
    })),
    cashReceived,
    cashPaid,
    closingCashBalance,
    customerDueSummary: {
      totalDue: totalCustomerDue,
      topCustomers: customers.filter((c) => c.current_due > 0).slice(0, 10),
    },
    supplierDueSummary: {
      totalDue: totalSupplierDue,
      topSuppliers: suppliers.filter((s) => s.current_due > 0).slice(0, 10),
    },
    stockSummary: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      stock: p.stock,
      unit: p.unit,
      unitPrice: p.unit_price,
      godown: p.godown,
    })),
    profitLossSummary: {
      calculable: calculableProfitLoss !== null,
      revenue: totalSalesAmount,
      grindingWheatCost,
      approvedExpenses: totalDailyExpenses,
      bankCharges: bankChargesTotal,
      netProfitLoss: calculableProfitLoss,
    },
  });
});
