import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  Landmark,
  Lock,
  Unlock,
  KeyRound,
  Plus,
  FileDown,
  ShieldAlert,
  Check,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  History,
  X,
  Eye,
  EyeOff,
  Printer,
} from 'lucide-react';
import { apiFetch, setBankToken } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import {
  BankAccount,
  BankTransaction,
  BankAccessLog,
  BankTransactionType,
  WithdrawDestination,
} from '../types/mill';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';
import { exportElementToPdf, printAsPdf, waitForElementById } from '../lib/pdfUtils';
import { millConfig } from '../data/mock';

type BankPdfType = 'statement' | 'deposit' | 'withdraw' | 'charges' | 'transfer';

const BANK_TX_LABELS: Record<string, string> = {
  Deposit: 'জমা (Deposit)',
  Withdraw: 'উত্তোলন (Withdraw)',
  Transfer: 'ট্রান্সফার (Transfer)',
  'Bank Charges': 'ব্যাংক চার্জ (Charges)',
  Interest: 'সুদ / মুনাফা (Interest)',
  Adjustment: 'সমন্বয় (Adjustment)',
};

export const BankManagementPage: React.FC = () => {
  const { user, permissions } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(15);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accessLogs, setAccessLogs] = useState<BankAccessLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'reports' | 'security'>('overview');

  // Filters & PDF
  const [filterBankId, setFilterBankId] = useState<string>('all');
  const [pdfReportType, setPdfReportType] = useState<BankPdfType>('statement');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Add Bank Account Form
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('মা ফ্লাওয়ার মিল');
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [accountType, setAccountType] = useState<'Current' | 'Savings' | 'Business' | 'Mobile Merchant'>('Current');
  const [openingBalance, setOpeningBalance] = useState('0');

  // New Bank Transaction Form
  const [showTxForm, setShowTxForm] = useState(false);
  const [txBankId, setTxBankId] = useState('');
  const [txType, setTxType] = useState<BankTransactionType>('Deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txCharges, setTxCharges] = useState('0');
  const [chargesDeducted, setChargesDeducted] = useState(false);
  const [txPurpose, setTxPurpose] = useState('');
  const [txWithdrawnBy, setTxWithdrawnBy] = useState(user?.name || '');
  const [txDestination, setTxDestination] = useState<WithdrawDestination>('Cash');
  const [txDepositedFrom, setTxDepositedFrom] = useState('বিক্রয় ক্যাশ');
  const [txDepositMethod, setTxDepositMethod] = useState('Cash Deposit');
  const [txRefNo, setTxRefNo] = useState('');
  const [txToBankId, setTxToBankId] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Change PIN Modal
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setErrorMsg(null);
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  };

  const checkSecurityStatus = useCallback(async () => {
    try {
      const res = await apiFetch<{
        isUnlocked: boolean;
        lockedUntil: number;
        failedAttempts: number;
        sessionTimeoutMinutes: number;
      }>('/api/bank/security-status');
      setIsUnlocked(res.isUnlocked);
      setLockedUntil(res.lockedUntil || 0);
      setFailedAttempts(res.failedAttempts || 0);
      setSessionTimeoutMinutes(res.sessionTimeoutMinutes || 15);
      return res.isUnlocked;
    } catch {
      return false;
    }
  }, []);

  const loadBankData = useCallback(async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        apiFetch<{ accounts: BankAccount[] }>('/api/bank/accounts'),
        apiFetch<{ transactions: BankTransaction[] }>('/api/bank/transactions'),
      ]);
      const accList = accRes.accounts || [];
      setAccounts(accList);
      setTransactions(txRes.transactions || []);
      if (accList.length > 0) {
        setTxBankId((prev) => prev || accList[0].id);
        if (accList.length > 1) {
          setTxToBankId((prev) => prev || accList[1].id);
        }
      }
      if (permissions.isOwner) {
        const logRes = await apiFetch<{ logs: BankAccessLog[] }>('/api/bank/access-logs');
        setAccessLogs(logRes.logs || []);
      }
    } catch (err: any) {
      if (err?.status === 423) {
        setIsUnlocked(false);
        setBankToken(null);
        setPinError(err?.message || 'ব্যাংক নিরাপত্তা সেশন যাচাই প্রয়োজন।');
      } else {
        showError(err?.message || 'ব্যাংক তথ্য লোড করতে সমস্যা হয়েছে।');
      }
    }
  }, [permissions.isOwner]);

  useEffect(() => {
    checkSecurityStatus().then((ok) => {
      if (ok) loadBankData();
    });
  }, [checkSecurityStatus, loadBankData]);

  const normalizeDigits = (val: string) =>
    val.trim().replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeDigits(pinInput);
    if (!cleaned) {
      setPinError('ব্যাংক নিরাপত্তা পিন লিখুন।');
      return;
    }
    setPinError('');
    setVerifyingPin(true);
    try {
      const res = await apiFetch<{ bankToken: string }>('/api/bank/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: cleaned }),
      });
      setBankToken(res.bankToken);
      setPinInput('');
      setIsUnlocked(true);
      await loadBankData();
      showToast('ব্যাংক নিরাপত্তা পিন যাচাই সম্পন্ন — ব্যাংক মডিউল আনলক হয়েছে!');
    } catch (err: any) {
      setPinError(err?.message || 'ব্যাংক পিন সঠিক নয়');
      await checkSecurityStatus();
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleLockBank = async () => {
    await apiFetch('/api/bank/lock', { method: 'POST' }).catch(() => {});
    setBankToken(null);
    setIsUnlocked(false);
    setAccounts([]);
    setTransactions([]);
    showToast('ব্যাংক মডিউল নিরাপদভাবে লক করা হয়েছে।');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/bank/accounts', {
        method: 'POST',
        body: JSON.stringify({
          bankName,
          accountName,
          accountNumber,
          branch,
          accountType,
          openingBalance: Number(openingBalance) || 0,
        }),
      });
      setShowAddAccount(false);
      setBankName('');
      setAccountNumber('');
      setBranch('');
      await loadBankData();
      showToast('নতুন ব্যাংক অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'ব্যাংক অ্যাকাউন্ট তৈরি ব্যর্থ');
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/bank/transactions', {
        method: 'POST',
        body: JSON.stringify({
          bankAccountId: txBankId,
          type: txType,
          amount: Number(txAmount),
          bankCharges: Number(txCharges) || 0,
          chargesDeductedFromWithdrawal: chargesDeducted,
          purpose: txPurpose,
          withdrawnBy: txWithdrawnBy,
          destination: txDestination,
          depositedFrom: txDepositedFrom,
          depositMethod: txDepositMethod,
          relatedCashAccount: txDepositMethod === 'Cash Deposit' ? 'মিলের মূল ক্যাশ বাক্স' : undefined,
          referenceNumber: txRefNo,
          toBankAccountId: txType === 'Transfer' ? txToBankId : undefined,
          notes: txNotes,
        }),
      });
      setShowTxForm(false);
      setTxAmount('');
      setTxCharges('0');
      setTxPurpose('');
      setTxRefNo('');
      setTxNotes('');
      await loadBankData();
      showToast('ব্যাংক লেনদেন সফলভাবে সম্পন্ন হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'ব্যাংক লেনদেন ব্যর্থ');
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/bank/change-pin', {
        method: 'POST',
        body: JSON.stringify({ currentPin, newPin }),
      });
      setCurrentPin('');
      setNewPin('');
      showToast('ব্যাংক নিরাপত্তা পিন সফলভাবে পরিবর্তন করা হয়েছে!');
    } catch (err: any) {
      showError(err?.message || 'পিন পরিবর্তন ব্যর্থ');
    }
  };

  const totalBankBalance = useMemo(
    () => accounts.reduce((s, a) => s + Number(a.currentBalance || 0), 0),
    [accounts]
  );

  const reportTransactions = useMemo(() => {
    let list = transactions;
    if (filterBankId !== 'all') {
      list = list.filter((t) => t.bankAccountId === filterBankId || t.toBankAccountId === filterBankId);
    }
    if (pdfReportType === 'deposit') return list.filter((t) => t.type === 'Deposit');
    if (pdfReportType === 'withdraw') return list.filter((t) => t.type === 'Withdraw');
    if (pdfReportType === 'charges') return list.filter((t) => t.type === 'Bank Charges' || t.bankCharges > 0);
    if (pdfReportType === 'transfer') return list.filter((t) => t.type === 'Transfer');
    return list;
  }, [transactions, filterBankId, pdfReportType]);

  const reportTotals = useMemo(() => {
    const selectedAcc = accounts.find((a) => a.id === filterBankId);
    const opening = selectedAcc
      ? selectedAcc.openingBalance
      : accounts.reduce((s, a) => s + a.openingBalance, 0);
    const closing = selectedAcc
      ? selectedAcc.currentBalance
      : accounts.reduce((s, a) => s + a.currentBalance, 0);
    const totalAmt = reportTransactions.reduce((s, t) => s + t.amount, 0);
    const totalCharges = reportTransactions.reduce((s, t) => s + (t.bankCharges || 0), 0);
    return { opening, closing, totalAmt, totalCharges };
  }, [accounts, filterBankId, reportTransactions]);

  const handleDownloadBankPdf = async (type: BankPdfType) => {
    setPdfReportType(type);
    setActiveTab('reports');
    setIsExportingPdf(true);
    try {
      // Wait for React state flush and DOM mount of #printable-bank-report-pdf
      await new Promise((r) => setTimeout(r, 80));
      await waitForElementById('printable-bank-report-pdf', 800);
      await new Promise((r) => requestAnimationFrame(r));

      const titles: Record<BankPdfType, string> = {
        statement: 'Bank_Statement',
        deposit: 'Bank_Deposit_Report',
        withdraw: 'Bank_Withdrawal_Report',
        charges: 'Bank_Charges_Report',
        transfer: 'Bank_Transfer_Report',
      };
      const success = await exportElementToPdf('printable-bank-report-pdf', {
        filename: `মা_ফ্লাওয়ার_মিল_${titles[type]}_${new Date().toISOString().slice(0, 10)}`,
      });
      if (success) {
        showToast('ব্যাংক রিপোর্ট পিডিএফ ডাউনলোড হয়েছে!');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  // PIN Lock Screen when not unlocked
  if (!isUnlocked) {
    const isLockedOut = lockedUntil > Date.now();
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border-2 border-emerald-900/20 bg-white shadow-xl overflow-hidden">
          <div className="bg-[#0d381e] p-6 text-center text-white">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-emerald-950 shadow-md">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-black">উচ্চ-নিরাপত্তা ব্যাংক লক</h1>
            <p className="text-xs text-emerald-200 mt-1">
              ব্যাংক অ্যাকাউন্ট ও ব্যালেন্স দেখতে আলাদা ব্যাংক নিরাপত্তা পিন (PIN) দিন
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="p-6 space-y-4 text-xs sm:text-sm">
            {pinError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {isLockedOut && (
              <div className="rounded-lg bg-amber-50 border border-amber-300 p-3 text-xs font-bold text-amber-900">
                সতর্কতা: ভুল পিনের কারণে ব্যাংক প্রবেশ সাময়িকভাবে লক আছে। কিছুক্ষণ পর আবার চেষ্টা করুন।
              </div>
            )}

            <div>
              <label className="block font-bold text-stone-700 mb-1">ব্যাংক নিরাপত্তা পিন / পাসওয়ার্ড</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  disabled={isLockedOut || verifyingPin}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="ব্যাংক পিন লিখুন (যেমন: 4321)"
                  className="w-full rounded-lg border border-stone-300 pl-9 pr-10 py-2.5 font-bold tracking-widest focus:border-emerald-700 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-2.5 top-2.5 p-1 text-stone-400 hover:text-stone-700"
                  title={showPin ? 'লুকান' : 'দেখুন'}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-stone-500">
                ব্যর্থ প্রচেষ্টা লগ করা হয় (৫ বার ভুল দিলে ৫ মিনিটের জন্য লক)। ডিফল্ট পিন:{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono font-bold text-stone-800">4321</code>{' '}
                (ইংরেজি বা বাংলা যেকোনো সংখ্যায় লেখা যাবে)
              </p>
            </div>

            <button
              type="submit"
              disabled={isLockedOut || verifyingPin}
              className="w-full rounded-xl bg-[#0d381e] hover:bg-[#134e2a] disabled:opacity-50 py-2.5 font-bold text-white flex items-center justify-center gap-2"
            >
              <Unlock className="h-4 w-4 text-amber-300" />
              <span>{verifyingPin ? 'যাচাই করা হচ্ছে...' : 'ব্যাংক মডিউল আনলক করুন'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const parsedAmount = Number(txAmount) || 0;
  const parsedCharges = Number(txCharges) || 0;
  const previewActualReceived =
    txType === 'Withdraw'
      ? chargesDeducted
        ? Math.max(0, parsedAmount - parsedCharges)
        : parsedAmount
      : parsedAmount;

  return (
    <div className="space-y-5 pb-10 relative">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-white shadow-xl text-xs font-bold">
          <Check className="h-4 w-4 text-emerald-300" />
          <span>{toast}</span>
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
          <NavLink to="/" className="hover:text-emerald-800">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">ক্যাশ ও ব্যাংক হিসাব</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                উচ্চ-নিরাপত্তা ব্যাংক ব্যবস্থাপনা ও স্টেটমেন্ট
              </h1>
              <p className="text-xs sm:text-sm text-stone-500">
                জমা, উত্তোলন, ব্যাংক চার্জ, ব্যাংক-টু-ব্যাংক ট্রান্সফার ও ৫টি পৃথক PDF রিপোর্ট (সেশন টাইমআউট: {toBengaliNumber(sessionTimeoutMinutes)} মিনিট)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLockBank}
              className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 px-3 py-2 text-xs font-bold"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>ব্যাংক লক করুন</span>
            </button>
            <button
              onClick={() => setShowTxForm(!showTxForm)}
              className="flex items-center gap-1.5 rounded-lg bg-[#ea7a1a] hover:bg-[#d96a10] text-white px-4 py-2 text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন ব্যাংক লেনদেন</span>
            </button>
            {permissions.isOwner && (
              <button
                onClick={() => setShowAddAccount(!showAddAccount)}
                className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] text-white px-3.5 py-2 text-xs font-bold"
              >
                <Plus className="h-4 w-4 text-amber-300" />
                <span>ব্যাংক অ্যাকাউন্ট যোগ</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`rounded-lg px-3.5 py-2 ${activeTab === 'overview' ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-700'}`}
          >
            ব্যাংক অ্যাকাউন্ট ({toBengaliNumber(accounts.length)})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`rounded-lg px-3.5 py-2 ${activeTab === 'transactions' ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-700'}`}
          >
            লেনদেন ইতিহাস ({toBengaliNumber(transactions.length)})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`rounded-lg px-3.5 py-2 ${activeTab === 'reports' ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-700'}`}
          >
            ৫টি ব্যাংক PDF রিপোর্ট
          </button>
          {permissions.isOwner && (
            <button
              onClick={() => setActiveTab('security')}
              className={`rounded-lg px-3.5 py-2 ${activeTab === 'security' ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-700'}`}
            >
              পিন পরিবর্তন ও অ্যাক্সেস লগ
            </button>
          )}
        </div>
      </div>

      {/* Add Bank Account Form (Owner Only) */}
      {showAddAccount && permissions.isOwner && (
        <form onSubmit={handleCreateAccount} className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-5 shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">ব্যাংকের নাম</label>
            <input type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="যেমন: সোনালী ব্যাংক পিএলসি" className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold" />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">অ্যাকাউন্টের নাম</label>
            <input type="text" required value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">অ্যাকাউন্ট নম্বর</label>
            <input type="text" required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono" />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">শাখা</label>
            <input type="text" required value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="বগুড়া" className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">অ্যাকাউন্ট ধরন</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value as any)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold">
              <option value="Current">Current</option>
              <option value="Business">Business</option>
              <option value="Savings">Savings</option>
              <option value="Mobile Merchant">Mobile Merchant</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">প্রারম্ভিক স্থিতি (৳)</label>
            <input type="number" min="0" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold" />
          </div>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddAccount(false)} className="rounded-lg bg-stone-200 px-4 py-2 font-bold">বাতিল</button>
            <button type="submit" className="rounded-lg bg-[#0d381e] text-white px-5 py-2 font-bold">ব্যাংক অ্যাকাউন্ট সংরক্ষণ ✓</button>
          </div>
        </form>
      )}

      {/* New Bank Transaction Form */}
      {showTxForm && (
        <form onSubmit={handleCreateTransaction} className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-md space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <h2 className="text-sm font-black text-amber-950">নতুন ব্যাংক লেনদেন (Deposit / Withdraw / Transfer / Charges)</h2>
            <button type="button" onClick={() => setShowTxForm(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">লেনদেনের ধরন</label>
              <select value={txType} onChange={(e) => setTxType(e.target.value as BankTransactionType)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold">
                <option value="Deposit">Deposit (ব্যাংকে টাকা জমা)</option>
                <option value="Withdraw">Withdraw (ব্যাংক থেকে টাকা উত্তোলন)</option>
                <option value="Transfer">Transfer (ব্যাংক-টু-ব্যাংক ট্রান্সফার)</option>
                <option value="Bank Charges">Bank Charges (ব্যাংক চার্জ/SMS ফি)</option>
                <option value="Interest">Interest (ব্যাংক সুদ/মুনাফা)</option>
                <option value="Adjustment">Adjustment (সমন্বয়)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">ব্যাংক অ্যাকাউন্ট</label>
              <select value={txBankId} onChange={(e) => setTxBankId(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.bankName} ({formatBengaliCurrency(a.currentBalance)})</option>
                ))}
              </select>
            </div>
            {txType === 'Transfer' && (
              <div>
                <label className="block font-bold text-stone-700 mb-1">প্রাপক ব্যাংক অ্যাকাউন্ট</label>
                <select value={txToBankId} onChange={(e) => setTxToBankId(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold">
                  {accounts.filter((a) => a.id !== txBankId).map((a) => (
                    <option key={a.id} value={a.id}>{a.bankName}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block font-bold text-stone-700 mb-1">টাকার পরিমাণ (৳)</label>
              <input type="number" required min="1" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold" />
            </div>

            {txType !== 'Bank Charges' && (
              <div>
                <label className="block font-bold text-stone-700 mb-1">ব্যাংক চার্জ (৳, যদি থাকে)</label>
                <input type="number" min="0" value={txCharges} onChange={(e) => setTxCharges(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold" />
              </div>
            )}

            {txType === 'Withdraw' && (
              <>
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 font-bold text-stone-700 cursor-pointer">
                    <input type="checkbox" checked={chargesDeducted} onChange={(e) => setChargesDeducted(e.target.checked)} className="rounded accent-emerald-700" />
                    <span>উত্তোলিত টাকা থেকে চার্জ কাটা হয়েছে?</span>
                  </label>
                  <span className="text-[11px] font-black text-emerald-800 mt-1">
                    হাতে নগদ প্রাপ্তি: {formatBengaliCurrency(previewActualReceived)}
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">উত্তোলনকারী (Withdrawn By)</label>
                  <input type="text" value={txWithdrawnBy} onChange={(e) => setTxWithdrawnBy(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">গন্তব্য (Destination)</label>
                  <select value={txDestination} onChange={(e) => setTxDestination(e.target.value as WithdrawDestination)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold">
                    <option value="Cash">মিলের নগদ ক্যাশ (Cash)</option>
                    <option value="Another Bank">অন্য ব্যাংক</option>
                    <option value="Business Expense">ব্যবসায়িক খরচ</option>
                    <option value="Other">অন্যান্য</option>
                  </select>
                </div>
              </>
            )}

            {txType === 'Deposit' && (
              <>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">কোথা থেকে জমা (Deposited From)</label>
                  <input type="text" value={txDepositedFrom} onChange={(e) => setTxDepositedFrom(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">জমার মাধ্যম (Method)</label>
                  <select value={txDepositMethod} onChange={(e) => setTxDepositMethod(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold">
                    <option value="Cash Deposit">নগদ জমা (ক্যাশ বাক্স)</option>
                    <option value="Cheque Deposit">চেক জমা</option>
                    <option value="Online Transfer">অনলাইন / NPSB / BEFTN</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block font-bold text-stone-700 mb-1">উদ্দেশ্য / বিবরণ</label>
              <input type="text" value={txPurpose} onChange={(e) => setTxPurpose(e.target.value)} placeholder="লেনদেনের কারণ" className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">রেফারেন্স / রশিদ নং</label>
              <input type="text" value={txRefNo} onChange={(e) => setTxRefNo(e.target.value)} placeholder="SLIP-..." className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">নোট</label>
              <input type="text" value={txNotes} onChange={(e) => setTxNotes(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-[#0d381e] text-white px-5 py-2.5 font-bold shadow-sm">
              লেনদেন সম্পন্ন করুন ✓
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: ACCOUNTS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-[#0d381e] to-emerald-900 p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-emerald-200">মিলের সর্বমোট ব্যাংক ব্যালেন্স</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
                {formatBengaliCurrency(totalBankBalance)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleDownloadBankPdf('statement')} className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-bold flex items-center gap-1.5">
                <FileDown className="h-3.5 w-3.5 text-amber-300" /> স্টেটমেন্ট PDF
              </button>
              <button onClick={() => handleDownloadBankPdf('deposit')} className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-bold flex items-center gap-1.5">
                <FileDown className="h-3.5 w-3.5 text-emerald-300" /> জমা PDF
              </button>
              <button onClick={() => handleDownloadBankPdf('withdraw')} className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-bold flex items-center gap-1.5">
                <FileDown className="h-3.5 w-3.5 text-rose-300" /> উত্তোলন PDF
              </button>
              <button onClick={() => handleDownloadBankPdf('charges')} className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-bold flex items-center gap-1.5">
                <FileDown className="h-3.5 w-3.5 text-amber-200" /> ব্যাংক চার্জ PDF
              </button>
              <button onClick={() => handleDownloadBankPdf('transfer')} className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-bold flex items-center gap-1.5">
                <FileDown className="h-3.5 w-3.5 text-sky-300" /> ট্রান্সফার PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-black text-stone-900">{acc.bankName}</h3>
                    <p className="text-xs text-stone-500">{acc.branch} • {acc.accountType}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {acc.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>
                <div className="text-xs text-stone-600">
                  <p>অ্যাকাউন্ট: <strong>{acc.accountName}</strong></p>
                  <p className="font-mono text-[11px]">A/C: {acc.accountNumber}</p>
                </div>
                <div className="border-t border-stone-100 pt-2 flex items-center justify-between">
                  <span className="text-xs text-stone-500">বর্তমান ব্যালেন্স</span>
                  <span className="text-lg font-black text-[#0d381e]">
                    {formatBengaliCurrency(acc.currentBalance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BANK TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-700">
                  <th className="py-3 px-4">লেনদেন নং ও তারিখ</th>
                  <th className="py-3 px-4">ব্যাংক</th>
                  <th className="py-3 px-4">ধরন</th>
                  <th className="py-3 px-4">বিবরণ / মাধ্যম</th>
                  <th className="py-3 px-4 text-right">পরিমাণ (৳)</th>
                  <th className="py-3 px-4 text-right">ব্যাংক চার্জ</th>
                  <th className="py-3 px-4 text-right">প্রাপ্ত নগদ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{tx.txNo}</div>
                      <div className="text-[11px] text-stone-500">{toBengaliNumber(tx.date)} • {tx.time}</div>
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {tx.bankName}
                      {tx.toBankName && <div className="text-[11px] text-sky-700">→ {tx.toBankName}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                        tx.type === 'Deposit' || tx.type === 'Interest'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.type === 'Transfer'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.type === 'Deposit' && <ArrowDownLeft className="h-3 w-3" />}
                        {tx.type === 'Withdraw' && <ArrowUpRight className="h-3 w-3" />}
                        {tx.type === 'Transfer' && <ArrowLeftRight className="h-3 w-3" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      <div>{tx.purpose || tx.depositedFrom || tx.notes || 'ব্যাংক লেনদেন'}</div>
                      <div className="text-[10px] text-stone-400">
                        {tx.referenceNumber ? `Ref: ${tx.referenceNumber} • ` : ''} তৈরি: {tx.createdBy}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-stone-900">{formatBengaliCurrency(tx.amount)}</td>
                    <td className="py-3 px-4 text-right text-amber-800 font-bold">
                      {tx.bankCharges > 0 ? formatBengaliCurrency(tx.bankCharges) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {tx.type === 'Withdraw' ? formatBengaliCurrency(tx.actualAmountReceived ?? tx.amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 5 BANK PDF REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterBankId}
                onChange={(e) => setFilterBankId(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
              >
                <option value="all">সকল ব্যাংক অ্যাকাউন্ট</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.bankName}</option>
                ))}
              </select>

              {[
                { id: 'statement', label: 'ব্যাংক স্টেটমেন্ট' },
                { id: 'deposit', label: 'টাকা জমা রিপোর্ট' },
                { id: 'withdraw', label: 'উত্তোলন রিপোর্ট' },
                { id: 'charges', label: 'ব্যাংক চার্জ রিপোর্ট' },
                { id: 'transfer', label: 'ট্রান্সফার রিপোর্ট' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setPdfReportType(btn.id as BankPdfType)}
                  className={`rounded-lg px-3 py-2 font-bold ${
                    pdfReportType === btn.id ? 'bg-[#0d381e] text-white' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadBankPdf(pdfReportType)}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-4 py-2 font-bold"
              >
                <FileDown className="h-4 w-4 text-amber-300" />
                <span>{isExportingPdf ? 'পিডিএফ হচ্ছে...' : 'নির্বাচিত ব্যাংক PDF ডাউনলোড'}</span>
              </button>
              <button
                onClick={() => printAsPdf(`ব্যাংক_রিপোর্ট_${pdfReportType}`, 'printable-bank-report-pdf')}
                className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-3 py-2 font-bold"
              >
                <Printer className="h-4 w-4" />
                <span>প্রিন্ট</span>
              </button>
            </div>
          </div>

          <div id="printable-bank-report-pdf" className="rounded-xl border border-stone-200 bg-white p-6 space-y-4 text-xs">
            <div className="border-b-2 border-stone-800 pb-3 text-center">
              <p className="text-[11px] font-bold text-amber-800">|| শ্রী গনেশায় নমঃ ||</p>
              <h2 className="text-xl font-black text-[#0d381e]">
                {millConfig.name} —{' '}
                {pdfReportType === 'statement'
                  ? 'পূর্ণাঙ্গ ব্যাংক স্টেটমেন্ট (Bank Statement)'
                  : pdfReportType === 'deposit'
                  ? 'ব্যাংক জমা রিপোর্ট (Deposit Report)'
                  : pdfReportType === 'withdraw'
                  ? 'ব্যাংক উত্তোলন রিপোর্ট (Withdrawal Report)'
                  : pdfReportType === 'charges'
                  ? 'ব্যাংক চার্জ রিপোর্ট (Bank Charges Report)'
                  : 'ব্যাংক-টু-ব্যাংক ট্রান্সফার রিপোর্ট'}
              </h2>
              <p className="text-stone-600 mt-0.5">
                {millConfig.location} | অ্যাকাউন্ট:{' '}
                <strong>
                  {filterBankId === 'all'
                    ? 'সকল ব্যাংক অ্যাকাউন্ট'
                    : (() => {
                        const acc = accounts.find((a) => a.id === filterBankId);
                        return acc ? `${acc.bankName} (${acc.accountNumber})` : 'নির্বাচিত ব্যাংক';
                      })()}
                </strong>{' '}
                | তারিখ: {toBengaliNumber(new Date().toLocaleDateString('en-GB'))}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-2.5 bg-stone-50">
                <span className="text-stone-500 block">প্রারম্ভিক ব্যালেন্স</span>
                <span className="text-sm font-black">{formatBengaliCurrency(reportTotals.opening)}</span>
              </div>
              <div className="rounded-lg border p-2.5 bg-emerald-50">
                <span className="text-emerald-800 block">
                  {pdfReportType === 'charges' ? 'মোট লেনদেন সংখ্যা' : 'মোট লেনদেন পরিমাণ'}
                </span>
                <span className="text-sm font-black">
                  {pdfReportType === 'charges'
                    ? `${toBengaliNumber(reportTransactions.length)} টি`
                    : formatBengaliCurrency(reportTotals.totalAmt)}
                </span>
              </div>
              <div className="rounded-lg border p-2.5 bg-amber-50">
                <span className="text-amber-800 block">মোট ব্যাংক চার্জ</span>
                <span className="text-sm font-black">{formatBengaliCurrency(reportTotals.totalCharges)}</span>
              </div>
              <div className="rounded-lg border p-2.5 bg-sky-50">
                <span className="text-sky-900 block">সমাপনী ব্যালেন্স</span>
                <span className="text-sm font-black">{formatBengaliCurrency(reportTotals.closing)}</span>
              </div>
            </div>

            <table className="w-full border-collapse border border-stone-300 text-xs">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-300">
                  <th className="py-2 px-2.5 border-r text-left">নং ও তারিখ</th>
                  <th className="py-2 px-2.5 border-r text-left">ব্যাংক</th>
                  <th className="py-2 px-2.5 border-r text-left">ধরন</th>
                  <th className="py-2 px-2.5 border-r text-left">বিবরণ / মাধ্যম / গন্তব্য</th>
                  <th className="py-2 px-2.5 border-r text-right">পরিমাণ (৳)</th>
                  <th className="py-2 px-2.5 border-r text-right">চার্জ (৳)</th>
                  <th className="py-2 px-2.5 text-right">প্রাপ্ত নগদ (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {reportTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-stone-500">
                      নির্বাচিত ফিল্টারে কোনো ব্যাংক লেনদেন পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  reportTransactions.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 px-2.5 border-r">
                        <div className="font-bold">{t.txNo}</div>
                        <div className="text-[10px] text-stone-500">
                          {toBengaliNumber(t.date)} • {toBengaliNumber(t.time)}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 border-r font-semibold">
                        {t.bankName}
                        {t.toBankName ? ` → ${t.toBankName}` : ''}
                      </td>
                      <td className="py-2 px-2.5 border-r font-semibold">
                        {BANK_TX_LABELS[t.type] || t.type}
                      </td>
                      <td className="py-2 px-2.5 border-r">
                        <div>{t.purpose || t.depositedFrom || t.notes || 'ব্যাংক লেনদেন'}</div>
                        <div className="text-[10px] text-stone-500">
                          {t.type === 'Withdraw' && (t.withdrawnBy || t.destination)
                            ? `উত্তোলনকারী: ${t.withdrawnBy || '—'} | গন্তব্য: ${t.destination || '—'}`
                            : t.type === 'Deposit' && (t.depositMethod || t.depositedFrom)
                            ? `মাধ্যম: ${t.depositMethod || '—'}${t.depositedFrom ? ` | উৎস: ${t.depositedFrom}` : ''}`
                            : t.referenceNumber
                            ? `Ref: ${t.referenceNumber}`
                            : `এন্ট্রি: ${t.createdBy}`}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 border-r text-right font-bold">{formatBengaliCurrency(t.amount)}</td>
                      <td className="py-2 px-2.5 border-r text-right text-amber-800 font-semibold">
                        {t.bankCharges ? formatBengaliCurrency(t.bankCharges) : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-bold text-emerald-800">
                        {t.type === 'Withdraw'
                          ? formatBengaliCurrency(t.actualAmountReceived ?? t.amount)
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-[11px] font-bold text-stone-700">
              <div><div className="border-t border-stone-400 mx-auto w-36 pt-1" /><span>Prepared By ({user?.name})</span></div>
              <div><div className="border-t border-stone-400 mx-auto w-36 pt-1" /><span>মালিকের স্বাক্ষর</span></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OWNER SECURITY SETTINGS & ACCESS LOGS */}
      {activeTab === 'security' && permissions.isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form onSubmit={handleChangePin} className="lg:col-span-5 rounded-xl border border-stone-200 bg-white p-5 space-y-3 text-xs h-fit">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600" />
              ব্যাংক নিরাপত্তা পিন (PIN) পরিবর্তন
            </h3>
            <div>
              <label className="block font-bold text-stone-700 mb-1">বর্তমান ব্যাংক পিন</label>
              <input type="password" required value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">নতুন ব্যাংক পিন (কমপক্ষে ৪ অক্ষর)</label>
              <input type="password" required value={newPin} onChange={(e) => setNewPin(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-[#0d381e] text-white py-2.5 font-bold">
              পিন আপডেট করুন ✓
            </button>
          </form>

          <div className="lg:col-span-7 rounded-xl border border-stone-200 bg-white p-5 space-y-3 text-xs">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-700" />
              ব্যাংক অ্যাক্সেস ও ব্যর্থ পিন প্রচেষ্টা লগ
            </h3>
            <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
              {accessLogs.map((l) => (
                <div key={l.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold">@{l.username} ({l.role})</span> — <span>{l.message}</span>
                    <div className="text-[10px] text-stone-400">{toBengaliNumber(l.date)} • {l.time}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${l.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {l.success ? 'সফল' : 'ব্যর্থ'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
