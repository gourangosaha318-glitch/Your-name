import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from './AuthContext';
import { StockHistoryRecord, StockMovementType } from '../types/mill';

export interface ProductItem {
  id: string;
  name: string;
  category: 'আটা' | 'ময়দা' | 'ভুসি' | 'সুজি' | 'গম' | 'অন্যান্য';
  stock: number;
  unit: 'বস্তা' | 'কেজি' | 'প্যাকেট';
  unitPrice: number;
  minReorderLevel: number;
  godown: string;
  color?: string;
  updatedAt: string;
}

interface StockHistoryResult {
  openingStock: number;
  closingStock: number;
  totalIn: number;
  totalOut: number;
  history: StockHistoryRecord[];
}

interface ProductContextType {
  products: ProductItem[];
  loading: boolean;
  refreshProducts: () => Promise<void>;
  addProduct: (product: Omit<ProductItem, 'id' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  adjustStock: (
    id: string,
    transactionType: StockMovementType,
    quantity: number,
    reason: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateStock: (id: string, delta: number, reason?: string) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchStockHistory: (params?: {
    productId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<StockHistoryResult>;
  totalFinishedBags: number;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshProducts = useCallback(async () => {
    if (!isAuthenticated) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ products: any[] }>('/api/products');
      setProducts(
        (res.products || []).map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          stock: Number(p.stock ?? 0),
          unit: p.unit,
          unitPrice: Number(p.unitPrice ?? 0),
          minReorderLevel: Number(p.minReorderLevel ?? 0),
          godown: p.godown || '',
          color: p.color || '#ea580c',
          updatedAt: p.updatedAt || '',
        }))
      );
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const addProduct: ProductContextType['addProduct'] = async (newProd) => {
    try {
      await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(newProd),
      });
      await refreshProducts();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'পণ্য যুক্ত ব্যর্থ' };
    }
  };

  const adjustStock: ProductContextType['adjustStock'] = async (
    id,
    transactionType,
    quantity,
    reason
  ) => {
    try {
      await apiFetch(`/api/products/${id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ transactionType, quantity, reason }),
      });
      await refreshProducts();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'স্টক পরিবর্তন ব্যর্থ' };
    }
  };

  const updateStock: ProductContextType['updateStock'] = async (id, delta, reason) => {
    const type: StockMovementType = delta >= 0 ? 'Stock Added' : 'Stock Removed';
    return adjustStock(
      id,
      type,
      Math.abs(delta),
      reason || (delta >= 0 ? 'দ্রুত স্টক যোগ (+)' : 'দ্রুত স্টক বিয়োগ (-)')
    );
  };

  const deleteProduct: ProductContextType['deleteProduct'] = async (id) => {
    try {
      await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      await refreshProducts();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'পণ্য মুছতে ব্যর্থ' };
    }
  };

  const fetchStockHistory: ProductContextType['fetchStockHistory'] = async (params) => {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', params.productId);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return apiFetch<StockHistoryResult>(`/api/stock-history?${query.toString()}`);
  };

  const totalFinishedBags = products
    .filter((p) => p.unit === 'বস্তা')
    .reduce((sum, p) => sum + p.stock, 0);

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        refreshProducts,
        addProduct,
        adjustStock,
        updateStock,
        deleteProduct,
        fetchStockHistory,
        totalFinishedBags,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
