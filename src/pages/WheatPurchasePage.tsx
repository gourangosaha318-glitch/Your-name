import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, ShoppingBag, Plus, Check, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useProducts } from '../context/ProductContext';
import { SupplierRecord, WheatPurchaseRecord } from '../types/mill';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';

export const WheatPurchasePage: React.FC = () => {
  const { refreshProducts } = useProducts();
  const [purchases, setPurchases] = useState<WheatPurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [quantityKg, setQuantityKg] = useState('2000');
  const [ratePerKg, setRatePerKg] = useState('25');
  const [paidAmount, setPaidAmount] = useState('50000');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Due'>('Cash');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        apiFetch<{ purchases: WheatPurchaseRecord[] }>('/api/wheat-purchases'),
        apiFetch<{ suppliers: SupplierRecord[] }>('/api/suppliers'),
      ]);
      setPurchases(pRes.purchases || []);
      const wheatSups = sRes.suppliers || [];
      setSuppliers(wheatSups);
      if (wheatSups.length > 0 && !supplierId) {
        setSupplierId(wheatSups[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'তথ্য লোড ব্যর্থ');
    }
  }, [supplierId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalCost = (Number(quantityKg) || 0) * (Number(ratePerKg) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/wheat-purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId,
          quantityKg: Number(quantityKg),
          ratePerKg: Number(ratePerKg),
          paidAmount: Number(paidAmount),
          paymentMethod,
          note,
        }),
      });
      setShowForm(false);
      setNote('');
      await Promise.all([loadData(), refreshProducts()]);
      setToast('গম ক্রয় সংরক্ষিত, গুদাম স্টক ও সরবরাহকারী খাতা আপডেট হয়েছে!');
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'গম ক্রয় সংরক্ষণ ব্যর্থ');
      setTimeout(() => setErrorMsg(null), 4000);
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

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
          <NavLink to="/" className="hover:text-emerald-800">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">গম ক্রয় রেজিস্টার</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">গম ক্রয় রেজিস্টার (KG)</h1>
              <p className="text-xs sm:text-sm text-stone-500">
                গম ক্রয়ের সাথে সাথে সাইলো গম স্টক (কেজি) ও সরবরাহকারী খাতা স্বয়ংক্রিয়ভাবে আপডেট হয়
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg bg-[#ea7a1a] hover:bg-[#d96a10] text-white px-4 py-2 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>নতুন গম ক্রয় এন্ট্রি</span>
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">সরবরাহকারী নির্বাচন</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.supplierType})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">পরিমাণ (কেজি)</label>
            <input
              type="number"
              required
              min="1"
              value={quantityKg}
              onChange={(e) => {
                setQuantityKg(e.target.value);
                setPaidAmount(String((Number(e.target.value) || 0) * (Number(ratePerKg) || 0)));
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">দর (৳ / কেজি)</label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={ratePerKg}
              onChange={(e) => {
                setRatePerKg(e.target.value);
                setPaidAmount(String((Number(quantityKg) || 0) * (Number(e.target.value) || 0)));
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">মোট গম মূল্য</label>
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 font-black text-stone-900">
              {formatBengaliCurrency(totalCost)}
            </div>
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">পরিশোধিত টাকা (৳)</label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">পেমেন্ট মাধ্যম</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            >
              <option value="Cash">নগদ (Cash)</option>
              <option value="Due">বাকি (Due)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="নোট (যেমন: গাড়ি নম্বর বা গমের মান)"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="w-full rounded-xl bg-[#0d381e] text-white py-2.5 font-bold">
              গম ক্রয় সংরক্ষণ করুন ✓
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-700">
                <th className="py-3 px-4">চালান নং ও তারিখ</th>
                <th className="py-3 px-4">সরবরাহকারী</th>
                <th className="py-3 px-4 text-right">পরিমাণ (কেজি)</th>
                <th className="py-3 px-4 text-right">দর</th>
                <th className="py-3 px-4 text-right">মোট খরচ</th>
                <th className="py-3 px-4 text-right">পরিশোধ / বাকি</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {purchases.map((p) => {
                const due = Math.max(0, p.totalCost - p.paidAmount);
                return (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{p.memoNo}</div>
                      <div className="text-[11px] text-stone-500">{toBengaliNumber(p.date)} • {p.time}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-800">{p.supplierName}</td>
                    <td className="py-3 px-4 text-right font-black text-amber-800">
                      {toBengaliNumber(p.quantityKg)} কেজি
                    </td>
                    <td className="py-3 px-4 text-right">{formatBengaliCurrency(p.ratePerKg)}</td>
                    <td className="py-3 px-4 text-right font-black text-stone-900">
                      {formatBengaliCurrency(p.totalCost)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-emerald-700">{formatBengaliCurrency(p.paidAmount)}</div>
                      {due > 0 && (
                        <div className="text-[11px] font-bold text-rose-600">বাকি: {formatBengaliCurrency(due)}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
