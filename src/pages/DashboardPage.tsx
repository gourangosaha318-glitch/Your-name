import React, { useState } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { StatCards } from '../components/StatCards';
import { ChartsSection } from '../components/ChartsSection';
import { TablesSection } from '../components/TablesSection';
import { ReportModal } from '../components/ReportModal';
import { TransactionModal } from '../components/TransactionModal';
import { FileText, ShoppingCart, Cog, Send, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DailySubmissionModal } from '../components/DailySubmissionModal';
import { mockTransactions, TransactionItem, DailyReportSubmission } from '../data/mock';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isDailySubmitOpen, setIsDailySubmitOpen] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>(mockTransactions);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAddTransaction = (newTx: TransactionItem) => {
    setTransactions((prev) => [newTx, ...prev]);
    setToastMessage('নতুন লেনদেন সফলভাবে ড্যাশবোর্ডে যুক্ত হয়েছে!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDailySubmitReport = (newSub: DailyReportSubmission) => {
    try {
      const existing = localStorage.getItem('ma_flower_mill_daily_submissions');
      const list = existing ? JSON.parse(existing) : [];
      localStorage.setItem('ma_flower_mill_daily_submissions', JSON.stringify([newSub, ...list]));
    } catch (e) {
      console.error(e);
    }
    setToastMessage('মালিকের টেবিলে আজকের হিসাব ও ক্যাশ সফলভাবে জমা দেওয়া হয়েছে!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* 1. Hero Banner */}
      <HeroBanner />

      {/* Quick Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/70 border border-amber-200/50 p-2.5 shadow-2xs backdrop-blur-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 px-2">
          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>দ্রুত কার্যক্রম:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto -mx-0.5 px-0.5">
          <button
            onClick={() => setIsDailySubmitOpen(true)}
            className="flex items-center gap-1.5 shrink-0 rounded-xl bg-[#0d381e] hover:bg-[#14532d] active:scale-95 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-2xs min-h-[38px]"
          >
            <Send className="h-4 w-4 text-amber-400" />
            <span>মালিককে হিসাব জমা</span>
          </button>

          <button
            onClick={() => navigate('/sales')}
            className="flex items-center gap-1.5 shrink-0 rounded-xl bg-[#ea7a1a] hover:bg-[#d96a10] active:scale-95 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-2xs min-h-[38px]"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>বিক্রয় মেমো তৈরি</span>
          </button>

          <button
            onClick={() => navigate('/daily-accounts')}
            className="flex items-center gap-1.5 shrink-0 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 px-3.5 py-2 text-xs font-bold transition-all min-h-[38px]"
          >
            <FileText className="h-4 w-4 text-amber-700" />
            <span>দৈনিক হিসাব খাতা</span>
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-1.5 shrink-0 rounded-xl bg-white hover:bg-stone-100 active:scale-95 text-stone-800 border border-stone-300 px-3.5 py-2 text-xs font-bold transition-all min-h-[38px]"
          >
            <FileText className="h-4 w-4 text-stone-600" />
            <span>দৈনিক অডিট রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* 2. 5 Stat Cards */}
      <StatCards />

      {/* 3. Row of 3 Panels: Bar Chart, Donut Chart, Today's Summary */}
      <ChartsSection onViewFullReport={() => setIsReportOpen(true)} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs sm:text-sm font-bold">
          <Check className="h-4 w-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 4. Bottom Row of 2 Tables: Recent Transactions & Employee Submissions */}
      <TablesSection
        onNewTransaction={() => setIsTxModalOpen(true)}
        transactions={transactions}
      />

      {/* Interactive Modals */}
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onAddTransaction={handleAddTransaction}
      />
      <DailySubmissionModal
        isOpen={isDailySubmitOpen}
        onClose={() => setIsDailySubmitOpen(false)}
        onSubmitReport={handleDailySubmitReport}
      />
    </div>
  );
};
