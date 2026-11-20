import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  Truck,
  Plus,
  Search,
  FileDown,
  Printer,
  Check,
  AlertCircle,
  X,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { SupplierRecord, SupplierTransaction, SupplierTxType } from '../types/mill';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import { millConfig } from '../data/mock';

interface SupplierCategoryItem {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

const TX_TYPE_LABELS: Record<SupplierTxType, string> = {
  Purchase: 'ক্রয় (Purchase)',
  Payment: 'পরিশোধ (Payment)',
  'Advance Payment': 'অগ্রিম পরিশোধ (Advance)',
  Due: 'বকেয়া যোগ (Due)',
  Adjustment: 'সমন্বয় (Adjustment)',
  Refund: 'ফেরত (Refund)',
};

export const SuppliersPage: React.FC = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [categories, setCategories] = useState<SupplierCategoryItem[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('সকল');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null);

  // Modals & forms
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supName, setSupName] = useState('');
  const [supType, setSupType] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supOpening, setSupOpening] = useState('0');
  const [supNotes, setSupNotes] = useState('');

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [txTarget, setTxTarget] = useState<SupplierRecord | null>(null);
  const [txType, setTxType] = useState<SupplierTxType>('Payment');
  const [txAmount, setTxAmount] = useState('');
  const [txMethod, setTxMethod] = useState<'Cash' | 'Bank' | 'Other'>('Cash');
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

  const loadAll = useCallback(async () => {
    try {
      const [supRes, catRes] = await Promise.all([
        apiFetch<{ suppliers: SupplierRecord[]; transactions: SupplierTransaction[] }>('/api/suppliers'),
        apiFetch<{ categories: SupplierCategoryItem[] }>('/api/supplier-categories'),
      ]);
      const list = supRes.suppliers || [];
      setSuppliers(list);
      setTransactions(supRes.transactions || []);
      const cats = catRes.categories || [];
      setCategories(cats);
      if (cats.length > 0 && !supType) {
        setSupType(cats[0].name);
      }
      setSelectedSupplier((prev) => (prev ? list.find((s) => s.id === prev.id) || list[0] || null : list[0] || null));
    } catch (err: any) {
      showError(err?.message || 'সরবরাহকারী তথ্য লোড করতে ব্যর্থ');
    }
  }, [supType]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchCat = selectedCategory === 'সকল' || s.supplierType === selectedCategory;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.supplierType.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [suppliers, selectedCategory, searchTerm]);

  const activeLedgerTxs = useMemo(() => {
    if (!selectedSupplier) return [];
    return transactions.filter((t) => t.supplierId === selectedSupplier.id);
  }, [transactions, selectedSupplier]);

  const totalPayable = suppliers.reduce((s, x) => s + Math.max(0, x.currentDue), 0);
  const totalAdvance = suppliers.reduce((s, x) => s + (x.currentDue < 0 ? Math.abs(x.currentDue) : 0), 0);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: supName,
          supplierType: supType || categories[0]?.name || 'গম সরবরাহকারী (Wheat Supplier)',
          phone: supPhone,
          address: supAddress,
          openingBalance: Number(supOpening) || 0,
          notes: supNotes,
        }),
      });
      setShowAddSupplier(false);
      setSupName('');
      setSupPhone('');
      setSupAddress('');
      setSupOpening('0');
      setSupNotes('');
      await loadAll();
      showToast('নতুন সরবরাহকারী যুক্ত করা হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'সরবরাহকারী যোগ ব্যর্থ');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await apiFetch('/api/supplier-categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      setNewCategoryName('');
      setShowAddCategory(false);
      await loadAll();
      showToast('নতুন সরবরাহকারী ক্যাটাগরি যোগ হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'ক্যাটাগরি যোগ ব্যর্থ');
    }
  };

  const handleRecordTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTarget) return;
    try {
      await apiFetch(`/api/suppliers/${txTarget.id}/transactions`, {
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
      await loadAll();
      showToast('সরবরাহকারীর লেনদেন লেজারে সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'লেনদেন সংরক্ষণ ব্যর্থ');
    }
  };

  const handleDownloadLedgerPdf = async () => {
    if (!selectedSupplier) return;
    setIsExporting(true);
    try {
      await exportElementToPdf('supplier-ledger-pdf-sheet', {
        filename: `Supplier_Ledger_${selectedSupplier.name.replace(/\s+/g, '_')}`,
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
          <span className="font-semibold text-stone-800">সরবরাহকারী খাতা ও ধরন</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">সরবরাহকারী ব্যবস্থাপনা ও লেজার</h1>
              <p className="text-xs sm:text-sm text-stone-500">
                গম, বস্তা, পরিবহন, মেশিনারিজ, কাস্টম ক্যাটাগরি এবং পূর্ণাঙ্গ সরবরাহকারী লেজার ও পিডিএফ
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddCategory(true)}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 px-3 py-2 text-xs font-bold text-stone-800"
            >
              <Tag className="h-4 w-4 text-emerald-700" />
              <span>নতুন ক্যাটাগরি</span>
            </button>
            <button
              onClick={() => setShowAddSupplier(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              <span>নতুন সরবরাহকারী</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-stone-500">মোট সরবরাহকারী</p>
          <p className="text-xl font-black text-stone-900 mt-1">{toBengaliNumber(suppliers.length)} জন</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <p className="text-xs text-rose-800 font-semibold">সর্বমোট সরবরাহকারী পাওনা (Due)</p>
          <p className="text-xl font-black text-rose-900 mt-1">{formatBengaliCurrency(totalPayable)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <p className="text-xs text-emerald-800 font-semibold">সরবরাহকারীকে অগ্রিম প্রদান (Advance)</p>
          <p className="text-xl font-black text-emerald-900 mt-1">{formatBengaliCurrency(totalAdvance)}</p>
        </div>
      </div>

      {/* Category Filter + Search */}
      <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory('সকল')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selectedCategory === 'সকল' ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            সকল ক্যাটাগরি
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedCategory === cat.name ? 'bg-[#ea7a1a] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="সরবরাহকারীর নাম, ধরন বা মোবাইল দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-stone-200 pl-9 pr-3 py-2 text-xs focus:border-emerald-700 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main Split: Supplier Directory + Active Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Directory List */}
        <div className="lg:col-span-5 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
          <div className="bg-stone-50 border-b border-stone-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-800">সরবরাহকারী তালিকা ({toBengaliNumber(filteredSuppliers.length)})</h2>
          </div>
          <div className="divide-y divide-stone-100 max-h-[540px] overflow-y-auto">
            {filteredSuppliers.map((sup) => {
              const active = selectedSupplier?.id === sup.id;
              return (
                <div
                  key={sup.id}
                  onClick={() => setSelectedSupplier(sup)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    active ? 'bg-emerald-50/80 border-l-4 border-[#0d381e]' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-stone-900">{sup.name}</p>
                      <p className="text-[11px] font-semibold text-amber-700 mt-0.5">{sup.supplierType}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {sup.phone || 'মোবাইল নেই'} • {sup.address || 'ঠিকানা নেই'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {sup.currentDue > 0 ? (
                        <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                          পাওনা: {formatBengaliCurrency(sup.currentDue)}
                        </span>
                      ) : sup.currentDue < 0 ? (
                        <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          অগ্রিম: {formatBengaliCurrency(Math.abs(sup.currentDue))}
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                          ক্লিয়ার ✓
                        </span>
                      )}
                      <div className="mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTxTarget(sup);
                            setTxType('Payment');
                          }}
                          className="rounded bg-[#0d381e] text-white px-2 py-1 text-[10px] font-bold hover:bg-[#134e2a]"
                        >
                          + লেনদেন এন্ট্রি
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredSuppliers.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-500">কোনো সরবরাহকারী পাওয়া যায়নি।</div>
            )}
          </div>
        </div>

        {/* Selected Supplier Ledger */}
        <div className="lg:col-span-7 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
          {selectedSupplier ? (
            <>
              <div className="bg-stone-50 border-b border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-amber-700">{selectedSupplier.supplierType}</span>
                  <h2 className="text-lg font-black text-stone-900">{selectedSupplier.name} — পূর্ণাঙ্গ লেজার</h2>
                  <p className="text-xs text-stone-500">
                    {selectedSupplier.phone} • {selectedSupplier.address}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTxTarget(selectedSupplier);
                      setTxType('Payment');
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[#ea7a1a] hover:bg-[#d86c0e] text-white px-3 py-1.5 text-xs font-bold"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span>লেনদেন রেকর্ড</span>
                  </button>
                  <button
                    onClick={() => setIsLedgerPdfOpen(true)}
                    className="flex items-center gap-1 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] text-white px-3 py-1.5 text-xs font-bold"
                  >
                    <FileDown className="h-3.5 w-3.5 text-amber-300" />
                    <span>লেজার PDF</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-stone-100 bg-stone-50/40 text-xs">
                <div>
                  <span className="text-stone-500">প্রারম্ভিক জের</span>
                  <p className="font-bold text-stone-800">{formatBengaliCurrency(selectedSupplier.openingBalance)}</p>
                </div>
                <div>
                  <span className="text-stone-500">মোট ক্রয়</span>
                  <p className="font-bold text-stone-900">{formatBengaliCurrency(selectedSupplier.totalPurchases)}</p>
                </div>
                <div>
                  <span className="text-stone-500">মোট পরিশোধ</span>
                  <p className="font-bold text-emerald-700">{formatBengaliCurrency(selectedSupplier.totalPayments)}</p>
                </div>
                <div>
                  <span className="text-stone-500">বর্তমান ব্যালেন্স</span>
                  <p className={`font-black ${selectedSupplier.currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {selectedSupplier.currentDue < 0
                      ? `অগ্রিম ${formatBengaliCurrency(Math.abs(selectedSupplier.currentDue))}`
                      : formatBengaliCurrency(selectedSupplier.currentDue)}
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
                      <th className="py-2.5 px-3 font-bold text-right">জের</th>
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
                            {TX_TYPE_LABELS[tx.type] || tx.type}
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
                          এই সরবরাহকারীর এখনো কোনো লেনদেন রেকর্ড করা হয়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-sm text-stone-400">বাম পাশ থেকে একটি সরবরাহকারী নির্বাচন করুন।</div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">নতুন কাস্টম সরবরাহকারী ক্যাটাগরি</h3>
              <button onClick={() => setShowAddCategory(false)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">ক্যাটাগরির নাম</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: বৈদ্যুতিক যন্ত্রাংশ সরবরাহকারী"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddCategory(false)} className="px-3 py-1.5 rounded-lg border">
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-[#0d381e] text-white font-bold">
                  যোগ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">নতুন সরবরাহকারী যুক্ত করুন</h3>
              <button onClick={() => setShowAddSupplier(false)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">সরবরাহকারীর নাম / প্রতিষ্ঠান *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">সরবরাহকারীর ধরন (ক্যাটাগরি) *</label>
                <select
                  value={supType}
                  onChange={(e) => setSupType(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">মোবাইল</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">প্রারম্ভিক বকেয়া (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={supOpening}
                    onChange={(e) => setSupOpening(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSupplier(false)} className="px-4 py-2 rounded-lg border font-semibold">
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

      {/* Supplier Transaction Modal */}
      {txTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">সরবরাহকারী লেনদেন — {txTarget.name}</h3>
              <button onClick={() => setTxTarget(null)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleRecordTx} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">লেনদেনের ধরন</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as SupplierTxType)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                >
                  {(Object.keys(TX_TYPE_LABELS) as SupplierTxType[]).map((t) => (
                    <option key={t} value={t}>{TX_TYPE_LABELS[t]}</option>
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
                    onChange={(e) => setTxMethod(e.target.value as 'Cash' | 'Bank' | 'Other')}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="Cash">নগদ (Cash)</option>
                    <option value="Bank">ব্যাংক (Bank)</option>
                    <option value="Other">অন্যান্য</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">রেফারেন্স নম্বর</label>
                <input
                  type="text"
                  placeholder="যেমন: চালান বা ভাউচার নং"
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

      {/* Supplier Ledger PDF Modal */}
      {isLedgerPdfOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between border-b bg-stone-50 px-5 py-3 print:hidden">
              <h3 className="text-sm font-bold text-stone-900">সরবরাহকারী লেজার PDF — {selectedSupplier.name}</h3>
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
                    printAsPdf(`সরবরাহকারী_লেজার_${selectedSupplier.name}`, 'supplier-ledger-pdf-sheet')
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

            <div id="supplier-ledger-pdf-sheet" className="p-8 bg-white text-stone-900 text-xs">
              <div className="text-center border-b-2 border-[#0d381e] pb-4 mb-5">
                <p className="text-[11px] font-semibold text-stone-500">|| শ্রী গনেশায় নমঃ ||</p>
                <h2 className="text-2xl font-black text-[#0d381e]">{millConfig.name}</h2>
                <p className="text-xs text-stone-600">{millConfig.location} • মোবাইল: {toBengaliNumber(millConfig.phone)}</p>
                <div className="inline-block mt-2 rounded bg-[#0d381e] text-white px-4 py-1 text-xs font-bold">
                  সরবরাহকারী হিসাব ও লেজার বিবরণী (Supplier Ledger Statement)
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  প্রিন্ট তারিখ: {toBengaliNumber(new Date().toLocaleDateString('en-GB'))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-3.5 mb-5">
                <div>
                  <p><span className="font-bold">সরবরাহকারী:</span> {selectedSupplier.name}</p>
                  <p><span className="font-bold">ক্যাটাগরি:</span> {selectedSupplier.supplierType}</p>
                  <p><span className="font-bold">মোবাইল:</span> {selectedSupplier.phone ? toBengaliNumber(selectedSupplier.phone) : '—'}</p>
                  <p><span className="font-bold">ঠিকানা:</span> {selectedSupplier.address || '—'}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">প্রারম্ভিক জের:</span> {formatBengaliCurrency(selectedSupplier.openingBalance)}</p>
                  <p><span className="font-bold">মোট ক্রয়:</span> {formatBengaliCurrency(selectedSupplier.totalPurchases)}</p>
                  <p><span className="font-bold">মোট পরিশোধ:</span> {formatBengaliCurrency(selectedSupplier.totalPayments)}</p>
                  <p className="text-sm font-black text-rose-800 mt-1">
                    বর্তমান স্থিতি: {selectedSupplier.currentDue < 0
                      ? `অগ্রিম ${formatBengaliCurrency(Math.abs(selectedSupplier.currentDue))}`
                      : formatBengaliCurrency(selectedSupplier.currentDue)}
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
                    <th className="border border-stone-300 p-2 text-right">চলতি ব্যালেন্স (৳)</th>
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
                        <div className="font-semibold">{TX_TYPE_LABELS[tx.type] || tx.type}</div>
                        {tx.paymentMethod && (
                          <div className="text-[10px] text-stone-500">{tx.paymentMethod}</div>
                        )}
                      </td>
                      <td className="border border-stone-300 p-2">
                        <span className="font-mono font-bold">{tx.referenceNo}</span> — {tx.note}
                        {tx.quantityKg ? (
                          <span className="block text-[10px] text-amber-800">
                            পরিমাণ: {toBengaliNumber(tx.quantityKg)} কেজি
                            {tx.rate ? ` @ ${formatBengaliCurrency(tx.rate)}/কেজি` : ''}
                          </span>
                        ) : null}
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
