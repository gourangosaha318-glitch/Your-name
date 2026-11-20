import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { TransactionModal } from './TransactionModal';

export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#fbf7ee] text-slate-800">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <Topbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />

        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <BottomNav
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenNewTransaction={() => setIsQuickTxOpen(true)}
        />
      </div>

      <TransactionModal
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
        onAddTransaction={() => {
          navigate('/daily-accounts');
        }}
      />
    </div>
  );
};
