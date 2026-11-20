import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  BarChart3,
  FileDown,
  Printer,
  Calendar,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import { millConfig } from '../data/mock';

interface DailyReportData {
  date: string;
  openingCashBalance: number;
  wheatPurchaseKg: number;
  wheatPurchaseCost: number;
  wheatSupplierPayments: number;
  totalGrindingKg: number;
  productionSummary: {
    totalBags: number;
    atta: number;
    maida: number;
    bran: number;
    suji: number;
  };
  productWiseSales: Array<{ product: string; bags: number; amount: number }>;
  bagBasedSales?: number;
  totalBagsSold?: number;
  transportTotal?: number;
  discountTotal?: number;
  retailFlourSales: number;
  totalSalesAmount: number;
  cashSales: number;
  bankSales: number;
  dueSales: number;
  customerPaymentsReceived: number;
  totalSupplierPayments: number;
  totalDailyExpenses: number;
  vouchers: Array<{
    voucherNo: string;
    category: string;
    description: string;
    amount: number;
    paymentMethod: string;
    status: string;
    approvedBy?: string;
  }>;
  approvedVouchersCount: number;
  pendingVouchersCount: number;
  rejectedVouchersCount: number;
  pendingExpensesTotal: number;
  bankSummary: {
    depositTotal: number;
    withdrawTotal: number;
    chargesTotal: number;
    transactionsCount: number;
  };
  employeeTransactions: Array<{
    employeeName: string;
    designation: string;
    type: string;
    amount: number;
    note: string;
  }>;
  cashReceived: number;
  cashPaid: number;
  closingCashBalance: number;
  customerDueSummary: {
    totalDue: number;
    topCustomers: Array<{ id: string; shop_name: string; name: string; phone: string; current_due: number }>;
  };
  supplierDueSummary: {
    totalDue: number;
    topSuppliers: Array<{ id: string; name: string; supplier_type: string; phone: string; current_due: number }>;
  };
  stockSummary: Array<{
    id: string;
    name: string;
    category: string;
    stock: number;
    unit: string;
    unitPrice: number;
    godown: string;
  }>;
  profitLossSummary: {
    calculable: boolean;
    revenue: number;
    grindingWheatCost: number;
    approvedExpenses: number;
    bankCharges: number;
    netProfitLoss: number | null;
  };
}

function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [isoDate, setIsoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const dmy = isoToDMY(isoDate);
      const res = await apiFetch<DailyReportData>(`/api/reports/daily?date=${encodeURIComponent(dmy)}`);
      setReport(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'দৈনিক রিপোর্ট লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [isoDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrintFullPdf = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      await exportElementToPdf('full-daily-report-pdf', {
        filename: `Full_Daily_Report_${report.date.replace(/\//g, '-')}`,
        orientation: 'portrait',
        scale: 2,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Controls */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs print:hidden">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
          <NavLink to="/" className="hover:text-emerald-800">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">দৈনিক পূর্ণাঙ্গ রিপোর্ট</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                দৈনিক পূর্ণাঙ্গ ব্যবসায়িক রিপোর্ট (All-in-One)
              </h1>
              <p className="text-xs sm:text-sm text-stone-500">
                ২৭টি আর্থিক, উৎপাদন, মজুদ, ব্যাংক, খরচের ভাউচার এবং বকেয়া বিবরণী সহ এক ক্লিকে A4 বাংলা PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <input
                type="date"
                value={isoDate}
                onChange={(e) => setIsoDate(e.target.value)}
                className="bg-transparent font-bold text-stone-800 focus:outline-hidden"
              />
            </div>
            <button
              onClick={loadReport}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
            <button
              onClick={handlePrintFullPdf}
              disabled={isExporting || !report}
              className="flex items-center gap-2 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] text-white px-4 py-2 text-xs font-bold shadow-sm disabled:opacity-50"
            >
              <FileDown className="h-4 w-4 text-amber-300" />
              <span>{isExporting ? 'PDF তৈরি হচ্ছে...' : 'Print Full Daily Report PDF'}</span>
            </button>
            <button
              onClick={() =>
                report && printAsPdf(`Full_Daily_Report_${report.date}`, 'full-daily-report-pdf')
              }
              disabled={!report}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>প্রিন্ট</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Printable A4 Bengali Full Daily Report Document */}
      {report && (
        <div
          id="full-daily-report-pdf"
          className="mx-auto max-w-4xl rounded-xl border border-stone-300 bg-white p-6 sm:p-8 shadow-sm text-stone-900 text-xs"
        >
          {/* Letterhead */}
          <div className="text-center border-b-2 border-[#0d381e] pb-4 mb-5">
            <p className="text-[11px] font-semibold text-stone-500">|| শ্রী গনেশায় নমঃ ||</p>
            <h2 className="text-2xl font-black text-[#0d381e] tracking-tight">{millConfig.name}</h2>
            <p className="text-xs text-stone-600">{millConfig.location} • মোবাইল: {millConfig.phone}</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded bg-[#0d381e] text-white px-4 py-1 text-xs font-bold">
              <span>দৈনিক পূর্ণাঙ্গ সমন্বিত রিপোর্ট (Daily All-in-One Report)</span>
              <span>•</span>
              <span>তারিখ: {toBengaliNumber(report.date)}</span>
            </div>
          </div>

          {/* Section 1: Cash & Financial Summary (Items 1, 9-15, 21-23) */}
          <div className="mb-5">
            <h3 className="bg-[#0d381e] text-white px-3 py-1.5 font-bold rounded-t text-xs">
              ১. নগদ ক্যাশ ও দৈনিক বিক্রয়-খরচ সারসংক্ষেপ
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 border border-t-0 border-stone-300 divide-y sm:divide-y-0 sm:divide-x divide-stone-300">
              <div className="p-2.5">
                <p className="text-[11px] text-stone-500">প্রারম্ভিক ক্যাশ ব্যালেন্স</p>
                <p className="text-sm font-black text-stone-900">{formatBengaliCurrency(report.openingCashBalance)}</p>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] text-stone-500">মোট ক্যাশ গ্রহণ (Cash Received)</p>
                <p className="text-sm font-black text-emerald-700">{formatBengaliCurrency(report.cashReceived)}</p>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] text-stone-500">মোট ক্যাশ প্রদান (Cash Paid)</p>
                <p className="text-sm font-black text-rose-700">{formatBengaliCurrency(report.cashPaid)}</p>
              </div>
              <div className="p-2.5 bg-amber-50/70">
                <p className="text-[11px] text-amber-900 font-bold">সমাপনী ক্যাশ ব্যালেন্স (Closing)</p>
                <p className="text-sm font-black text-[#0d381e]">{formatBengaliCurrency(report.closingCashBalance)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 border border-t-0 border-stone-300 divide-y sm:divide-y-0 sm:divide-x divide-stone-300 bg-stone-50/50">
              <div className="p-2.5">
                <p className="text-[11px] text-stone-500">মোট বিক্রয়</p>
                <p className="font-black text-stone-900">{formatBengaliCurrency(report.totalSalesAmount)}</p>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] text-stone-500">নগদ / ব্যাংক / বাকি বিক্রয়</p>
                <p className="font-bold text-stone-800">
                  {formatBengaliCurrency(report.cashSales)} / {formatBengaliCurrency(report.bankSales)} /{' '}
                  <span className="text-rose-700">{formatBengaliCurrency(report.dueSales)}</span>
                </p>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] text-stone-500">ক্রেতা বকেয়া আদায় / সরবরাহকারী পেমেন্ট</p>
                <p className="font-bold text-stone-800">
                  {formatBengaliCurrency(report.customerPaymentsReceived)} / {formatBengaliCurrency(report.totalSupplierPayments)}
                </p>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] text-stone-500">দৈনিক অনুমোদিত খরচ</p>
                <p className="font-black text-rose-700">{formatBengaliCurrency(report.totalDailyExpenses)}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Wheat Purchase, Grinding & Production (Items 2-7) */}
          <div className="mb-5">
            <h3 className="bg-[#0d381e] text-white px-3 py-1.5 font-bold rounded-t text-xs">
              ২. গম ক্রয় (কেজি), ভাঙানো ও বস্তা উৎপাদন সারসংক্ষেপ
            </h3>
            <table className="w-full border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100">
                  <th className="border border-stone-300 p-2 text-left">গম ক্রয় (কেজি)</th>
                  <th className="border border-stone-300 p-2 text-right">গম ক্রয় মূল্য</th>
                  <th className="border border-stone-300 p-2 text-right">সরবরাহকারী পরিশোধ</th>
                  <th className="border border-stone-300 p-2 text-right">মোট ভাঙানো (কেজি)</th>
                  <th className="border border-stone-300 p-2 text-right">মোট উৎপাদন (বস্তা)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold">
                  <td className="border border-stone-300 p-2">{toBengaliNumber(report.wheatPurchaseKg)} কেজি</td>
                  <td className="border border-stone-300 p-2 text-right">{formatBengaliCurrency(report.wheatPurchaseCost)}</td>
                  <td className="border border-stone-300 p-2 text-right">{formatBengaliCurrency(report.wheatSupplierPayments)}</td>
                  <td className="border border-stone-300 p-2 text-right">{toBengaliNumber(report.totalGrindingKg)} কেজি</td>
                  <td className="border border-stone-300 p-2 text-right text-emerald-800">
                    {toBengaliNumber(report.productionSummary.totalBags)} বস্তা
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="grid grid-cols-4 border border-t-0 border-stone-300 bg-stone-50 text-center">
              <div className="p-2 border-r border-stone-300">
                <span className="text-stone-500 block text-[11px]">আটা (বস্তা)</span>
                <span className="font-black text-stone-900">{toBengaliNumber(report.productionSummary.atta)} বস্তা</span>
              </div>
              <div className="p-2 border-r border-stone-300">
                <span className="text-stone-500 block text-[11px]">ময়দা (বস্তা)</span>
                <span className="font-black text-stone-900">{toBengaliNumber(report.productionSummary.maida)} বস্তা</span>
              </div>
              <div className="p-2 border-r border-stone-300">
                <span className="text-stone-500 block text-[11px]">ভুসি (বস্তা)</span>
                <span className="font-black text-stone-900">{toBengaliNumber(report.productionSummary.bran)} বস্তা</span>
              </div>
              <div className="p-2">
                <span className="text-stone-500 block text-[11px]">সুজি (বস্তা)</span>
                <span className="font-black text-stone-900">{toBengaliNumber(report.productionSummary.suji)} বস্তা</span>
              </div>
            </div>
          </div>

          {/* Section 3: Product-wise Sales (Item 8 + Retail Flour) */}
          <div className="mb-5">
            <h3 className="bg-[#0d381e] text-white px-3 py-1.5 font-bold rounded-t text-xs">
              ৩. পণ্যভিত্তিক বিক্রয় তালিকা (বস্তাভিত্তিক ও খুচরা ময়দা সহ)
            </h3>
            <table className="w-full border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100">
                  <th className="border border-stone-300 p-2 text-left">পণ্যের নাম</th>
                  <th className="border border-stone-300 p-2 text-right">বস্তা</th>
                  <th className="border border-stone-300 p-2 text-right">বিক্রয় মূল্য (৳)</th>
                </tr>
              </thead>
              <tbody>
                {report.productWiseSales.map((ps, idx) => (
                  <tr key={idx}>
                    <td className="border border-stone-300 p-2 font-semibold">{ps.product}</td>
                    <td className="border border-stone-300 p-2 text-right">
                      {ps.bags > 0 ? `${toBengaliNumber(ps.bags)} বস্তা` : '—'}
                    </td>
                    <td className="border border-stone-300 p-2 text-right font-bold">{formatBengaliCurrency(ps.amount)}</td>
                  </tr>
                ))}
                {report.productWiseSales.length === 0 && report.retailFlourSales === 0 && (
                  <tr>
                    <td colSpan={3} className="border border-stone-300 p-3 text-center text-stone-400">
                      নির্বাচিত তারিখে কোনো সম্পন্ন বিক্রয় মেমো পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
                {report.retailFlourSales > 0 && (
                  <tr className="bg-amber-50/70 font-bold">
                    <td className="border border-stone-300 p-2">আলাদাভাবে খুচরা ময়দা বিক্রয় (Retail Flour)</td>
                    <td className="border border-stone-300 p-2 text-right text-amber-800">০ বস্তা (টাকা ভিত্তিক)</td>
                    <td className="border border-stone-300 p-2 text-right">{formatBengaliCurrency(report.retailFlourSales)}</td>
                  </tr>
                )}
                {(Number(report.transportTotal) > 0 || Number(report.discountTotal) > 0) && (
                  <tr className="bg-stone-50 text-[11px]">
                    <td className="border border-stone-300 p-2" colSpan={2}>
                      পরিবহন (+) {formatBengaliCurrency(Number(report.transportTotal || 0))} / ছাড় (−){' '}
                      {formatBengaliCurrency(Number(report.discountTotal || 0))}
                    </td>
                    <td className="border border-stone-300 p-2 text-right font-semibold">
                      {formatBengaliCurrency(Number(report.transportTotal || 0) - Number(report.discountTotal || 0))}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-stone-100 font-black">
                  <td className="border border-stone-300 p-2">মোট বিক্রয় সারসংক্ষেপ</td>
                  <td className="border border-stone-300 p-2 text-right">
                    {toBengaliNumber(
                      report.totalBagsSold ?? report.productWiseSales.reduce((s, p) => s + p.bags, 0)
                    )}{' '}
                    বস্তা
                  </td>
                  <td className="border border-stone-300 p-2 text-right text-[#0d381e]">
                    {formatBengaliCurrency(report.totalSalesAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 4: Expense Vouchers & Bank Summary (Items 16-20) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <h3 className="bg-[#0d381e] text-white px-3 py-1.5 font-bold rounded-t text-xs">
                ৪. খরচের ভাউচার (অনুমোদিত: {toBengaliNumber(report.approvedVouchersCount)}, অপেক্ষমাণ:{' '}
                {toBengaliNumber(report.pendingVouchersCount)}
                {report.rejectedVouchersCount > 0 ? `, প্রত্যাখ্যাত: ${toBengaliNumber(report.rejectedVouchersCount)}` : ''})
              </h3>
              <table className="w-full border-collapse border border-stone-300">
                <thead>
                  <tr className="bg-stone-100">
                    <th className="border border-stone-300 p-1.5 text-left">ভাউচার, খাত ও বিবরণ</th>
                    <th className="border border-stone-300 p-1.5 text-center">অবস্থা</th>
                    <th className="border border-stone-300 p-1.5 text-right">টাকা</th>
                  </tr>
                </thead>
                <tbody>
                  {report.vouchers.map((v, i) => (
                    <tr key={i}>
                      <td className="border border-stone-300 p-1.5">
                        <div>
                          <span className="font-mono font-bold">{v.voucherNo}</span> — {v.category}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {v.description} ({v.paymentMethod})
                          {v.approvedBy ? ` • অনুমোদন: ${v.approvedBy}` : ''}
                        </div>
                      </td>
                      <td className="border border-stone-300 p-1.5 text-center">
                        {v.status === 'approved' ? 'অনুমোদিত' : v.status === 'pending' ? 'অপেক্ষমাণ' : 'প্রত্যাখ্যাত'}
                      </td>
                      <td className="border border-stone-300 p-1.5 text-right font-bold">{formatBengaliCurrency(v.amount)}</td>
                    </tr>
                  ))}
                  {report.vouchers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="border border-stone-300 p-3 text-center text-stone-400">
                        কোনো ভাউচার নেই।
                      </td>
                    </tr>
                  )}
                </tbody>
                {report.pendingExpensesTotal > 0 && (
                  <tfoot>
                    <tr className="bg-amber-50 text-[11px] font-bold">
                      <td colSpan={2} className="border border-stone-300 p-1.5">অপেক্ষমাণ ভাউচার মোট:</td>
                      <td className="border border-stone-300 p-1.5 text-right text-amber-900">
                        {formatBengaliCurrency(report.pendingExpensesTotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div>
              <h3 className="bg-[#0d381e] text-white px-3 py-1.5 font-bold rounded-t text-xs">
                ৫. ব্যাংক জমা, উত্তোলন, চার্জ ও কর্মচারী লেনদেন
              </h3>
              <table className="w-full border-collapse border border-stone-300 mb-3">
                <tbody>
                  <tr>
                    <td className="border border-stone-300 p-2 font-semibold">ব্যাংক জমা (Deposit)</td>
                    <td className="border border-stone-300 p-2 text-right font-bold text-emerald-700">
                      {formatBengaliCurrency(report.bankSummary.depositTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-stone-300 p-2 font-semibold">ব্যাংক উত্তোলন (Withdraw)</td>
                    <td className="border border-stone-300 p-2 text-right font-bold text-amber-800">
                      {formatBengaliCurrency(report.bankSummary.withdrawTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-stone-300 p-2 font-semibold">মোট ব্যাংক চার্জ</td>
                    <td className="border border-stone-300 p-2 text-right font-bold text-rose-700">
                      {formatBengaliCurrency(report.bankSummary.chargesTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-stone-300 rounded overflow-hidden">
                <div className="bg-stone-100 px-2.5 py-1 font-bold text-[11px] border-b border-stone-300">
                  কর্মচারী দৈনিক লেনদেন ({toBengaliNumber(report.employeeTransactions.length)} টি)
                </div>
                {report.employeeTransactions.length > 0 ? (
                  <div className="divide-y divide-stone-200">
                    {report.employeeTransactions.map((e, i) => (
                      <div key={i} className="flex justify-between px-2.5 py-1.5 text-[11px]">
                        <span>
                          {e.employeeName} ({e.designation} • {e.type})
                          {e.note ? ` — ${e.note}` : ''}
                        </span>
                        <span className="font-bold shrink-0">{formatBengaliCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-2.5 text-center text-stone-400 text-[11px]">কর্মচারী লেনদেন নেই।</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 6: Customer & Supplier Due Summary (Items 24-25) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <h3 className="bg-[#0d381e] text-white px-3 py-1.5 font-bold rounded-t text-xs flex justify-between">
                <span>৬. ক্রেতা বকেয়া সারসংক্ষেপ</span>
                <span>মোট: {formatBengaliCurrency(report.customerDueSummary.totalDue)}</span>
              </h3>
              <table className="w-full border-collapse border border-stone-300">
                <tbody>
                  {report.customerDueSummary.topCustomers.slice(0, 6).map((c) => (
                    <tr key={c.id}>
                      <td className="border border-stone-300 p-1.5">{c.shop_name}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-bold text-rose-700">
                        {formatBengaliCurrency(c.current_due)}
                      </td>
                    </tr>
                  ))}
                  {report.customerDueSummary.topCustomers.length === 0 && (
                    <tr><td colSpan={2} className="border border-stone-300 p-2 text-center text-stone-400">কোনো বকেয়া নেই।</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="bg-[#0d381e] text-white px-3 py-1.5 font-bold rounded-t text-xs flex justify-between">
                <span>৭. সরবরাহকারী পাওনা সারসংক্ষেপ</span>
                <span>মোট: {formatBengaliCurrency(report.supplierDueSummary.totalDue)}</span>
              </h3>
              <table className="w-full border-collapse border border-stone-300">
                <tbody>
                  {report.supplierDueSummary.topSuppliers.slice(0, 6).map((s) => (
                    <tr key={s.id}>
                      <td className="border border-stone-300 p-1.5">{s.name} ({s.supplier_type})</td>
                      <td className="border border-stone-300 p-1.5 text-right font-bold text-rose-700">
                        {formatBengaliCurrency(s.current_due)}
                      </td>
                    </tr>
                  ))}
                  {report.supplierDueSummary.topSuppliers.length === 0 && (
                    <tr><td colSpan={2} className="border border-stone-300 p-2 text-center text-stone-400">কোনো পাওনা নেই।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7: Current Stock Summary & Daily Profit/Loss (Items 26-27) */}
          <div className="mb-6">
            <h3 className="bg-[#0d381e] text-white px-3 py-1.5 font-bold rounded-t text-xs">
              ৮. গুদাম মজুদ স্টক ও দৈনিক লাভ-ক্ষতি বিবরণী
            </h3>
            <table className="w-full border-collapse border border-stone-300 mb-3">
              <thead>
                <tr className="bg-stone-100">
                  <th className="border border-stone-300 p-1.5 text-left">পণ্য ও গুদাম</th>
                  <th className="border border-stone-300 p-1.5 text-right">বর্তমান স্টক</th>
                  <th className="border border-stone-300 p-1.5 text-right">একক দর</th>
                  <th className="border border-stone-300 p-1.5 text-right">মোট মূল্যায়ন (৳)</th>
                </tr>
              </thead>
              <tbody>
                {report.stockSummary.map((st) => (
                  <tr key={st.id}>
                    <td className="border border-stone-300 p-1.5 font-semibold">{st.name} ({st.godown})</td>
                    <td className="border border-stone-300 p-1.5 text-right font-bold">
                      {toBengaliNumber(st.stock)} {st.unit}
                    </td>
                    <td className="border border-stone-300 p-1.5 text-right">{formatBengaliCurrency(st.unitPrice)}</td>
                    <td className="border border-stone-300 p-1.5 text-right font-bold">
                      {formatBengaliCurrency(st.stock * st.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-100 font-black">
                  <td className="border border-stone-300 p-1.5">মোট গুদাম মজুদ ও মূল্যায়ন</td>
                  <td className="border border-stone-300 p-1.5 text-right">
                    {toBengaliNumber(
                      report.stockSummary.filter((s) => s.unit === 'বস্তা').reduce((sum, s) => sum + s.stock, 0)
                    )}{' '}
                    বস্তা
                  </td>
                  <td className="border border-stone-300 p-1.5 text-right">—</td>
                  <td className="border border-stone-300 p-1.5 text-right text-[#0d381e]">
                    {formatBengaliCurrency(
                      report.stockSummary.reduce((sum, s) => sum + s.stock * s.unitPrice, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
              <p className="font-bold text-stone-800 mb-1">দৈনিক লাভ / ক্ষতি হিসাব (হিসাববিজ্ঞানের প্রকৃত তথ্যভিত্তিক):</p>
              {report.profitLossSummary.calculable && report.profitLossSummary.netProfitLoss !== null ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  <div>মোট বিক্রয়: <strong>{formatBengaliCurrency(report.profitLossSummary.revenue)}</strong></div>
                  <div>ভাঙানো গমের মূল্য: <strong>{formatBengaliCurrency(report.profitLossSummary.grindingWheatCost)}</strong></div>
                  <div>অনুমোদিত খরচ: <strong>{formatBengaliCurrency(report.profitLossSummary.approvedExpenses)}</strong></div>
                  <div>ব্যাংক চার্জ: <strong>{formatBengaliCurrency(report.profitLossSummary.bankCharges)}</strong></div>
                  <div className={`font-black ${report.profitLossSummary.netProfitLoss >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                    {report.profitLossSummary.netProfitLoss >= 0 ? 'নিট লাভ: ' : 'নিট ক্ষতি: '}
                    {formatBengaliCurrency(Math.abs(report.profitLossSummary.netProfitLoss))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-stone-600">
                  সঠিক লাভ-ক্ষতি হিসাবের জন্য নির্বাচিত তারিখে গম ভাঙানো ও বিক্রয় এন্ট্রি পূর্ণ থাকা আবশ্যক (অনুমানভিত্তিক হিসাব দেখানো হয়নি)।
                </p>
              )}
            </div>
          </div>

          {/* Bottom Signatures */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 text-center text-xs">
            <div>
              <div className="border-t border-stone-400 pt-1.5 font-bold">প্রস্তুতকারী (Prepared By)</div>
              <div className="text-[10px] text-stone-500">{user?.name}</div>
            </div>
            <div>
              <div className="border-t border-stone-400 pt-1.5 font-bold">পরীক্ষাকারী (Checked By)</div>
            </div>
            <div>
              <div className="border-t border-stone-400 pt-1.5 font-bold">মালিকের স্বাক্ষর (Owner)</div>
            </div>
            <div>
              <div className="border-t border-stone-400 pt-1.5 font-bold">তারিখ: {toBengaliNumber(report.date)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
