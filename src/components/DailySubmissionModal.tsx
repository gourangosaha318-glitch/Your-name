import React, { useState } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  Wheat,
  Store,
  DollarSign,
  FileText,
  Calculator,
  MessageCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  getFormattedHeaderDate,
} from '../lib/bengaliUtils';
import { DailyReportSubmission, millConfig } from '../data/mock';
import { useSales } from '../context/SalesContext';

interface DailySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: DailyReportSubmission) => void;
}

export const DailySubmissionModal: React.FC<DailySubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport,
}) => {
  const { dailySummary } = useSales();
  const dateInfo = getFormattedHeaderDate();

  // Step 1: Raw Material & Production State
  const [wheatUsed, setWheatUsed] = useState<number>(5000);
  const [flourBags, setFlourBags] = useState<number>(120);
  const [maidaBags, setMaidaBags] = useState<number>(100);
  const [branBags, setBranBags] = useState<number>(80);
  const [sujiBags, setSujiBags] = useState<number>(40);

  // Step 2: Physical Stock Count in Warehouse
  const [stockFlour, setStockFlour] = useState<number>(100);
  const [stockMaida, setStockMaida] = useState<number>(120);
  const [stockBran, setStockBran] = useState<number>(80);
  const [stockSuji, setStockSuji] = useState<number>(40);

  // Step 3: Daily Financials (Bag Sales + Retail Flour Sales separated)
  const [bagSales, setBagSales] = useState<number>(dailySummary.bagBasedSales);
  const [retailFlourSales, setRetailFlourSales] = useState<number>(dailySummary.retailFlourSales);
  const [dueCollected, setDueCollected] = useState<number>(25000);
  const [wheatPurchaseCost, setWheatPurchaseCost] = useState<number>(75000);
  const [factoryExpenses, setFactoryExpenses] = useState<number>(5000);

  // Step 4: Notes
  const [managerNotes, setManagerNotes] = useState<string>(
    'সকল মেশিনের রোল স্বাভাবিক গতিতে চলেছে। গুদামের সকল বস্তা সঠিকভাবে গোনা হয়েছে।'
  );
  const [managerName, setManagerName] = useState<string>('মিজানুর রহমান (ম্যানেজার)');

  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  React.useEffect(() => {
    if (isOpen) {
      setBagSales(dailySummary.bagBasedSales);
      setRetailFlourSales(dailySummary.retailFlourSales);
    }
  }, [isOpen, dailySummary.bagBasedSales, dailySummary.retailFlourSales]);

  if (!isOpen) return null;

  // Calculations
  const totalSales = (Number(bagSales) || 0) + (Number(retailFlourSales) || 0);
  const totalStockBags = stockFlour + stockMaida + stockBran + stockSuji;
  const netCashToBoss = Math.max(
    0,
    totalSales + dueCollected - wheatPurchaseCost - factoryExpenses
  );

  // Format WhatsApp Message
  const generateWhatsAppMessage = () => {
    return `🌾 *${millConfig.name} - দৈনিক হিসাব সারসংক্ষেপ*
📍 ${millConfig.location}
📅 তারিখ: ${toBengaliNumber(new Date().toLocaleDateString('en-GB'))} (${dateInfo.banglaFormatted})
👤 জমা প্রদানকারী: ${managerName}
────────────────────────────
⚙️ *গম ভাঙানো:* ${toBengaliNumber(wheatUsed.toLocaleString())} কেজি
📦 *উৎপাদিত বস্তা:*
  • আটা: ${toBengaliNumber(flourBags)} বস্তা
  • ময়দা: ${toBengaliNumber(maidaBags)} বস্তা
  • ভুসি: ${toBengaliNumber(branBags)} বস্তা
  • সুজি: ${toBengaliNumber(sujiBags)} বস্তা

🏭 *গুদামে বর্তমান অবশিষ্ট মোট স্টক:* ${toBengaliNumber(totalStockBags)} বস্তা
  (আটা: ${toBengaliNumber(stockFlour)} | ময়দা: ${toBengaliNumber(stockMaida)} | ভুসি: ${toBengaliNumber(stockBran)} | সুজি: ${toBengaliNumber(stockSuji)})
────────────────────────────
💰 *আর্থিক খাতা:*
  (+) বস্তাভিত্তিক বিক্রয়: ${formatBengaliCurrency(bagSales)}
  (+) খুচরা ময়দা বিক্রয় (টাকা): ${formatBengaliCurrency(retailFlourSales)}
  (=) সর্বমোট বিক্রয়: ${formatBengaliCurrency(totalSales)}
  (+) বকেয়া আদায়: ${formatBengaliCurrency(dueCollected)}
  (-) গম ক্রয়: ${formatBengaliCurrency(wheatPurchaseCost)}
  (-) মিলের খরচ: ${formatBengaliCurrency(factoryExpenses)}

💵 *বসের নিকট জমা নগদ ক্যাশ: ${formatBengaliCurrency(netCashToBoss)}*
────────────────────────────
📝 *ম্যানেজারের মন্তব্য:*
${managerNotes}

_সঠিক হিসাব, সফল ব্যবসা_`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSubmission: DailyReportSubmission = {
      id: `sub-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB'),
      banglaDate: dateInfo.banglaFormatted.replace('বাংলা তারিখ: ', ''),
      submittedBy: managerName,
      designation: 'ম্যানেজার ও প্রধান হিসাবরক্ষক',
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      wheatUsedKg: wheatUsed,
      production: {
        flourBags,
        maidaBags,
        branBags,
        sujiBags,
      },
      stockCount: {
        flour: stockFlour,
        maida: stockMaida,
        bran: stockBran,
        suji: stockSuji,
        totalStockBags,
      },
      finances: {
        totalSales,
        bagSales,
        retailFlourSales,
        dueCollected,
        wheatPurchaseCost,
        factoryExpenses,
        netCashToBoss,
      },
      managerNotes,
      status: 'pending',
      statusText: 'অপেক্ষমাণ ⏳',
    };

    onSubmitReport(newSubmission);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col">
        {/* Mobile Swipe Handle */}
        <div className="sm:hidden pt-2 pb-1 bg-[#0d381e]">
          <div className="h-1.5 w-12 rounded-full bg-emerald-700/60 mx-auto" />
        </div>

        {/* Modal Top Header */}
        <div className="flex items-center justify-between bg-[#0d381e] px-5 sm:px-6 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                মালিকের নিকট দৈনিক হিসাব ও স্টক জমা শিট
              </h2>
              <p className="text-xs text-emerald-200">
                {dateInfo.gregorianFormatted} | {dateInfo.banglaFormatted}
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

        {/* Segmented Tab Bar */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-100/80 px-4 py-2">
          <div className="flex items-center gap-1.5 p-1 bg-stone-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'form'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              হিসাব এন্ট্রি ফর্ম
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'preview'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              হোয়াটসঅ্যাপ মেসেজ প্রিভিউ
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs active:scale-95"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-200" />
                <span>কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <MessageCircle className="h-3.5 w-3.5 text-emerald-300" />
                <span>হোয়াটসঅ্যাপে পাঠান</span>
              </>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
          {activeTab === 'form' ? (
            <form id="daily-submission-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Section 1: গম ব্যবহার ও উৎপাদন */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                  <Wheat className="h-4 w-4 text-[#ea7a1a]" />
                  <h3 className="font-bold text-stone-900 text-sm">
                    ১. কাঁচামাল ও উৎপাদন হিসাব (Production Log)
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      গম ব্যবহার (কেজি)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={wheatUsed}
                      onChange={(e) => setWheatUsed(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      আটা (বস্তা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={flourBags}
                      onChange={(e) => setFlourBags(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      ময়দা (বস্তা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={maidaBags}
                      onChange={(e) => setMaidaBags(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      ভুসি (বস্তা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={branBags}
                      onChange={(e) => setBranBags(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      সুজি (বস্তা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={sujiBags}
                      onChange={(e) => setSujiBags(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: গুদাম ও ফিজিক্যাল স্টক রিকনসিলিয়েশন */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-emerald-700" />
                    <h3 className="font-bold text-stone-900 text-sm">
                      ২. গুদাম স্টক গণনা (Physical Stock Verification)
                    </h3>
                  </div>
                  <span className="font-bold text-xs text-stone-700 bg-white px-2.5 py-0.5 rounded-full border border-stone-200">
                    মোট অবশিষ্ট স্টক: {toBengaliNumber(totalStockBags)} বস্তা
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      আটা মজুদ (বস্তা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stockFlour}
                      onChange={(e) => setStockFlour(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      ময়দা মজুদ (বস্তা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stockMaida}
                      onChange={(e) => setStockMaida(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      ভুসি মজুদ (বস্তা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stockBran}
                      onChange={(e) => setStockBran(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      সুজি মজুদ (বস্তা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stockSuji}
                      onChange={(e) => setStockSuji(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: আর্থিক খাতা ও বসের হাতে জমা ক্যাশ */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                  <DollarSign className="h-4 w-4 text-emerald-700" />
                  <h3 className="font-bold text-stone-900 text-sm">
                    ৩. আর্থিক হিসাব ও ক্যাশ জমা (Cash Reconciliation)
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      (+) বস্তাভিত্তিক বিক্রয় (৳)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={bagSales}
                      onChange={(e) => setBagSales(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-amber-900 text-xs mb-1">
                      (+) খুচরা ময়দা (৳ টাকা)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={retailFlourSales}
                      onChange={(e) => setRetailFlourSales(Number(e.target.value))}
                      className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-1.5 font-bold text-amber-950 text-xs focus:border-amber-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      (+) বকেয়া আদায় (৳)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={dueCollected}
                      onChange={(e) => setDueCollected(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      (-) গম ক্রয় পরিশোধ (৳)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={wheatPurchaseCost}
                      onChange={(e) => setWheatPurchaseCost(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 text-xs mb-1">
                      (-) মিলের কারখানা খরচ (৳)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={factoryExpenses}
                      onChange={(e) => setFactoryExpenses(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 text-xs focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Net Cash Highlight Box */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-4 text-white shadow-md">
                  <div>
                    <p className="text-xs font-semibold text-emerald-200">
                      মালিকের টেবিলে বুঝিয়ে দেওয়া নগদ ক্যাশ টাকা:
                    </p>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                      {formatBengaliCurrency(netCashToBoss)}
                    </p>
                  </div>
                  <div className="text-right mt-2 sm:mt-0 text-xs text-emerald-100">
                    <p>মোট গ্রহণ: {formatBengaliCurrency(totalSales + dueCollected)}</p>
                    <p>মোট খরচ: {formatBengaliCurrency(wheatPurchaseCost + factoryExpenses)}</p>
                  </div>
                </div>
              </div>

              {/* Section 4: ম্যানেজার ও মন্তব্য */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 text-xs mb-1">
                    হিসাব জমাদানকারী ম্যানেজারের নাম
                  </label>
                  <input
                    type="text"
                    required
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-800 focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 text-xs mb-1">
                    বসের জন্য বিশেষ নোট / মিলের অবস্থা
                  </label>
                  <input
                    type="text"
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="যেমন: বিদ্যুৎ বিল পরিশোধ, গমের রোল ক্লিয়ার..."
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-800 focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </form>
          ) : (
            /* WhatsApp Preview Card */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>
                    নিচের টেক্সটটি কপি করে মিলের মালিককে সরাসরি হোয়াটসঅ্যাপে বা এসএমএসে পাঠিয়ে দেওয়া যাবে:
                  </span>
                </div>
                <button
                  onClick={handleCopyWhatsApp}
                  className="flex items-center gap-1 font-bold text-emerald-800 bg-white border border-stone-300 px-2.5 py-1 rounded-lg hover:bg-stone-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedWhatsApp ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                </button>
              </div>

              <div className="rounded-xl border border-stone-300 bg-stone-900 text-emerald-300 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                {generateWhatsAppMessage()}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-5 sm:px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
          >
            বাতিল
          </button>

          <button
            type="submit"
            form="daily-submission-form"
            className="flex items-center gap-2 rounded-xl bg-[#0d381e] hover:bg-[#14532d] px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md active:scale-95 transition-all"
          >
            <Send className="h-4 w-4 text-amber-400" />
            <span>মালিকের নিকট হিসাব জমা দিন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
