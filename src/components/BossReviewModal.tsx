import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Wheat,
  Store,
  DollarSign,
  Clock,
  User,
  MessageCircle,
  FileDown,
  Check,
} from 'lucide-react';
import {
  toBengaliNumber,
  formatBengaliCurrency,
} from '../lib/bengaliUtils';
import { DailyReportSubmission, millConfig } from '../data/mock';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';

interface BossReviewModalProps {
  submission: DailyReportSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (submissionId: string, remarks: string) => void;
}

export const BossReviewModal: React.FC<BossReviewModalProps> = ({
  submission,
  isOpen,
  onClose,
  onApprove,
}) => {
  const [bossRemarks, setBossRemarks] = useState(
    submission?.bossRemarks || 'হিসাব ও গুদামের স্টক সঠিকভাবে যাচাই করা হয়েছে।'
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen || !submission) return null;

  const isApproved = submission.status === 'approved';

  const handleApproveClick = () => {
    onApprove(submission.id, bossRemarks);
    onClose();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const success = await exportElementToPdf('boss-review-voucher-card', {
        filename: `মা_ফ্লাওয়ার_মিল_হিসাব_ভাউচার_${submission.date.replace(/\//g, '-')}`,
      });
      if (success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col">
        {/* Mobile Swipe Handle */}
        <div className="sm:hidden pt-2 pb-1 bg-[#0d381e]">
          <div className="h-1.5 w-12 rounded-full bg-emerald-700/60 mx-auto" />
        </div>

        {/* Modal Top Header */}
        <div className="flex items-center justify-between bg-[#0d381e] px-5 sm:px-6 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  ম্যানেজারের দৈনিক হিসাব পর্যালোচনা ও অনুমোদন
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isApproved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-stone-900'
                  }`}
                >
                  {submission.statusText}
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                তারিখ: {toBengaliNumber(submission.date)} | বাংলা: {submission.banglaDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-200 hover:bg-emerald-900 active:scale-90 transition-all"
            aria-label="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div id="boss-review-voucher-card" className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm text-stone-800 bg-white">
          {/* Letterhead for PDF & Print */}
          <div className="border-b-2 border-[#0d381e] pb-2.5 text-center">
            <h2 className="text-lg font-black text-[#0d381e]">{millConfig.name}</h2>
            <p className="text-[11px] text-stone-600">{millConfig.location} | দৈনিক হিসাব ও স্টক ভাউচার</p>
            <p className="text-[11px] font-bold text-stone-700 mt-0.5">
              তারিখ: {toBengaliNumber(submission.date)} ({submission.banglaDate}) • অবস্থা: {submission.statusText}
            </p>
          </div>

          {/* Submission Meta Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-stone-50 border border-stone-200 p-3.5 gap-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-stone-500" />
              <span className="font-bold text-stone-900">{submission.submittedBy}</span>
              <span className="text-stone-400">({submission.designation})</span>
            </div>
            <div className="flex items-center gap-2 text-stone-500 text-xs">
              <Clock className="h-3.5 w-3.5" />
              <span>জমার সময়: {submission.time}</span>
            </div>
          </div>

          {/* 1. গম ও উৎপাদন সামারি */}
          <div className="rounded-xl border border-stone-200 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-stone-900 font-bold border-b border-stone-100 pb-1.5">
              <Wheat className="h-4 w-4 text-amber-600" />
              <span>১. কাঁচামাল ও উৎপাদন ভাউচার</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="rounded-lg bg-stone-50 p-2">
                <span className="text-stone-500 block">গম ব্যবহার</span>
                <span className="font-extrabold text-stone-900 text-sm">
                  {toBengaliNumber(submission.wheatUsedKg.toLocaleString())} কেজি
                </span>
              </div>
              <div className="rounded-lg bg-sky-50 p-2">
                <span className="text-sky-800 block font-medium">আটা উৎপাদন</span>
                <span className="font-extrabold text-sky-950 text-sm">
                  {toBengaliNumber(submission.production.flourBags)} বস্তা
                </span>
              </div>
              <div className="rounded-lg bg-purple-50 p-2">
                <span className="text-purple-800 block font-medium">ময়দা উৎপাদন</span>
                <span className="font-extrabold text-purple-950 text-sm">
                  {toBengaliNumber(submission.production.maidaBags)} বস্তা
                </span>
              </div>
              <div className="rounded-lg bg-teal-50 p-2">
                <span className="text-teal-800 block font-medium">ভুসি উৎপাদন</span>
                <span className="font-extrabold text-teal-950 text-sm">
                  {toBengaliNumber(submission.production.branBags)} বস্তা
                </span>
              </div>
              <div className="rounded-lg bg-amber-50 p-2">
                <span className="text-amber-800 block font-medium">সুজি উৎপাদন</span>
                <span className="font-extrabold text-amber-950 text-sm">
                  {toBengaliNumber(submission.production.sujiBags)} বস্তা
                </span>
              </div>
            </div>
          </div>

          {/* 2. গুদাম স্টক অডিট */}
          <div className="rounded-xl border border-stone-200 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-stone-900 font-bold border-b border-stone-100 pb-1.5">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-700" />
                <span>২. গুদামে অবশিষ্ট বস্তা গণনা (Physical Stock Count)</span>
              </div>
              <span className="font-black text-emerald-800 text-xs">
                সর্বমোট: {toBengaliNumber(submission.stockCount.totalStockBags)} বস্তা
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-stone-50 p-2 border border-stone-200">
                <span className="text-stone-500">আটা</span>
                <p className="font-black text-stone-900 text-sm">
                  {toBengaliNumber(submission.stockCount.flour)}
                </p>
              </div>
              <div className="rounded-lg bg-stone-50 p-2 border border-stone-200">
                <span className="text-stone-500">ময়দা</span>
                <p className="font-black text-stone-900 text-sm">
                  {toBengaliNumber(submission.stockCount.maida)}
                </p>
              </div>
              <div className="rounded-lg bg-stone-50 p-2 border border-stone-200">
                <span className="text-stone-500">ভুসি</span>
                <p className="font-black text-stone-900 text-sm">
                  {toBengaliNumber(submission.stockCount.bran)}
                </p>
              </div>
              <div className="rounded-lg bg-stone-50 p-2 border border-stone-200">
                <span className="text-stone-500">সুজি</span>
                <p className="font-black text-stone-900 text-sm">
                  {toBengaliNumber(submission.stockCount.suji)}
                </p>
              </div>
            </div>
          </div>

          {/* 3. আর্থিক ব্যালেন্স ও ক্যাশ জমা */}
          <div className="rounded-xl border border-stone-200 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-stone-900 font-bold border-b border-stone-100 pb-1.5">
              <DollarSign className="h-4 w-4 text-emerald-700" />
              <span>৩. আর্থিক ব্যালেন্স ও ক্যাশ টাকা</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-stone-50">
                <span className="text-stone-500 block">মোট বিক্রয়</span>
                <span className="font-bold text-stone-900">
                  {formatBengaliCurrency(submission.finances.totalSales)}
                </span>
                {submission.finances.retailFlourSales !== undefined && (
                  <div className="mt-1 text-[10px] text-stone-600 space-y-0.5 border-t border-stone-200 pt-1">
                    <div>বস্তা: {formatBengaliCurrency(submission.finances.bagSales ?? (submission.finances.totalSales - submission.finances.retailFlourSales))}</div>
                    <div className="font-bold text-amber-800">খুচরা ময়দা: {formatBengaliCurrency(submission.finances.retailFlourSales)}</div>
                  </div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900">
                <span className="block font-medium">বকেয়া আদায়</span>
                <span className="font-bold">
                  {formatBengaliCurrency(submission.finances.dueCollected)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-900">
                <span className="block font-medium">গম ক্রয় পরিশোধ</span>
                <span className="font-bold">
                  {formatBengaliCurrency(submission.finances.wheatPurchaseCost)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-900">
                <span className="block font-medium">কারখানা খরচ</span>
                <span className="font-bold">
                  {formatBengaliCurrency(submission.finances.factoryExpenses)}
                </span>
              </div>
            </div>

            {/* Net Cash Handover to Boss Highlight */}
            <div className="flex items-center justify-between rounded-xl bg-[#0d381e] p-3.5 text-white">
              <div>
                <span className="text-xs font-semibold text-emerald-200">
                  মালিকের টেবিলে জমা ক্যাশ টাকা:
                </span>
                <p className="text-2xl font-black tracking-tight">
                  {formatBengaliCurrency(submission.finances.netCashToBoss)}
                </p>
              </div>
              <span className="text-xs font-bold text-amber-300 bg-white/10 px-3 py-1 rounded-full">
                ক্যাশ অন হ্যান্ড
              </span>
            </div>
          </div>

          {/* 4. ম্যানেজারের মন্তব্য */}
          {submission.managerNotes && (
            <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-xs text-amber-950">
              <span className="font-bold">ম্যানেজারের নোট: </span>
              <span>{submission.managerNotes}</span>
            </div>
          )}

          {/* 5. Boss Approval Section */}
          <div className="rounded-xl border border-stone-300 bg-stone-50 p-4 space-y-3">
            <h4 className="font-bold text-stone-900 text-xs">
              মালিকের মূল্যায়ন ও অনুমোদন মন্তব্য:
            </h4>

            {isApproved ? (
              <div className="rounded-lg bg-emerald-100/90 border border-emerald-300 p-3 text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>হিসাবটি সফলভাবে অনুমোদিত হয়েছে</span>
                </div>
                <p className="text-xs text-emerald-800">
                  অনুমোদনকারী: {submission.approvedBy || millConfig.ownerName} ({submission.approvedTime || 'সন্ধ্যা ৮:২০'})
                </p>
                {submission.bossRemarks && (
                  <p className="text-xs italic mt-1 font-medium">"{submission.bossRemarks}"</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={bossRemarks}
                  onChange={(e) => setBossRemarks(e.target.value)}
                  placeholder="বসের মন্তব্য বা নির্দেশনা লিখুন..."
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-emerald-600 focus:outline-hidden"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-stone-500">
                    মালিকের প্রোফাইল: <strong>{millConfig.ownerName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleApproveClick}
                    className="flex items-center gap-2 rounded-xl bg-[#15803d] hover:bg-[#166534] px-5 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    <span>যাচাই ও অনুমোদন করুন ✓</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-5 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#14532d] disabled:opacity-60 text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs active:scale-95 transition-all"
            >
              {isExporting ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>পিডিএফ হচ্ছে...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span>পিডিএফ ডাউনলোড সম্পন্ন!</span>
                </>
              ) : (
                <>
                  <FileDown className="h-3.5 w-3.5 text-amber-300" />
                  <span>পিডিএফ ভাউচার ডাউনলোড</span>
                </>
              )}
            </button>

            <button
              onClick={() => printAsPdf(`হিসাব_ভাউচার_${submission.date}`, 'boss-review-voucher-card')}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-stone-600" />
              <span>প্রিন্ট</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-stone-200 hover:bg-stone-300 px-4 py-1.5 text-xs font-bold text-stone-700 transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
