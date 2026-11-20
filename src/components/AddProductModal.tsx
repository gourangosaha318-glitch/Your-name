import React, { useState } from 'react';
import { X, Plus, PackagePlus, CheckCircle2 } from 'lucide-react';
import { useProducts, ProductItem } from '../context/ProductContext';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (productName: string) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addProduct } = useProducts();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductItem['category']>('আটা');
  const [stock, setStock] = useState('50');
  const [unit, setUnit] = useState<ProductItem['unit']>('বস্তা');
  const [unitPrice, setUnitPrice] = useState('1200');
  const [minReorderLevel, setMinReorderLevel] = useState('15');
  const [godown, setGodown] = useState('১ নং গুদাম');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Pick a thematic color based on category
    let color = '#ea580c';
    if (category === 'ময়দা') color = '#0d9488';
    if (category === 'ভুসি') color = '#0284c7';
    if (category === 'সুজি') color = '#7e22ce';
    if (category === 'গম') color = '#d97706';
    if (category === 'অন্যান্য') color = '#64748b';

    addProduct({
      name: name.trim(),
      category,
      stock: parseFloat(stock) || 0,
      unit,
      unitPrice: parseFloat(unitPrice) || 0,
      minReorderLevel: parseFloat(minReorderLevel) || 10,
      godown: godown.trim() || '১ নং গুদাম',
      color,
    });

    setSubmitted(true);
    if (onSuccess) {
      onSuccess(name.trim());
    }

    setTimeout(() => {
      setSubmitted(false);
      onClose();
      // Reset
      setName('');
      setStock('50');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0d381e] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">নতুন পণ্য যুক্ত করুন</h2>
              <p className="text-[11px] text-emerald-200">মিলের গুদাম ও বিক্রয়ের জন্য নতুন পণ্যের বিবরণ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-emerald-200 hover:bg-emerald-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Product Name */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">
              পণ্যের পূর্ণ নাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: লাল গম আটা (৫০ কেজি বস্তা) বা প্যাকেট আটা ২ কেজি"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">ক্যাটাগরি / পণ্যের ধরন</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductItem['category'])}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="আটা">আটা</option>
                <option value="ময়দা">ময়দা</option>
                <option value="ভুসি">ভুসি</option>
                <option value="সুজি">সুজি</option>
                <option value="গম">কাঁচা গম</option>
                <option value="অন্যান্য">অন্যান্য পণ্য</option>
              </select>
            </div>

            {/* Measurement Unit */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">পরিমাপের একক</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductItem['unit'])}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="বস্তা">বস্তা (Bag)</option>
                <option value="কেজি">কেজি (KG)</option>
                <option value="প্যাকেট">প্যাকেট (Packet)</option>
              </select>
            </div>

            {/* Opening Stock */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                প্রারম্ভিক মজুদ (স্টক পরিমাণ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="যেমন: ৫০"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* Unit Price */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                একক প্রতি আনুমানিক বিক্রয় দর (৳)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="যেমন: ১২০০"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* Minimum Reorder Warning Level */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                সর্বনিম্ন সতর্কতামূলক স্টক মাত্রা
              </label>
              <input
                type="number"
                min="1"
                value={minReorderLevel}
                onChange={(e) => setMinReorderLevel(e.target.value)}
                placeholder="যেমন: ১৫"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* Godown / Warehouse Location */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">গুদামের স্থান / নম্বর</label>
              <input
                type="text"
                value={godown}
                onChange={(e) => setGodown(e.target.value)}
                placeholder="যেমন: ১ নং গুদাম"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
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
              className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] px-5 py-2 font-bold text-white shadow-sm transition-all"
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>পণ্য যুক্ত হয়েছে!</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>পণ্য সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
