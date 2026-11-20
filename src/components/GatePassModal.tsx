import React, { useState } from 'react';
import { X, Printer, FileDown, Check, ShieldCheck } from 'lucide-react';
import { toBengaliNumber } from '../lib/bengaliUtils';
import { millConfig } from '../data/mock';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import { GatePassRecord } from '../types/mill';

interface GatePassModalProps {
  gatePass: GatePassRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

// Strip any KG weight text so Gate Pass strictly shows product name & bags ONLY (never weight in KG)
function formatGatePassProductName(rawName: string): string {
  return String(rawName || '')
    .replace(/\([^)]*(কেজি|kg)[^)]*\)/gi, '')
    .replace(/[০-৯0-9.]+\s*(কেজি|kg)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const GatePassModal: React.FC<GatePassModalProps> = ({ gatePass, isOpen, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen || !gatePass) return null;

  const computedTotalBags =
    Number(gatePass.totalBags) ||
    gatePass.items.reduce((sum, it) => sum + (Number(it.bags) || 0), 0);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const success = await exportElementToPdf('printable-gate-pass', {
        filename: `মা_ফ্লাওয়ার_মিল_গেট_পাস_${gatePass.gatePassNo}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200 my-auto max-h-[94vh] flex flex-col">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-[#0d381e] px-5 py-3 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            <span className="font-bold text-sm">গেট পাস (GATE PASS) — গেট নিরাপত্তা কপি</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-1.5 text-xs font-bold text-white transition-all"
            >
              {isExporting ? (
                <span>পিডিএফ হচ্ছে...</span>
              ) : exportSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>ডাউনলোড সম্পন্ন</span>
                </>
              ) : (
                <>
                  <FileDown className="h-3.5 w-3.5 text-amber-300" />
                  <span>গেট পাস পিডিএফ</span>
                </>
              )}
            </button>

            <button
              onClick={() => printAsPdf(`গেট_পাস_${gatePass.gatePassNo}`, 'printable-gate-pass')}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-stone-900"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>প্রিন্ট</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1 text-emerald-200 hover:bg-emerald-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Gate Pass Content (STRICTLY NO KG WEIGHT, NO PRICE, NO MONEY, NO DUE) */}
        <div className="overflow-y-auto flex-1">
          <div id="printable-gate-pass" className="p-6 bg-white text-stone-900 text-xs sm:text-sm">
            {/* Mill Header */}
            <div className="border-b-2 border-stone-900 pb-3 text-center">
              <h1 className="text-2xl font-black text-[#0d381e] tracking-tight">
                {millConfig.name}
              </h1>
              <p className="text-xs font-semibold text-stone-600">
                {millConfig.location}
              </p>
              <div className="mt-2 inline-block border-2 border-stone-900 px-4 py-1 rounded font-black text-sm tracking-wide uppercase bg-stone-100">
                গেট পাস / মালামাল বহির্গমন ছাড়পত্র (GATE PASS)
              </div>
            </div>

            {/* Gate Pass Info Grid */}
            <div className="grid grid-cols-2 gap-3 py-3 border-b border-stone-300 text-xs">
              <div className="space-y-1">
                <p>
                  <span className="font-bold text-stone-700">গেট পাস নং:</span>{' '}
                  <span className="font-black text-base text-[#0d381e]">{gatePass.gatePassNo}</span>
                </p>
                {gatePass.receiverName && (
                  <p>
                    <span className="font-bold text-stone-700">গ্রহণকারী / ড্রাইভার:</span>{' '}
                    <span className="font-semibold">{gatePass.receiverName}</span>
                  </p>
                )}
                {gatePass.vehicleNumber && (
                  <p>
                    <span className="font-bold text-stone-700">গাড়ির নম্বর:</span>{' '}
                    <span className="font-semibold">{gatePass.vehicleNumber}</span>
                  </p>
                )}
              </div>
              <div className="text-right space-y-1">
                <p>
                  <span className="font-bold text-stone-700">তারিখ:</span>{' '}
                  <span className="font-semibold">{toBengaliNumber(gatePass.date)}</span>
                </p>
                <p>
                  <span className="font-bold text-stone-700">সময়:</span>{' '}
                  <span className="font-semibold">{toBengaliNumber(gatePass.time)}</span>
                </p>
                {gatePass.memoNo && (
                  <p className="text-[11px] text-stone-500">
                    রেফারেন্স নং: #{toBengaliNumber(gatePass.memoNo)}
                  </p>
                )}
              </div>
            </div>

            {gatePass.testerTag && (
              <div className="my-2 rounded border border-sky-300 bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-900 text-center">
                {gatePass.testerTag}
              </div>
            )}

            {/* Product & Bag Count ONLY Table */}
            <div className="py-3">
              <table className="w-full border-collapse border border-stone-800 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-800 font-black text-stone-900">
                    <th className="border-r border-stone-800 py-2 px-3 text-center w-12">ক্রমিক</th>
                    <th className="border-r border-stone-800 py-2 px-3 text-left">পণ্যের নাম</th>
                    <th className="py-2 px-3 text-center w-36">বস্তার সংখ্যা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {gatePass.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border-r border-stone-300 py-2.5 px-3 text-center font-bold">
                        {toBengaliNumber(idx + 1)}
                      </td>
                      <td className="border-r border-stone-300 py-2.5 px-3 font-bold text-stone-900">
                        {formatGatePassProductName(item.productName)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-base text-[#0d381e]">
                        {toBengaliNumber(item.bags)} বস্তা
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-800 bg-stone-100 font-black">
                    <td colSpan={2} className="border-r border-stone-800 py-2.5 px-3 text-right">
                      সর্বমোট বস্তার সংখ্যা:
                    </td>
                    <td className="py-2.5 px-3 text-center text-lg text-[#0d381e]">
                      {toBengaliNumber(computedTotalBags)} বস্তা
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Security Notice & Signatures */}
            <div className="mt-2 rounded bg-stone-50 border border-stone-300 px-3 py-2 text-[11px] text-stone-700 text-center">
              গেট নিরাপত্তারক্ষী অনুগ্রহ করে উপরোক্ত বস্তার সংখ্যা মিলিয়ে মিল থেকে মালামাল বহির্গমনের অনুমতি প্রদান করবেন।
            </div>

            <div className="grid grid-cols-3 gap-4 pt-12 text-center text-[11px] font-bold text-stone-700">
              <div>
                <div className="border-t border-stone-500 pt-1">গ্রহণকারীর স্বাক্ষর</div>
              </div>
              <div>
                <div className="border-t border-stone-500 pt-1">গেট নিরাপত্তারক্ষী</div>
              </div>
              <div>
                <div className="border-t border-stone-500 pt-1">
                  অনুমোদিত স্বাক্ষর
                  <span className="block font-normal text-[10px] text-stone-500 mt-0.5">
                    ({gatePass.authorizedBy})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
