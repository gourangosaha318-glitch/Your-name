import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  Users,
  Plus,
  Search,
  FileDown,
  Printer,
  Check,
  AlertCircle,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { CustomerRecord, CustomerTransaction } from '../types/mill';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import { millConfig } from '../data/mock';

type CustomerTxType = 'Sale' | 'Payment' | 'Advance' | 'Adjustment' | 'Return';

const CUST_TX_LABELS: Record<CustomerTxType, string> = {
  Sale: 'বিক্রয় / বকেয়া যোগ (Sale)',
  Payment: 'বকেয়া আদায় (Payment)',
  Advance: 'অগ্রিম জমা (Advance)',
  Adjustment: 'সমন্বয় (Adjustment)',
  Return: 'পণ্য ফেরত (Return)',
};

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [custName, setCustName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [notes, setNotes] = useState('');

  const [txTarget, setTxTarget] = useState<CustomerRecord | null>(null);
  const [txType, setTxType] = useState<CustomerTxType>('Payment');
  const [txAmount, setTxAmount] = useState('');
  const [txMethod, setTxMethod] = useState<'Cash' | 'Bank' | 'Due' | 'Other'>('Cash');
  const [txAdjustSign, setTxAdjustSign] = useState<'1' | '-1'>('-1');
  const [txRef, setTxRef] = useState('');
  const [txNote, setTxNote] = useState('');

  const [isLedgerPdfOpen, setIsLedgerPdfOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setErrorMsg(null);
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  };

  const loadCustomers = useCallback(async () => {
    try {
      const res = await apiFetch<{ customers: CustomerRecord[]; transactions: CustomerTransaction[] }>('/api/customers');
      const list = res.customers || [];
      setCustomers(list);
      setTransactions(res.transactions || []);
      setSelectedCustomer((prev) => (prev ? list.find((c) => c.id === prev.id) || list[0] || null : list[0] || null));
    } catch (err: any) {
      showError(err?.message || 'ক্রেতা তথ্য লোড করতে ব্যর্থ');
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        !q ||
        c.shopName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  const activeLedgerTxs = useMemo(() => {
    if (!selectedCustomer) return [];
    return transactions.filter((t) => t.customerId === selectedCustomer.id);
  }, [transactions, selectedCustomer]);

  const totalReceivable = customers.reduce((s, c) => s + Math.max(0, c.currentDue), 0);
  const dueCustomersCount = customers.filter((c) => c.currentDue > 0).length;

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: custName || shopName,
          shopName: shopName || custName,
          phone,
          address,
          openingBalance: Number(openingBalance) || 0,
          notes,
        }),
      });
      setShowAddCustomer(false);
      setCustName('');
      setShopName('');
      setPhone('');
      setAddress('');
      setOpeningBalance('0');
      setNotes('');
      await loadCustomers();
      showToast('নতুন ক্রেতা পার্টি খাতায় যুক্ত হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'ক্রেতা যোগ ব্যর্থ');
    }
  };

  const handleRecordTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTarget) return;
    try {
      await apiFetch(`/api/customers/${txTarget.id}/transactions`, {
        method: 'POST',
        body: JSON.stringify({
          type: txType,
          amount: Number(txAmount),
          paymentMethod: txMethod,
          adjustmentSign: txType === 'Adjustment' ? Number(txAdjustSign) : undefined,
          referenceNo: txRef || undefined,
          note: txNote,
        }),
      });
      setTxTarget(null);
      setTxAmount('');
      setTxRef('');
      setTxNote('');
      await loadCustomers();
      showToast('ক্রেতার লেনদেন লেজারে সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'লেনদেন সংরক্ষণ ব্যর্থ');
    }
  };

  const handleDownloadLedgerPdf = async () => {
    if (!selectedCustomer) return;
    setIsExporting(true);
    try {
      await exportElementToPdf('customer-ledger-pdf-sheet', {
        filename: `Customer_Ledger_${selectedCustomer.shopName.replace(/\s+/g, '_')}`,
        orientation: 'portrait',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-white shadow-xl text-xs font-bold">
          <Check className="h-4 w-4 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-white shadow-xl text-xs font-bold">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
          <NavLink to="/" className="hover:text-emerald-800">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">ক্রেতা খাতা ও লেজার</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">ক্রেতা ও পার্টি লেজার খাতা</h1>
              <p className="text-xs sm:text-sm text-stone-500">
                পাইকারি ক্রেতা, বকেয়া আদায়, সমন্বয় এবং আলাদা ক্রেতা লেজার PDF রিপোর্ট
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            <span>নতুন ক্রেতা যোগ</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-stone-500">মোট নিবন্ধিত ক্রেতা</p>
          <p className="text-xl font-black text-stone-900 mt-1">{toBengaliNumber(customers.length)} জন</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <p className="text-xs text-amber-800 font-semibold">মোট ক্রেতা বকেয়া পাওনা</p>
          <p className="text-xl font-black text-amber-900 mt-1">{formatBengaliCurrency(totalReceivable)}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-stone-500">বকেয়াদার ক্রেতা সংখ্যা</p>
          <p className="text-xl font-black text-rose-700 mt-1">{toBengaliNumber(dueCustomersCount)} জন</p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="দোকানের নাম, স্বত্বাধিকারী বা মোবাইল নম্বর লিখুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-stone-200 pl-9 pr-3 py-2 text-xs focus:border-emerald-700 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Customer Directory */}
        <div className="lg:col-span-5 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
          <div className="bg-stone-50 border-b border-stone-200 px-4 py-3">
            <h2 className="text-sm font-bold text-stone-800">ক্রেতা তালিকা ({toBengaliNumber(filteredCustomers.length)})</h2>
          </div>
          <div className="divide-y divide-stone-100 max-h-[540px] overflow-y-auto">
            {filteredCustomers.map((c) => {
              const active = selectedCustomer?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    active ? 'bg-emerald-50/80 border-l-4 border-[#0d381e]' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-stone-900">{c.shopName}</p>
                      <p className="text-[11px] font-medium text-stone-600">{c.name}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {c.phone || 'মোবাইল নেই'} • {c.address || 'ঠিকানা নেই'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {c.currentDue > 0 ? (
                        <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          বকেয়া: {formatBengaliCurrency(c.currentDue)}
                        </span>
                      ) : c.currentDue < 0 ? (
                        <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          অগ্রিম জমা: {formatBengaliCurrency(Math.abs(c.currentDue))}
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                          পরিশোধিত ✓
                        </span>
                      )}
                      <div className="mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTxTarget(c);
                            setTxType('Payment');
                          }}
                          className="rounded bg-[#0d381e] text-white px-2 py-1 text-[10px] font-bold hover:bg-[#134e2a]"
                        >
                          + আদায় / লেনদেন
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredCustomers.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-500">কোনো ক্রেতা পাওয়া যায়নি।</div>
            )}
          </div>
        </div>

        {/* Active Customer Ledger */}
        <div className="lg:col-span-7 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
          {selectedCustomer ? (
            <>
              <div className="bg-stone-50 border-b border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-stone-900">{selectedCustomer.shopName} — ক্রেতা লেজার</h2>
                  <p className="text-xs text-stone-500">
                    স্বত্বাধিকারী: {selectedCustomer.name} • {selectedCustomer.phone} • {selectedCustomer.address}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTxTarget(selectedCustomer);
                      setTxType('Payment');
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[#ea7a1a] hover:bg-[#d86c0e] text-white px-3 py-1.5 text-xs font-bold"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span>বকেয়া আদায় / লেনদেন</span>
                  </button>
                  <button
                    onClick={() => setIsLedgerPdfOpen(true)}
                    className="flex items-center gap-1 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] text-white px-3 py-1.5 text-xs font-bold"
                  >
                    <FileDown className="h-3.5 w-3.5 text-amber-300" />
                    <span>ক্রেতা লেজার PDF</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-stone-100 bg-stone-50/40 text-xs">
                <div>
                  <span className="text-stone-500">প্রারম্ভিক জের</span>
                  <p className="font-bold text-stone-800">{formatBengaliCurrency(selectedCustomer.openingBalance)}</p>
                </div>
                <div>
                  <span className="text-stone-500">মোট ক্রয়</span>
                  <p className="font-bold text-stone-900">{formatBengaliCurrency(selectedCustomer.totalSales)}</p>
                </div>
                <div>
                  <span className="text-stone-500">মোট পরিশোধ</span>
                  <p className="font-bold text-emerald-700">{formatBengaliCurrency(selectedCustomer.totalPayments)}</p>
                </div>
                <div>
                  <span className="text-stone-500">বর্তমান বকেয়া</span>
                  <p className={`font-black ${selectedCustomer.currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {selectedCustomer.currentDue < 0
                      ? `অগ্রিম ${formatBengaliCurrency(Math.abs(selectedCustomer.currentDue))}`
                      : formatBengaliCurrency(selectedCustomer.currentDue)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100 text-stone-600 border-b border-stone-200">
                      <th className="py-2.5 px-3 font-bold">তারিখ ও সময়</th>
                      <th className="py-2.5 px-3 font-bold">ধরন</th>
                      <th className="py-2.5 px-3 font-bold">রেফারেন্স / নোট</th>
                      <th className="py-2.5 px-3 font-bold text-right">টাকা</th>
                      <th className="py-2.5 px-3 font-bold text-right">বকেয়া জের</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {activeLedgerTxs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-stone-800">{toBengaliNumber(tx.date)}</div>
                          <div className="text-[10px] text-stone-400">{toBengaliNumber(tx.time)}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="rounded bg-stone-100 px-2 py-0.5 font-semibold text-stone-800">
                            {CUST_TX_LABELS[tx.type] || tx.type}
                          </span>
                          {tx.paymentMethod && (
                            <span className="block text-[10px] text-stone-400 mt-0.5">{tx.paymentMethod}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[11px] font-bold text-stone-700">{tx.referenceNo}</span>
                          <p className="text-[11px] text-stone-500">{tx.note}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-stone-900">
                          {formatBengaliCurrency(tx.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                          {formatBengaliCurrency(tx.runningDue)}
                        </td>
                      </tr>
                    ))}
                    {activeLedgerTxs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-stone-400">
                          এই ক্রেতার এখনো কোনো লেনদেন রেকর্ড করা হয়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-sm text-stone-400">বাম পাশ থেকে একটি ক্রেতা নির্বাচন করুন।</div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">নতুন ক্রেতা যুক্ত করুন</h3>
              <button onClick={() => setShowAddCustomer(false)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">দোকান / প্রতিষ্ঠানের নাম *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">স্বত্বাধিকারী / ব্যক্তির নাম *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">মোবাইল</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">প্রারম্ভিক বকেয়া (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddCustomer(false)} className="px-4 py-2 rounded-lg border font-semibold">
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#0d381e] text-white font-bold">
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Customer Transaction Modal */}
      {txTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">ক্রেতার লেনদেন — {txTarget.shopName}</h3>
              <button onClick={() => setTxTarget(null)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleRecordTx} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">লেনদেনের ধরন</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as CustomerTxType)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                >
                  {(Object.keys(CUST_TX_LABELS) as CustomerTxType[]).map((t) => (
                    <option key={t} value={t}>{CUST_TX_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              {txType === 'Adjustment' && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">সমন্বয়ের দিক</label>
                  <select
                    value={txAdjustSign}
                    onChange={(e) => setTxAdjustSign(e.target.value as '1' | '-1')}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="-1">বকেয়া কমান (-)</option>
                    <option value="1">বকেয়া বাড়ান (+)</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">টাকার পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">মাধ্যম</label>
                  <select
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value as 'Cash' | 'Bank' | 'Due' | 'Other')}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="Cash">নগদ (Cash)</option>
                    <option value="Bank">ব্যাংক (Bank)</option>
                    <option value="Other">অন্যান্য</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">রেফারেন্স নং</label>
                <input
                  type="text"
                  placeholder="যেমন: মেমো বা রশিদ নং"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">বিবরণ / নোট</label>
                <input
                  type="text"
                  required
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setTxTarget(null)} className="px-4 py-2 rounded-lg border font-semibold">
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#0d381e] text-white font-bold">
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger PDF Modal */}
      {isLedgerPdfOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between border-b bg-stone-50 px-5 py-3 print:hidden">
              <h3 className="text-sm font-bold text-stone-900">ক্রেতা লেজার PDF — {selectedCustomer.shopName}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadLedgerPdf}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] text-white px-3 py-1.5 text-xs font-bold"
                >
                  <FileDown className="h-4 w-4 text-amber-300" />
                  <span>{isExporting ? 'তৈরি হচ্ছে...' : 'PDF ডাউনলোড'}</span>
                </button>
                <button
                  onClick={() =>
                    printAsPdf(`ক্রেতা_লেজার_${selectedCustomer.shopName}`, 'customer-ledger-pdf-sheet')
                  }
                  className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700"
                >
                  <Printer className="h-4 w-4" />
                  <span>প্রিন্ট</span>
                </button>
                <button onClick={() => setIsLedgerPdfOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div id="customer-ledger-pdf-sheet" className="p-8 bg-white text-stone-900 text-xs">
              <div className="text-center border-b-2 border-[#0d381e] pb-4 mb-5">
                <p className="text-[11px] font-semibold text-stone-500">|| শ্রী গনেশায় নমঃ ||</p>
                <h2 className="text-2xl font-black text-[#0d381e]">{millConfig.name}</h2>
                <p className="text-xs text-stone-600">{millConfig.location} • মোবাইল: {toBengaliNumber(millConfig.phone)}</p>
                <div className="inline-block mt-2 rounded bg-[#0d381e] text-white px-4 py-1 text-xs font-bold">
                  ক্রেতা হিসাব ও লেজার বিবরণী (Customer Ledger Statement)
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  প্রিন্ট তারিখ: {toBengaliNumber(new Date().toLocaleDateString('en-GB'))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-3.5 mb-5">
                <div>
                  <p><span className="font-bold">দোকান / পার্টি:</span> {selectedCustomer.shopName}</p>
                  <p><span className="font-bold">স্বত্বাধিকারী:</span> {selectedCustomer.name}</p>
                  <p><span className="font-bold">মোবাইল:</span> {selectedCustomer.phone ? toBengaliNumber(selectedCustomer.phone) : '—'}</p>
                  <p><span className="font-bold">ঠিকানা:</span> {selectedCustomer.address || '—'}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">প্রারম্ভিক জের:</span> {formatBengaliCurrency(selectedCustomer.openingBalance)}</p>
                  <p><span className="font-bold">মোট বিক্রয়:</span> {formatBengaliCurrency(selectedCustomer.totalSales)}</p>
                  <p><span className="font-bold">মোট জমা:</span> {formatBengaliCurrency(selectedCustomer.totalPayments)}</p>
                  <p className="text-sm font-black text-rose-800 mt-1">
                    বর্তমান বকেয়া: {selectedCustomer.currentDue < 0
                      ? `অগ্রিম ${formatBengaliCurrency(Math.abs(selectedCustomer.currentDue))}`
                      : formatBengaliCurrency(selectedCustomer.currentDue)}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-stone-300 text-xs mb-8">
                <thead>
                  <tr className="bg-stone-100 text-stone-800">
                    <th className="border border-stone-300 p-2 text-left">তারিখ ও সময়</th>
                    <th className="border border-stone-300 p-2 text-left">ধরন ও মাধ্যম</th>
                    <th className="border border-stone-300 p-2 text-left">রেফারেন্স / বিবরণ</th>
                    <th className="border border-stone-300 p-2 text-right">পরিমাণ (৳)</th>
                    <th className="border border-stone-300 p-2 text-right">চলতি বকেয়া (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLedgerTxs.map((tx) => (
                    <tr key={tx.id}>
                      <td className="border border-stone-300 p-2">
                        <div>{toBengaliNumber(tx.date)}</div>
                        <div className="text-[10px] text-stone-500">{toBengaliNumber(tx.time)}</div>
                      </td>
                      <td className="border border-stone-300 p-2">
                        <div className="font-semibold">{CUST_TX_LABELS[tx.type] || tx.type}</div>
                        {tx.paymentMethod && (
                          <div className="text-[10px] text-stone-500">{tx.paymentMethod}</div>
                        )}
                      </td>
                      <td className="border border-stone-300 p-2">
                        <span className="font-mono font-bold">{tx.referenceNo}</span> — {tx.note}
                      </td>
                      <td className="border border-stone-300 p-2 text-right font-bold">{formatBengaliCurrency(tx.amount)}</td>
                      <td className="border border-stone-300 p-2 text-right font-bold">{formatBengaliCurrency(tx.runningDue)}</td>
                    </tr>
                  ))}
                  {activeLedgerTxs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="border border-stone-300 p-4 text-center text-stone-500">
                        কোনো লেনদেন পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex items-end justify-between pt-10 text-xs">
                <div className="text-center">
                  <div className="w-40 border-t border-stone-400 pt-1 font-bold">প্রস্তুতকারী: {user?.name}</div>
                </div>
                <div className="text-center">
                  <div className="w-44 border-t border-stone-400 pt-1 font-bold">মিল কর্তৃপক্ষের স্বাক্ষর</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
