import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  FileDown,
  Printer,
  Edit3,
  Upload,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
  History,
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { ExpenseVoucher, VoucherPaymentMethod } from '../types/mill';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import { millConfig } from '../data/mock';

const EXPENSE_CATEGORIES = [
  'বিদ্যুৎ বিল',
  'মেশিন মেইনটেন্যান্স',
  'জ্বালানি ও জেনারেটর',
  'শ্রমিক মজুরি ও ভাতা',
  'পরিবহন ও ভাড়া',
  'বস্তা ও প্যাকেজিং খরচ',
  'অফিস ও আপ্যায়ন',
  'অন্যান্য পরিচালন ব্যয়',
];

export const ExpenseVoucherPage: React.FC = () => {
  const { user, permissions } = useAuth();
  const [vouchers, setVouchers] = useState<ExpenseVoucher[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'history'>('all');
  const [loading, setLoading] = useState(false);

  // Create Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(user?.name || '');
  const [receiverPerson, setReceiverPerson] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<VoucherPaymentMethod>('Cash');
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Approval / Rejection / Adjustment / PDF Modal State
  const [selectedVoucher, setSelectedVoucher] = useState<ExpenseVoucher | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [approveTarget, setApproveTarget] = useState<ExpenseVoucher | null>(null);
  const [ownerSigInput, setOwnerSigInput] = useState(user?.name || millConfig.ownerName);

  const [rejectTarget, setRejectTarget] = useState<ExpenseVoucher | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [adjustTarget, setAdjustTarget] = useState<ExpenseVoucher | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

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

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ vouchers: ExpenseVoucher[] }>('/api/vouchers');
      setVouchers(res.vouchers || []);
    } catch (err: any) {
      showError(err?.message || 'ভাউচার লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showError('সংযুক্ত ফাইল ২ মেগাবাইটের কম হতে হবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentDataUrl(String(reader.result || ''));
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ voucher: ExpenseVoucher }>('/api/vouchers', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description,
          amount: Number(amount),
          paidBy: paidBy || user?.name,
          receiverPerson,
          paymentMethod,
          bankAccountId: paymentMethod === 'Bank' ? bankAccountId : undefined,
          attachmentDataUrl: attachmentDataUrl || undefined,
          attachmentName: attachmentName || undefined,
          notes,
        }),
      });
      setShowCreateForm(false);
      setDescription('');
      setAmount('');
      setReceiverPerson('');
      setNotes('');
      setAttachmentDataUrl('');
      setAttachmentName('');
      await fetchVouchers();
      showToast(`খরচের ভাউচার #${res.voucher.voucherNo} মালিকের অনুমোদনের জন্য জমা হয়েছে!`);
    } catch (err: any) {
      showError(err?.message || 'ভাউচার তৈরি ব্যর্থ');
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;
    try {
      await apiFetch(`/api/vouchers/${approveTarget.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ signature: ownerSigInput }),
      });
      setApproveTarget(null);
      await fetchVouchers();
      showToast(`ভাউচার #${approveTarget.voucherNo} মালিক কর্তৃক অনুমোদিত ও স্বাক্ষরিত হয়েছে!`);
    } catch (err: any) {
      showError(err?.message || 'অনুমোদন ব্যর্থ');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    try {
      await apiFetch(`/api/vouchers/${rejectTarget.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectTarget(null);
      setRejectReason('');
      await fetchVouchers();
      showToast(`ভাউচার #${rejectTarget.voucherNo} প্রত্যাখ্যান করা হয়েছে।`);
    } catch (err: any) {
      showError(err?.message || 'প্রত্যাখ্যান ব্যর্থ');
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    try {
      await apiFetch(`/api/vouchers/${adjustTarget.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          newAmount: Number(adjustAmount),
          reason: adjustReason,
        }),
      });
      setAdjustTarget(null);
      setAdjustAmount('');
      setAdjustReason('');
      await fetchVouchers();
      showToast(`অনুমোদিত ভাউচার #${adjustTarget.voucherNo} এর সংশোধনী রেকর্ড অডিট সহ সংরক্ষিত হয়েছে!`);
    } catch (err: any) {
      showError(err?.message || 'সংশোধনী ব্যর্থ');
    }
  };

  const counts = useMemo(
    () => ({
      all: vouchers.length,
      pending: vouchers.filter((v) => v.status === 'pending').length,
      approved: vouchers.filter((v) => v.status === 'approved').length,
      rejected: vouchers.filter((v) => v.status === 'rejected').length,
    }),
    [vouchers]
  );

  const visibleVouchers = useMemo(() => {
    if (activeTab === 'pending') return vouchers.filter((v) => v.status === 'pending');
    if (activeTab === 'approved') return vouchers.filter((v) => v.status === 'approved');
    if (activeTab === 'rejected') return vouchers.filter((v) => v.status === 'rejected');
    return vouchers;
  }, [vouchers, activeTab]);

  const approvedTotal = useMemo(
    () => vouchers.filter((v) => v.status === 'approved').reduce((s, v) => s + v.amount, 0),
    [vouchers]
  );
  const pendingTotal = useMemo(
    () => vouchers.filter((v) => v.status === 'pending').reduce((s, v) => s + v.amount, 0),
    [vouchers]
  );

  const handleDownloadVoucherPdf = async () => {
    if (!selectedVoucher) return;
    setIsExportingPdf(true);
    try {
      const success = await exportElementToPdf('printable-expense-voucher', {
        filename: `মা_ফ্লাওয়ার_মিল_খরচের_ভাউচার_${selectedVoucher.voucherNo}`,
      });
      if (success) {
        showToast('খরচের ভাউচার পিডিএফ ডাউনলোড হয়েছে!');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-5 pb-10 relative">
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
          <span className="font-semibold text-stone-800">খরচের ভাউচার</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400 shadow-sm">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                খরচের ভাউচার ব্যবস্থাপনা (Expense Voucher)
              </h1>
              <p className="text-xs sm:text-sm text-stone-500">
                ম্যানেজার এন্ট্রি → মালিকের অনুমোদন ও স্বাক্ষর → অনুমোদিত ভাউচার PDF ও পূর্ণ অডিট ইতিহাস
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 rounded-lg bg-[#ea7a1a] hover:bg-[#d96a10] text-white px-4 py-2 text-xs font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>নতুন খরচের ভাউচার তৈরি</span>
          </button>
        </div>

        {/* Summary Badges */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <span className="text-amber-800 font-semibold block">অপেক্ষমাণ (Pending)</span>
            <span className="text-lg font-black text-amber-950">
              {toBengaliNumber(counts.pending)} টি ({formatBengaliCurrency(pendingTotal)})
            </span>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <span className="text-emerald-800 font-semibold block">অনুমোদিত (Approved)</span>
            <span className="text-lg font-black text-emerald-950">
              {toBengaliNumber(counts.approved)} টি ({formatBengaliCurrency(approvedTotal)})
            </span>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <span className="text-rose-800 font-semibold block">প্রত্যাখ্যাত (Rejected)</span>
            <span className="text-lg font-black text-rose-950">{toBengaliNumber(counts.rejected)} টি</span>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <span className="text-stone-600 font-semibold block">মোট ভাউচার ইতিহাস</span>
            <span className="text-lg font-black text-stone-900">{toBengaliNumber(counts.all)} টি</span>
          </div>
        </div>

        {/* 5 Workflow Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3 text-xs font-bold">
          {[
            { id: 'all', label: `সকল ভাউচার (${toBengaliNumber(counts.all)})` },
            { id: 'pending', label: `অপেক্ষমাণ অনুমোদন (${toBengaliNumber(counts.pending)})` },
            { id: 'approved', label: `অনুমোদিত (${toBengaliNumber(counts.approved)})` },
            { id: 'rejected', label: `প্রত্যাখ্যাত (${toBengaliNumber(counts.rejected)})` },
            { id: 'history', label: 'ভাউচার ও সংশোধনী ইতিহাস' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                activeTab === t.id
                  ? 'bg-[#0d381e] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create Voucher Form */}
      {showCreateForm && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3 mb-4">
            <h2 className="text-sm font-black text-amber-950">
              নতুন খরচের ভাউচার এন্ট্রি (স্বয়ংক্রিয়ভাবে Pending Owner Approval হিসেবে সেভ হবে)
            </h2>
            <button onClick={() => setShowCreateForm(false)} className="text-xs font-bold text-stone-600">
              ✕ বাতিল
            </button>
          </div>
          <form onSubmit={handleCreateVoucher} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">খরচের খাত</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">টাকার পরিমাণ (৳)</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="যেমন: 2500"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">পেমেন্ট মাধ্যম</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as VoucherPaymentMethod)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold"
              >
                <option value="Cash">নগদ (Cash)</option>
                <option value="Bank">ব্যাংক (Bank)</option>
                <option value="Other">অন্যান্য (Other)</option>
              </select>
            </div>

            {paymentMethod === 'Bank' && (
              <div>
                <label className="block font-bold text-stone-700 mb-1">সংশ্লিষ্ট ব্যাংক অ্যাকাউন্ট আইডি</label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold"
                >
                  <option value="">নির্বাচন করুন</option>
                  <option value="bank-1">ইসলামী ব্যাংক বাংলাদেশ লি.</option>
                  <option value="bank-2">ডাচ-বাংলা ব্যাংক লি.</option>
                  <option value="bank-3">বিকাশ মার্চেন্ট অ্যাকাউন্ট</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-stone-700 mb-1">প্রদানকারী (Paid By)</label>
              <input
                type="text"
                required
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">প্রাপক / খরচকারী ব্যক্তি</label>
              <input
                type="text"
                required
                value={receiverPerson}
                onChange={(e) => setReceiverPerson(e.target.value)}
                placeholder="যার হাতে টাকা দেওয়া হলো"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">খরচের বিস্তারিত বিবরণ</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="যেমন: ১ নং রোল মেশিনের বেল্ট মেরামত"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">রশিদ/ছবি সংযুক্তি (ঐচ্ছিক)</label>
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-stone-400 bg-white px-3 py-1.5 cursor-pointer hover:bg-stone-50">
                <Upload className="h-4 w-4 text-emerald-700" />
                <span className="truncate">{attachmentName || 'ছবি / রশিদ আপলোড'}</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
            <div className="lg:col-span-3 flex items-center justify-between gap-3 pt-2">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="অতিরিক্ত নোট (ঐচ্ছিক)"
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#0d381e] hover:bg-[#134e2a] text-white px-5 py-2.5 font-bold shadow-sm"
              >
                অনুমোদনের জন্য জমা দিন ✓
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vouchers Table or History View */}
      {activeTab === 'history' ? (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-stone-900 flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-700" />
            সম্পূর্ণ ভাউচার ও সংশোধনী (Adjustment) অডিট ইতিহাস
          </h2>
          <div className="space-y-3">
            {vouchers.map((v) => (
              <div key={v.id} className="rounded-xl border border-stone-200 p-4 text-xs space-y-2 bg-stone-50/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-stone-900">{v.voucherNo}</span>
                    <span className="text-stone-500">({toBengaliNumber(v.date)} • {toBengaliNumber(v.time)})</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        v.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : v.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {v.status === 'approved' ? 'অনুমোদিত' : v.status === 'rejected' ? 'প্রত্যাখ্যাত' : 'অপেক্ষমাণ'}
                    </span>
                  </div>
                  <span className="font-black text-sm text-stone-900">{formatBengaliCurrency(v.amount)}</span>
                </div>
                <p className="text-stone-700">
                  <strong>{v.category}:</strong> {v.description} | তৈরি: {v.createdBy} | প্রাপক: {v.receiverPerson}
                </p>
                {v.approvedBy && (
                  <p className="text-emerald-800 font-semibold">
                    ✓ অনুমোদন: {v.approvedBy} ({v.approvedAt}) — স্বাক্ষর: {v.ownerSignature}
                  </p>
                )}
                {v.rejectedBy && (
                  <p className="text-rose-700 font-semibold">
                    ✕ প্রত্যাখ্যান: {v.rejectedBy} ({v.rejectedAt}) — কারণ: {v.rejectionReason}
                  </p>
                )}
                {v.adjustments && v.adjustments.length > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-1">
                    <p className="font-bold text-amber-950">সংশোধনী ইতিহাস (Adjustment Audit):</p>
                    {v.adjustments.map((adj) => (
                      <p key={adj.id} className="text-[11px] text-amber-900">
                        • {toBengaliNumber(adj.date)} {adj.time}: {formatBengaliCurrency(adj.previousAmount)} →{' '}
                        <strong>{formatBengaliCurrency(adj.newAmount)}</strong> ({adj.reason}) — {adj.createdBy}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-700">
                  <th className="py-3 px-4">ভাউচার নং ও তারিখ</th>
                  <th className="py-3 px-4">খাত ও বিবরণ</th>
                  <th className="py-3 px-4">প্রদানকারী ও প্রাপক</th>
                  <th className="py-3 px-4">মাধ্যম</th>
                  <th className="py-3 px-4 text-right">পরিমাণ (৳)</th>
                  <th className="py-3 px-4 text-center">মালিকের অবস্থা</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন / PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500">লোড হচ্ছে...</td>
                  </tr>
                ) : visibleVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500">কোনো ভাউচার পাওয়া যায়নি।</td>
                  </tr>
                ) : (
                  visibleVouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-stone-50/70">
                      <td className="py-3 px-4">
                        <div className="font-black text-stone-900">{v.voucherNo}</div>
                        <div className="text-[11px] text-stone-500">{toBengaliNumber(v.date)} • {v.time}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-800">{v.category}</div>
                        <div className="text-stone-600">{v.description}</div>
                        {v.adjustments?.length > 0 && (
                          <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            {toBengaliNumber(v.adjustments.length)} টি সংশোধনী রয়েছে
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        <div>প্রদান: {v.paidBy}</div>
                        <div className="text-[11px] text-stone-500">প্রাপক: {v.receiverPerson}</div>
                        <div className="text-[10px] text-stone-400">এন্ট্রি: {v.createdBy}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-stone-100 px-2 py-0.5 font-bold text-stone-700">
                          {v.paymentMethod}
                        </span>
                        {v.bankAccountName && (
                          <div className="text-[10px] text-sky-700 mt-0.5">{v.bankAccountName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sm text-stone-900">
                        {formatBengaliCurrency(v.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {v.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> অনুমোদিত
                          </span>
                        ) : v.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                            <XCircle className="h-3.5 w-3.5" /> প্রত্যাখ্যাত
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                            <Clock className="h-3.5 w-3.5" /> অপেক্ষমাণ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex flex-wrap justify-end items-center gap-1.5">
                          {v.status === 'pending' && permissions.canApproveVouchers && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setApproveTarget(v);
                                  setOwnerSigInput(user?.name || millConfig.ownerName);
                                }}
                                className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 text-[11px] font-bold"
                              >
                                অনুমোদন ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(v)}
                                className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-[11px] font-bold"
                              >
                                বাতিল ✕
                              </button>
                            </>
                          )}

                          {v.status === 'approved' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVoucher(v);
                                  setIsPdfModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] text-white px-2.5 py-1.5 text-[11px] font-bold"
                              >
                                <FileDown className="h-3 w-3 text-amber-300" />
                                <span>ভাউচার PDF</span>
                              </button>
                              {permissions.isOwner && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdjustTarget(v);
                                    setAdjustAmount(String(v.amount));
                                  }}
                                  title="সংশোধনী রেকর্ড যোগ (অডিট সহ)"
                                  className="rounded-lg border border-amber-300 bg-amber-50 p-1.5 text-amber-900 hover:bg-amber-100"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVoucher(v);
                                setIsPdfModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-2.5 py-1 text-[11px] font-bold"
                            >
                              <FileDown className="h-3 w-3 text-stone-600" />
                              <span>বিবরণ / PDF</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Owner Approve Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleApprove} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                ভাউচার অনুমোদন ও মালিকের স্বাক্ষর ({approveTarget.voucherNo})
              </h3>
              <button type="button" onClick={() => setApproveTarget(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 space-y-1">
              <p><strong>খাত:</strong> {approveTarget.category}</p>
              <p><strong>বিবরণ:</strong> {approveTarget.description}</p>
              <p><strong>পরিমাণ:</strong> {formatBengaliCurrency(approveTarget.amount)}</p>
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">মালিকের স্বাক্ষর / অনুমোদন নাম</label>
              <input
                type="text"
                required
                value={ownerSigInput}
                onChange={(e) => setOwnerSigInput(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setApproveTarget(null)} className="rounded-lg bg-stone-200 px-4 py-2 font-bold">
                বাতিল
              </button>
              <button type="submit" className="rounded-lg bg-emerald-700 text-white px-4 py-2 font-bold">
                অনুমোদন নিশ্চিত করুন ✓
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Owner Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleReject} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-black text-rose-900">ভাউচার প্রত্যাখ্যান ({rejectTarget.voucherNo})</h3>
            <div>
              <label className="block font-bold text-stone-700 mb-1">বাতিল/প্রত্যাখ্যানের কারণ (বাধ্যতামূলক)</label>
              <input
                type="text"
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="কারণ লিখুন..."
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectTarget(null)} className="rounded-lg bg-stone-200 px-4 py-2 font-bold">
                বাতিল
              </button>
              <button type="submit" className="rounded-lg bg-rose-600 text-white px-4 py-2 font-bold">
                প্রত্যাখ্যান করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Owner Immutable Adjustment Modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleAdjust} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-black text-amber-950">
              অনুমোদিত ভাউচার সংশোধনী রেকর্ড ({adjustTarget.voucherNo})
            </h3>
            <p className="text-[11px] text-stone-600">
              অনুমোদিত ভাউচার কখনো মুছে ফেলা হয় না। পরিবর্তনের জন্য নিচে নতুন পরিমাণ এবং কারণ দিলে স্থায়ী অডিট ইতিহাস সংরক্ষিত হবে।
            </p>
            <div>
              <label className="block font-bold text-stone-700 mb-1">সংশোধিত টাকার পরিমাণ (৳)</label>
              <input
                type="number"
                required
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">সংশোধনের কারণ</label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="যেমন: আসল ভাউচার বিলের সাথে সমন্বয়"
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdjustTarget(null)} className="rounded-lg bg-stone-200 px-4 py-2 font-bold">
                বাতিল
              </button>
              <button type="submit" className="rounded-lg bg-amber-600 text-white px-4 py-2 font-bold">
                সংশোধনী সেভ করুন ✓
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable Expense Voucher PDF Modal */}
      {isPdfModalOpen && selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between bg-[#0d381e] px-5 py-3 text-white shrink-0 print:hidden">
              <span className="font-bold text-sm">
                {selectedVoucher.status === 'approved'
                  ? 'অনুমোদিত খরচের ভাউচার (Expense Voucher PDF)'
                  : selectedVoucher.status === 'rejected'
                  ? 'প্রত্যাখ্যাত খরচের ভাউচার (Rejected Voucher)'
                  : 'অপেক্ষমাণ খরচের ভাউচার (Pending Approval)'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadVoucherPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-1.5 text-xs font-bold"
                >
                  <FileDown className="h-3.5 w-3.5 text-amber-300" />
                  <span>{isExportingPdf ? 'পিডিএফ হচ্ছে...' : 'ভাউচার পিডিএফ'}</span>
                </button>
                <button
                  onClick={() => printAsPdf(`খরচের_ভাউচার_${selectedVoucher.voucherNo}`, 'printable-expense-voucher')}
                  className="flex items-center gap-1 rounded-lg bg-amber-500 text-stone-900 px-3 py-1.5 text-xs font-bold"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>প্রিন্ট</span>
                </button>
                <button onClick={() => setIsPdfModalOpen(false)} className="p-1 hover:bg-emerald-900 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <div id="printable-expense-voucher" className="p-6 bg-white text-stone-900 text-xs sm:text-sm space-y-4">
                <div className="border-b-2 border-stone-900 pb-3 text-center">
                  <p className="text-[11px] font-bold text-amber-800">|| শ্রী গনেশায় নমঃ ||</p>
                  <h1 className="text-2xl font-black text-[#0d381e]">{millConfig.name}</h1>
                  <p className="text-xs text-stone-600">{millConfig.location} | {toBengaliNumber(millConfig.phone)}</p>
                  <div className="mt-2 inline-block border-2 border-stone-800 bg-stone-100 px-4 py-1 rounded font-black text-sm">
                    খরচের ভাউচার (EXPENSE VOUCHER)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-b border-stone-200 pb-3">
                  <div className="space-y-1">
                    <p><strong>ভাউচার নং:</strong> {selectedVoucher.voucherNo}</p>
                    <p><strong>খরচের খাত:</strong> {selectedVoucher.category}</p>
                    <p>
                      <strong>পেমেন্ট মাধ্যম:</strong>{' '}
                      {selectedVoucher.paymentMethod === 'Cash'
                        ? 'নগদ (Cash)'
                        : selectedVoucher.paymentMethod === 'Bank'
                        ? 'ব্যাংক (Bank)'
                        : 'অন্যান্য'}{' '}
                      {selectedVoucher.bankAccountName ? `(${selectedVoucher.bankAccountName})` : ''}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p><strong>তারিখ:</strong> {toBengaliNumber(selectedVoucher.date)}</p>
                    <p><strong>সময়:</strong> {toBengaliNumber(selectedVoucher.time)}</p>
                    {selectedVoucher.status === 'approved' ? (
                      <p className="text-emerald-800 font-bold">
                        অবস্থা: মালিক অনুমোদিত ✓ {selectedVoucher.approvedAt ? `(${toBengaliNumber(selectedVoucher.approvedAt)})` : ''}
                      </p>
                    ) : selectedVoucher.status === 'rejected' ? (
                      <p className="text-rose-700 font-bold">অবস্থা: মালিক কর্তৃক প্রত্যাখ্যাত ✕</p>
                    ) : (
                      <p className="text-amber-800 font-bold">অবস্থা: মালিকের অনুমোদন অপেক্ষমাণ ⏳</p>
                    )}
                  </div>
                </div>

                {selectedVoucher.status === 'rejected' && selectedVoucher.rejectionReason && (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                    <strong>প্রত্যাখ্যানের কারণ:</strong> {selectedVoucher.rejectionReason}{' '}
                    {selectedVoucher.rejectedBy ? `(${selectedVoucher.rejectedBy})` : ''}
                  </div>
                )}

                <table className="w-full border-collapse border border-stone-700 text-xs">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-700">
                      <th className="border-r border-stone-700 py-2 px-3 text-left">খরচের বিবরণ</th>
                      <th className="border-r border-stone-700 py-2 px-3 text-left">প্রদান / প্রাপক</th>
                      <th className="py-2 px-3 text-right w-36">টাকার পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-r border-stone-300 py-3 px-3">{selectedVoucher.description}</td>
                      <td className="border-r border-stone-300 py-3 px-3">
                        <div>প্রদান: {selectedVoucher.paidBy}</div>
                        <div>প্রাপক: {selectedVoucher.receiverPerson}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-base">
                        {formatBengaliCurrency(selectedVoucher.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {selectedVoucher.notes && (
                  <p className="text-xs text-stone-600"><strong>নোট:</strong> {selectedVoucher.notes}</p>
                )}

                {selectedVoucher.adjustments && selectedVoucher.adjustments.length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-3 text-xs space-y-1.5">
                    <p className="font-bold text-amber-950">সংশোধনী অডিট ইতিহাস (Adjustment History):</p>
                    <table className="w-full border-collapse border border-amber-300 text-[11px] bg-white">
                      <thead>
                        <tr className="bg-amber-100/80">
                          <th className="border border-amber-300 p-1.5 text-left">তারিখ ও সময়</th>
                          <th className="border border-amber-300 p-1.5 text-right">পূর্বের টাকা</th>
                          <th className="border border-amber-300 p-1.5 text-right">নতুন টাকা</th>
                          <th className="border border-amber-300 p-1.5 text-left">কারণ ও সংশোধনকারী</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVoucher.adjustments.map((adj) => (
                          <tr key={adj.id}>
                            <td className="border border-amber-200 p-1.5">
                              {toBengaliNumber(adj.date)} {toBengaliNumber(adj.time)}
                            </td>
                            <td className="border border-amber-200 p-1.5 text-right">
                              {formatBengaliCurrency(adj.previousAmount)}
                            </td>
                            <td className="border border-amber-200 p-1.5 text-right font-bold">
                              {formatBengaliCurrency(adj.newAmount)}
                            </td>
                            <td className="border border-amber-200 p-1.5">
                              {adj.reason} ({adj.createdBy})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedVoucher.attachmentDataUrl && (
                  <div className="border rounded-lg p-2">
                    <p className="text-[11px] font-bold mb-1">সংযুক্ত রশিদ:</p>
                    <img src={selectedVoucher.attachmentDataUrl} alt="Receipt" className="max-h-40 rounded object-contain" />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-12 text-center text-[11px] font-bold text-stone-700">
                  <div>
                    <div className="border-t border-stone-500 pt-1">প্রস্তুতকারী</div>
                    <span className="font-normal text-[10px]">{selectedVoucher.createdBy}</span>
                  </div>
                  <div>
                    <div className="border-t border-stone-500 pt-1">গ্রহীতার স্বাক্ষর</div>
                    <span className="font-normal text-[10px]">{selectedVoucher.receiverPerson}</span>
                  </div>
                  <div>
                    <div className="border-t border-stone-500 pt-1">মালিকের অনুমোদন ও স্বাক্ষর</div>
                    <span className="font-bold text-[10px] text-emerald-800">
                      {selectedVoucher.status === 'approved'
                        ? selectedVoucher.ownerSignature || selectedVoucher.approvedBy || 'অনুমোদিত'
                        : selectedVoucher.status === 'rejected'
                        ? 'প্রত্যাখ্যাত'
                        : 'অনুমোদন অপেক্ষমাণ'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
