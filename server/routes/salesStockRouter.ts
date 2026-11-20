import { Router } from 'express';
import { db, appendAuditLog, getTodayStr, getNowTimeStr, runInTx } from '../db';
import { generateId } from '../crypto';
import { AuthedRequest, requireAuth, requireRole } from '../auth';

export const salesStockRouter = Router();

function isRetailFlour(item: any): boolean {
  if (!item) return false;
  if (item.itemType === 'retail_flour') return true;
  const p = String(item.product || '').trim();
  return p === 'খুচরা ময়দা' || p === 'খুচরা ময়দা';
}

function stripWeightForGatePass(name: string): string {
  return String(name || '')
    .replace(/\([^)]*(কেজি|kg)[^)]*\)/gi, '')
    .replace(/[০-৯0-9.]+\s*(কেজি|kg)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findProductForSaleItem(item: any): any | null {
  if (item.productId) {
    const byId = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId) as any;
    if (byId) return byId;
  }
  const name = String(item.product || '').trim();
  if (!name) return null;
  const exact = db.prepare('SELECT * FROM products WHERE name = ? LIMIT 1').get(name) as any;
  if (exact) return exact;
  // Category fallback match
  const cats = ['আটা', 'ময়দা', 'ময়দা', 'ভুসি', 'সুজি'];
  for (const cat of cats) {
    if (name.includes(cat)) {
      const normalizedCat = cat === 'ময়দা' ? 'ময়দা' : cat;
      const found = db.prepare('SELECT * FROM products WHERE category = ? AND unit = ? LIMIT 1').get(normalizedCat, 'বস্তা') as any;
      if (found) return found;
    }
  }
  return null;
}

function recordStockMovement(params: {
  productId: string;
  transactionType: string;
  reference: string;
  stockIn: number;
  stockOut: number;
  createdBy: string;
  note: string;
  date?: string;
}) {
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(params.productId) as any;
  if (!prod) return;
  const delta = (Number(params.stockIn) || 0) - (Number(params.stockOut) || 0);
  const nextBalance = Math.max(0, Number(prod.stock) + delta);
  const dateStr = params.date || getTodayStr();
  const timeStr = getNowTimeStr();

  db.prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?').run(nextBalance, dateStr, prod.id);
  db.prepare(
    `INSERT INTO stock_history
      (id, date, time, product_id, product_name, transaction_type, reference, stock_in, stock_out, balance, created_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    generateId('sh'),
    dateStr,
    timeStr,
    prod.id,
    prod.name,
    params.transactionType,
    params.reference,
    Number(params.stockIn) || 0,
    Number(params.stockOut) || 0,
    nextBalance,
    params.createdBy,
    params.note,
    new Date().toISOString()
  );
}

function normalizeMemoPayload(body: any) {
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const items = rawItems.map((it: any, idx: number) => {
    if (isRetailFlour(it)) {
      const total = Math.max(0, Number(it.total) || 0);
      return {
        id: it.id || `rf-${Date.now()}-${idx}`,
        product: 'খুচরা ময়দা',
        itemType: 'retail_flour',
        quantity: 0,
        unit: 'খুচরা (টাকা)',
        rate: 0,
        total,
        note: String(it.note || ''),
      };
    }
    const qty = Math.max(0, Math.floor(Number(it.quantity) || 0));
    const rate = Math.max(0, Number(it.rate) || 0);
    const total = qty > 0 && rate > 0 ? qty * rate : Math.max(0, Number(it.total) || 0);
    return {
      id: it.id || `bag-${Date.now()}-${idx}`,
      productId: it.productId || undefined,
      product: String(it.product || 'আটা (৫০ কেজি বস্তা)'),
      itemType: 'bag',
      quantity: qty,
      unit: it.unit || 'বস্তা',
      rate,
      total,
      note: String(it.note || ''),
    };
  });

  const bagCount = items.filter((i: any) => !isRetailFlour(i)).reduce((s: number, i: any) => s + i.quantity, 0);
  const bagBasedTotal = items.filter((i: any) => !isRetailFlour(i)).reduce((s: number, i: any) => s + i.total, 0);
  const retailFlourTotal = items.filter((i: any) => isRetailFlour(i)).reduce((s: number, i: any) => s + i.total, 0);
  const productTotal = bagBasedTotal + retailFlourTotal;
  const discount = Math.max(0, Number(body?.discount) || 0);
  const transportCost = Math.max(0, Number(body?.transportCost) || 0);
  const grandTotal = Math.max(0, productTotal + transportCost - discount);
  const paidAmount = Math.max(0, Number(body?.paidAmount) || 0);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  return {
    items,
    bagCount,
    bagBasedTotal,
    retailFlourTotal,
    productTotal,
    discount,
    transportCost,
    grandTotal,
    paidAmount,
    dueAmount,
  };
}

function serializeMemoRow(r: any) {
  return {
    memoNo: r.memo_no,
    date: r.date,
    time: r.time,
    customerId: r.customer_id || undefined,
    customerName: r.customer_name,
    customerPhone: r.customer_phone || '',
    customerAddress: r.customer_address || '',
    items: JSON.parse(r.items_json || '[]'),
    bagCount: r.bag_count,
    bagBasedTotal: r.bag_based_total,
    retailFlourTotal: r.retail_flour_total,
    discount: r.discount,
    transportCost: r.transport_cost,
    totalAmount: r.grand_total,
    paidAmount: r.paid_amount,
    dueAmount: r.due_amount,
    paymentMethod: r.payment_method,
    bankAccountId: r.bank_account_id || undefined,
    status: r.status,
    createdBy: r.created_by,
    createdById: r.created_by_id,
    createdByRole: r.created_by_role,
    testerTag: r.tester_tag || undefined,
    stockDeducted: r.stock_deducted === 1,
    gatePassId: r.gate_pass_id || undefined,
    gatePassNo: r.gate_pass_no || undefined,
  };
}

// ================= PRODUCTS & STOCK HISTORY =================
salesStockRouter.get('/products', requireAuth, (req: AuthedRequest, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY rowid ASC').all() as any[];
  if (req.user?.role === 'TESTER') {
    // Tester sees product catalog & unit prices for memo creation only (no sensitive stock totals/godown info)
    return res.json({
      products: rows.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        unitPrice: p.unit_price,
      })),
    });
  }
  res.json({
    products: rows.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      stock: p.stock,
      unit: p.unit,
      unitPrice: p.unit_price,
      minReorderLevel: p.min_reorder_level,
      godown: p.godown,
      color: p.color,
      updatedAt: p.updated_at,
    })),
  });
});

salesStockRouter.post('/products', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { name, category, stock, unit, unitPrice, minReorderLevel, godown, color } = req.body || {};
  if (!name || !category || !unit) {
    return res.status(400).json({ error: 'পণ্যের নাম, ক্যাটাগরি এবং একক আবশ্যক।' });
  }
  const initStock = Math.max(0, Number(stock) || 0);
  const id = generateId('prod');
  const today = getTodayStr();
  const time = getNowTimeStr();

  runInTx(() => {
    db.prepare(
      `INSERT INTO products (id, name, category, stock, unit, unit_price, min_reorder_level, godown, color, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      String(name).trim(),
      String(category).trim(),
      initStock,
      String(unit).trim(),
      Math.max(0, Number(unitPrice) || 0),
      Math.max(0, Number(minReorderLevel) || 0),
      String(godown || '১ নং গুদাম').trim(),
      color || '#ea580c',
      today
    );

    db.prepare(
      `INSERT INTO stock_history
        (id, date, time, product_id, product_name, transaction_type, reference, stock_in, stock_out, balance, created_by, note, created_at)
       VALUES (?, ?, ?, ?, ?, 'Opening Stock', ?, ?, 0, ?, ?, ?, ?)`
    ).run(
      generateId('sh'),
      today,
      time,
      id,
      String(name).trim(),
      `OPEN-${id.slice(-4)}`,
      initStock,
      initStock,
      actor.fullName,
      'নতুন পণ্য প্রারম্ভিক মজুদ যুক্ত',
      new Date().toISOString()
    );

    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'CREATE_PRODUCT',
      recordType: 'Product',
      recordId: id,
      ipAddress: req.clientIp,
      details: `নতুন পণ্য যুক্ত: ${name} (${initStock} ${unit})`,
    });
  });

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  res.status(201).json({
    product: {
      id: created.id,
      name: created.name,
      category: created.category,
      stock: created.stock,
      unit: created.unit,
      unitPrice: created.unit_price,
      minReorderLevel: created.min_reorder_level,
      godown: created.godown,
      color: created.color,
      updatedAt: created.updated_at,
    },
  });
});

salesStockRouter.post('/products/:id/adjust', requireAuth, requireRole('OWNER', 'MANAGER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const { transactionType, quantity, reason } = req.body || {};

  const allowedTypes = ['Stock Added', 'Stock Removed', 'Damage', 'Correction/Adjustment', 'Return'];
  if (!allowedTypes.includes(transactionType)) {
    return res.status(400).json({ error: 'সঠিক স্টক লেনদেনের ধরন নির্বাচন করুন।' });
  }
  const cleanReason = String(reason || '').trim();
  if (!cleanReason) {
    return res.status(400).json({ error: 'স্টক পরিবর্তনের কারণ (Reason) লেখা বাধ্যতামূলক!' });
  }
  const qty = Number(quantity) || 0;
  if (qty === 0) {
    return res.status(400).json({ error: 'পরিমাণ শূন্য হতে পারবে না।' });
  }

  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!prod) return res.status(404).json({ error: 'পণ্য পাওয়া যায়নি।' });

  const isOut =
    transactionType === 'Stock Removed' ||
    transactionType === 'Damage' ||
    (transactionType === 'Correction/Adjustment' && qty < 0);

  const absQty = Math.abs(qty);
  const stockIn = isOut ? 0 : absQty;
  const stockOut = isOut ? absQty : 0;

  if (stockOut > prod.stock) {
    return res.status(400).json({ error: `পর্যাপ্ত মজুদ নেই! বর্তমান মজুদ: ${prod.stock} ${prod.unit}` });
  }

  const refNo = `ADJ-${Date.now().toString().slice(-5)}`;
  runInTx(() => {
    const prevStock = prod.stock;
    recordStockMovement({
      productId: prod.id,
      transactionType,
      reference: refNo,
      stockIn,
      stockOut,
      createdBy: actor.fullName,
      note: cleanReason,
    });
    const updatedProd = db.prepare('SELECT * FROM products WHERE id = ?').get(prod.id) as any;
    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'STOCK_ADJUSTMENT',
      recordType: 'StockHistory',
      recordId: refNo,
      ipAddress: req.clientIp,
      details: `${prod.name} (${transactionType}): ${prevStock} -> ${updatedProd.stock} ${prod.unit} | কারণ: ${cleanReason}`,
      previousValue: String(prevStock),
      newValue: String(updatedProd.stock),
    });
  });

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  res.json({
    product: {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      stock: updated.stock,
      unit: updated.unit,
      unitPrice: updated.unit_price,
      minReorderLevel: updated.min_reorder_level,
      godown: updated.godown,
      color: updated.color,
      updatedAt: updated.updated_at,
    },
  });
});

salesStockRouter.delete('/products/:id', requireAuth, requireRole('OWNER'), (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { id } = req.params;
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!prod) return res.status(404).json({ error: 'পণ্য পাওয়া যায়নি।' });

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  appendAuditLog({
    userId: actor.id,
    username: actor.username,
    role: actor.role,
    action: 'DELETE_PRODUCT',
    recordType: 'Product',
    recordId: id,
    ipAddress: req.clientIp,
    details: `পণ্য মুছে ফেলা হয়েছে: ${prod.name}`,
  });
  res.json({ success: true });
});

function parseDMYToNumber(dmy: string): number {
  const parts = String(dmy || '').split('/');
  if (parts.length !== 3) return 0;
  return Number(`${parts[2]}${parts[1].padStart(2, '0')}${parts[0].padStart(2, '0')}`);
}

salesStockRouter.get('/stock-history', requireAuth, requireRole('OWNER', 'MANAGER'), (req, res) => {
  const productId = String(req.query.productId || '').trim();
  const startDate = String(req.query.startDate || '').trim(); // DD/MM/YYYY
  const endDate = String(req.query.endDate || '').trim();     // DD/MM/YYYY

  let rows = db.prepare('SELECT * FROM stock_history ORDER BY created_at ASC').all() as any[];
  if (productId && productId !== 'all') {
    rows = rows.filter((r) => r.product_id === productId);
  }

  let openingStock = 0;
  let filtered = rows;

  if (startDate || endDate) {
    const startNum = startDate ? parseDMYToNumber(startDate) : 0;
    const endNum = endDate ? parseDMYToNumber(endDate) : 99999999;

    const beforeStart = rows.filter((r) => parseDMYToNumber(r.date) < startNum);
    if (beforeStart.length > 0 && productId && productId !== 'all') {
      openingStock = beforeStart[beforeStart.length - 1].balance;
    } else if (beforeStart.length > 0) {
      openingStock = beforeStart.reduce((s, r) => s + (r.stock_in - r.stock_out), 0);
    }

    filtered = rows.filter((r) => {
      const n = parseDMYToNumber(r.date);
      return n >= startNum && n <= endNum;
    });
  } else if (rows.length > 0 && productId && productId !== 'all') {
    openingStock = rows[0].balance - rows[0].stock_in + rows[0].stock_out;
  }

  const totalIn = filtered.reduce((s, r) => s + (Number(r.stock_in) || 0), 0);
  const totalOut = filtered.reduce((s, r) => s + (Number(r.stock_out) || 0), 0);
  const closingStock =
    filtered.length > 0 && productId && productId !== 'all'
      ? filtered[filtered.length - 1].balance
      : openingStock + totalIn - totalOut;

  res.json({
    openingStock,
    closingStock,
    totalIn,
    totalOut,
    history: [...filtered].reverse().map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      productId: r.product_id,
      productName: r.product_name,
      transactionType: r.transaction_type,
      reference: r.reference,
      stockIn: r.stock_in,
      stockOut: r.stock_out,
      balance: r.balance,
      createdBy: r.created_by,
      note: r.note,
    })),
  });
});

// ================= SALES MEMOS =================
salesStockRouter.get('/memos', requireAuth, (req: AuthedRequest, res) => {
  const actor = req.user!;
  let rows = db.prepare('SELECT * FROM memos WHERE status != ? ORDER BY updated_at DESC').all('cancelled') as any[];
  if (actor.role === 'TESTER') {
    // Tester sees their own created memos / drafts
    rows = rows.filter((r) => r.created_by_id === actor.id || r.created_by_role === 'TESTER');
  }
  res.json({ memos: rows.map(serializeMemoRow) });
});

salesStockRouter.post('/memos', requireAuth, (req: AuthedRequest, res) => {
  const actor = req.user!;
  const body = req.body || {};
  const calc = normalizeMemoPayload(body);

  if (calc.items.length === 0) {
    return res.status(400).json({ error: 'কমপক্ষে একটি পণ্য বা খুচরা ময়দা যুক্ত করুন।' });
  }

  const requestedStatus = body.status === 'draft' ? 'draft' : 'completed';
  const dateStr = String(body.date || getTodayStr()).trim();
  const timeStr = getNowTimeStr();
  const testerTag =
    actor.role === 'TESTER'
      ? `Created by Tester — ${actor.fullName} — ${dateStr} — ${timeStr}`
      : null;

  // Compute next unique memo number
  const existingNos = db.prepare('SELECT memo_no FROM memos').all() as { memo_no: string }[];
  const maxNo = existingNos.reduce((m, r) => {
    const n = parseInt(r.memo_no, 10);
    return !isNaN(n) && n > m ? n : m;
  }, 1043);
  const memoNo = body.memoNo && !existingNos.some((e) => e.memo_no === String(body.memoNo))
    ? String(body.memoNo)
    : String(maxNo + 1);

  const customerName = String(body.customerName || 'নগদ ক্রেতা').trim();
  const customerId = body.customerId ? String(body.customerId) : null;
  const paymentMethod = String(body.paymentMethod || 'Cash');
  const bankAccountId = body.bankAccountId ? String(body.bankAccountId) : null;
  const alsoCreateGatePass = Boolean(body.createGatePass) && calc.bagCount > 0;

  let gatePassId: string | null = null;
  let gatePassNo: string | null = null;

  try {
    runInTx(() => {
      // 1. Deduct stock ONLY if completed (never for draft!)
      let stockDeductedFlag = 0;
      if (requestedStatus === 'completed') {
        for (const item of calc.items) {
          if (isRetailFlour(item) || item.quantity <= 0) continue;
          const prod = findProductForSaleItem(item);
          if (prod) {
            if (prod.stock < item.quantity) {
              throw new Error(`"${prod.name}" এর পর্যাপ্ত মজুদ নেই (মজুদ: ${prod.stock} বস্তা)`);
            }
            recordStockMovement({
              productId: prod.id,
              transactionType: 'Sales',
              reference: `MEMO-${memoNo}`,
              stockIn: 0,
              stockOut: item.quantity,
              createdBy: actor.fullName,
              note: `মেমো #${memoNo} (${customerName})${testerTag ? ` [${testerTag}]` : ''}`,
              date: dateStr,
            });
          }
        }
        stockDeductedFlag = 1;

        // 2. If Bank payment & bankAccountId provided, credit Bank Account
        if (paymentMethod === 'Bank' && bankAccountId && calc.paidAmount > 0) {
          const bank = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(bankAccountId) as any;
          if (bank) {
            const nextBal = Number(bank.current_balance) + calc.paidAmount;
            db.prepare('UPDATE bank_accounts SET current_balance = ? WHERE id = ?').run(nextBal, bank.id);
            db.prepare(
              `INSERT INTO bank_transactions
                (id, tx_no, date, time, bank_account_id, bank_name, type, amount, bank_charges, charges_deducted, actual_received, deposited_from, deposit_method, reference_number, notes, created_by, owner_approval_status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'Deposit', ?, 0, 0, ?, ?, 'Bank Transfer/Deposit', ?, ?, ?, 'approved', ?)`
            ).run(
              generateId('btx'),
              `BTX-${Date.now().toString().slice(-5)}`,
              dateStr,
              timeStr,
              bank.id,
              bank.bank_name,
              calc.paidAmount,
              calc.paidAmount,
              `বিক্রয় মেমো #${memoNo} (${customerName})`,
              `MEMO-${memoNo}`,
              `বিক্রয় বাবদ ব্যাংক জমা`,
              actor.fullName,
              new Date().toISOString()
            );
          }
        }

        // 3. Update Customer Ledger if customerId provided or name matches existing customer
        let matchedCust: any = null;
        if (customerId) {
          matchedCust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        } else {
          matchedCust = db
            .prepare('SELECT * FROM customers WHERE shop_name = ? OR name = ? LIMIT 1')
            .get(customerName, customerName);
        }
        if (matchedCust) {
          const nextSales = Number(matchedCust.total_sales) + calc.grandTotal;
          const nextPaid = Number(matchedCust.total_payments) + calc.paidAmount;
          const nextDue = Math.max(0, Number(matchedCust.current_due) + calc.dueAmount);
          db.prepare(
            'UPDATE customers SET total_sales = ?, total_payments = ?, current_due = ? WHERE id = ?'
          ).run(nextSales, nextPaid, nextDue, matchedCust.id);
          db.prepare(
            `INSERT INTO customer_transactions
              (id, customer_id, customer_name, date, time, type, reference_no, amount, paid_amount, payment_method, note, created_by, running_due, created_at)
             VALUES (?, ?, ?, ?, ?, 'Sale', ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            generateId('ctx'),
            matchedCust.id,
            matchedCust.shop_name,
            dateStr,
            timeStr,
            `MEMO-${memoNo}`,
            calc.grandTotal,
            calc.paidAmount,
            paymentMethod,
            `বিক্রয় মেমো #${memoNo} (${calc.bagCount} বস্তা)`,
            actor.fullName,
            nextDue,
            new Date().toISOString()
          );
        }

        // 4. Optional Gate Pass generation (STRICTLY NO KG, NO PRICE, NO MONEY!)
        if (alsoCreateGatePass) {
          const gpRows = db.prepare('SELECT gate_pass_no FROM gate_passes').all() as { gate_pass_no: string }[];
          const maxGp = gpRows.reduce((m, r) => {
            const num = parseInt(String(r.gate_pass_no).replace(/\D/g, ''), 10);
            return !isNaN(num) && num > m ? num : m;
          }, 1002);
          gatePassId = generateId('gp');
          gatePassNo = `GP-${maxGp + 1}`;
          const gpItems = calc.items
            .filter((it: any) => !isRetailFlour(it) && it.quantity > 0)
            .map((it: any) => ({ productName: stripWeightForGatePass(it.product), bags: it.quantity }));

          db.prepare(
            `INSERT INTO gate_passes
              (id, gate_pass_no, memo_no, date, time, items_json, total_bags, receiver_name, vehicle_number, created_by, created_by_id, created_by_role, tester_tag, authorized_by, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
          ).run(
            gatePassId,
            gatePassNo,
            memoNo,
            dateStr,
            timeStr,
            JSON.stringify(gpItems),
            calc.bagCount,
            String(body.receiverName || '').trim() || null,
            String(body.vehicleNumber || '').trim() || null,
            actor.fullName,
            actor.id,
            actor.role,
            testerTag,
            actor.role === 'TESTER' ? `${actor.fullName} (গেট ইনচার্জ অনুমোদন সাপেক্ষে)` : actor.fullName,
            new Date().toISOString()
          );
        }
      }

      db.prepare(
        `INSERT INTO memos
          (memo_no, date, time, customer_id, customer_name, customer_phone, customer_address, items_json, bag_count, bag_based_total, retail_flour_total, discount, transport_cost, grand_total, paid_amount, due_amount, payment_method, bank_account_id, status, created_by, created_by_id, created_by_role, tester_tag, stock_deducted, gate_pass_id, gate_pass_no, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        memoNo,
        dateStr,
        timeStr,
        customerId,
        customerName,
        String(body.customerPhone || '').trim(),
        String(body.customerAddress || '').trim(),
        JSON.stringify(calc.items),
        calc.bagCount,
        calc.bagBasedTotal,
        calc.retailFlourTotal,
        calc.discount,
        calc.transportCost,
        calc.grandTotal,
        calc.paidAmount,
        calc.dueAmount,
        paymentMethod,
        bankAccountId,
        requestedStatus,
        actor.fullName,
        actor.id,
        actor.role,
        testerTag,
        stockDeductedFlag,
        gatePassId,
        gatePassNo,
        new Date().toISOString()
      );

      appendAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: requestedStatus === 'draft' ? 'CREATE_DRAFT_MEMO' : 'CREATE_MEMO',
        recordType: 'Memo',
        recordId: memoNo,
        ipAddress: req.clientIp,
        details: `মেমো #${memoNo} (${requestedStatus}) তৈরি - ক্রেতা: ${customerName}, মোট: ৳${calc.grandTotal}, বস্তা: ${calc.bagCount}${testerTag ? ` | ${testerTag}` : ''}`,
      });
    });

    const created = db.prepare('SELECT * FROM memos WHERE memo_no = ?').get(memoNo);
    res.status(201).json({ memo: serializeMemoRow(created) });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'মেমো সংরক্ষণ ব্যর্থ হয়েছে।' });
  }
});

salesStockRouter.put('/memos/:memoNo', requireAuth, (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { memoNo } = req.params;
  const existing = db.prepare('SELECT * FROM memos WHERE memo_no = ?').get(memoNo) as any;
  if (!existing) return res.status(404).json({ error: 'মেমো পাওয়া যায়নি।' });

  // Server-side RBAC check: Tester CANNOT edit approved/completed transactions!
  if (actor.role === 'TESTER') {
    if (existing.status !== 'draft' || existing.created_by_id !== actor.id) {
      return res.status(403).json({
        error: 'টেস্টার অ্যাকাউন্ট থেকে চূড়ান্ত/অনুমোদিত মেমো পরিবর্তন করা সম্পূর্ণ নিষিদ্ধ। শুধুমাত্র নিজের খসড়া (Draft) সম্পাদনা করা যাবে।',
      });
    }
  }

  const body = req.body || {};
  const calc = normalizeMemoPayload(body);
  const nextStatus = body.status === 'draft' ? 'draft' : 'completed';
  const dateStr = String(body.date || existing.date).trim();
  const prevItems = JSON.parse(existing.items_json || '[]');

  try {
    runInTx(() => {
      // Prevent duplicate stock deduction: if previously deducted, reverse old bag stock cleanly first!
      if (existing.stock_deducted === 1) {
        for (const oldItem of prevItems) {
          if (isRetailFlour(oldItem) || oldItem.quantity <= 0) continue;
          const prod = findProductForSaleItem(oldItem);
          if (prod) {
            recordStockMovement({
              productId: prod.id,
              transactionType: 'Reversal',
              reference: `MEMO-${memoNo}-EDIT`,
              stockIn: oldItem.quantity,
              stockOut: 0,
              createdBy: actor.fullName,
              note: `মেমো #${memoNo} সংশোধন রিভার্সাল`,
              date: dateStr,
            });
          }
        }
      }

      let nextDeducted = 0;
      if (nextStatus === 'completed') {
        for (const newItem of calc.items) {
          if (isRetailFlour(newItem) || newItem.quantity <= 0) continue;
          const prod = findProductForSaleItem(newItem);
          if (prod) {
            if (prod.stock < newItem.quantity) {
              throw new Error(`"${prod.name}" এর পর্যাপ্ত মজুদ নেই (মজুদ: ${prod.stock} বস্তা)`);
            }
            recordStockMovement({
              productId: prod.id,
              transactionType: 'Sales',
              reference: `MEMO-${memoNo}`,
              stockIn: 0,
              stockOut: newItem.quantity,
              createdBy: actor.fullName,
              note: `মেমো #${memoNo} আপডেট বিক্রয়`,
              date: dateStr,
            });
          }
        }
        nextDeducted = 1;
      }

      db.prepare(
        `UPDATE memos SET
          date = ?, customer_name = ?, customer_phone = ?, customer_address = ?,
          items_json = ?, bag_count = ?, bag_based_total = ?, retail_flour_total = ?,
          discount = ?, transport_cost = ?, grand_total = ?, paid_amount = ?, due_amount = ?,
          payment_method = ?, status = ?, stock_deducted = ?, updated_at = ?
         WHERE memo_no = ?`
      ).run(
        dateStr,
        String(body.customerName || existing.customer_name).trim(),
        String(body.customerPhone ?? existing.customer_phone ?? '').trim(),
        String(body.customerAddress ?? existing.customer_address ?? '').trim(),
        JSON.stringify(calc.items),
        calc.bagCount,
        calc.bagBasedTotal,
        calc.retailFlourTotal,
        calc.discount,
        calc.transportCost,
        calc.grandTotal,
        calc.paidAmount,
        calc.dueAmount,
        String(body.paymentMethod || existing.payment_method),
        nextStatus,
        nextDeducted,
        new Date().toISOString(),
        memoNo
      );

      appendAuditLog({
        userId: actor.id,
        username: actor.username,
        role: actor.role,
        action: 'UPDATE_MEMO',
        recordType: 'Memo',
        recordId: memoNo,
        ipAddress: req.clientIp,
        details: `মেমো #${memoNo} আপডেট: পূর্বের মোট ৳${existing.grand_total} -> নতুন মোট ৳${calc.grandTotal}`,
        previousValue: String(existing.grand_total),
        newValue: String(calc.grandTotal),
      });
    });

    const updated = db.prepare('SELECT * FROM memos WHERE memo_no = ?').get(memoNo);
    res.json({ memo: serializeMemoRow(updated) });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'মেমো আপডেট ব্যর্থ হয়েছে।' });
  }
});

// Delete / Cancel Memo (Owner only for completed memos; cancels & writes Stock Reversal instead of wiping history)
salesStockRouter.delete('/memos/:memoNo', requireAuth, (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { memoNo } = req.params;
  const existing = db.prepare('SELECT * FROM memos WHERE memo_no = ?').get(memoNo) as any;
  if (!existing) return res.status(404).json({ error: 'মেমো পাওয়া যায়নি।' });

  if (actor.role === 'TESTER') {
    if (existing.status !== 'draft' || existing.created_by_id !== actor.id) {
      return res.status(403).json({ error: 'টেস্টার কোনো বিক্রিত/চূড়ান্ত মেমো মুছতে পারবেন না।' });
    }
  } else if (actor.role === 'MANAGER' && existing.status === 'completed') {
    return res.status(403).json({ error: 'চূড়ান্ত অনুমোদিত বিক্রয় মেমো শুধুমাত্র মালিক বাতিল/মুছতে পারবেন।' });
  }

  runInTx(() => {
    if (existing.stock_deducted === 1) {
      const items = JSON.parse(existing.items_json || '[]');
      for (const item of items) {
        if (isRetailFlour(item) || item.quantity <= 0) continue;
        const prod = findProductForSaleItem(item);
        if (prod) {
          recordStockMovement({
            productId: prod.id,
            transactionType: 'Reversal',
            reference: `CANCEL-MEMO-${memoNo}`,
            stockIn: item.quantity,
            stockOut: 0,
            createdBy: actor.fullName,
            note: `মেমো #${memoNo} বাতিলজনিত স্টক ফেরত (Reversal)`,
          });
        }
      }
    }

    if (existing.status === 'draft') {
      db.prepare('DELETE FROM memos WHERE memo_no = ?').run(memoNo);
    } else {
      db.prepare('UPDATE memos SET status = ?, stock_deducted = 0, updated_at = ? WHERE memo_no = ?').run(
        'cancelled',
        new Date().toISOString(),
        memoNo
      );
    }

    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'CANCEL_MEMO',
      recordType: 'Memo',
      recordId: memoNo,
      ipAddress: req.clientIp,
      details: `মেমো #${memoNo} বাতিল ও স্টক রিভার্সাল সম্পন্ন (${existing.customer_name})।`,
    });
  });

  res.json({ success: true });
});

// ================= GATE PASSES (STRICTLY BAGS ONLY — ZERO KG/PRICE/MONEY) =================
salesStockRouter.get('/gate-passes', requireAuth, (req: AuthedRequest, res) => {
  const actor = req.user!;
  const q = String(req.query.q || '').trim().toLowerCase();
  let rows = db.prepare('SELECT * FROM gate_passes ORDER BY created_at DESC').all() as any[];

  if (actor.role === 'TESTER') {
    rows = rows.filter((r) => r.created_by_id === actor.id || r.created_by_role === 'TESTER');
  }

  if (q) {
    rows = rows.filter(
      (r) =>
        String(r.gate_pass_no).toLowerCase().includes(q) ||
        String(r.memo_no || '').toLowerCase().includes(q) ||
        String(r.receiver_name || '').toLowerCase().includes(q) ||
        String(r.vehicle_number || '').toLowerCase().includes(q) ||
        String(r.items_json || '').toLowerCase().includes(q)
    );
  }

  res.json({
    gatePasses: rows.map((r) => ({
      id: r.id,
      gatePassNo: r.gate_pass_no,
      memoNo: r.memo_no || undefined,
      date: r.date,
      time: r.time,
      items: JSON.parse(r.items_json || '[]'),
      totalBags: r.total_bags,
      receiverName: r.receiver_name || undefined,
      vehicleNumber: r.vehicle_number || undefined,
      createdBy: r.created_by,
      createdById: r.created_by_id,
      createdByRole: r.created_by_role,
      testerTag: r.tester_tag || undefined,
      authorizedBy: r.authorized_by,
      status: r.status,
    })),
  });
});

salesStockRouter.post('/gate-passes', requireAuth, (req: AuthedRequest, res) => {
  const actor = req.user!;
  const { memoNo, items, receiverName, vehicleNumber, authorizedBy } = req.body || {};

  // Strictly extract ONLY productName and integer bags (ZERO weight KG, ZERO price, ZERO money!)
  const cleanItems = (Array.isArray(items) ? items : [])
    .map((it: any) => ({
      productName: stripWeightForGatePass(it.productName || it.product || ''),
      bags: Math.max(0, Math.floor(Number(it.bags ?? it.quantity) || 0)),
    }))
    .filter((it: any) => it.productName && it.bags > 0 && !it.productName.includes('খুচরা'));

  if (cleanItems.length === 0) {
    return res.status(400).json({ error: 'গেট পাসের জন্য কমপক্ষে ১ বস্তা পণ্য নির্বাচন করুন।' });
  }

  const totalBags = cleanItems.reduce((s: number, it: any) => s + it.bags, 0);
  const dateStr = getTodayStr();
  const timeStr = getNowTimeStr();
  const testerTag =
    actor.role === 'TESTER'
      ? `Created by Tester — ${actor.fullName} — ${dateStr} — ${timeStr}`
      : null;

  const gpRows = db.prepare('SELECT gate_pass_no FROM gate_passes').all() as { gate_pass_no: string }[];
  const maxGp = gpRows.reduce((m, r) => {
    const num = parseInt(String(r.gate_pass_no).replace(/\D/g, ''), 10);
    return !isNaN(num) && num > m ? num : m;
  }, 1002);

  const id = generateId('gp');
  const gatePassNo = `GP-${maxGp + 1}`;
  const authSig = String(authorizedBy || '').trim() || actor.fullName;

  runInTx(() => {
    db.prepare(
      `INSERT INTO gate_passes
        (id, gate_pass_no, memo_no, date, time, items_json, total_bags, receiver_name, vehicle_number, created_by, created_by_id, created_by_role, tester_tag, authorized_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
    ).run(
      id,
      gatePassNo,
      memoNo ? String(memoNo).trim() : null,
      dateStr,
      timeStr,
      JSON.stringify(cleanItems),
      totalBags,
      receiverName ? String(receiverName).trim() : null,
      vehicleNumber ? String(vehicleNumber).trim() : null,
      actor.fullName,
      actor.id,
      actor.role,
      testerTag,
      authSig,
      new Date().toISOString()
    );

    if (memoNo) {
      db.prepare('UPDATE memos SET gate_pass_id = ?, gate_pass_no = ? WHERE memo_no = ?').run(
        id,
        gatePassNo,
        String(memoNo).trim()
      );
    }

    appendAuditLog({
      userId: actor.id,
      username: actor.username,
      role: actor.role,
      action: 'CREATE_GATE_PASS',
      recordType: 'GatePass',
      recordId: gatePassNo,
      ipAddress: req.clientIp,
      details: `গেট পাস #${gatePassNo} তৈরি (${totalBags} বস্তা${memoNo ? `, মেমো #${memoNo}` : ''})${testerTag ? ` | ${testerTag}` : ''}`,
    });
  });

  const created = db.prepare('SELECT * FROM gate_passes WHERE id = ?').get(id) as any;
  res.status(201).json({
    gatePass: {
      id: created.id,
      gatePassNo: created.gate_pass_no,
      memoNo: created.memo_no || undefined,
      date: created.date,
      time: created.time,
      items: JSON.parse(created.items_json),
      totalBags: created.total_bags,
      receiverName: created.receiver_name || undefined,
      vehicleNumber: created.vehicle_number || undefined,
      createdBy: created.created_by,
      createdById: created.created_by_id,
      createdByRole: created.created_by_role,
      testerTag: created.tester_tag || undefined,
      authorizedBy: created.authorized_by,
      status: created.status,
    },
  });
});
