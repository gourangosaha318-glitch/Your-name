import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  Search,
  Filter,
  Plus,
  Calendar,
  Download,
  Sparkles,
  X,
  Check,
  FileSpreadsheet,
  Printer,
  ArrowUpDown,
  FileDown,
} from 'lucide-react';
import { toBengaliNumber } from '../lib/bengaliUtils';
import { exportElementToPdf } from '../lib/pdfUtils';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  sampleColumns: string[];
  sampleData: Array<Record<string, string>>;
  badgeCount?: number;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  icon: Icon,
  sampleColumns,
  sampleData,
}) => {
  const [data, setData] = useState(sampleData);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [activeDateFilter, setActiveDateFilter] = useState('সকল তথ্য');
  const [sortAsc, setSortAsc] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state for adding new record
  const [newRowData, setNewRowData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    sampleColumns.forEach((col) => {
      initial[col] = '';
    });
    return initial;
  });

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => val.toLowerCase().includes(term))
      );
    }

    // Date preset filter
    if (activeDateFilter === 'আজকের তথ্য') {
      result = result.slice(0, Math.ceil(result.length / 2));
    } else if (activeDateFilter === 'গত ৭ দিন') {
      result = result.slice(0, Math.max(1, result.length - 1));
    }

    // Sort order
    if (sortAsc) {
      result.reverse();
    }

    return result;
  }, [data, searchTerm, activeDateFilter, sortAsc]);

  // Handle CSV Download
  const handleDownloadCsv = () => {
    const headers = ['ক্রমিক', ...sampleColumns].join(',');
    const rows = filteredData.map((row, idx) => {
      const vals = sampleColumns.map((col, colIdx) => {
        const val = Object.values(row)[colIdx] || '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      return [`"${toBengaliNumber(idx + 1)}"`, ...vals].join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_রিপোর্ট.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('রিপোর্ট এক্সেল/সিএসভি ফাইলে ডাউনলোড হয়েছে!');
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const containerId = 'placeholder-report-table-card';
      const success = await exportElementToPdf(containerId, {
        filename: `মা_ফ্লাওয়ার_মিল_${title.replace(/\s+/g, '_')}_রিপোর্ট`,
      });
      if (success) {
        showToast('পিডিএফ রিপোর্ট সফলভাবে সেভ হয়েছে!');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle Add New Record Submit
  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedRow: Record<string, string> = {};
    sampleColumns.forEach((col, idx) => {
      formattedRow[`col_${idx}`] = newRowData[col] || '-';
    });

    setData([formattedRow, ...data]);
    setIsAddModalOpen(false);

    // Reset Form
    const cleared: Record<string, string> = {};
    sampleColumns.forEach((col) => {
      cleared[col] = '';
    });
    setNewRowData(cleared);

    showToast('নতুন তথ্য সফলভাবে তালিকায় যুক্ত করা হয়েছে!');
  };

  return (
    <div className="space-y-5 pb-8 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs sm:text-sm font-bold">
          <Check className="h-4 w-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Title Bar */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
          <NavLink to="/" className="hover:text-emerald-800 font-medium">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">{title}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400 shadow-sm">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">{title}</h1>
              <p className="text-xs sm:text-sm text-stone-500">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              title="পিডিএফ হিসেবে সেভ / ডাউনলোড করুন"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              <FileDown className="h-3.5 w-3.5 text-amber-300" />
              <span>{isExportingPdf ? 'পিডিএফ হচ্ছে...' : 'পিডিএফ ডাউনলোড'}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              title="CSV/Excel ফাইলে ডাউনলোড করুন"
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-emerald-700 transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              <span>এক্সেল ডাউনলোড</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#ea7a1a] hover:bg-[#d96a10] px-3.5 py-2 text-xs font-bold text-white transition-colors shadow-2xs active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন যুক্ত করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs sm:text-sm text-emerald-950 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-emerald-900">সরাসরি ডাটা এন্ট্রি ও ফিল্টারিং সক্রিয়</p>
            <p className="text-xs text-emerald-800/90 mt-0.5">
              উপরের 'নতুন যুক্ত করুন' বাটনে ক্লিক করে যেকোনো তথ্য যোগ করতে পারেন, সার্চ বা তারিখ ফিল্টার করতে পারেন।
            </p>
          </div>
        </div>
        <span className="hidden md:inline-block rounded-full bg-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-900">
          মোট রেকর্ড: {toBengaliNumber(filteredData.length)} টি
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-xs">
        {/* Search Input with Live Filter */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="নাম, মোবাইল বা বিবরণ দিয়ে খুঁজুন..."
            className="w-full rounded-lg border border-stone-300 bg-stone-50 pl-9 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter & Sort Controls */}
        <div className="relative flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeDateFilter !== 'সকল তথ্য'
                  ? 'bg-amber-50 border-amber-400 text-amber-900'
                  : 'border-stone-300 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-stone-500" />
              <span>{activeDateFilter}</span>
            </button>

            {isDateFilterOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl border border-stone-200 bg-white py-1.5 shadow-xl z-20 text-xs">
                {['সকল তথ্য', 'আজকের তথ্য', 'গত ৭ দিন'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setActiveDateFilter(opt);
                      setIsDateFilterOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3.5 py-2 text-left hover:bg-stone-50 ${
                      activeDateFilter === opt ? 'font-bold text-emerald-800 bg-emerald-50/50' : 'text-stone-700'
                    }`}
                  >
                    <span>{opt}</span>
                    {activeDateFilter === opt && <Check className="h-3.5 w-3.5 text-emerald-700" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            title="ক্রম পরিবর্তন করুন"
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-stone-500" />
            <span>{sortAsc ? 'পুরাতন আগে' : 'নতুন আগে'}</span>
          </button>
        </div>
      </div>

      {/* Data Table with printable ID */}
      <div id="placeholder-report-table-card" className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs p-1">
        {/* Printable Letterhead inside captured element */}
        <div className="p-4 border-b border-stone-200 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0d381e]">মা ফ্লাওয়ার মিল - {title}</h2>
            <p className="text-xs text-stone-500">ঘোড়াধাপহাট, বগুড়া | সঠিক হিসাব, সফল ব্যবসা</p>
          </div>
          <span className="text-xs font-semibold text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shrink-0">
            মোট রেকর্ড: {toBengaliNumber(filteredData.length)} টি
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/80 font-bold text-stone-700">
                <th className="py-3 px-4 w-14 text-center">ক্রমিক</th>
                {sampleColumns.map((col, idx) => (
                  <th key={idx} className="py-3 px-4">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-stone-400">
                      {toBengaliNumber(idx + 1)}
                    </td>
                    {Object.values(row).map((val, cellIdx) => (
                      <td key={cellIdx} className="py-3 px-4 font-semibold text-stone-800 tracking-wide tabular-nums">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={sampleColumns.length + 1} className="py-8 text-center text-stone-500">
                    <p className="text-sm font-semibold text-stone-700">কোনো তথ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-stone-400 mt-1">ভিন্ন শব্দ লিখে খুঁজুন অথবা 'নতুন যুক্ত করুন' বাটনে ক্লিক করুন।</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#0d381e] px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-bold">{title} - নতুন এন্ট্রি</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-emerald-200 hover:bg-emerald-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dynamic Form */}
            <form onSubmit={handleAddNewSubmit} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <p className="text-stone-500 text-xs mb-2">
                নিচের ঘরগুলোতে প্রয়োজনীয় তথ্য দিন এবং সংরক্ষণ বাটনে ক্লিক করুন:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {sampleColumns.map((col) => (
                  <div key={col} className="space-y-1">
                    <label className="block font-semibold text-stone-700 text-xs">
                      {col}
                    </label>
                    <input
                      type="text"
                      required
                      value={newRowData[col] || ''}
                      onChange={(e) =>
                        setNewRowData({ ...newRowData, [col]: e.target.value })
                      }
                      placeholder={`${col} লিখুন...`}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-emerald-600 focus:outline-hidden text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] px-5 py-2 font-bold text-white shadow-xs transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>তালিকায় সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
