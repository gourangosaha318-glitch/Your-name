import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Store,
  Plus,
  Search,
  Download,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Layers,
  DollarSign,
  Package,
  FileDown,
  History,
  SlidersHorizontal,
  X,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { useProducts, ProductItem } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';
import { AddProductModal } from '../components/AddProductModal';
import { exportElementToPdf, printAsPdf } from '../lib/pdfUtils';
import { StockHistoryRecord, StockMovementType } from '../types/mill';
import { millConfig } from '../data/mock';

function inputDateToDMY(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

export const InventoryPage: React.FC = () => {
  const { user, permissions } = useAuth();
  const { products, adjustStock, deleteProduct, fetchStockHistory, totalFinishedBags } = useProducts();

  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('সকল');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mandatory-Reason Stock Adjustment Modal State
  const [adjustTarget, setAdjustTarget] = useState<ProductItem | null>(null);
  const [adjustType, setAdjustType] = useState<StockMovementType>('Stock Added');
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState('');

  // Stock History Filter & Data State
  const [histProductId, setHistProductId] = useState<string>('all');
  const [histStartIso, setHistStartIso] = useState<string>('');
  const [histEndIso, setHistEndIso] = useState<string>('');
  const [histData, setHistData] = useState<{
    openingStock: number;
    closingStock: number;
    totalIn: number;
    totalOut: number;
    history: StockHistoryRecord[];
  }>({ openingStock: 0, closingStock: 0, totalIn: 0, totalOut: 0, history: [] });

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const showToast = (msg: string) => {
    setErrorMsg(null);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  };

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetchStockHistory({
        productId: histProductId,
        startDate: inputDateToDMY(histStartIso),
        endDate: inputDateToDMY(histEndIso),
      });
      setHistData(res);
    } catch (err: any) {
      showError(err?.message || 'স্টক ইতিহাস লোড করতে ব্যর্থ');
    }
  }, [fetchStockHistory, histProductId, histStartIso, histEndIso]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const categories = ['সকল', 'আটা', 'ময়দা', 'ভুসি', 'সুজি', 'গম', 'অন্যান্য'];

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchSearch =
        prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.godown.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'সকল' || prod.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  const lowStockCount = products.filter((p) => p.stock <= p.minReorderLevel).length;
  const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.unitPrice, 0);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    if (!adjustReason.trim()) {
      showError('স্টক পরিবর্তনের কারণ (Reason) লেখা বাধ্যতামূলক!');
      return;
    }
    const res = await adjustStock(adjustTarget.id, adjustType, Number(adjustQty), adjustReason.trim());
    if (!res.success) {
      showError(res.error || 'স্টক পরিবর্তন ব্যর্থ');
      return;
    }
    setAdjustTarget(null);
    setAdjustReason('');
    showToast(`${adjustTarget.name} এর স্টক সমন্বয় ও ইতিহাস সফলভাবে রেকর্ড হয়েছে!`);
    if (activeTab === 'history') loadHistory();
  };

  const handleDownloadCsv = () => {
    const headers = ['ক্রমিক', 'পণ্যের নাম', 'ক্যাটাগরি', 'বর্তমান মজুদ', 'একক', 'একক দর', 'মোট মূল্য', 'গুদাম'].join(',');
    const rows = filteredProducts.map((p, idx) =>
      [
        `"${toBengaliNumber(idx + 1)}"`,
        `"${p.name}"`,
        `"${p.category}"`,
        `"${toBengaliNumber(p.stock)}"`,
        `"${p.unit}"`,
        `"${toBengaliNumber(p.unitPrice)}"`,
        `"${toBengaliNumber(p.stock * p.unitPrice)}"`,
        `"${p.godown}"`,
      ].join(',')
    );
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `গুদাম_ও_স্টক_রিপোর্ট_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('স্টক এক্সেল/CSV ডাউনলোড হয়েছে!');
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const targetId = activeTab === 'history' ? 'printable-stock-history-pdf' : 'inventory-stock-report-content';
      const fname =
        activeTab === 'history'
          ? `মা_ফ্লাওয়ার_মিল_স্টক_ইতিহাস_${new Date().toISOString().slice(0, 10)}`
          : `মা_ফ্লাওয়ার_মিল_মজুদ_স্টক_${new Date().toISOString().slice(0, 10)}`;
      const success = await exportElementToPdf(targetId, { filename: fname });
      if (success) showToast('স্টক পিডিএফ সফলভাবে ডাউনলোড হয়েছে!');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const selectedHistProduct = products.find((p) => p.id === histProductId);

  const histSummaryBreakdown = useMemo(() => {
    let production = 0;
    let sales = 0;
    let adjustmentNet = 0;
    for (const h of histData.history) {
      if (h.transactionType === 'Production') production += h.stockIn;
      else if (h.transactionType === 'Sales') sales += h.stockOut;
      else if (h.transactionType !== 'Opening Stock') {
        adjustmentNet += h.stockIn - h.stockOut;
      }
    }
    return { production, sales, adjustmentNet };
  }, [histData.history]);

  return (
    <div className="space-y-5 pb-8 relative">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-white shadow-xl text-xs sm:text-sm font-bold">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <span>{toastMessage}</span>
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
          <NavLink to="/" className="hover:text-emerald-800 font-medium">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">গুদাম ও স্টক ইতিহাস</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400 shadow-sm">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                গুদাম, পণ্য মজুদ ও স্টক ইতিহাস (Stock History)
              </h1>
              <p className="text-xs sm:text-sm text-stone-500">
                প্রতিটি উৎপাদন, বিক্রয়, ক্ষতি ও সমন্বয় অটো-রেকর্ড এবং তারিখ-ভিত্তিক স্টক ইতিহাস পিডিএফ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-3.5 py-2 text-xs font-bold shadow-2xs"
            >
              <FileDown className="h-3.5 w-3.5 text-amber-300" />
              <span>
                {isExportingPdf
                  ? 'পিডিএফ হচ্ছে...'
                  : activeTab === 'history'
                  ? 'Download Stock History PDF'
                  : 'স্টক পিডিএফ ডাউনলোড'}
              </span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              <span>এক্সেল</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#ea7a1a] hover:bg-[#d96a10] px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন পণ্য যুক্ত</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${
              activeTab === 'stock' ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            বর্তমান মজুদ ও স্টক সমন্বয়
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold ${
              activeTab === 'history' ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>স্টক মুভমেন্ট ইতিহাস ও PDF</span>
          </button>
        </div>
      </div>

      {activeTab === 'stock' ? (
        <div id="inventory-stock-report-content" className="space-y-5 bg-white sm:p-2 rounded-2xl">
          {/* Letterhead shown inside exported PDF & Print */}
          <div className="hidden pdf-only-block print:block border-b-2 border-[#0d381e] pb-3 text-center">
            <p className="text-[11px] font-bold text-amber-800">|| শ্রী গনেশায় নমঃ ||</p>
            <h2 className="text-xl font-black text-[#0d381e]">{millConfig.name} — গুদাম মজুদ ও স্টক প্রতিবেদন</h2>
            <p className="text-xs text-stone-600">
              {millConfig.location} | তারিখ: {toBengaliNumber(new Date().toLocaleDateString('en-GB'))}
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">মোট ফিনিশড বস্তা</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-stone-900">
                {toBengaliNumber(totalFinishedBags)} <span className="text-xs font-semibold text-stone-500">বস্তা</span>
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">মোট পণ্য সংখ্যা</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-stone-900">
                {toBengaliNumber(products.length)} <span className="text-xs font-semibold text-stone-500">আইটেম</span>
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">কম স্টক সতর্কতা</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-amber-700">
                {toBengaliNumber(lowStockCount)} <span className="text-xs font-semibold text-stone-500">টি</span>
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">আনুমানিক স্টক মূল্য</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-stone-900">
                {formatBengaliCurrency(totalStockValue)}
              </p>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
                    selectedCategory === cat ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="পণ্য বা গুদাম খুঁজুন..."
                className="w-full rounded-lg border border-stone-300 bg-stone-50 pl-9 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 font-bold text-stone-700">
                    <th className="py-2.5 px-4 w-12 text-center">নং</th>
                    <th className="py-2.5 px-4">পণ্যের নাম</th>
                    <th className="py-2.5 px-4">ক্যাটাগরি</th>
                    <th className="py-2.5 px-4">গুদাম</th>
                    <th className="py-2.5 px-4">বর্তমান মজুদ</th>
                    <th className="py-2.5 px-4">একক দর</th>
                    <th className="py-2.5 px-4">মূল্যায়ন</th>
                    <th className="py-2.5 px-4">অবস্থা</th>
                    <th className="py-2.5 px-4 text-right">স্টক সমন্বয় / ইতিহাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredProducts.map((prod, idx) => {
                    const isLow = prod.stock <= prod.minReorderLevel;
                    return (
                      <tr key={prod.id} className="hover:bg-amber-50/30">
                        <td className="py-3 px-4 text-center font-bold text-stone-400">{toBengaliNumber(idx + 1)}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">{prod.name}</td>
                        <td className="py-3 px-4 font-semibold">{prod.category}</td>
                        <td className="py-3 px-4">{prod.godown}</td>
                        <td className="py-3 px-4 font-black text-stone-900 text-sm">
                          {toBengaliNumber(prod.stock)} {prod.unit}
                        </td>
                        <td className="py-3 px-4">{formatBengaliCurrency(prod.unitPrice)}</td>
                        <td className="py-3 px-4 font-bold">{formatBengaliCurrency(prod.stock * prod.unitPrice)}</td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                              কম স্টক
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              পর্যাপ্ত
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustTarget(prod);
                                setAdjustType('Stock Added');
                                setAdjustQty('10');
                                setAdjustReason('');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] text-white px-2.5 py-1 text-[11px] font-bold"
                            >
                              <SlidersHorizontal className="h-3 w-3" />
                              <span>সমন্বয়</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHistProductId(prod.id);
                                setActiveTab('history');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-2.5 py-1 text-[11px] font-bold"
                            >
                              <History className="h-3 w-3" />
                              <span>ইতিহাস</span>
                            </button>
                            {permissions.isOwner && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`আপনি কি নিশ্চিত যে "${prod.name}" মুছে ফেলতে চান?`)) {
                                    const res = await deleteProduct(prod.id);
                                    if (res.success) showToast(`"${prod.name}" মুছে ফেলা হয়েছে!`);
                                    else showError(res.error || 'মুছতে ব্যর্থ');
                                  }
                                }}
                                className="rounded-md border border-stone-200 p-1 text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* STOCK HISTORY VIEW & PRINTABLE PDF REPORT */
        <div className="space-y-4">
          {/* Filters */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
            <div>
              <label className="block font-bold text-stone-700 mb-1">পণ্য নির্বাচন করুন</label>
              <select
                value={histProductId}
                onChange={(e) => setHistProductId(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
              >
                <option value="all">সকল পণ্য</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">শুরুর তারিখ (Start Date)</label>
              <input
                type="date"
                value={histStartIso}
                onChange={(e) => setHistStartIso(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">শেষ তারিখ (End Date)</label>
              <input
                type="date"
                value={histEndIso}
                onChange={(e) => setHistEndIso(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadHistory}
                className="flex-1 rounded-lg bg-[#0d381e] text-white py-2 px-3 font-bold"
              >
                ফিল্টার করুন
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white py-2 px-3 font-bold"
              >
                <FileDown className="h-3.5 w-3.5 text-amber-300" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={() => printAsPdf('স্টক_ইতিহাস_রিপোর্ট', 'printable-stock-history-pdf')}
                className="flex items-center gap-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 py-2 px-2.5 font-bold"
              >
                <Printer className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Capturable A4 Printable Stock History Section */}
          <div id="printable-stock-history-pdf" className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b-2 border-stone-800 pb-3 text-center">
              <p className="text-[11px] font-bold text-amber-800">|| শ্রী গনেশায় নমঃ ||</p>
              <h2 className="text-xl font-black text-[#0d381e]">{millConfig.name} — পণ্য স্টক ইতিহাস রিপোর্ট</h2>
              <p className="text-xs text-stone-600 mt-0.5">
                {millConfig.location} | পণ্য:{' '}
                <strong>
                  {selectedHistProduct ? `${selectedHistProduct.name} (${selectedHistProduct.unit})` : 'সকল পণ্য'}
                </strong>
                {histStartIso || histEndIso
                  ? ` | সময়কাল: ${histStartIso ? toBengaliNumber(inputDateToDMY(histStartIso)) : 'শুরু'} হতে ${
                      histEndIso ? toBengaliNumber(inputDateToDMY(histEndIso)) : 'আজ'
                    }`
                  : ` | রিপোর্ট তারিখ: ${toBengaliNumber(new Date().toLocaleDateString('en-GB'))}`}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <span className="text-stone-500 block">প্রারম্ভিক মজুদ (Opening)</span>
                <span className="text-base font-black text-stone-900">
                  {toBengaliNumber(histData.openingStock)} {selectedHistProduct?.unit || 'বস্তা'}
                </span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <span className="text-emerald-800 block">মোট স্টক ইন (Production/Add)</span>
                <span className="text-base font-black text-emerald-900">
                  +{toBengaliNumber(histData.totalIn)} {selectedHistProduct?.unit || 'বস্তা'}
                </span>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <span className="text-rose-800 block">মোট স্টক আউট (Sales/Out)</span>
                <span className="text-base font-black text-rose-900">
                  −{toBengaliNumber(histData.totalOut)} {selectedHistProduct?.unit || 'বস্তা'}
                </span>
              </div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                <span className="text-amber-900 block font-semibold">সমাপনী মজুদ (Closing Stock)</span>
                <span className="text-base font-black text-amber-950">
                  {toBengaliNumber(histData.closingStock)} {selectedHistProduct?.unit || 'বস্তা'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-[11px] bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
              <div>
                <span className="text-stone-500">উৎপাদন (Production): </span>
                <strong className="text-emerald-800">+{toBengaliNumber(histSummaryBreakdown.production)}</strong>
              </div>
              <div>
                <span className="text-stone-500">বিক্রয় (Sales): </span>
                <strong className="text-sky-800">−{toBengaliNumber(histSummaryBreakdown.sales)}</strong>
              </div>
              <div>
                <span className="text-stone-500">সমন্বয়/ক্ষতি/ফেরত (Net Adj): </span>
                <strong className="text-amber-900">
                  {histSummaryBreakdown.adjustmentNet >= 0
                    ? `+${toBengaliNumber(histSummaryBreakdown.adjustmentNet)}`
                    : `−${toBengaliNumber(Math.abs(histSummaryBreakdown.adjustmentNet))}`}
                </strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-stone-300 text-xs">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-300 font-bold text-stone-800">
                    <th className="py-2 px-3 border-r border-stone-300">Date (তারিখ)</th>
                    <th className="py-2 px-3 border-r border-stone-300">পণ্য</th>
                    <th className="py-2 px-3 border-r border-stone-300">Transaction Type</th>
                    <th className="py-2 px-3 border-r border-stone-300">Reference</th>
                    <th className="py-2 px-3 border-r border-stone-300 text-right">Stock In</th>
                    <th className="py-2 px-3 border-r border-stone-300 text-right">Stock Out</th>
                    <th className="py-2 px-3 border-r border-stone-300 text-right">Balance</th>
                    <th className="py-2 px-3 border-r border-stone-300">Created By</th>
                    <th className="py-2 px-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {histData.history.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-stone-500">
                        নির্বাচিত ফিল্টারে কোনো স্টক লেনদেন পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    histData.history.map((h) => (
                      <tr key={h.id} className="hover:bg-stone-50">
                        <td className="py-2 px-3 border-r border-stone-200">
                          <div>{toBengaliNumber(h.date)}</div>
                          <div className="text-[10px] text-stone-500">{h.time}</div>
                        </td>
                        <td className="py-2 px-3 border-r border-stone-200 font-bold">{h.productName}</td>
                        <td className="py-2 px-3 border-r border-stone-200">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.transactionType === 'Production' || h.transactionType === 'Opening Stock' || h.transactionType === 'Reversal'
                                ? 'bg-emerald-100 text-emerald-800'
                                : h.transactionType === 'Sales'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {h.transactionType}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-stone-200 font-mono text-[11px]">{h.reference}</td>
                        <td className="py-2 px-3 border-r border-stone-200 text-right font-bold text-emerald-700">
                          {h.stockIn > 0 ? `+${toBengaliNumber(h.stockIn)}` : '—'}
                        </td>
                        <td className="py-2 px-3 border-r border-stone-200 text-right font-bold text-rose-600">
                          {h.stockOut > 0 ? `−${toBengaliNumber(h.stockOut)}` : '—'}
                        </td>
                        <td className="py-2 px-3 border-r border-stone-200 text-right font-black text-stone-900">
                          {toBengaliNumber(h.balance)}
                        </td>
                        <td className="py-2 px-3 border-r border-stone-200">{h.createdBy}</td>
                        <td className="py-2 px-3 text-stone-600">{h.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-[11px] font-bold text-stone-700">
              <div>
                <div className="border-t border-stone-400 mx-auto w-40 pt-1" />
                <span>Prepared By ({user?.name})</span>
              </div>
              <div>
                <div className="border-t border-stone-400 mx-auto w-40 pt-1" />
                <span>মালিক / অনুমোদিত স্বাক্ষর</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory-Reason Stock Adjustment Modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleAdjustSubmit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-stone-900">
                স্টক সমন্বয় ও ইতিহাস রেকর্ড ({adjustTarget.name})
              </h3>
              <button type="button" onClick={() => setAdjustTarget(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-stone-600">
              বর্তমান মজুদ: <strong>{toBengaliNumber(adjustTarget.stock)} {adjustTarget.unit}</strong>। প্রতিটি পরিবর্তনের কারণ (Reason) লেখা বাধ্যতামূলক।
            </p>
            <div>
              <label className="block font-bold text-stone-700 mb-1">লেনদেনের ধরন</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as StockMovementType)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
              >
                <option value="Stock Added">Stock Added (মজুদ যোগ)</option>
                <option value="Stock Removed">Stock Removed (মজুদ বিয়োগ)</option>
                <option value="Damage">Damage (নষ্ট/ক্ষতি)</option>
                <option value="Correction/Adjustment">Correction/Adjustment (সংশোধন)</option>
                <option value="Return">Return (ক্রেতা ফেরত +)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                পরিমাণ ({adjustTarget.unit}) {adjustType === 'Correction/Adjustment' ? '(কমাতে চাইলে - লিখুন)' : ''}
              </label>
              <input
                type="number"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">পরিবর্তনের কারণ (বাধ্যতামূলক)</label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="যেমন: গুদাম গণনায় সমন্বয় বা বস্তা ক্ষতি"
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdjustTarget(null)} className="rounded-lg bg-stone-200 px-4 py-2 font-bold">
                বাতিল
              </button>
              <button type="submit" className="rounded-lg bg-[#0d381e] text-white px-4 py-2 font-bold">
                সংরক্ষণ করুন ✓
              </button>
            </div>
          </form>
        </div>
      )}

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(prodName) => {
          showToast(`"${prodName}" সফলভাবে গুদামে যুক্ত ও প্রারম্ভিক ইতিহাস তৈরি হয়েছে!`);
        }}
      />
    </div>
  );
};
