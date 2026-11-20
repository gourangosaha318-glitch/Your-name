import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, UserCheck, Plus, Check, AlertCircle, X } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { EmployeeDailyTx } from '../types/mill';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';

const TX_TYPES: Array<{ value: EmployeeDailyTx['type']; label: string }> = [
  { value: 'Salary/Wage', label: 'বেতন / মজুরি প্রদান (Salary/Wage)' },
  { value: 'Advance', label: 'অগ্রিম / ধার প্রদান (Advance)' },
  { value: 'Collection', label: 'কর্মচারীর মাধ্যমে ক্যাশ আদায় (Collection)' },
  { value: 'Expense', label: 'টিফিন / যাতায়াত খরচ (Expense)' },
];

export const EmployeesPage: React.FC = () => {
  const [transactions, setTransactions] = useState<EmployeeDailyTx[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [employeeName, setEmployeeName] = useState('');
  const [designation, setDesignation] = useState('মিল কর্মী');
  const [type, setType] = useState<EmployeeDailyTx['type']>('Salary/Wage');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch<{ transactions: EmployeeDailyTx[] }>('/api/employees');
      setTransactions(res.transactions || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'কর্মচারী তথ্য লোড করতে ব্যর্থ');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          employeeName,
          designation,
          type,
          amount: Number(amount),
          note,
        }),
      });
      setShowForm(false);
      setEmployeeName('');
      setAmount('');
      setNote('');
      await loadData();
      setToast('কর্মচারীর লেনদেন দৈনিক হিসাবে যুক্ত হয়েছে!');
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'সংরক্ষণ ব্যর্থ');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const totalPaid = transactions
    .filter((t) => t.type !== 'Collection')
    .reduce((s, t) => s + t.amount, 0);
  const totalCollected = transactions
    .filter((t) => t.type === 'Collection')
    .reduce((s, t) => s + t.amount, 0);

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

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
          <NavLink to="/" className="hover:text-emerald-800">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">কর্মচারী লেনদেন</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">কর্মচারী ও স্টাফ দৈনিক লেনদেন</h1>
              <p className="text-xs sm:text-sm text-stone-500">
                বেতন-মজুরি, অগ্রিম, যাতায়াত ভাতা ও কর্মচারী মারফত ক্যাশ আদায়ের রেজিস্টার
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            <span>নতুন লেনদেন এন্ট্রি</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-stone-500">মোট লেনদেন</p>
          <p className="text-xl font-black text-stone-900 mt-1">{toBengaliNumber(transactions.length)} টি</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <p className="text-xs text-rose-800 font-semibold">মোট কর্মচারী প্রদান (মজুরি/অগ্রিম)</p>
          <p className="text-xl font-black text-rose-900 mt-1">{formatBengaliCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <p className="text-xs text-emerald-800 font-semibold">কর্মচারী কর্তৃক ক্যাশ জমা</p>
          <p className="text-xl font-black text-emerald-900 mt-1">{formatBengaliCurrency(totalCollected)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <th className="py-3 px-4 font-bold">তারিখ ও সময়</th>
                <th className="py-3 px-4 font-bold">কর্মচারীর নাম ও পদবি</th>
                <th className="py-3 px-4 font-bold">লেনদেনের ধরন</th>
                <th className="py-3 px-4 font-bold">বিবরণ</th>
                <th className="py-3 px-4 font-bold text-right">টাকা</th>
                <th className="py-3 px-4 font-bold">এন্ট্রিকারী</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-stone-800">{toBengaliNumber(t.date)}</div>
                    <div className="text-[10px] text-stone-400">{toBengaliNumber(t.time)}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-stone-900">{t.employeeName}</div>
                    <div className="text-[11px] text-stone-500">{t.designation}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded px-2 py-0.5 font-bold ${
                        t.type === 'Collection'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-600">{t.note || '—'}</td>
                  <td className="py-3 px-4 text-right font-black text-stone-900">{formatBengaliCurrency(t.amount)}</td>
                  <td className="py-3 px-4 text-stone-600">{t.createdBy}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    এখনো কোনো কর্মচারী লেনদেন রেকর্ড করা হয়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">কর্মচারী লেনদেন এন্ট্রি</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">কর্মচারীর নাম *</label>
                <input
                  type="text"
                  required
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">পদবি</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">টাকার পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">ধরন</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EmployeeDailyTx['type'])}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                >
                  {TX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">বিবরণ / নোট</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border font-semibold">
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
    </div>
  );
};
