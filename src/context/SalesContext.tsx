import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { GatePassRecord, UserRole } from '../types/mill';

export type MemoItemType = 'bag' | 'retail_flour';

export interface MemoItem {
  id: string;
  productId?: string;
  product: string;
  itemType: MemoItemType;
  quantity: number; // Always 0 for 'retail_flour' — never added to bag count
  unit: string;     // 'বস্তা' for bag items, 'খুচরা (টাকা)' for 'retail_flour'
  rate: number;     // Per bag rate for bag items, 0 for 'retail_flour'
  total: number;    // Direct Taka amount for 'retail_flour', quantity * rate for bag items
  note?: string;
}

export interface MemoData {
  memoNo: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: MemoItem[];
  bagCount: number;           // Strictly excludes 'খুচরা ময়দা'
  bagBasedTotal: number;      // Sum of bag-based items (BDT)
  retailFlourTotal: number;   // Sum of 'খুচরা ময়দা' items (BDT)
  discount: number;
  transportCost: number;
  totalAmount: number;        // Grand Total = (bagBasedTotal + retailFlourTotal) + transportCost - discount
  paidAmount: number;
  dueAmount: number;
  paymentMethod: 'Cash' | 'Bank' | 'Due' | 'Other';
  bankAccountId?: string;
  status: 'completed' | 'draft' | 'cancelled';
  date: string;
  time?: string;
  createdBy?: string;
  createdByRole?: UserRole;
  testerTag?: string;
  gatePassId?: string;
  gatePassNo?: string;
}

export const RETAIL_FLOUR_LABEL = 'খুচরা ময়দা';

export function isRetailFlourItem(item: Pick<MemoItem, 'itemType' | 'product'>): boolean {
  if (item.itemType === 'retail_flour') return true;
  const normalized = (item.product || '').trim();
  return normalized === 'খুচরা ময়দা' || normalized === 'খুচরা ময়দা';
}

export function normalizeAndCalculateMemo(raw: Partial<MemoData> & { items: Partial<MemoItem>[] }): MemoData {
  const normalizedItems: MemoItem[] = (raw.items || []).map((item, idx) => {
    const isRetail = isRetailFlourItem({
      itemType: item.itemType || 'bag',
      product: item.product || '',
    });

    if (isRetail) {
      const amount = Math.max(0, Number(item.total) || 0);
      return {
        id: item.id || `item-${Date.now()}-${idx}`,
        product: RETAIL_FLOUR_LABEL,
        itemType: 'retail_flour',
        quantity: 0, // Strictly 0 bags
        unit: 'খুচরা (টাকা)',
        rate: 0,
        total: amount,
        note: item.note || '',
      };
    }

    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const total = Number(item.total) >= 0 && item.total !== undefined ? Number(item.total) : qty * rate;

    return {
      id: item.id || `item-${Date.now()}-${idx}`,
      productId: item.productId,
      product: item.product || 'আটা (৫০ কেজি বস্তা)',
      itemType: 'bag',
      quantity: qty,
      unit: item.unit || 'বস্তা',
      rate,
      total: qty > 0 && rate > 0 ? qty * rate : total,
      note: item.note || '',
    };
  });

  const bagCount = normalizedItems
    .filter((i) => !isRetailFlourItem(i))
    .reduce((sum, i) => sum + i.quantity, 0);

  const bagBasedTotal = normalizedItems
    .filter((i) => !isRetailFlourItem(i))
    .reduce((sum, i) => sum + i.total, 0);

  const retailFlourTotal = normalizedItems
    .filter((i) => isRetailFlourItem(i))
    .reduce((sum, i) => sum + i.total, 0);

  const discount = Math.max(0, Number(raw.discount) || 0);
  const transportCost = Math.max(0, Number(raw.transportCost) || 0);
  const productTotal = bagBasedTotal + retailFlourTotal;
  const totalAmount = Math.max(0, productTotal + transportCost - discount);
  const paidAmount = Math.max(0, Number(raw.paidAmount) || 0);
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  return {
    memoNo: raw.memoNo || '',
    customerId: raw.customerId,
    customerName: raw.customerName || 'নগদ ক্রেতা',
    customerPhone: raw.customerPhone || '',
    customerAddress: raw.customerAddress || '',
    items: normalizedItems,
    bagCount,
    bagBasedTotal,
    retailFlourTotal,
    discount,
    transportCost,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentMethod: raw.paymentMethod || 'Cash',
    bankAccountId: raw.bankAccountId,
    status: raw.status || 'completed',
    date: raw.date || new Date().toLocaleDateString('en-GB'),
    time: raw.time,
    createdBy: raw.createdBy,
    createdByRole: raw.createdByRole,
    testerTag: raw.testerTag,
    gatePassId: raw.gatePassId,
    gatePassNo: raw.gatePassNo,
  };
}

export function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-GB');
}

export interface RetailFlourEntryRow {
  memoNo: string;
  itemId: string;
  customerName: string;
  date: string;
  amount: number;
  note: string;
}

export interface DailySalesSummary {
  bagBasedSales: number;
  totalBagsSold: number; // Strictly excludes retail flour
  retailFlourSales: number;
  retailFlourEntryCount: number;
  totalDailySales: number;
  totalPaidToday: number;
  totalDueToday: number;
  totalExpenses: number;
  netIncome: number;
  totalDueAllMemos: number;
  todayRetailEntries: RetailFlourEntryRow[];
}

interface SalesContextType {
  memos: MemoData[];
  gatePasses: GatePassRecord[];
  loading: boolean;
  refreshSales: () => Promise<void>;
  addMemo: (
    memoInput: Partial<MemoData> & {
      items: MemoItem[];
      createGatePass?: boolean;
      receiverName?: string;
      vehicleNumber?: string;
    }
  ) => Promise<{ success: boolean; memo?: MemoData; error?: string }>;
  updateMemo: (
    memoNo: string,
    updatedInput: Partial<MemoData> & { items: MemoItem[] }
  ) => Promise<{ success: boolean; memo?: MemoData; error?: string }>;
  deleteMemo: (memoNo: string) => Promise<{ success: boolean; error?: string }>;
  createGatePass: (data: {
    memoNo?: string;
    items: { productName: string; bags: number }[];
    receiverName?: string;
    vehicleNumber?: string;
    authorizedBy?: string;
  }) => Promise<{ success: boolean; gatePass?: GatePassRecord; error?: string }>;
  updateRetailFlourEntry: (memoNo: string, itemId: string, newAmount: number, newNote?: string) => Promise<void>;
  deleteRetailFlourEntry: (memoNo: string, itemId: string) => Promise<void>;
  dailySummary: DailySalesSummary;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { refreshProducts } = useProducts();
  const [memos, setMemos] = useState<MemoData[]>([]);
  const [gatePasses, setGatePasses] = useState<GatePassRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshSales = useCallback(async () => {
    if (!isAuthenticated) {
      setMemos([]);
      setGatePasses([]);
      return;
    }
    setLoading(true);
    try {
      const [memoRes, gpRes] = await Promise.all([
        apiFetch<{ memos: any[] }>('/api/memos'),
        apiFetch<{ gatePasses: GatePassRecord[] }>('/api/gate-passes'),
      ]);
      setMemos((memoRes.memos || []).map((m) => normalizeAndCalculateMemo(m)));
      setGatePasses(gpRes.gatePasses || []);
    } catch (err) {
      console.error('Failed to load sales/gate passes:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSales();
  }, [refreshSales]);

  const addMemo: SalesContextType['addMemo'] = async (memoInput) => {
    try {
      const res = await apiFetch<{ memo: any }>('/api/memos', {
        method: 'POST',
        body: JSON.stringify(memoInput),
      });
      await Promise.all([refreshSales(), refreshProducts()]);
      return { success: true, memo: normalizeAndCalculateMemo(res.memo) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'মেমো সংরক্ষণ ব্যর্থ হয়েছে' };
    }
  };

  const updateMemo: SalesContextType['updateMemo'] = async (memoNo, updatedInput) => {
    try {
      const res = await apiFetch<{ memo: any }>(`/api/memos/${memoNo}`, {
        method: 'PUT',
        body: JSON.stringify(updatedInput),
      });
      await Promise.all([refreshSales(), refreshProducts()]);
      return { success: true, memo: normalizeAndCalculateMemo(res.memo) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'মেমো আপডেট ব্যর্থ হয়েছে' };
    }
  };

  const deleteMemo: SalesContextType['deleteMemo'] = async (memoNo) => {
    try {
      await apiFetch(`/api/memos/${memoNo}`, { method: 'DELETE' });
      await Promise.all([refreshSales(), refreshProducts()]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'মেমো বাতিল ব্যর্থ হয়েছে' };
    }
  };

  const createGatePass: SalesContextType['createGatePass'] = async (data) => {
    try {
      const res = await apiFetch<{ gatePass: GatePassRecord }>('/api/gate-passes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await refreshSales();
      return { success: true, gatePass: res.gatePass };
    } catch (err: any) {
      return { success: false, error: err?.message || 'গেট পাস তৈরি ব্যর্থ হয়েছে' };
    }
  };

  const updateRetailFlourEntry = async (
    memoNo: string,
    itemId: string,
    newAmount: number,
    newNote?: string
  ) => {
    const target = memos.find((m) => m.memoNo === memoNo);
    if (!target) return;
    const nextItems = target.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            total: Math.max(0, Number(newAmount) || 0),
            note: newNote !== undefined ? newNote : item.note,
          }
        : item
    );
    const wasFullyPaid = target.paidAmount >= target.totalAmount;
    const nextCalc = normalizeAndCalculateMemo({ ...target, items: nextItems });
    await updateMemo(memoNo, {
      ...nextCalc,
      paidAmount: wasFullyPaid ? nextCalc.totalAmount : target.paidAmount,
    });
  };

  const deleteRetailFlourEntry = async (memoNo: string, itemId: string) => {
    const target = memos.find((m) => m.memoNo === memoNo);
    if (!target) return;
    const remainingItems = target.items.filter((item) => item.id !== itemId);
    if (remainingItems.length === 0) {
      await deleteMemo(memoNo);
      return;
    }
    const wasFullyPaid = target.paidAmount >= target.totalAmount;
    const nextCalc = normalizeAndCalculateMemo({ ...target, items: remainingItems });
    await updateMemo(memoNo, {
      ...nextCalc,
      paidAmount: wasFullyPaid ? nextCalc.totalAmount : target.paidAmount,
    });
  };

  const dailySummary = useMemo<DailySalesSummary>(() => {
    const todayStr = getTodayDateString();
    const todayMemos = memos.filter((m) => m.date === todayStr && m.status === 'completed');

    const bagBasedSales = todayMemos.reduce((sum, m) => sum + m.bagBasedTotal, 0);
    const totalBagsSold = todayMemos.reduce((sum, m) => sum + m.bagCount, 0);
    const retailFlourSales = todayMemos.reduce((sum, m) => sum + m.retailFlourTotal, 0);
    const totalDailySales = todayMemos.reduce((sum, m) => sum + m.totalAmount, 0);
    const totalPaidToday = todayMemos.reduce((sum, m) => sum + m.paidAmount, 0);
    const totalDueToday = todayMemos.reduce((sum, m) => sum + m.dueAmount, 0);

    const todayRetailEntries: RetailFlourEntryRow[] = [];
    todayMemos.forEach((m) => {
      m.items.forEach((item) => {
        if (isRetailFlourItem(item)) {
          todayRetailEntries.push({
            memoNo: m.memoNo,
            itemId: item.id,
            customerName: m.customerName,
            date: m.date,
            amount: item.total,
            note: item.note || 'খুচরা ময়দা বিক্রয়',
          });
        }
      });
    });

    const totalExpenses = 0;
    const totalDueAllMemos = memos
      .filter((m) => m.status === 'completed')
      .reduce((sum, m) => sum + m.dueAmount, 0);

    return {
      bagBasedSales,
      totalBagsSold,
      retailFlourSales,
      retailFlourEntryCount: todayRetailEntries.length,
      totalDailySales,
      totalPaidToday,
      totalDueToday,
      totalExpenses,
      netIncome: Math.max(0, totalDailySales - totalExpenses),
      totalDueAllMemos,
      todayRetailEntries,
    };
  }, [memos]);

  return (
    <SalesContext.Provider
      value={{
        memos,
        gatePasses,
        loading,
        refreshSales,
        addMemo,
        updateMemo,
        deleteMemo,
        createGatePass,
        updateRetailFlourEntry,
        deleteRetailFlourEntry,
        dailySummary,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};
