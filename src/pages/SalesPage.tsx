import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  Receipt,
  Plus,
  Printer,
  Search,
  Edit3,
  Trash2,
  FileDown,
  Check,
  Coins,
  Package,
  TrendingUp,
  Wallet,
  X,
  PlusCircle,
  ShieldCheck,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { toBengaliNumber, formatBengaliCurrency } from '../lib/bengaliUtils';
import { MemoPrintModal } from '../components/MemoPrintModal';
import { GatePassModal } from '../components/GatePassModal';
import {
  useSales,
  MemoData,
  MemoItem,
  RETAIL_FLOUR_LABEL,
  isRetailFlourItem,
  getTodayDateString,
} from '../context/SalesContext';
import { useAuth } from '../context/AuthContext';
import { exportElementToPdf } from '../lib/pdfUtils';
import { GatePassRecord } from '../types/mill';
import { millConfig } from '../data/mock';

const BAG_PRODUCTS = [
  { name: 'আটা (৫০ কেজি বস্তা)', defaultRate: 1200 },
  { name: 'ময়দা (৫০ কেজি বস্তা)', defaultRate: 1200 },
  { name: 'ভুসি (৩৫ কেজি বস্তা)', defaultRate: 850 },
  { name: 'সুজি (৫০ কেজি বস্তা)', defaultRate: 1400 },
];

function createEmptyBagItem(): MemoItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    product: 'আটা (৫০ কেজি বস্তা)',
    itemType: 'bag',
    quantity: 10,
    unit: 'বস্তা',
    rate: 1200,
    total: 12000,
    note: '',
  };
}

function createEmptyRetailItem(amount = 500): MemoItem {
  return {
    id: `rf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    product: RETAIL_FLOUR_LABEL,
    itemType: 'retail_flour',
    quantity: 0,
    unit: 'খুচরা (টাকা)',
    rate: 0,
    total: amount,
    note: '',
  };
}

export const SalesPage: React.FC = () => {
  const { user, permissions } = useAuth();
  const {
    memos,
    gatePasses,
    addMemo,
    updateMemo,
    deleteMemo,
    createGatePass,
    updateRetailFlourEntry,
    deleteRetailFlourEntry,
    dailySummary,
  } = useSales();

  const [activeTab, setActiveTab] = useState<'memos' | 'gatepasses'>('memos');
  const [selectedMemo, setSelectedMemo] = useState<MemoData | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const [selectedGatePass, setSelectedGatePass] = useState<GatePassRecord | null>(null);
  const [isGatePassOpen, setIsGatePassOpen] = useState(false);

  // Create / Edit Memo Form State
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [editingMemoNo, setEditingMemoNo] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [memoDate, setMemoDate] = useState(getTodayDateString());
  const [formItems, setFormItems] = useState<MemoItem[]>([createEmptyBagItem()]);
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [transportInput, setTransportInput] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Due' | 'Other'>('Cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('0');
  const [fullPaidChecked, setFullPaidChecked] = useState<boolean>(true);
  const [alsoGenerateGatePass, setAlsoGenerateGatePass] = useState<boolean>(true);
  const [receiverName, setReceiverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Standalone Gate Pass Modal/Form
  const [showStandaloneGpForm, setShowStandaloneGpForm] = useState(false);
  const [gpMemoNo, setGpMemoNo] = useState('');
  const [gpProductName, setGpProductName] = useState('আটা (বস্তা)');
  const [gpBags, setGpBags] = useState('10');
  const [gpReceiver, setGpReceiver] = useState('');
  const [gpVehicle, setGpVehicle] = useState('');

  // Inline Edit State for Today's Retail Flour Entries Table
  const [editingRetailKey, setEditingRetailKey] = useState<string | null>(null);
  const [editRetailAmount, setEditRetailAmount] = useState<string>('');
  const [editRetailNote, setEditRetailNote] = useState<string>('');

  // Search, Filter & Export State
  const [searchQuery, setSearchQuery] = useState('');
  const [gpSearchQuery, setGpSearchQuery] = useState('');
  const [memoFilter, setMemoFilter] = useState<'all' | 'retail' | 'due' | 'draft'>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setErrorMsg(null);
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // Live form calculations
  const formBagCount = useMemo(
    () =>
      formItems
        .filter((it) => !isRetailFlourItem(it))
        .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    [formItems]
  );

  const formBagTotal = useMemo(
    () =>
      formItems
        .filter((it) => !isRetailFlourItem(it))
        .reduce((sum, it) => sum + (Number(it.total) || 0), 0),
    [formItems]
  );

  const formRetailTotal = useMemo(
    () =>
      formItems
        .filter((it) => isRetailFlourItem(it))
        .reduce((sum, it) => sum + (Number(it.total) || 0), 0),
    [formItems]
  );

  const formProductTotal = formBagTotal + formRetailTotal;
  const formDiscount = Math.max(0, parseFloat(discountInput) || 0);
  const formTransport = Math.max(0, parseFloat(transportInput) || 0);
  const formGrandTotal = Math.max(0, formProductTotal + formTransport - formDiscount);
  const effectivePaid = fullPaidChecked
    ? formGrandTotal
    : Math.max(0, parseFloat(paidAmountInput) || 0);
  const formDue = Math.max(0, formGrandTotal - effectivePaid);

  const openNewMemoForm = (startWithRetailFlour = false) => {
    setEditingMemoNo(null);
    setCustomerName(startWithRetailFlour ? 'খুচরা ময়দা ক্রেতা' : '');
    setCustomerPhone('');
    setCustomerAddress('');
    setMemoDate(getTodayDateString());
    setFormItems(startWithRetailFlour ? [createEmptyRetailItem(500)] : [createEmptyBagItem()]);
    setDiscountInput('0');
    setTransportInput('0');
    setPaymentMethod('Cash');
    setFullPaidChecked(true);
    setPaidAmountInput(startWithRetailFlour ? '500' : '12000');
    setAlsoGenerateGatePass(!startWithRetailFlour);
    setReceiverName('');
    setVehicleNumber('');
    setShowMemoForm(true);
  };

  const openEditMemoForm = (memo: MemoData) => {
    if (permissions.isTester && memo.status !== 'draft') {
      showError('টেস্টার শুধুমাত্র নিজের খসড়া (Draft) মেমো সম্পাদনা করতে পারবেন।');
      return;
    }
    setEditingMemoNo(memo.memoNo);
    setCustomerName(memo.customerName);
    setCustomerPhone(memo.customerPhone || '');
    setCustomerAddress(memo.customerAddress || '');
    setMemoDate(memo.date);
    setFormItems(memo.items.map((it) => ({ ...it })));
    setDiscountInput(String(memo.discount || 0));
    setTransportInput(String(memo.transportCost || 0));
    setPaymentMethod(memo.paymentMethod || 'Cash');
    const isFullyPaid = memo.paidAmount >= memo.totalAmount;
    setFullPaidChecked(isFullyPaid);
    setPaidAmountInput(String(memo.paidAmount));
    setAlsoGenerateGatePass(false);
    setShowMemoForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemProductChange = (itemId: string, selectedValue: string) => {
    setFormItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (selectedValue === RETAIL_FLOUR_LABEL) {
          return {
            ...it,
            product: RETAIL_FLOUR_LABEL,
            itemType: 'retail_flour',
            quantity: 0,
            unit: 'খুচরা (টাকা)',
            rate: 0,
            total: it.total > 0 ? it.total : 500,
          };
        }
        const matchedBag = BAG_PRODUCTS.find((p) => p.name === selectedValue);
        const rate = matchedBag ? matchedBag.defaultRate : it.rate || 1200;
        const qty = it.quantity > 0 ? it.quantity : 10;
        return {
          ...it,
          product: selectedValue,
          itemType: 'bag',
          quantity: qty,
          unit: 'বস্তা',
          rate,
          total: qty * rate,
        };
      })
    );
  };

  const handleBagFieldChange = (itemId: string, field: 'quantity' | 'rate', valStr: string) => {
    const val = Math.max(0, parseFloat(valStr) || 0);
    setFormItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const nextQty = field === 'quantity' ? Math.floor(val) : it.quantity;
        const nextRate = field === 'rate' ? val : it.rate;
        return {
          ...it,
          quantity: nextQty,
          rate: nextRate,
          total: nextQty * nextRate,
        };
      })
    );
  };

  const handleRetailFieldChange = (itemId: string, field: 'total' | 'note', val: string) => {
    setFormItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (field === 'note') return { ...it, note: val };
        return {
          ...it,
          quantity: 0,
          rate: 0,
          total: Math.max(0, parseFloat(val) || 0),
        };
      })
    );
  };

  const handleRemoveFormItem = (itemId: string) => {
    setFormItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.id !== itemId)));
  };

  const handleSaveMemo = async (status: 'completed' | 'draft') => {
    if (formItems.length === 0) return;
    setSubmitting(true);

    if (editingMemoNo) {
      const res = await updateMemo(editingMemoNo, {
        customerName: customerName.trim() || 'নগদ ক্রেতা',
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: formItems,
        discount: formDiscount,
        transportCost: formTransport,
        paymentMethod,
        paidAmount: effectivePaid,
        date: memoDate,
        status,
      });
      setSubmitting(false);
      if (!res.success) {
        showError(res.error || 'মেমো আপডেট ব্যর্থ');
        return;
      }
      setShowMemoForm(false);
      setEditingMemoNo(null);
      if (res.memo) setSelectedMemo(res.memo);
      showToast(`মেমো #${toBengaliNumber(editingMemoNo)} সফলভাবে আপডেট করা হয়েছে!`);
    } else {
      const res = await addMemo({
        customerName: customerName.trim() || 'নগদ ক্রেতা',
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: formItems,
        discount: formDiscount,
        transportCost: formTransport,
        paymentMethod,
        paidAmount: effectivePaid,
        date: memoDate,
        status,
        createGatePass: status === 'completed' && alsoGenerateGatePass && formBagCount > 0,
        receiverName: receiverName.trim(),
        vehicleNumber: vehicleNumber.trim(),
      });
      setSubmitting(false);
      if (!res.success || !res.memo) {
        showError(res.error || 'মেমো তৈরি ব্যর্থ');
        return;
      }
      setShowMemoForm(false);
      setSelectedMemo(res.memo);
      setIsPrintOpen(true);
      showToast(
        status === 'draft'
          ? `খসড়া মেমো #${toBengaliNumber(res.memo.memoNo)} সংরক্ষণ করা হয়েছে!`
          : `নতুন মেমো #${toBengaliNumber(res.memo.memoNo)} তৈরি হয়েছে${res.memo.gatePassNo ? ` (গেট পাস: ${res.memo.gatePassNo})` : ''}!`
      );
    }
  };

  const handleDeleteMemo = async (memoNo: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে মেমো #${toBengaliNumber(memoNo)} বাতিল/মুছে ফেলতে চান? (স্টক স্বয়ংক্রিয়ভাবে রিভার্সাল হবে)`)) {
      return;
    }
    const res = await deleteMemo(memoNo);
    if (!res.success) {
      showError(res.error || 'মেমো বাতিল ব্যর্থ');
      return;
    }
    showToast(`মেমো #${toBengaliNumber(memoNo)} বাতিল ও স্টক রিভার্সাল সম্পন্ন হয়েছে।`);
  };

  const handleOpenGatePassForMemo = async (memo: MemoData) => {
    const existing = gatePasses.find(
      (g) => g.id === memo.gatePassId || g.memoNo === memo.memoNo
    );
    if (existing) {
      setSelectedGatePass(existing);
      setIsGatePassOpen(true);
      return;
    }
    const bagItems = memo.items
      .filter((it) => !isRetailFlourItem(it) && it.quantity > 0)
      .map((it) => ({ productName: it.product, bags: it.quantity }));
    if (bagItems.length === 0) {
      showError('এই মেমোতে কোনো বস্তা পণ্য নেই, তাই গেট পাস প্রযোজ্য নয়।');
      return;
    }
    const res = await createGatePass({
      memoNo: memo.memoNo,
      items: bagItems,
    });
    if (res.success && res.gatePass) {
      setSelectedGatePass(res.gatePass);
      setIsGatePassOpen(true);
      showToast(`গেট পাস ${res.gatePass.gatePassNo} তৈরি হয়েছে!`);
    } else {
      showError(res.error || 'গেট পাস তৈরি ব্যর্থ');
    }
  };

  const handleCreateStandaloneGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    const bags = Math.max(1, Math.floor(Number(gpBags) || 0));
    const res = await createGatePass({
      memoNo: gpMemoNo.trim() || undefined,
      items: [{ productName: gpProductName, bags }],
      receiverName: gpReceiver.trim() || undefined,
      vehicleNumber: gpVehicle.trim() || undefined,
    });
    if (res.success && res.gatePass) {
      setShowStandaloneGpForm(false);
      setGpMemoNo('');
      setGpReceiver('');
      setGpVehicle('');
      setSelectedGatePass(res.gatePass);
      setIsGatePassOpen(true);
      showToast(`নতুন গেট পাস ${res.gatePass.gatePassNo} সংরক্ষণ হয়েছে!`);
    } else {
      showError(res.error || 'গেট পাস তৈরি ব্যর্থ');
    }
  };

  const handleSaveInlineRetailEdit = async (memoNo: string, itemId: string) => {
    const newAmt = Math.max(0, parseFloat(editRetailAmount) || 0);
    await updateRetailFlourEntry(memoNo, itemId, newAmt, editRetailNote);
    setEditingRetailKey(null);
    showToast('খুচরা ময়দা এন্ট্রি আপডেট এবং দৈনিক হিসাব পুনর্গণনা করা হয়েছে!');
  };

  const handleDeleteInlineRetail = async (memoNo: string, itemId: string) => {
    if (window.confirm('আপনি কি এই খুচরা ময়দা বিক্রয় এন্ট্রিটি মুছে ফেলতে চান?')) {
      await deleteRetailFlourEntry(memoNo, itemId);
      showToast('খুচরা ময়দা এন্ট্রি মুছে ফেলা হয়েছে এবং মোট বিক্রয় পুনর্গণনা হয়েছে।');
    }
  };

  const filteredMemos = useMemo(() => {
    return memos.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.customerName.toLowerCase().includes(q) ||
        m.memoNo.includes(q) ||
        (m.customerPhone && m.customerPhone.includes(q)) ||
        m.items.some((it) => it.product.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (memoFilter === 'retail') return m.retailFlourTotal > 0;
      if (memoFilter === 'due') return m.dueAmount > 0 && m.status === 'completed';
      if (memoFilter === 'draft') return m.status === 'draft';
      return true;
    });
  }, [memos, searchQuery, memoFilter]);

  const filteredGatePasses = useMemo(() => {
    const q = gpSearchQuery.toLowerCase().trim();
    if (!q) return gatePasses;
    return gatePasses.filter(
      (g) =>
        g.gatePassNo.toLowerCase().includes(q) ||
        (g.memoNo && g.memoNo.includes(q)) ||
        (g.receiverName && g.receiverName.toLowerCase().includes(q)) ||
        (g.vehicleNumber && g.vehicleNumber.toLowerCase().includes(q)) ||
        g.items.some((it) => it.productName.toLowerCase().includes(q))
    );
  }, [gatePasses, gpSearchQuery]);

  const handleDownloadSalesPdf = async () => {
    setIsExportingPdf(true);
    try {
      const success = await exportElementToPdf('sales-report-printable-section', {
        filename: `মা_ফ্লাওয়ার_মিল_বিক্রয়_রিপোর্ট_${new Date().toISOString().slice(0, 10)}`,
      });
      if (success) showToast('বিক্রয় রিপোর্ট পিডিএফ হিসেবে সেভ হয়েছে!');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-5 pb-10 relative">
      {toastMsg && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-white shadow-xl text-xs sm:text-sm font-bold">
          <Check className="h-4 w-4 text-emerald-300 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-50 flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-white shadow-xl text-xs sm:text-sm font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tester Mode Banner */}
      {permissions.isTester && (
        <div className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-xs text-sky-950 flex items-center gap-2.5 shadow-2xs">
          <ShieldCheck className="h-5 w-5 text-sky-700 shrink-0" />
          <div>
            <p className="font-bold">টেস্টার অ্যাক্সেস মোড ({user?.name})</p>
            <p className="text-sky-800">
              আপনি বিক্রয় মেমো, খসড়া (Draft) মেমো এবং গেট পাস তৈরি ও প্রিন্ট করতে পারবেন। আপনার তৈরি সকল রেকর্ডে "Created by Tester" ট্যাগ যুক্ত থাকবে।
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
          {!permissions.isTester && (
            <>
              <NavLink to="/" className="hover:text-emerald-800">ড্যাশবোর্ড</NavLink>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="font-semibold text-stone-800">বিক্রয় মেমো ও গেট পাস</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400 shadow-sm shrink-0">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                ক্রেতার মেমো, খুচরা ময়দা ও গেট পাস
              </h1>
              <p className="text-xs sm:text-sm text-stone-500">
                পৃথক ক্রেতার মেমো PDF ও গেট পাস (বস্তা সংখ্যা মাত্র) PDF ব্যবস্থাপনা
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!permissions.isTester && (
              <button
                type="button"
                onClick={handleDownloadSalesPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-2xs"
              >
                <FileDown className="h-4 w-4 text-amber-300" />
                <span>{isExportingPdf ? 'পিডিএফ হচ্ছে...' : 'বিক্রয় রিপোর্ট পিডিএফ'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowStandaloneGpForm(!showStandaloneGpForm)}
              className="flex items-center gap-1.5 rounded-lg border border-sky-400 bg-sky-50 hover:bg-sky-100 px-3.5 py-2 text-xs font-bold text-sky-950 transition-all"
            >
              <Truck className="h-4 w-4 text-sky-700" />
              <span>নতুন গেট পাস</span>
            </button>

            <button
              type="button"
              onClick={() => openNewMemoForm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-950 transition-all"
            >
              <Coins className="h-4 w-4 text-amber-600" />
              <span>+ খুচরা ময়দা (টাকা)</span>
            </button>

            <button
              type="button"
              onClick={() => (showMemoForm && !editingMemoNo ? setShowMemoForm(false) : openNewMemoForm(false))}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#ea7a1a] hover:bg-[#d96a10] px-4 py-2 text-xs font-bold text-white transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন ক্রেতার মেমো</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs: Customer Memos vs Gate Passes */}
        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('memos')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'memos'
                ? 'bg-[#0d381e] text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            ক্রেতার মেমো তালিকা ({toBengaliNumber(memos.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gatepasses')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'gatepasses'
                ? 'bg-sky-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            গেট পাস রেজিস্টার ({toBengaliNumber(gatePasses.length)})
          </button>
        </div>
      </div>

      {/* Standalone Gate Pass Form */}
      {showStandaloneGpForm && (
        <div className="rounded-2xl border-2 border-sky-300 bg-sky-50/40 p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-sky-200 pb-3 mb-4">
            <h2 className="text-sm font-black text-sky-950 flex items-center gap-2">
              <Truck className="h-4 w-4 text-sky-700" />
              নতুন গেট পাস তৈরি (শুধুমাত্র বস্তার সংখ্যা — কোনো দাম বা কেজি নয়)
            </h2>
            <button
              type="button"
              onClick={() => setShowStandaloneGpForm(false)}
              className="text-xs font-bold text-stone-600 hover:text-stone-900"
            >
              ✕ বন্ধ
            </button>
          </div>
          <form onSubmit={handleCreateStandaloneGatePass} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end">
            <div>
              <label className="block font-bold text-stone-700 mb-1">পণ্যের নাম</label>
              <select
                value={gpProductName}
                onChange={(e) => setGpProductName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
              >
                <option value="আটা">আটা</option>
                <option value="ময়দা">ময়দা</option>
                <option value="ভুসি">ভুসি</option>
                <option value="সুজি">সুজি</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">বস্তার সংখ্যা</label>
              <input
                type="number"
                required
                min="1"
                value={gpBags}
                onChange={(e) => setGpBags(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">ড্রাইভার / প্রাপক (ঐচ্ছিক)</label>
              <input
                type="text"
                value={gpReceiver}
                onChange={(e) => setGpReceiver(e.target.value)}
                placeholder="নাম"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">গাড়ির নম্বর (ঐচ্ছিক)</label>
              <input
                type="text"
                value={gpVehicle}
                onChange={(e) => setGpVehicle(e.target.value)}
                placeholder="বগুড়া-ট-..."
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full rounded-lg bg-sky-800 hover:bg-sky-900 text-white py-2.5 px-4 font-bold"
              >
                গেট পাস তৈরি ও প্রিন্ট
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Customer Memo Form */}
      {showMemoForm && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0d381e] text-amber-400">
                <Receipt className="h-4 w-4" />
              </span>
              <h2 className="text-sm sm:text-base font-black text-amber-950">
                {editingMemoNo
                  ? `মেমো সম্পাদনা (#${toBengaliNumber(editingMemoNo)})`
                  : 'নতুন ক্রেতার মেমো ফর্ম'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMemoForm(false);
                setEditingMemoNo(null);
              }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-600 hover:bg-stone-200/70"
            >
              <X className="h-4 w-4" />
              <span>বাতিল</span>
            </button>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-stone-700 mb-1">ক্রেতার নাম / দোকান</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="যেমন: ভাই ভাই ট্রেডার্স"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01712345678"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">ঠিকানা (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="বগুড়া"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">তারিখ</label>
                <input
                  type="text"
                  value={memoDate}
                  onChange={(e) => setMemoDate(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                  মেমো পণ্যের তালিকা (বস্তাভিত্তিক ও খুচরা ময়দা)
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormItems((prev) => [...prev, createEmptyBagItem()])}
                    className="flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-800"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>+ বস্তা পণ্য</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormItems((prev) => [...prev, createEmptyRetailItem(500)])}
                    className="flex items-center gap-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1.5 text-xs font-bold text-amber-950"
                  >
                    <Coins className="h-3.5 w-3.5 text-amber-700" />
                    <span>+ খুচরা ময়দা (৳)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {formItems.map((item, idx) => {
                  const isRetail = isRetailFlourItem(item);
                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end rounded-xl p-3 border ${
                        isRetail ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200 bg-stone-50/60'
                      }`}
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          {toBengaliNumber(idx + 1)}. পণ্যের নাম
                        </label>
                        <select
                          value={isRetail ? RETAIL_FLOUR_LABEL : item.product}
                          onChange={(e) => handleItemProductChange(item.id, e.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-bold text-stone-800"
                        >
                          <option value="আটা (৫০ কেজি বস্তা)">আটা (৫০ কেজি বস্তা)</option>
                          <option value="ময়দা (৫০ কেজি বস্তা)">ময়দা (৫০ কেজি বস্তা)</option>
                          <option value="ভুসি (৩৫ কেজি বস্তা)">ভুসি (৩৫ কেজি বস্তা)</option>
                          <option value="সুজি (৫০ কেজি বস্তা)">সুজি (৫০ কেজি বস্তা)</option>
                          <option value={RETAIL_FLOUR_LABEL}>খুচরা ময়দা (সরাসরি টাকা — বস্তা নয়)</option>
                        </select>
                      </div>

                      {isRetail ? (
                        <>
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-amber-900 mb-1">
                              খুচরা ময়দা মূল্য (৳ টাকা)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.total || ''}
                              onChange={(e) => handleRetailFieldChange(item.id, 'total', e.target.value)}
                              className="w-full rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-black text-amber-950"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-bold text-stone-600 mb-1">
                              নোট (বস্তা গণনায় যুক্ত নয়)
                            </label>
                            <input
                              type="text"
                              value={item.note || ''}
                              onChange={(e) => handleRetailFieldChange(item.id, 'note', e.target.value)}
                              placeholder="সকালের খুচরা বিক্রি"
                              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-stone-600 mb-1">বস্তা সংখ্যা</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity || ''}
                              onChange={(e) => handleBagFieldChange(item.id, 'quantity', e.target.value)}
                              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-bold"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-stone-600 mb-1">দর (৳/বস্তা)</label>
                            <input
                              type="number"
                              min="1"
                              value={item.rate || ''}
                              onChange={(e) => handleBagFieldChange(item.id, 'rate', e.target.value)}
                              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-bold"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">পণ্য মোট</label>
                            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-black text-stone-900">
                              {formatBengaliCurrency(item.total)}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveFormItem(item.id)}
                          disabled={formItems.length <= 1}
                          className="rounded-lg border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Discount, Transport Cost, Payment Method & Optional Gate Pass */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-stone-200 bg-white p-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">পরিবহন খরচ (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={transportInput}
                  onChange={(e) => setTransportInput(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">ডিসকাউন্ট / ছাড় (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-bold"
                >
                  <option value="Cash">নগদ (Cash)</option>
                  <option value="Bank">ব্যাংক (Bank)</option>
                  <option value="Due">বাকি (Due)</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>
              {!editingMemoNo && formBagCount > 0 && (
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 font-bold text-sky-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alsoGenerateGatePass}
                      onChange={(e) => setAlsoGenerateGatePass(e.target.checked)}
                      className="rounded accent-sky-700"
                    />
                    <span>সাথে গেট পাস তৈরি করুন</span>
                  </label>
                  {alsoGenerateGatePass && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="ড্রাইভার"
                        className="rounded border border-sky-200 px-2 py-1 text-[11px]"
                      />
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="গাড়ি নং"
                        className="rounded border border-sky-200 px-2 py-1 text-[11px]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grand Calculation & Submit */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-xl border border-emerald-200 bg-white p-4">
              <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-200">
                  <span className="text-stone-500 block">মোট বস্তা</span>
                  <span className="text-sm font-black text-stone-900">{toBengaliNumber(formBagCount)} বস্তা</span>
                </div>
                <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-200">
                  <span className="text-stone-500 block">পণ্য মোট</span>
                  <span className="text-sm font-black text-stone-900">{formatBengaliCurrency(formProductTotal)}</span>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200">
                  <span className="text-amber-800 block font-semibold">খুচরা ময়দা (৳)</span>
                  <span className="text-sm font-black text-amber-950">{formatBengaliCurrency(formRetailTotal)}</span>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2.5 border border-emerald-300">
                  <span className="text-emerald-800 block font-semibold">সর্বমোট বিল</span>
                  <span className="text-sm font-black text-emerald-950">{formatBengaliCurrency(formGrandTotal)}</span>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-stone-700">নগদ গ্রহণ (৳)</label>
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fullPaidChecked}
                        onChange={(e) => {
                          setFullPaidChecked(e.target.checked);
                          if (e.target.checked) setPaidAmountInput(String(formGrandTotal));
                        }}
                        className="rounded accent-emerald-700"
                      />
                      <span>সম্পূর্ণ নগদ</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    min="0"
                    disabled={fullPaidChecked}
                    value={fullPaidChecked ? formGrandTotal : paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold disabled:bg-stone-100"
                  />
                  <span className="text-[11px] font-semibold text-rose-600 mt-0.5 block">
                    বকেয়া: {formatBengaliCurrency(formDue)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSaveMemo('completed')}
                    className="rounded-xl bg-[#0d381e] hover:bg-[#134e2a] disabled:opacity-60 text-white px-4 py-2 text-xs font-bold shadow-sm"
                  >
                    {submitting ? 'সংরক্ষণ হচ্ছে...' : editingMemoNo ? 'আপডেট করুন ✓' : 'চূড়ান্ত সংরক্ষণ ও প্রিন্ট'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSaveMemo('draft')}
                    className="rounded-lg border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1.5 text-[11px] font-bold"
                  >
                    খসড়া (Draft) সংরক্ষণ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'memos' ? (
        <div id="sales-report-printable-section" className="space-y-5 bg-white sm:p-2 rounded-2xl">
          {/* Letterhead shown inside generated PDF & print */}
          <div className="hidden pdf-only-block print:block border-b-2 border-[#0d381e] pb-3 text-center">
            <p className="text-[11px] font-bold text-amber-800">|| শ্রী গনেশায় নমঃ ||</p>
            <h2 className="text-xl font-black text-[#0d381e]">{millConfig.name}</h2>
            <p className="text-xs text-stone-600">{millConfig.location} | মোবাইল: {toBengaliNumber(millConfig.phone)}</p>
            <p className="mt-1 inline-block rounded bg-[#0d381e] text-white px-3 py-0.5 text-xs font-bold">
              বিক্রয়, খুচরা ময়দা ও ক্রেতার মেমো রিপোর্ট • তারিখ: {toBengaliNumber(new Date().toLocaleDateString('en-GB'))}
            </p>
          </div>

          {/* Summary cards hidden for TESTER to satisfy Tester restriction ("Cannot view sensitive financial reports") */}
          {!permissions.isTester && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-600">বস্তাভিত্তিক বিক্রয় (আজ)</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-stone-900">
                  {formatBengaliCurrency(dailySummary.bagBasedSales)}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-stone-500">
                  মোট বিক্রিত বস্তা: <strong className="text-stone-800">{toBengaliNumber(dailySummary.totalBagsSold)} বস্তা</strong>
                </p>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950">খুচরা ময়দা বিক্রয় (আজ)</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200/80 text-amber-900">
                    <Coins className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-amber-950">
                  {formatBengaliCurrency(dailySummary.retailFlourSales)}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-800">
                    {toBengaliNumber(dailySummary.retailFlourEntryCount)} টি এন্ট্রি
                  </span>
                  <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                    বস্তা হিসাব ব্যতীত
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-[#0d381e] to-emerald-950 p-4 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-200">আজকের সর্বমোট বিক্রয়</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700/50 text-amber-300">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-white">
                  {formatBengaliCurrency(dailySummary.totalDailySales)}
                </p>
                <p className="mt-1 text-[11px] text-emerald-200">বস্তা + খুচরা ময়দা সম্মিলিত আয়</p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-600">নগদ আদায় ও বকেয়া</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-700">
                  {formatBengaliCurrency(dailySummary.totalPaidToday)}
                </p>
                <p className="mt-1 text-[11px] font-bold text-rose-600">
                  আজকের বকেয়া: {formatBengaliCurrency(dailySummary.totalDueToday)}
                </p>
              </div>
            </div>
          )}

          {/* Separate Retail Flour Entries Table (Hidden for Tester) */}
          {!permissions.isTester && (
            <div className="overflow-hidden rounded-xl border border-amber-300 bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 bg-amber-50/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-700" />
                  <h2 className="text-sm font-extrabold text-amber-950">
                    আজকের খুচরা ময়দা বিক্রয় এন্ট্রি (সরাসরি টাকা — বস্তা গণনায় যুক্ত নয়)
                  </h2>
                </div>
                <span className="text-xs font-extrabold text-amber-950 bg-white px-2.5 py-1 rounded-lg border border-amber-300">
                  মোট খুচরা ময়দা: {formatBengaliCurrency(dailySummary.retailFlourSales)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-700">
                      <th className="py-2.5 px-4">মেমো নং</th>
                      <th className="py-2.5 px-4">ক্রেতা</th>
                      <th className="py-2.5 px-4">বিবরণ / নোট</th>
                      <th className="py-2.5 px-4">বস্তা সংখ্যা</th>
                      <th className="py-2.5 px-4 text-right">বিক্রয় মূল্য (৳)</th>
                      <th className="py-2.5 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {dailySummary.todayRetailEntries.length > 0 ? (
                      dailySummary.todayRetailEntries.map((entry) => {
                        const rowKey = `${entry.memoNo}-${entry.itemId}`;
                        const isEditing = editingRetailKey === rowKey;
                        return (
                          <tr key={rowKey} className="hover:bg-amber-50/40">
                            <td className="py-2.5 px-4 font-bold text-stone-900">#{toBengaliNumber(entry.memoNo)}</td>
                            <td className="py-2.5 px-4 font-semibold">{entry.customerName}</td>
                            <td className="py-2.5 px-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editRetailNote}
                                  onChange={(e) => setEditRetailNote(e.target.value)}
                                  className="w-full rounded border border-stone-300 px-2 py-1 text-xs"
                                />
                              ) : (
                                <span>{entry.note}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-500">
                                প্রযোজ্য নয় (টাকা)
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-amber-950">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={editRetailAmount}
                                  onChange={(e) => setEditRetailAmount(e.target.value)}
                                  className="w-28 rounded border border-amber-400 px-2 py-1 text-right text-xs font-bold"
                                />
                              ) : (
                                formatBengaliCurrency(entry.amount)
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineRetailEdit(entry.memoNo, entry.itemId)}
                                    className="rounded bg-emerald-700 text-white px-2 py-1 text-[11px] font-bold"
                                  >
                                    সেভ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingRetailKey(null)}
                                    className="rounded bg-stone-200 px-2 py-1 text-[11px] font-bold"
                                  >
                                    বাতিল
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRetailKey(rowKey);
                                      setEditRetailAmount(String(entry.amount));
                                      setEditRetailNote(entry.note);
                                    }}
                                    className="rounded border border-stone-300 bg-white p-1 text-stone-700 hover:bg-amber-50"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  {permissions.isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInlineRetail(entry.memoNo, entry.itemId)}
                                      className="rounded border border-stone-200 bg-white p-1 text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-5 text-center text-stone-500">
                          আজ কোনো খুচরা ময়দা এন্ট্রি নেই।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Memos Table */}
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-stone-800">ক্রেতার মেমো তালিকা</h2>
                <span className="text-xs font-semibold text-stone-500">({toBengaliNumber(filteredMemos.length)} টি)</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ক্রেতা বা মেমো খুঁজুন..."
                    className="rounded-lg border border-stone-300 bg-white pl-8 pr-3 py-1.5 text-xs"
                  />
                </div>

                <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-xs font-bold">
                  {(['all', 'retail', 'due', 'draft'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMemoFilter(f)}
                      className={`px-2.5 py-1 rounded-md ${
                        memoFilter === f ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      {f === 'all' ? 'সকল' : f === 'retail' ? 'খুচরা ময়দা' : f === 'due' ? 'বকেয়া' : 'খসড়া'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/70 font-bold text-stone-700">
                    <th className="py-3 px-3">মেমো নং</th>
                    <th className="py-3 px-3">তারিখ ও ক্রেতা</th>
                    <th className="py-3 px-3">পণ্যের বিবরণ</th>
                    <th className="py-3 px-3 text-center">বস্তা</th>
                    <th className="py-3 px-3 text-right">সর্বমোট বিল</th>
                    <th className="py-3 px-3 text-right">পরিশোধ / বকেয়া</th>
                    <th className="py-3 px-3 text-right">ক্রেতার মেমো / গেট পাস / অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMemos.map((memo) => {
                    const canEdit = !permissions.isTester || memo.status === 'draft';
                    const canDelete = permissions.isOwner || (permissions.isTester && memo.status === 'draft');
                    return (
                      <tr key={memo.memoNo} className="hover:bg-amber-50/30">
                        <td className="py-3 px-3 font-black text-stone-900">
                          #{toBengaliNumber(memo.memoNo)}
                          {memo.status === 'draft' && (
                            <span className="block mt-1 rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] w-fit">
                              খসড়া
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-stone-900">{memo.customerName}</div>
                          <div className="text-[11px] text-stone-500">
                            {toBengaliNumber(memo.date)} • {memo.paymentMethod}
                          </div>
                          {memo.testerTag && (
                            <div className="mt-1 inline-block rounded bg-sky-100 border border-sky-200 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                              {memo.testerTag}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            {memo.items.map((it, i) => (
                              <div key={i} className="text-[11px]">
                                {isRetailFlourItem(it) ? (
                                  <span className="font-bold text-amber-900">
                                    • খুচরা ময়দা: {formatBengaliCurrency(it.total)}
                                  </span>
                                ) : (
                                  <span>
                                    • {it.product} × {toBengaliNumber(it.quantity)} বস্তা
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#0d381e]">
                          {toBengaliNumber(memo.bagCount)} বস্তা
                        </td>
                        <td className="py-3 px-3 text-right font-black text-stone-900">
                          {formatBengaliCurrency(memo.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-emerald-700">{formatBengaliCurrency(memo.paidAmount)}</div>
                          {memo.dueAmount > 0 && (
                            <div className="text-[11px] font-bold text-rose-600">
                              বকেয়া: {formatBengaliCurrency(memo.dueAmount)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex flex-wrap justify-end items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMemo(memo);
                                setIsPrintOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] text-white px-2.5 py-1.5 text-[11px] font-bold"
                            >
                              <Printer className="h-3 w-3" />
                              <span>ক্রেতার মেমো PDF</span>
                            </button>

                            {memo.bagCount > 0 && memo.status === 'completed' && (
                              <button
                                type="button"
                                onClick={() => handleOpenGatePassForMemo(memo)}
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white px-2.5 py-1.5 text-[11px] font-bold"
                              >
                                <Truck className="h-3 w-3" />
                                <span>{memo.gatePassNo ? `গেট পাস (${memo.gatePassNo})` : 'গেট পাস PDF'}</span>
                              </button>
                            )}

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openEditMemoForm(memo)}
                                title="সম্পাদনা"
                                className="rounded-lg border border-stone-300 bg-white p-1.5 text-stone-700 hover:bg-amber-50"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMemo(memo.memoNo)}
                                title="বাতিল/মুছুন"
                                className="rounded-lg border border-stone-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
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
        /* Gate Pass Register Tab */
        <div className="overflow-hidden rounded-xl border border-sky-200 bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-200 bg-sky-50/70 px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-sky-950">সংরক্ষিত গেট পাস তালিকা (Gate Pass Register)</h2>
              <p className="text-[11px] text-sky-800">গেট নিরাপত্তার জন্য শুধুমাত্র পণ্যের নাম ও বস্তার সংখ্যা সংরক্ষিত থাকে</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                value={gpSearchQuery}
                onChange={(e) => setGpSearchQuery(e.target.value)}
                placeholder="গেট পাস নং, গাড়ি বা পণ্য খুঁজুন..."
                className="rounded-lg border border-stone-300 bg-white pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-700">
                  <th className="py-3 px-4">গেট পাস নং</th>
                  <th className="py-3 px-4">তারিখ ও সময়</th>
                  <th className="py-3 px-4">পণ্য ও বস্তার সংখ্যা</th>
                  <th className="py-3 px-4 text-center">মোট বস্তা</th>
                  <th className="py-3 px-4">ড্রাইভার / গাড়ি</th>
                  <th className="py-3 px-4">অনুমোদন / ট্যাগ</th>
                  <th className="py-3 px-4 text-right">গেট পাস প্রিন্ট / PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredGatePasses.map((gp) => (
                  <tr key={gp.id} className="hover:bg-sky-50/40">
                    <td className="py-3 px-4 font-black text-sky-900">
                      {gp.gatePassNo}
                      {gp.memoNo && (
                        <span className="block text-[10px] font-semibold text-stone-500">
                          মেমো #{toBengaliNumber(gp.memoNo)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div>{toBengaliNumber(gp.date)}</div>
                      <div className="text-[11px] text-stone-500">{toBengaliNumber(gp.time)}</div>
                    </td>
                    <td className="py-3 px-4">
                      {gp.items.map((it, i) => (
                        <div key={i} className="font-semibold text-stone-800">
                          • {it.productName.replace(/\([^)]*(কেজি|kg)[^)]*\)/gi, '').replace(/[০-৯0-9.]+\s*(কেজি|kg)/gi, '').trim()} —{' '}
                          <span className="text-[#0d381e] font-bold">{toBengaliNumber(it.bags)} বস্তা</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-base text-[#0d381e]">
                      {toBengaliNumber(gp.totalBags)} বস্তা
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      <div>{gp.receiverName || '—'}</div>
                      <div className="text-[11px] text-stone-500">{gp.vehicleNumber || ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-800">{gp.authorizedBy}</div>
                      {gp.testerTag && (
                        <span className="mt-0.5 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                          {gp.testerTag}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGatePass(gp);
                          setIsGatePassOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-800 hover:bg-sky-900 text-white px-3 py-1.5 text-xs font-bold"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>গেট পাস PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Memo Modal */}
      <MemoPrintModal
        memo={selectedMemo}
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        onOpenGatePass={() => {
          if (selectedMemo) {
            setIsPrintOpen(false);
            handleOpenGatePassForMemo(selectedMemo);
          }
        }}
      />

      {/* Gate Pass Modal */}
      <GatePassModal
        gatePass={selectedGatePass}
        isOpen={isGatePassOpen}
        onClose={() => setIsGatePassOpen(false)}
      />
    </div>
  );
};
