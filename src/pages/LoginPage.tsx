import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, UserCog, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { millConfig } from '../data/mock';
import { UserRole } from '../types/mill';

export const LoginPage: React.FC = () => {
  const { login, loginAsDemo, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('mill123456');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'TESTER') {
        navigate('/sales', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = await login(username, password);
    if (!res.success) {
      setErrorMessage(res.error || 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়');
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setErrorMessage('');
    const res = await loginAsDemo(role);
    if (!res.success) {
      setErrorMessage(res.error || 'ডেমো লগইন ব্যর্থ হয়েছে');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fbf7ee] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xl">
        {/* Header Branding */}
        <div className="relative bg-[#0d381e] p-7 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-emerald-950">
              <path d="M12 2C12 2 13.5 6 12 9C10.5 6 12 2 12 2Z" fill="currentColor" />
              <path d="M9.5 4.5C9.5 4.5 11 8 8.5 10.5C7.5 8 9.5 4.5 9.5 4.5Z" fill="currentColor" />
              <path d="M14.5 4.5C14.5 4.5 13 8 15.5 10.5C16.5 8 14.5 4.5 14.5 4.5Z" fill="currentColor" />
              <path d="M7.5 8.5C7.5 8.5 10 11.5 7 13.5C6 11 7.5 8.5 7.5 8.5Z" fill="currentColor" />
              <path d="M16.5 8.5C16.5 8.5 14 11.5 17 13.5C18 11 16.5 8.5 16.5 8.5Z" fill="currentColor" />
              <path d="M12 9V22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">
            {millConfig.name}
          </h1>
          <p className="text-xs font-semibold text-amber-300 mt-0.5">
            {millConfig.location}
          </p>
          <p className="text-[11px] text-emerald-200/80 mt-1">
            {millConfig.tagline}
          </p>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-stone-900">নিরাপদ সিস্টেম লগইন</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              মালিক, ম্যানেজার অথবা টেস্টার অ্যাকাউন্ট দিয়ে প্রবেশ করুন
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                ইউজারনেম বা ইমেইল
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="owner / manager / tester"
                  className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2.5 text-stone-800 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-stone-300 pl-9 pr-10 py-2.5 text-stone-800 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0d381e] hover:bg-[#134e2a] disabled:opacity-60 py-2.5 font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Role Quick Login Options */}
          <div className="border-t border-stone-200 pt-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-stone-500 text-center">
              তাৎক্ষণিক ভূমিকা (Role) ভিত্তিক লগইন:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('OWNER')}
                className="w-full rounded-lg border border-amber-300 bg-amber-50/90 hover:bg-amber-100 py-2 px-3 text-xs font-bold text-amber-950 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-700" />
                  মালিক (OWNER) — সম্পূর্ণ নিয়ন্ত্রণ
                </span>
                <span className="text-[10px] text-amber-800 font-mono">owner</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('MANAGER')}
                className="w-full rounded-lg border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 py-2 px-3 text-xs font-bold text-emerald-950 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-emerald-700" />
                  ম্যানেজার (MANAGER) — দৈনিক পরিচালনা
                </span>
                <span className="text-[10px] text-emerald-800 font-mono">manager</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('TESTER')}
                className="w-full rounded-lg border border-sky-300 bg-sky-50/80 hover:bg-sky-100 py-2 px-3 text-xs font-bold text-sky-950 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-sky-700" />
                  টেস্টার (TESTER) — শুধুমাত্র মেমো ও গেট পাস
                </span>
                <span className="text-[10px] text-sky-800 font-mono">tester</span>
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] text-stone-400 pt-1">
            মা ফ্লাওয়ার মিল | {millConfig.sidebarSlogan}
          </div>
        </div>
      </div>
    </div>
  );
};
