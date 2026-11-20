import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Calendar,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Settings,
  Database,
  History,
  Video,
} from 'lucide-react';
import { getFormattedHeaderDate } from '../lib/bengaliUtils';
import { useAuth } from '../context/AuthContext';
import { millConfig } from '../data/mock';
import { LoginTutorialVideo } from './LoginTutorialVideo';

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout, permissions } = useAuth();
  const navigate = useNavigate();

  const [dateInfo, setDateInfo] = useState(() => getFormattedHeaderDate());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDateInfo(getFormattedHeaderDate());
    const interval = setInterval(() => {
      setDateInfo(getFormattedHeaderDate());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-stone-200/80 bg-[#fbf7ee]/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onToggleMobileSidebar}
          className="rounded-lg p-2 text-stone-700 hover:bg-stone-200/70 focus:outline-hidden lg:hidden"
          aria-label="মেনু খুলুন"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 rounded-lg border border-stone-200 bg-white/90 px-3.5 py-1.5 shadow-xs text-xs md:text-sm text-stone-700">
          <Calendar className="h-4 w-4 text-emerald-700 shrink-0" />
          <span className="font-semibold text-stone-800">{dateInfo.gregorianFormatted}</span>
          <span className="text-stone-300 font-light">|</span>
          <span className="font-medium text-stone-600">{dateInfo.banglaFormatted}</span>
        </div>

        <div className="sm:hidden text-xs font-semibold text-stone-800 truncate max-w-[200px]">
          {dateInfo.gregorianFormatted.replace('আজ: ', '')}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setShowTutorialModal(true)}
          className="flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50 hover:bg-amber-100 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#0d381e] shadow-2xs transition-colors"
          title="ব্যবহার নিয়ম টিউটোরিয়াল ভিডিও"
          aria-label="ব্যবহার নিয়ম টিউটোরিয়াল ভিডিও"
        >
          <Video className="h-4 w-4 text-[#ea7a1a] shrink-0" />
          <span className="hidden sm:inline">টিউটোরিয়াল ভিডিও</span>
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-stone-200/60 transition-colors focus:outline-hidden"
            aria-label="ব্যবহারকারী মেনু"
          >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-emerald-700/30 bg-emerald-800 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.slice(0, 2) || 'ম'}
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-sm font-bold text-stone-800 leading-none">
                {user?.name || 'ব্যবহারকারী'}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold mt-0.5">
                {user?.roleLabel || ''}
              </span>
            </div>

            <ChevronDown className="h-4 w-4 text-stone-500" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-stone-200 bg-white shadow-xl py-2 z-50">
              <div className="border-b border-stone-100 px-4 py-2">
                <p className="text-sm font-bold text-stone-800">{user?.name}</p>
                <p className="text-xs text-stone-500">@{user?.username} | {user?.roleLabel}</p>
                <p className="mt-1 text-[11px] font-medium text-emerald-700">{millConfig.location}</p>
              </div>

              {permissions.isOwner && (
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/users');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    <ShieldCheck className="h-4 w-4 text-stone-400" />
                    ইউজার ও পারমিশন
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/audit-logs');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    <History className="h-4 w-4 text-stone-400" />
                    অডিট লগ
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    <Settings className="h-4 w-4 text-stone-400" />
                    মিলের সেটিংস
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/backup');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    <Database className="h-4 w-4 text-stone-400" />
                    ডাটাবেস ব্যাকআপ
                  </button>
                </div>
              )}

              <div className="border-t border-stone-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  লগআউট করুন
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

      {showTutorialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto"
          onClick={() => setShowTutorialModal(false)}
        >
          <div
            className="w-full max-w-3xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <LoginTutorialVideo onClose={() => setShowTutorialModal(false)} />
          </div>
        </div>
      )}
    </>
  );
};
