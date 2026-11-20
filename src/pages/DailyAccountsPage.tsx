import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Send,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  Filter,
  Wheat,
  Store,
  DollarSign,
  User,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Download,
  Check,
  FileDown,
} from 'lucide-react';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  getFormattedHeaderDate,
} from '../lib/bengaliUtils';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import {
  DailyReportSubmission,
  mockDailySubmissions,
  millConfig,
} from '../data/mock';
import { DailySubmissionModal } from '../components/DailySubmissionModal';
import { BossReviewModal } from '../components/BossReviewModal';

export const DailyAccountsPage: React.FC = () => {
  const dateInfo = getFormattedHeaderDate();

  // Submissions State with LocalStorage Persistence
  const [submissions, setSubmissions] = useState<DailyReportSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('ma_flower_mill_daily_submissions');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load submissions from localStorage', e);
    }
    return mockDailySubmissions;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ma_flower_mill_daily_submissions', JSON.stringify(submissions));
    } catch (e) {
      console.error('Failed to save submissions to localStorage', e);
    }
  }, [submissions]);

  // Modals State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] =
    useState<DailyReportSubmission | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [copiedQuickWhatsApp, setCopiedQuickWhatsApp] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Latest Submission or aggregate stats
  const latestSubmission = submissions[0] || mockDailySubmissions[0];

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const success = await exportElementToPdf('daily-accounts-main-content', {
        filename: `মা_ফ্লাওয়ার_মিল_দৈনিক_হিসাব_ও_স্টক_${dateInfo.gregorianFormatted.replace(/\//g, '-')}`,
      });
      if (success) {
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 3000);
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle New Submission from Manager
  const handleAddNewSubmission = (newReport: DailyReportSubmission) => {
    setSubmissions((prev) => [newReport, ...prev]);
  };

  // Handle Boss Approval
  const handleApproveSubmission = (submissionId: string, remarks: string) => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id === submissionId) {
          return {
            ...sub,
            status: 'approved',
            statusText: 'অনুমোদিত ✓',
            approvedBy: millConfig.ownerName,
            approvedTime: new Date().toLocaleTimeString('bn-BD', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            bossRemarks: remarks,
          };
        }
        return sub;
      })
    );
  };

  // Filtered Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.date.includes(searchQuery) ||
      sub.banglaDate.includes(searchQuery);

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && sub.status === statusFilter;
  });

  // 1-Click WhatsApp Quick Generator for the top card
  const handleQuickWhatsAppCopy = () => {
    if (!latestSubmission) return;
    const msg = `🌾 *${millConfig.name} - দৈনিক হিসাব সারসংক্ষেপ*
📍 ${millConfig.location}
📅 তারিখ: ${toBengaliNumber(latestSubmission.date)} (${latestSubmission.banglaDate})
👤 জমা প্রদানকারী: ${latestSubmission.submittedBy}
────────────────────────────
⚙️ গম ভাঙানো: ${toBengaliNumber(latestSubmission.wheatUsedKg.toLocaleString())} কেজি
📦 উৎপাদিত বস্তা: আটা ${toBengaliNumber(latestSubmission.production.flourBags)}, ময়দা ${toBengaliNumber(latestSubmission.production.maidaBags)}, ভুসি ${toBengaliNumber(latestSubmission.production.branBags)}, সুজি ${toBengaliNumber(latestSubmission.production.sujiBags)}
🏭 গুদাম মোট স্টক: ${toBengaliNumber(latestSubmission.stockCount.totalStockBags)} বস্তা
────────────────────────────
💰 বস্তাভিত্তিক বিক্রয়: ${formatBengaliCurrency(latestSubmission.finances.bagSales ?? latestSubmission.finances.totalSales)}
💰 খুচরা ময়দা বিক্রয় (টাকা): ${formatBengaliCurrency(latestSubmission.finances.retailFlourSales ?? 0)}
💰 সর্বমোট বিক্রয়: ${formatBengaliCurrency(latestSubmission.finances.totalSales)}
(+) বকেয়া আদায়: ${formatBengaliCurrency(latestSubmission.finances.dueCollected)}
(-) গম ক্রয়: ${formatBengaliCurrency(latestSubmission.finances.wheatPurchaseCost)}
(-) মিলের কারখানা খরচ: ${formatBengaliCurrency(latestSubmission.finances.factoryExpenses)}
💵 *বসের টেবিলে জমা ক্যাশ: ${formatBengaliCurrency(latestSubmission.finances.netCashToBoss)}*
────────────────────────────
${latestSubmission.managerNotes ? `নোট: ${latestSubmission.managerNotes}` : ''}
_${millConfig.sidebarSlogan}_`;

    navigator.clipboard.writeText(msg);
    setCopiedQuickWhatsApp(true);
    setTimeout(() => setCopiedQuickWhatsApp(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              দৈনিক হিসাব ও স্টক খাতা (ম্যানেজার-টু-বস সাবমিশন)
            </h1>
            <span className="hidden sm:inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              রিয়েলটাইম অডিট
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            প্রতিদিনের গম ভাঙানো, গুদাম স্টক, আয়-ব্যয় এবং ক্যাশ বাক্স থেকে মালিকের নিকট হিসাব বুঝিয়ে দেওয়ার ব্যবস্থা
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleQuickWhatsAppCopy}
            className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-2xs active:scale-95 transition-all"
          >
            {copiedQuickWhatsApp ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>হোয়াটসঅ্যাপ সারাংশ</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-3.5 py-2 text-xs font-bold shadow-2xs active:scale-95 transition-all"
          >
            {isExportingPdf ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span>পিডিএফ হচ্ছে...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" />
                <span>পিডিএফ সেভ সম্পন্ন!</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 text-amber-300" />
                <span>পিডিএফ ডাউনলোড</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              printAsPdf(
                `দৈনিক_হিসাব_ও_স্টক_${dateInfo.gregorianFormatted.replace(/\//g, '-')}`,
                'daily-accounts-main-content'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-2xs active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4 text-stone-600" />
            <span>প্রিন্ট রেজিস্টার</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#0d381e] hover:bg-[#14532d] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md active:scale-95 transition-all"
          >
            <Send className="h-4 w-4 text-amber-400" />
            <span>মালিকের কাছে আজকের হিসাব জমা দিন</span>
          </button>
        </div>
      </div>

      {/* Printable Report Section */}
      <div id="daily-accounts-main-content" className="space-y-6 bg-white sm:p-2 rounded-2xl">
        {/* Letterhead shown inside generated PDF & print */}
        <div className="hidden pdf-only-block print:block border-b-2 border-[#0d381e] pb-3 text-center">
          <p className="text-[11px] font-bold text-amber-800">|| শ্রী গনেশায় নমঃ ||</p>
          <h2 className="text-xl font-black text-[#0d381e]">{millConfig.name}</h2>
          <p className="text-xs text-stone-600">{millConfig.location} | মোবাইল: {toBengaliNumber(millConfig.phone)}</p>
          <p className="mt-1 inline-block rounded bg-[#0d381e] text-white px-3 py-0.5 text-xs font-bold">
            দৈনিক হিসাব ও স্টক খাতা • তারিখ: {dateInfo.gregorianFormatted}
          </p>
        </div>
        {/* Top 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Handover Cash to Boss */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-4 sm:p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-200">মালিকের টেবিলে জমা ক্যাশ</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700/50">
              <DollarSign className="h-4 w-4 text-emerald-200" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
            {formatBengaliCurrency(latestSubmission.finances.netCashToBoss)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-300">
            <span>ক্যাশ ইন হ্যান্ড</span>
            <span>{toBengaliNumber(latestSubmission.date)}</span>
          </div>
        </div>

        {/* Card 2: Today's Total Sales & Collection */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">মোট বিক্রয় ও আদায়</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <TrendingUp className="h-4 w-4 text-[#ea7a1a]" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
            {formatBengaliCurrency(
              latestSubmission.finances.totalSales + latestSubmission.finances.dueCollected
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-stone-500">
            <span>বিক্রয়: {formatBengaliCurrency(latestSubmission.finances.totalSales)}</span>
            {latestSubmission.finances.retailFlourSales !== undefined && (
              <span className="font-bold text-amber-800">
                খুচরা ময়দা: {formatBengaliCurrency(latestSubmission.finances.retailFlourSales)}
              </span>
            )}
            <span>আদায়: {formatBengaliCurrency(latestSubmission.finances.dueCollected)}</span>
          </div>
        </div>

        {/* Card 3: Today's Expenses */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">গম ক্রয় ও মিল খরচ</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-rose-600">
            {formatBengaliCurrency(
              latestSubmission.finances.wheatPurchaseCost + latestSubmission.finances.factoryExpenses
            )}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
            <span>গম: {formatBengaliCurrency(latestSubmission.finances.wheatPurchaseCost)}</span>
            <span>অন্যান্য: {formatBengaliCurrency(latestSubmission.finances.factoryExpenses)}</span>
          </div>
        </div>

        {/* Card 4: Warehouse Total Stock */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">গুদামে অবশিষ্ট মোট স্টক</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
              <Store className="h-4 w-4 text-sky-700" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#0d381e]">
            {toBengaliNumber(latestSubmission.stockCount.totalStockBags)}{' '}
            <span className="text-sm font-semibold text-stone-600">বস্তা</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
            <span>আটা: {toBengaliNumber(latestSubmission.stockCount.flour)}</span>
            <span>ময়দা: {toBengaliNumber(latestSubmission.stockCount.maida)}</span>
            <span>ভুসি: {toBengaliNumber(latestSubmission.stockCount.bran)}</span>
          </div>
        </div>
      </div>

      {/* Production & Warehouse Stock Reconciliation Banner */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Wheat className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                দৈনিক গম ভাঙানো ও ফিনিশড স্টক রিকনসিলিয়েশন (Stock Audit)
              </h3>
              <p className="text-xs text-stone-500">
                গম ভাঙানোর পর উৎপাদিত মোট বস্তা ও গুদামে অবশিষ্ট বস্তার সমন্বয়
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
              আজকের গম ব্যবহার: {toBengaliNumber(latestSubmission.wheatUsedKg.toLocaleString())} কেজি
            </span>
          </div>
        </div>

        {/* Product Stock Table Breakdown */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Flour */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800">আটা (৫০ কেজি)</span>
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                উৎপাদন: {toBengaliNumber(latestSubmission.production.flourBags)} বস্তা
              </span>
            </div>
            <p className="text-xl font-black text-stone-900">
              {toBengaliNumber(latestSubmission.stockCount.flour)}{' '}
              <span className="text-xs font-semibold text-stone-500">বস্তা অবশিষ্ট</span>
            </p>
            <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#ea580c]" style={{ width: '65%' }} />
            </div>
          </div>

          {/* Maida */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800">ময়দা (৫০ কেজি)</span>
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                উৎপাদন: {toBengaliNumber(latestSubmission.production.maidaBags)} বস্তা
              </span>
            </div>
            <p className="text-xl font-black text-stone-900">
              {toBengaliNumber(latestSubmission.stockCount.maida)}{' '}
              <span className="text-xs font-semibold text-stone-500">বস্তা অবশিষ্ট</span>
            </p>
            <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#0d9488]" style={{ width: '75%' }} />
            </div>
          </div>

          {/* Bran */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800">ভুসি (৩৫ কেজি)</span>
              <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                উৎপাদন: {toBengaliNumber(latestSubmission.production.branBags)} বস্তা
              </span>
            </div>
            <p className="text-xl font-black text-stone-900">
              {toBengaliNumber(latestSubmission.stockCount.bran)}{' '}
              <span className="text-xs font-semibold text-stone-500">বস্তা অবশিষ্ট</span>
            </p>
            <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#0284c7]" style={{ width: '50%' }} />
            </div>
          </div>

          {/* Suji */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800">সুজি (৫০ কেজি)</span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                উৎপাদন: {toBengaliNumber(latestSubmission.production.sujiBags)} বস্তা
              </span>
            </div>
            <p className="text-xl font-black text-stone-900">
              {toBengaliNumber(latestSubmission.stockCount.suji)}{' '}
              <span className="text-xs font-semibold text-stone-500">বস্তা অবশিষ্ট</span>
            </p>
            <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#7e22ce]" style={{ width: '40%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Submissions History Table Section */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-stone-200 bg-stone-50/60">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-800" />
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">
              ম্যানেজারের দৈনিক হিসাব দাখিলের ইতিহাস ও বসের অনুমোদন খাতা
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="তারিখ বা নাম খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white pl-8 pr-3 py-1.5 text-xs text-stone-800 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                সকল
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                অপেক্ষমাণ
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                অনুমোদিত
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-stone-800">
            <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">তারিখ ও সময়</th>
                <th className="px-4 py-3">হিসাব জমাদানকারী</th>
                <th className="px-4 py-3 text-right">গম ব্যবহার</th>
                <th className="px-4 py-3 text-right">উৎপাদিত বস্তা</th>
                <th className="px-4 py-3 text-right">গুদামে অবশিষ্ট</th>
                <th className="px-4 py-3 text-right">মালিকের হাতে ক্যাশ</th>
                <th className="px-4 py-3 text-center">অবস্থা</th>
                <th className="px-4 py-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    কোনো হিসাব সাবমিশন পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isApproved = sub.status === 'approved';
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedSubmissionForReview(sub);
                        setIsReviewModalOpen(true);
                      }}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-stone-900">{toBengaliNumber(sub.date)}</div>
                        <div className="text-[11px] text-stone-500">{sub.time} | {sub.banglaDate}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-stone-800 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-stone-400" />
                          <span>{sub.submittedBy}</span>
                        </div>
                        <div className="text-[11px] text-stone-500">{sub.designation}</div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-stone-800">
                        {toBengaliNumber(sub.wheatUsedKg.toLocaleString())} কেজি
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bold text-sky-900">
                          {toBengaliNumber(
                            sub.production.flourBags +
                              sub.production.maidaBags +
                              sub.production.branBags +
                              sub.production.sujiBags
                          )}{' '}
                          বস্তা
                        </span>
                        <div className="text-[10px] text-stone-500">
                          (আটা {toBengaliNumber(sub.production.flourBags)}, ময়দা {toBengaliNumber(sub.production.maidaBags)})
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="font-extrabold text-stone-900">
                          {toBengaliNumber(sub.stockCount.totalStockBags)} বস্তা
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="font-black text-emerald-800 text-sm">
                          {formatBengaliCurrency(sub.finances.netCashToBoss)}
                        </span>
                        <div className="text-[10px] text-stone-500">
                          বিক্রয়: {formatBengaliCurrency(sub.finances.totalSales)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {sub.statusText}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubmissionForReview(sub);
                            setIsReviewModalOpen(true);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold shadow-2xs transition-all active:scale-95 ${
                            isApproved
                              ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                              : 'bg-[#15803d] text-white hover:bg-[#166534]'
                          }`}
                        >
                          {isApproved ? 'রিভিউ দেখুন' : 'যাচাই ও অনুমোদন'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600 gap-2">
          <span>
            সর্বমোট <strong>{toBengaliNumber(submissions.length)}</strong> টি দৈনিক হিসাব সাবমিশন সংরক্ষিত
          </span>
          <span className="text-stone-500">
            টিপস: যেকোনো সারিতে ক্লিক করে বিস্তারিত ভাউচার প্রিন্ট বা বসের অনুমোদন মন্তব্য দিন
          </span>
        </div>
      </div>
      </div>

      {/* Daily Submission Modal for Manager */}
      <DailySubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitReport={handleAddNewSubmission}
      />

      {/* Boss Review & Approval Modal */}
      <BossReviewModal
        submission={selectedSubmissionForReview}
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedSubmissionForReview(null);
        }}
        onApprove={handleApproveSubmission}
      />
    </div>
  );
};
