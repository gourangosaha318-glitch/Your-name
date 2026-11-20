import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  Settings,
  Database,
  ShieldCheck,
  Check,
  Download,
  Upload,
  Save,
  Tag,
  Plus,
  Trash2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { millConfig } from '../data/mock';
import { toBengaliNumber } from '../lib/bengaliUtils';

interface SupplierCat {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export const SettingsPage: React.FC = () => {
  const { permissions } = useAuth();
  const [millName, setMillName] = useState(millConfig.name);
  const [millLocation, setMillLocation] = useState(millConfig.location);
  const [millPhone, setMillPhone] = useState(millConfig.phone);
  const [openingCash, setOpeningCash] = useState('85400');
  const [bankTimeoutMins, setBankTimeoutMins] = useState('15');

  const [categories, setCategories] = useState<SupplierCat[]>([]);
  const [newCatName, setNewCatName] = useState('');

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

  const loadSettingsAndCats = useCallback(async () => {
    try {
      const [setRes, catRes] = await Promise.all([
        apiFetch<{ settings: Record<string, string> }>('/api/settings'),
        apiFetch<{ categories: SupplierCat[] }>('/api/supplier-categories'),
      ]);
      const s = setRes.settings || {};
      if (s.mill_name) setMillName(s.mill_name);
      if (s.mill_location) setMillLocation(s.mill_location);
      if (s.mill_phone) setMillPhone(s.mill_phone);
      if (s.opening_cash_balance) setOpeningCash(s.opening_cash_balance);
      if (s.bank_session_timeout_minutes) setBankTimeoutMins(s.bank_session_timeout_minutes);
      setCategories(catRes.categories || []);
    } catch (err: any) {
      showError(err?.message || 'সেটিংস লোড ব্যর্থ');
    }
  }, []);

  useEffect(() => {
    loadSettingsAndCats();
  }, [loadSettingsAndCats]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.isOwner) return;
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          mill_name: millName,
          mill_location: millLocation,
          mill_phone: millPhone,
          opening_cash_balance: Number(openingCash) || 0,
          bank_session_timeout_minutes: Number(bankTimeoutMins) || 15,
        }),
      });
      showToast('সিস্টেম সেটিংস ও নিরাপত্তা কনফিগারেশন সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'সেটিংস সংরক্ষণ ব্যর্থ');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await apiFetch('/api/supplier-categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      setNewCatName('');
      await loadSettingsAndCats();
      showToast('নতুন সরবরাহকারী ক্যাটাগরি যুক্ত হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'ক্যাটাগরি যোগ ব্যর্থ');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await apiFetch(`/api/supplier-categories/${id}`, { method: 'DELETE' });
      await loadSettingsAndCats();
      showToast('কাস্টম ক্যাটাগরি মুছে ফেলা হয়েছে।');
    } catch (err: any) {
      showError(err?.message || 'ক্যাটাগরি মোছা ব্যর্থ');
    }
  };

  const handleExportBackup = async () => {
    try {
      const dump = await apiFetch<any>('/api/backup/export');
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ma_flower_mill_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('সম্পূর্ণ ডাটাবেস ব্যাকআপ JSON ডাউনলোড হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'ব্যাকআপ ডাউনলোড ব্যর্থ');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed.data ? parsed : { data: parsed };
      const res = await apiFetch<{ success: boolean; restoredRows: number }>('/api/backup/restore', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadSettingsAndCats();
      showToast(`ব্যাকআপ থেকে ${toBengaliNumber(res.restoredRows)} টি রেকর্ড সফলভাবে পুনরুদ্ধার হয়েছে!`);
    } catch (err: any) {
      showError(err?.message || 'সঠিক ব্যাকআপ JSON ফাইল নির্বাচন করুন।');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-10">
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
          <span className="font-semibold text-stone-800">সেটিংস ও ডাটাবেস ব্যাকআপ</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400 shadow-sm">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              সিস্টেম সেটিংস, সরবরাহকারী ক্যাটাগরি ও ব্যাকআপ
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              মিলের তথ্য, ব্যাংক পিন সেশন টাইমআউট, সরবরাহকারী ধরন এবং SQLite ডাটাবেস JSON ব্যাকআপ/রিস্টোর
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: General & Security Settings */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-4">
              <h2 className="text-base font-bold text-stone-800">মিল ও নিরাপত্তা সেটিংস</h2>
              {!permissions.isOwner && (
                <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                  <Lock className="h-3 w-3" /> শুধুমাত্র মালিক পরিবর্তনযোগ্য
                </span>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">মিলের নাম</label>
                <input
                  type="text"
                  disabled={!permissions.isOwner}
                  value={millName}
                  onChange={(e) => setMillName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">ঠিকানা / লোকেশন</label>
                <input
                  type="text"
                  disabled={!permissions.isOwner}
                  value={millLocation}
                  onChange={(e) => setMillLocation(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">যোগাযোগ মোবাইল নম্বর</label>
                <input
                  type="text"
                  disabled={!permissions.isOwner}
                  value={millPhone}
                  onChange={(e) => setMillPhone(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 disabled:bg-stone-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">দৈনিক প্রারম্ভিক ক্যাশ (৳)</label>
                  <input
                    type="number"
                    disabled={!permissions.isOwner}
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 font-bold disabled:bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ব্যাংক পিন টাইমআউট (মিনিট)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    disabled={!permissions.isOwner}
                    value={bankTimeoutMins}
                    onChange={(e) => setBankTimeoutMins(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 font-bold disabled:bg-stone-50"
                  />
                </div>
              </div>

              {permissions.isOwner && (
                <div className="pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] text-white px-5 py-2 text-xs font-bold transition-colors shadow-2xs"
                  >
                    <Save className="h-4 w-4 text-amber-300" />
                    <span>সেটিংস সংরক্ষণ করুন</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Database Backup & Restore (Owner Only) */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2 mb-3">
              <Database className="h-5 w-5 text-emerald-700" />
              <h2 className="text-base font-bold text-stone-800">ডাটাবেস ব্যাকআপ ও রিস্টোর</h2>
            </div>

            {permissions.isOwner ? (
              <div className="space-y-3 text-xs">
                <p className="text-stone-600 leading-relaxed">
                  সকল পণ্য, স্টক ইতিহাস, মেমো, গেট পাস, খরচের ভাউচার, ব্যাংক লেনদেন, ক্রেতা/সরবরাহকারী লেজার ও অডিট লগের সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড বা পুনরুদ্ধার করুন।
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] px-4 py-2 font-bold text-white"
                  >
                    <Download className="h-4 w-4 text-amber-300" />
                    <span>সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড</span>
                  </button>

                  <label className="flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 hover:bg-amber-100 px-4 py-2 font-bold text-amber-950 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>JSON ব্যাকআপ রিস্টোর</span>
                    <input type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
                  </label>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-emerald-900 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>SQLite পারসিস্টেন্ট ডাটাবেস ও অটো স্টার্টআপ ব্যাকআপ সক্রিয় রয়েছে।</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                ডাটাবেস ব্যাকআপ এবং রিস্টোর সুবিধা শুধুমাত্র মালিক (OWNER)-এর জন্য সংরক্ষিত।
              </p>
            )}
          </div>
        </div>

        {/* Right: Supplier Categories Manager */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2 mb-3">
              <Tag className="h-5 w-5 text-[#ea7a1a]" />
              <h2 className="text-base font-bold text-stone-800">সরবরাহকারী ক্যাটাগরি ব্যবস্থাপনা</h2>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              ৫টি ডিফল্ট ক্যাটাগরি ছাড়াও ব্যবসার প্রয়োজনে নতুন কাস্টম সরবরাহকারী ধরন যোগ করতে পারবেন।
            </p>

            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input
                type="text"
                required
                placeholder="নতুন সরবরাহকারী ক্যাটাগরির নাম লিখুন..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-hidden"
              />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-lg bg-[#ea7a1a] hover:bg-[#d86c0e] text-white px-4 py-2 text-xs font-bold shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>যোগ করুন</span>
              </button>
            </form>

            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-white hover:bg-stone-50">
                  <div>
                    <span className="font-bold text-stone-800">{c.name}</span>
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        c.isDefault ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.isDefault ? 'ডিফল্ট' : 'কাস্টম'}
                    </span>
                  </div>
                  {!c.isDefault && permissions.isOwner && (
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
