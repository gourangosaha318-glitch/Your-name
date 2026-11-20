import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Receipt, PlusCircle, Store, Menu, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  onOpenMobileMenu: () => void;
  onOpenNewTransaction: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  onOpenMobileMenu,
  onOpenNewTransaction,
}) => {
  const { user } = useAuth();
  if (user?.role === 'TESTER') {
    return (
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-lg border-t border-stone-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-2 items-center h-16 px-4 max-w-lg mx-auto">
          <NavLink
            to="/sales"
            className="flex flex-col items-center justify-center text-[#0d381e] font-bold"
          >
            <Receipt className="h-5 w-5" />
            <span className="text-[11px] mt-0.5">বিক্রয় মেমো ও গেট পাস</span>
          </NavLink>
          <button
            onClick={onOpenMobileMenu}
            className="flex flex-col items-center justify-center text-stone-600 font-medium"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[11px] mt-0.5">মেনু</span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-lg border-t border-stone-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-5 items-center h-16 px-1.5 max-w-lg mx-auto">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-all ${
              isActive ? 'text-[#0d381e] font-bold' : 'text-stone-500 hover:text-stone-800'
            }`
          }
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">ড্যাশবোর্ড</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-all ${
              isActive ? 'text-[#0d381e] font-bold' : 'text-stone-500 hover:text-stone-800'
            }`
          }
        >
          <Receipt className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">বিক্রয়</span>
        </NavLink>

        <div className="flex flex-col items-center justify-center relative -top-3">
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-[#0d381e] via-[#14532d] to-[#ea7a1a] text-white shadow-lg ring-4 ring-white"
            aria-label="নতুন লেনদেন"
          >
            <PlusCircle className="h-6 w-6" />
          </button>
          <span className="text-[10px] font-bold text-stone-800 mt-1">এন্ট্রি</span>
        </div>

        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-all ${
              isActive ? 'text-[#0d381e] font-bold' : 'text-stone-500 hover:text-stone-800'
            }`
          }
        >
          <Store className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">স্টক</span>
        </NavLink>

        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center h-full min-h-[48px] py-1 text-stone-600"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">মেনু</span>
        </button>
      </div>
    </nav>
  );
};
