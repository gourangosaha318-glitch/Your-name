import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  ShoppingBag,
  Cog,
  Store,
  Receipt,
  Users,
  Truck,
  UserCheck,
  FileSpreadsheet,
  Landmark,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  Database,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/mill';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export interface MenuItemDef {
  path: string;
  label: string;
  icon: any;
  roles: UserRole[];
}

export const menuItems: MenuItemDef[] = [
  { path: '/', label: 'ড্যাশবোর্ড', icon: Home, roles: ['OWNER', 'MANAGER'] },
  { path: '/daily-accounts', label: 'দৈনিক হিসাব', icon: FileText, roles: ['OWNER', 'MANAGER'] },
  { path: '/wheat-purchase', label: 'গম ক্রয়', icon: ShoppingBag, roles: ['OWNER', 'MANAGER'] },
  { path: '/production', label: 'গম ভাঙানো ও উৎপাদন', icon: Cog, roles: ['OWNER', 'MANAGER'] },
  { path: '/inventory', label: 'গুদাম ও স্টক ইতিহাস', icon: Store, roles: ['OWNER', 'MANAGER'] },
  { path: '/sales', label: 'বিক্রয় মেমো ও গেট পাস', icon: Receipt, roles: ['OWNER', 'MANAGER', 'TESTER'] },
  { path: '/income-expense', label: 'খরচের ভাউচার', icon: FileSpreadsheet, roles: ['OWNER', 'MANAGER'] },
  { path: '/customers', label: 'ক্রেতা খাতা ও লেজার', icon: Users, roles: ['OWNER', 'MANAGER'] },
  { path: '/suppliers', label: 'সরবরাহকারী ও ধরন', icon: Truck, roles: ['OWNER', 'MANAGER'] },
  { path: '/employees', label: 'কর্মচারী লেনদেন', icon: UserCheck, roles: ['OWNER', 'MANAGER'] },
  { path: '/cash-bank', label: 'ক্যাশ ও ব্যাংক (পিন)', icon: Landmark, roles: ['OWNER', 'MANAGER'] },
  { path: '/reports', label: 'দৈনিক পূর্ণাঙ্গ রিপোর্ট', icon: BarChart3, roles: ['OWNER', 'MANAGER'] },
  { path: '/users', label: 'ইউজার ও পারমিশন', icon: ShieldCheck, roles: ['OWNER'] },
  { path: '/audit-logs', label: 'অডিট লগ', icon: History, roles: ['OWNER'] },
  { path: '/settings', label: 'সেটিংস ও ব্যাকআপ', icon: Settings, roles: ['OWNER', 'MANAGER'] },
  { path: '/backup', label: 'ডাটাবেস ব্যাকআপ', icon: Database, roles: ['OWNER'] },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const location = useLocation();
  const { user } = useAuth();
  const role: UserRole = user?.role || 'TESTER';

  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden animate-in fade-in"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 sm:w-64 flex-col bg-[#0d381e] text-white shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="relative flex items-center justify-between border-b border-emerald-900/50 px-4 py-4">
          <NavLink
            to={role === 'TESTER' ? '/sales' : '/'}
            onClick={onCloseMobile}
            className="flex items-center gap-3 group"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-2 shadow-md transition-transform group-hover:scale-105 active:scale-95">
              <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-emerald-950">
                <path d="M12 2C12 2 13.5 6 12 9C10.5 6 12 2 12 2Z" fill="currentColor" />
                <path d="M9.5 4.5C9.5 4.5 11 8 8.5 10.5C7.5 8 9.5 4.5 9.5 4.5Z" fill="currentColor" />
                <path d="M14.5 4.5C14.5 4.5 13 8 15.5 10.5C16.5 8 14.5 4.5 14.5 4.5Z" fill="currentColor" />
                <path d="M7.5 8.5C7.5 8.5 10 11.5 7 13.5C6 11 7.5 8.5 7.5 8.5Z" fill="currentColor" />
                <path d="M16.5 8.5C16.5 8.5 14 11.5 17 13.5C18 11 16.5 8.5 16.5 8.5Z" fill="currentColor" />
                <path d="M12 9V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white leading-tight">
                মা ফ্লাওয়ার মিল
              </span>
              <span className="text-xs font-medium text-emerald-200/90">
                ঘোড়াধাপহাট, বগুড়া
              </span>
            </div>
          </NavLink>

          <button
            onClick={onCloseMobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-emerald-200 hover:bg-emerald-900 active:scale-90 transition-all lg:hidden"
            aria-label="মেনু বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Role Badge */}
        <div className="px-4 py-2 bg-emerald-950/50 border-b border-emerald-900/50 flex items-center justify-between text-[11px]">
          <span className="text-emerald-200/80">ভূমিকা:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold ${
              role === 'OWNER'
                ? 'bg-amber-400 text-emerald-950'
                : role === 'MANAGER'
                ? 'bg-emerald-700 text-white'
                : 'bg-sky-600 text-white'
            }`}
          >
            {user?.roleLabel || role}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 overscroll-contain">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onCloseMobile()}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium min-h-[44px] transition-all duration-150 active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#ea7a1a] text-white shadow-md shadow-orange-950/20 font-semibold'
                    : 'text-emerald-100/90 hover:bg-emerald-900/60 active:bg-emerald-900/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive
                        ? 'text-white'
                        : 'text-emerald-200/80 group-hover:scale-110 group-hover:text-amber-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="relative border-t border-emerald-900/60 bg-gradient-to-b from-[#0b331c] to-[#072413] px-3 py-3 text-center">
          <p className="text-xs font-semibold text-amber-300 tracking-wide">
            সঠিক হিসাব, সফল ব্যবসা
          </p>
          <p className="text-[10px] text-emerald-300/60 mt-0.5">
            মা ফ্লাওয়ার মিল ব্যবস্থাপনা সফটওয়্যার
          </p>
        </div>
      </aside>
    </>
  );
};
