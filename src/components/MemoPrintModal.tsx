import React, { useState } from 'react';
import { X, Printer, FileDown, Check, ShieldAlert } from 'lucide-react';
import { toBengaliNumber, formatBengaliCurrency, getFormattedHeaderDate } from '../lib/bengaliUtils';
import { millConfig } from '../data/mock';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import { MemoData, isRetailFlourItem } from '../context/SalesContext';

export type { MemoData };

interface MemoPrintModalProps {
  memo: MemoData | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenGatePass?: () => void;
}

export const MemoPrintModal: React.FC<MemoPrintModalProps> = ({
  memo,
  isOpen,
  onClose,
  onOpenGatePass,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen || !memo) return null;

  const dateInfo = getFormattedHeaderDate();

  const bagItems = memo.items.filter((it) => !isRetailFlourItem(it));
  const retailItems = memo.items.filter((it) => isRetailFlourItem(it));

  const bagCount = bagItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const effectiveBagCount = memo.bagCount || bagCount;
  const bagBasedTotal = bagItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  const retailFlourTotal = retailItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  const productTotal = bagBasedTotal + retailFlourTotal;
  const discount = Number(memo.discount || 0);
  const transportCost = Number(memo.transportCost || 0);
  const grandTotal = Math.max(0, productTotal + transportCost - discount);
  const paidAmount = Number(memo.paidAmount || 0);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const success = await exportElementToPdf('printable-memo', {
        filename: `মা_ফ্লাওয়ার_মিল_ক্রেতার_মেমো_${memo.memoNo}_${memo.customerName.replace(/\s+/g, '_')}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200 my-auto max-h-[94vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0d381e] px-5 py-3 text-white shrink-0 print:hidden">
          <span className="font-bold text-sm">ক্রেতার মেমো / ক্যাশ মেমো (Customer Memo)</span>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenGatePass && effectiveBagCount > 0 && memo.status !== 'draft' && (
              <button
                onClick={onOpenGatePass}
                className="flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 px-3 py-1.5 text-xs font-bold text-white transition-all"
              >
                <span>গেট পাস পিডিএফ</span>
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-2xs active:scale-95"
            >
              {isExporting ? (
                <>
                  <span className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin" />
                  <span>পিডিএফ হচ্ছে...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-200" />
                  <span>ডাউনলোড সম্পন্ন!</span>
                </>
              ) : (
                <>
                  <FileDown className="h-3.5 w-3.5 text-amber-300" />
                  <span>ক্রেতার মেমো পিডিএফ</span>
                </>
              )}
            </button>

            <button
              onClick={() => printAsPdf(`ক্রেতার_মেমো_${memo.memoNo}`, 'printable-memo')}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-stone-900 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>প্রিন্ট</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-emerald-200 hover:bg-emerald-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Customer Memo Voucher */}
        <div className="overflow-y-auto flex-1">
          <div id="printable-memo" className="p-6 text-stone-800 text-xs sm:text-sm bg-white">
            {/* Memo Mill Header */}
            <div className="border-b-2 border-stone-800 pb-3 text-center">
              <div className="flex justify-center mb-1">
                <span className="text-[11px] font-bold tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                  || শ্রী গনেশায় নমঃ ||
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#0d381e] tracking-tight">
                {millConfig.name}
              </h1>
              <p className="text-xs font-bold text-amber-700">{millConfig.tagline}</p>
              <p className="text-[11px] text-stone-600 mt-0.5">
                {millConfig.location} | মোবাইল: {toBengaliNumber(millConfig.phone)}
              </p>
              {memo.status === 'draft' && (
                <div className="mt-2 inline-block rounded bg-amber-100 border border-amber-400 px-3 py-0.5 text-[11px] font-black text-amber-900">
                  খসড়া মেমো (DRAFT MEMO)
                </div>
              )}
            </div>

            {memo.testerTag && (
              <div className="mt-2 flex items-center justify-center gap-1.5 rounded border border-sky-300 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-900">
                <ShieldAlert className="h-3.5 w-3.5 text-sky-700" />
                <span>{memo.testerTag}</span>
              </div>
            )}

            {/* Customer & Memo Metadata */}
            <div className="grid grid-cols-2 gap-4 py-3 border-b border-stone-200 text-xs">
              <div className="space-y-0.5">
                <p>
                  <span className="font-bold text-stone-900">ক্রেতার নাম:</span> {memo.customerName}
                </p>
                {memo.customerPhone && (
                  <p>
                    <span className="font-bold text-stone-900">মোবাইল:</span>{' '}
                    {toBengaliNumber(memo.customerPhone)}
                  </p>
                )}
                {memo.customerAddress && (
                  <p>
                    <span className="font-bold text-stone-900">ঠিকানা:</span> {memo.customerAddress}
                  </p>
                )}
                <p>
                  <span className="font-bold text-stone-900">পেমেন্ট মাধ্যম:</span>{' '}
                  {memo.paymentMethod === 'Bank'
                    ? 'ব্যাংক'
                    : memo.paymentMethod === 'Due'
                    ? 'বাকি (Due)'
                    : memo.paymentMethod === 'Other'
                    ? 'অন্যান্য'
                    : 'নগদ (Cash)'}
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <p>
                  <span className="font-bold text-stone-900">মেমো / চালান নং:</span> #
                  {toBengaliNumber(memo.memoNo)}
                </p>
                <p>
                  <span className="font-bold text-stone-900">তারিখ ও সময়:</span>{' '}
                  {toBengaliNumber(memo.date)} {memo.time ? `(${toBengaliNumber(memo.time)})` : ''}
                </p>
                {memo.gatePassNo && (
                  <p className="text-[11px] font-bold text-sky-700">
                    গেট পাস নং: {memo.gatePassNo}
                  </p>
                )}
                <p className="text-[10px] text-stone-500">{dateInfo.banglaFormatted}</p>
              </div>
            </div>

            {/* Bag-Based Items Table */}
            {bagItems.length > 0 && (
              <div className="py-3">
                <p className="text-[11px] font-bold text-stone-600 mb-1.5">বস্তাভিত্তিক পণ্য বিবরণ:</p>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-y border-stone-300 bg-stone-100 font-bold text-stone-800">
                      <th className="py-2 px-2 text-center w-8">নং</th>
                      <th className="py-2 px-2">পণ্যের নাম</th>
                      <th className="py-2 px-2 text-center">বস্তা সংখ্যা</th>
                      <th className="py-2 px-2 text-right">বস্তা প্রতি দর</th>
                      <th className="py-2 px-2 text-right">মোট (টাকা)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {bagItems.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 px-2 text-center font-bold text-stone-500">
                          {toBengaliNumber(idx + 1)}
                        </td>
                        <td className="py-2 px-2 font-bold text-stone-900">{item.product}</td>
                        <td className="py-2 px-2 text-center font-medium">
                          {toBengaliNumber(item.quantity)} {item.unit}
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {formatBengaliCurrency(item.rate)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-stone-900">
                          {formatBengaliCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-stone-300 bg-stone-50/80 font-bold text-stone-800">
                      <td colSpan={2} className="py-1.5 px-2 text-right">
                        মোট বস্তা (খুচরা ময়দা ব্যতীত):
                      </td>
                      <td className="py-1.5 px-2 text-center text-[#0d381e]">
                        {toBengaliNumber(bagCount)} বস্তা
                      </td>
                      <td className="py-1.5 px-2 text-right">পণ্য উপ-মোট:</td>
                      <td className="py-1.5 px-2 text-right">
                        {formatBengaliCurrency(bagBasedTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Retail Flour (খুচরা ময়দা) Separate Section */}
            {retailItems.length > 0 && (
              <div className="py-2.5 my-2 rounded-lg border border-amber-300 bg-amber-50/60 px-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-1.5 mb-2">
                  <span className="text-xs font-extrabold text-amber-950">
                    খুচরা ময়দা বিক্রয় বিবরণ (সরাসরি টাকা — বস্তা গণনায় যুক্ত নয়)
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    ০ বস্তা
                  </span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <tbody className="divide-y divide-amber-200/60">
                    {retailItems.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-1.5 pr-2 font-bold text-stone-500 w-7">
                          {toBengaliNumber(idx + 1)}.
                        </td>
                        <td className="py-1.5 font-bold text-stone-900">
                          খুচরা ময়দা
                          {item.note ? (
                            <span className="font-normal text-stone-600 ml-1.5">({item.note})</span>
                          ) : null}
                        </td>
                        <td className="py-1.5 text-right font-extrabold text-amber-950">
                          {formatBengaliCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-amber-300 font-bold text-amber-950">
                      <td colSpan={2} className="pt-1.5 text-right pr-3">
                        মোট খুচরা ময়দা:
                      </td>
                      <td className="pt-1.5 text-right">{formatBengaliCurrency(retailFlourTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Calculation Summary */}
            <div className="border-t border-stone-300 pt-3 flex justify-end">
              <div className="w-72 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-700">
                  <span>মোট পণ্য মূল্য:</span>
                  <span className="font-semibold">{formatBengaliCurrency(productTotal)}</span>
                </div>
                {transportCost > 0 && (
                  <div className="flex justify-between text-stone-700">
                    <span>পরিবহন খরচ (+):</span>
                    <span className="font-semibold">{formatBengaliCurrency(transportCost)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>ছাড় / ডিসকাউন্ট (−):</span>
                    <span className="font-semibold">− {formatBengaliCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-stone-900 text-sm border-t border-stone-200 pt-1">
                  <span>সর্বমোট বিল (Grand Total):</span>
                  <span>{formatBengaliCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>নগদ / পরিশোধিত (Paid):</span>
                  <span>{formatBengaliCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-600 border-t border-dashed border-stone-300 pt-1">
                  <span>বকেয়া (Due):</span>
                  <span>{formatBengaliCurrency(dueAmount)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-[11px] font-semibold text-stone-600">
              <div>
                <div className="border-t border-stone-400 mx-auto w-36 pt-1" />
                <span>ক্রেতার স্বাক্ষর</span>
              </div>
              <div>
                <div className="border-t border-stone-400 mx-auto w-40 pt-1" />
                <span>মিল অনুমোদিত স্বাক্ষর ({memo.createdBy || 'মা ফ্লাওয়ার মিল'})</span>
              </div>
            </div>

            <div className="text-center mt-6 pt-2 border-t border-stone-100 text-[10px] text-stone-500">
              ধন্যবাদ, আবার আসবেন। সঠিক ওজনে মানসম্মত আটাই আমাদের অঙ্গীকার।
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
