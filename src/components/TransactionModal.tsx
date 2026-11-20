import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { toBengaliNumber } from '../lib/bengaliUtils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: any) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
}) => {
  const [type, setType] = useState<'বিক্রয়' | 'ক্রয়' | 'খরচ'>('বিক্রয়');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const newTx = {
      id: `tx-${Date.now()}`,
      type,
      description,
      quantity: quantity || '-',
      amount: parseFloat(amount) || 0,
      date: new Date().toLocaleDateString('en-GB'),
    };

    onAddTransaction(newTx);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-stone-200 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Drag Indicator Bar */}
        <div className="sm:hidden pt-2 pb-1 bg-[#0d381e]">
          <div className="h-1.5 w-12 rounded-full bg-emerald-700/60 mx-auto" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between bg-[#0d381e] px-5 py-3.5 text-white">
          <h2 className="text-base font-bold">নতুন হিসাব / লেনদেন এন্ট্রি করুন</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-200 hover:bg-emerald-900 active:scale-90 transition-all"
            aria-label="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Transaction Type Segmented Control */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">লেনদেনের ধরন</label>
            <div className="grid grid-cols-3 gap-2">
              {(['বিক্রয়', 'ক্রয়', 'খরচ'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 rounded-lg font-bold border transition-colors ${
                    type === t
                      ? 'bg-[#ea7a1a] text-white border-[#ea7a1a] shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              বিবরণ (মালের নাম / খরচের খাত)
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="যেমন: আটা (৫০ বস্তা) বা বিদ্যুৎ বিল"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              পরিমাণ (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="যেমন: ৫০ বস্তা বা ৩,০০০ কেজি"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Amount in Taka */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              টাকার পরিমাণ (৳)
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="যেমন: 60000"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={submitted}
              className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] px-5 py-2 font-bold text-white hover:bg-[#134e2a] shadow-xs"
            >
              {submitted ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>সংরক্ষিত!</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
