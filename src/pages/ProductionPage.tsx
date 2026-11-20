import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Cog, Plus, Check, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useProducts } from '../context/ProductContext';
import { ProductionRecord } from '../types/mill';
import { toBengaliNumber } from '../lib/bengaliUtils';

export const ProductionPage: React.FC = () => {
  const { refreshProducts } = useProducts();
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [shift, setShift] = useState('সকাল শিফট');
  const [wheatUsedKg, setWheatUsedKg] = useState('2500');
  const [flourBags, setFlourBags] = useState('20');
  const [maidaBags, setMaidaBags] = useState('18');
  const [branBags, setBranBags] = useState('12');
  const [sujiBags, setSujiBags] = useState('5');
  const [operatorName, setOperatorName] = useState('রফিকুল ইসলাম');
  const [note, setNote] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch<{ productions: ProductionRecord[] }>('/api/production');
      setProductions(res.productions || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'উৎপাদন তথ্য লোড ব্যর্থ');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/production', {
        method: 'POST',
        body: JSON.stringify({
          shift,
          wheatUsedKg: Number(wheatUsedKg),
          flourBags: Number(flourBags),
          maidaBags: Number(maidaBags),
          branBags: Number(branBags),
          sujiBags: Number(sujiBags),
          operatorName,
          note,
        }),
      });
      setShowForm(false);
      setNote('');
      await Promise.all([loadData(), refreshProducts()]);
      setToast('গম ভাঙানো ও উৎপাদন রেকর্ড সংরক্ষিত — গুদাম স্টক ও ইতিহাস আপডেট হয়েছে!');
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'উৎপাদন সংরক্ষণ ব্যর্থ');
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
          <span className="font-semibold text-stone-800">গম ভাঙানো ও উৎপাদন</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <Cog className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">গম ভাঙানো (KG) ও উৎপাদন (বস্তা)</h1>
              <p className="text-xs sm:text-sm text-stone-500">
                ভাঙানো গম কেজি বিয়োগ এবং উৎপাদিত আটা, ময়দা, ভুসি ও সুজি বস্তা স্বয়ংক্রিয়ভাবে স্টকে যুক্ত হয়
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg bg-[#ea7a1a] hover:bg-[#d96a10] text-white px-4 py-2 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>নতুন উৎপাদন লগ</span>
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-5 shadow-md grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">শিফট</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            >
              <option value="সকাল শিফট">সকাল শিফট</option>
              <option value="বিকাল শিফট">বিকাল শিফট</option>
              <option value="রাত শিফট">রাত শিফট</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">ভাঙানো গম (কেজি)</label>
            <input
              type="number"
              required
              min="1"
              value={wheatUsedKg}
              onChange={(e) => setWheatUsedKg(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">আটা উৎপাদন (বস্তা)</label>
            <input
              type="number"
              min="0"
              value={flourBags}
              onChange={(e) => setFlourBags(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">ময়দা উৎপাদন (বস্তা)</label>
            <input
              type="number"
              min="0"
              value={maidaBags}
              onChange={(e) => setMaidaBags(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">ভুসি উৎপাদন (বস্তা)</label>
            <input
              type="number"
              min="0"
              value={branBags}
              onChange={(e) => setBranBags(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">সুজি উৎপাদন (বস্তা)</label>
            <input
              type="number"
              min="0"
              value={sujiBags}
              onChange={(e) => setSujiBags(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">মিল অপারেটর</label>
            <input
              type="text"
              required
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-xl bg-[#0d381e] text-white py-2.5 font-bold">
              উৎপাদন সংরক্ষণ করুন ✓
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-700">
                <th className="py-3 px-4">তারিখ ও শিফট</th>
                <th className="py-3 px-4 text-right">ভাঙানো গম (KG)</th>
                <th className="py-3 px-4 text-center">আটা (বস্তা)</th>
                <th className="py-3 px-4 text-center">ময়দা (বস্তা)</th>
                <th className="py-3 px-4 text-center">ভুসি (বস্তা)</th>
                <th className="py-3 px-4 text-center">সুজি (বস্তা)</th>
                <th className="py-3 px-4">অপারেটর</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {productions.map((pr) => (
                <tr key={pr.id} className="hover:bg-stone-50">
                  <td className="py-3 px-4">
                    <div className="font-bold text-stone-900">{pr.shift}</div>
                    <div className="text-[11px] text-stone-500">{toBengaliNumber(pr.date)} • {pr.time}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-amber-800">
                    {toBengaliNumber(pr.wheatUsedKg)} কেজি
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-sky-800">{toBengaliNumber(pr.flourBags)}</td>
                  <td className="py-3 px-4 text-center font-bold text-purple-800">{toBengaliNumber(pr.maidaBags)}</td>
                  <td className="py-3 px-4 text-center font-bold text-teal-800">{toBengaliNumber(pr.branBags)}</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-800">{toBengaliNumber(pr.sujiBags)}</td>
                  <td className="py-3 px-4 text-stone-700">{pr.operatorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
