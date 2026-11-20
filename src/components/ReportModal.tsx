import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle, DollarSign, FileDown, Check, Coins } from 'lucide-react';
import { toBengaliNumber, formatBengaliCurrency, getFormattedHeaderDate } from '../lib/bengaliUtils';
import { millConfig } from '../data/mock';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import { useSales } from '../context/SalesContext';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/apiClient';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  const { dailySummary } = useSales();
  const { products } = useProducts();
  const { permissions } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [liveTotals, setLiveTotals] = useState<{
    expenses: number;
    customerDue: number;
    supplierDue: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || permissions.isTester) return;
    const todayDmy = new Date().toLocaleDateString('en-GB');
    apiFetch<any>(`/api/reports/daily?date=${encodeURIComponent(todayDmy)}`)
      .then((res) => {
        setLiveTotals({
          expenses: Number(res.totalDailyExpenses || 0),
          customerDue: Number(res.customerDueSummary?.totalDue ?? dailySummary.totalDueToday),
          supplierDue: Number(res.supplierDueSummary?.totalDue ?? 0),
        });
      })
      .catch(() => {
        setLiveTotals(null);
      });
  }, [isOpen, permissions.isTester, dailySummary.totalDueToday]);

  if (!isOpen) return null;

  const dateInfo = getFormattedHeaderDate();
  const totalExpenses = liveTotals ? liveTotals.expenses : 0;
  const totalDue = liveTotals ? liveTotals.customerDue : dailySummary.totalDueToday;
  const netCashIncome = Math.max(0, dailySummary.totalPaidToday - totalExpenses);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const success = await exportElementToPdf('daily-audit-report-content', {
        filename: `মা_ফ্লাওয়ার_মিল_দৈনিক_আর্থিক_রিপোর্ট_${dateInfo.gregorianFormatted.replace(/\//g, '-')}`,
      });
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-stone-200 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Grab Handle */}
        <div className="sm:hidden pt-2 pb-1 bg-[#0d381e] print:hidden">
          <div className="h-1.5 w-12 rounded-full bg-emerald-700/60 mx-auto" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between bg-[#0d381e] px-5 sm:px-6 py-3.5 sm:py-4 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">আজকের সম্পূর্ণ আর্থিক হিসাব রিপোর্ট</h2>
              <p className="text-xs text-emerald-200">{millConfig.name} - {millConfig.location}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-emerald-200 hover:bg-emerald-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Report Body */}
        <div id="daily-audit-report-content" className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-stone-800 text-sm bg-white">
          {/* Letterhead inside PDF/Print area */}
          <div className="text-center border-b-2 border-[#0d381e] pb-3">
            <p className="text-[11px] font-bold text-amber-800">|| শ্রী গনেশায় নমঃ ||</p>
            <h2 className="text-xl font-black text-[#0d381e]">{millConfig.name}</h2>
            <p className="text-xs text-stone-600">{millConfig.location} • মোবাইল: {toBengaliNumber(millConfig.phone)}</p>
            <p className="mt-1 inline-block rounded bg-[#0d381e] text-white px-3 py-0.5 text-xs font-bold">
              আজকের সম্পূর্ণ আর্থিক হিসাব রিপোর্ট
            </p>
          </div>

          {/* Date info banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-stone-50 border border-stone-200 p-3.5 text-xs text-stone-600 gap-2">
            <div>
              <span className="font-bold text-stone-900">তারিখ: </span>
              <span>{dateInfo.gregorianFormatted}</span>
            </div>
            <div>
              <span className="font-bold text-stone-900">বঙ্গাব্দ: </span>
              <span>{dateInfo.banglaFormatted}</span>
            </div>
          </div>

          {/* Key Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-center">
              <p className="text-xs text-stone-500 font-medium">মোট বিক্রয়</p>
              <p className="mt-1 text-base font-extrabold text-stone-900">
                {formatBengaliCurrency(dailySummary.totalDailySales)}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-center">
              <p className="text-xs text-stone-500 font-medium">মোট অনুমোদিত খরচ</p>
              <p className="mt-1 text-base font-extrabold text-stone-900">
                {formatBengaliCurrency(totalExpenses)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
              <p className="text-xs text-emerald-700 font-medium">আজকের নিট নগদ আয়</p>
              <p className="mt-1 text-base font-black text-emerald-700">
                {formatBengaliCurrency(netCashIncome)}
              </p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center">
              <p className="text-xs text-rose-600 font-medium">মোট ক্রেতা বকেয়া</p>
              <p className="mt-1 text-base font-black text-rose-600">
                {formatBengaliCurrency(totalDue)}
              </p>
            </div>
          </div>

          {/* Separate Sales Breakdown: Bag-based vs Retail Flour (খুচরা ময়দা) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-700" />
                <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                  দৈনিক বিক্রয় বিভাজন (বস্তাভিত্তিক ও খুচরা ময়দা)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                খুচরা ময়দা বস্তা গণনায় যুক্ত নয়
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-lg bg-white border border-stone-200 p-2.5">
                <span className="text-stone-500 block">বস্তাভিত্তিক বিক্রয়</span>
                <span className="text-sm font-black text-stone-900">
                  {formatBengaliCurrency(dailySummary.bagBasedSales)}
                </span>
                <span className="block text-[11px] text-stone-500">
                  মোট বস্তা: {toBengaliNumber(dailySummary.totalBagsSold)} বস্তা
                </span>
              </div>

              <div className="rounded-lg bg-white border border-amber-300 p-2.5">
                <span className="text-amber-800 block font-semibold">খুচরা ময়দা বিক্রয় (টাকা)</span>
                <span className="text-sm font-black text-amber-950">
                  {formatBengaliCurrency(dailySummary.retailFlourSales)}
                </span>
                <span className="block text-[11px] text-amber-700">
                  {toBengaliNumber(dailySummary.retailFlourEntryCount)} টি এন্ট্রি (০ বস্তা)
                </span>
              </div>

              <div className="rounded-lg bg-[#0d381e] text-white p-2.5">
                <span className="text-emerald-200 block font-semibold">সর্বমোট দৈনিক বিক্রয়</span>
                <span className="text-sm font-black text-white">
                  {formatBengaliCurrency(dailySummary.totalDailySales)}
                </span>
                <span className="block text-[11px] text-emerald-300">
                  বস্তা + খুচরা ময়দা
                </span>
              </div>
            </div>

            {dailySummary.todayRetailEntries.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-bold text-stone-700 mb-1">খুচরা ময়দা এন্ট্রিসমূহ:</p>
                <div className="divide-y divide-amber-200/60 rounded-lg bg-white border border-amber-200 px-3 text-xs">
                  {dailySummary.todayRetailEntries.map((rf) => (
                    <div key={`${rf.memoNo}-${rf.itemId}`} className="flex items-center justify-between py-1.5">
                      <span className="text-stone-700">
                        মেমো #{toBengaliNumber(rf.memoNo)} — {rf.note}
                      </span>
                      <span className="font-bold text-amber-950">{formatBengaliCurrency(rf.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Stock Breakdown */}
          <div>
            <h3 className="font-bold text-stone-900 text-sm mb-3">
              আজকের স্টক ও মালের বর্তমান অবস্থা (লাইভ ডাটাবেজ)
            </h3>
            <div className="overflow-hidden rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100 font-bold text-stone-700 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4">পণ্যের নাম</th>
                    <th className="py-2.5 px-4">বর্তমান মজুদ</th>
                    <th className="py-2.5 px-4">একক</th>
                    <th className="py-2.5 px-4 text-right">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {products.map((item) => {
                    const isLow = item.stock <= item.minReorderLevel;
                    return (
                      <tr key={item.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-4 font-bold text-stone-900">{item.name}</td>
                        <td className="py-2.5 px-4 font-semibold">{toBengaliNumber(item.stock)}</td>
                        <td className="py-2.5 px-4">{item.unit}</td>
                        <td className="py-2.5 px-4 text-right">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              কম মজুদ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              পর্যাপ্ত মজুদ ✓
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification Sign-off */}
          <div className="rounded-xl bg-amber-50/60 border border-amber-200/80 p-3.5 text-xs text-amber-900 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-amber-700 shrink-0" />
            <p>
              এই রিপোর্টটি স্বয়ংক্রিয়ভাবে মিলের লাইভ ডাটাবেজ এবং ক্যাশ বুক থেকে সংকলিত। সকল হিসাব সংরক্ষিত আছে।
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-200 bg-stone-50 px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-4 py-2 text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              {isExporting ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>পিডিএফ তৈরি হচ্ছে...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>পিডিএফ ডাউনলোড সম্পন্ন!</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-amber-300" />
                  <span>পিডিএফ ডাউনলোড</span>
                </>
              )}
            </button>

            <button
              onClick={() => printAsPdf(`দৈনিক_আর্থিক_রিপোর্ট_${dateInfo.gregorianFormatted}`, 'daily-audit-report-content')}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors shadow-2xs"
            >
              <Printer className="h-4 w-4" />
              <span>প্রিন্ট</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-[#0d381e] px-4 py-2 text-xs font-bold text-white hover:bg-[#134e2a] transition-colors shadow-sm"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
