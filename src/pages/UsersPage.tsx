import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  ShieldCheck,
  UserPlus,
  Key,
  Edit2,
  UserX,
  UserCheck,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { MillUserAccount, UserRole } from '../types/mill';
import { toBengaliNumber } from '../lib/bengaliUtils';

export const UsersPage: React.FC = () => {
  const {
    user: currentUser,
    users,
    refreshUsers,
    createUser,
    updateUsername,
    changeUserPassword,
    changeUserRole,
    toggleUserStatus,
  } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [password, setPassword] = useState('');

  const [editTarget, setEditTarget] = useState<MillUserAccount | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');

  const [passTarget, setPassTarget] = useState<MillUserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const showToast = (msg: string) => {
    setErrorMsg(null);
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createUser({
      fullName,
      username,
      email: email || `${username}@maflowermill.com`,
      role,
      password,
    });
    if (!res.success) {
      showError(res.error || 'ইউজার তৈরি ব্যর্থ');
      return;
    }
    setShowCreate(false);
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    showToast('নতুন ইউজার তৈরি হয়েছে!');
  };

  const handleEditUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const res = await updateUsername(editTarget.id, editUsername, editFullName);
    if (!res.success) {
      showError(res.error || 'আপডেট ব্যর্থ');
      return;
    }
    setEditTarget(null);
    showToast('ইউজারনেম এবং নাম সফলভাবে হালনাগাদ হয়েছে!');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passTarget) return;
    const res = await changeUserPassword(passTarget.id, newPassword);
    if (!res.success) {
      showError(res.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ');
      return;
    }
    setPassTarget(null);
    setNewPassword('');
    showToast('পাসওয়ার্ড নিরাপদভাবে রিসেট করা হয়েছে!');
  };

  const handleRoleChange = async (u: MillUserAccount, nextRole: UserRole) => {
    const res = await changeUserRole(u.id, nextRole);
    if (!res.success) {
      showError(res.error || 'ভূমিকা পরিবর্তন ব্যর্থ');
      return;
    }
    showToast(`${u.fullName} এর ভূমিকা পরিবর্তন করা হয়েছে।`);
  };

  const handleToggleStatus = async (u: MillUserAccount) => {
    const res = await toggleUserStatus(u.id);
    if (!res.success) {
      showError(res.error || 'অবস্থা পরিবর্তন ব্যর্থ');
      return;
    }
    showToast(`${u.fullName} অ্যাকাউন্ট ${u.isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'} করা হয়েছে।`);
  };

  return (
    <div className="space-y-5 pb-10">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-white shadow-xl text-xs font-bold">
          <Check className="h-4 w-4 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-white shadow-xl text-xs font-bold">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
          <NavLink to="/" className="hover:text-emerald-800">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">ইউজার ও ৩-স্তর পারমিশন</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">ইউজার ও পারমিশন নিয়ন্ত্রণ (Owner Only)</h1>
              <p className="text-xs sm:text-sm text-stone-500">
                OWNER, MANAGER এবং TESTER অ্যাকাউন্ট তৈরি, ইউজারনেম, পাসওয়ার্ড রিসেট এবং সক্রিয়/নিষ্ক্রিয় নিয়ন্ত্রণ
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#0d381e] hover:bg-[#134e2a] px-4 py-2 text-xs font-bold text-white"
          >
            <UserPlus className="h-4 w-4 text-amber-300" />
            <span>নতুন ইউজার তৈরি</span>
          </button>
        </div>
      </div>

      {/* Role Policy Matrix Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <span className="inline-block rounded bg-amber-400 px-2 py-0.5 font-black text-emerald-950 mb-2">OWNER (মালিক)</span>
          <p className="text-stone-700 leading-relaxed">
            সম্পূর্ণ নিয়ন্ত্রণ: ভাউচার অনুমোদন, ব্যাংক পিন পরিবর্তন, ইউজার/পাসওয়ার্ড নিয়ন্ত্রণ, অডিট লগ এবং ডাটাবেস ব্যাকআপ/রিস্টোর।
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <span className="inline-block rounded bg-emerald-700 px-2 py-0.5 font-black text-white mb-2">MANAGER (ম্যানেজার)</span>
          <p className="text-stone-700 leading-relaxed">
            দৈনিক কার্যক্রম: গম ক্রয়, উৎপাদন, মেমো, গেট পাস, খরচের ভাউচার তৈরি (অপেক্ষমাণ থাকবে), ক্রেতা/সরবরাহকারী এবং রিপোর্ট।
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
          <span className="inline-block rounded bg-sky-600 px-2 py-0.5 font-black text-white mb-2">TESTER (টেস্টার)</span>
          <p className="text-stone-700 leading-relaxed">
            সীমিত বিক্রয় অ্যাক্সেস: শুধুমাত্র নতুন মেমো ও গেট পাস তৈরি করতে পারবে। ব্যাংক, হিসাব-নিকাশ, অনুমোদিত তথ্য বা মোট স্টক দেখা নিষিদ্ধ।
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <th className="py-3 px-4 font-bold">নাম ও ইমেইল</th>
                <th className="py-3 px-4 font-bold">ইউজারনেম</th>
                <th className="py-3 px-4 font-bold">ভূমিকা (Role)</th>
                <th className="py-3 px-4 font-bold">অবস্থা</th>
                <th className="py-3 px-4 font-bold">শেষ লগইন</th>
                <th className="py-3 px-4 font-bold text-right">নিয়ন্ত্রণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">
                        {u.fullName} {isSelf && <span className="text-[10px] text-emerald-700">(আপনি)</span>}
                      </div>
                      <div className="text-[11px] text-stone-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-stone-800">@{u.username}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                        className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 font-bold text-stone-800 disabled:opacity-60"
                      >
                        <option value="OWNER">{ROLE_LABELS.OWNER}</option>
                        <option value="MANAGER">{ROLE_LABELS.MANAGER}</option>
                        <option value="TESTER">{ROLE_LABELS.TESTER}</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                          <UserCheck className="h-3 w-3" /> সক্রিয়
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
                          <UserX className="h-3 w-3" /> নিষ্ক্রিয়
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-500">{u.lastLoginAt ? toBengaliNumber(u.lastLoginAt) : '—'}</td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditTarget(u);
                          setEditUsername(u.username);
                          setEditFullName(u.fullName);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-stone-300 bg-white hover:bg-stone-50 px-2.5 py-1 font-bold text-stone-700"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>ইউজারনেম</span>
                      </button>
                      <button
                        onClick={() => {
                          setPassTarget(u);
                          setNewPassword('');
                        }}
                        className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 font-bold text-amber-900"
                      >
                        <Key className="h-3 w-3" />
                        <span>পাসওয়ার্ড</span>
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-bold ${
                            u.isActive
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'bg-emerald-700 text-white hover:bg-emerald-800'
                          }`}
                        >
                          {u.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">নতুন ইউজার অ্যাকাউন্ট তৈরি</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">পূর্ণ নাম *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ইউজারনেম *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ভূমিকা (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
                  >
                    <option value="MANAGER">MANAGER</option>
                    <option value="TESTER">TESTER</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">ইমেইল</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="অবশ্যক নয়"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর) *</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border font-semibold">
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#0d381e] text-white font-bold">
                  তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Username Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">ইউজারনেম ও নাম পরিবর্তন</h3>
              <button onClick={() => setEditTarget(null)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleEditUsername} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">পূর্ণ নাম</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">নতুন ইউজারনেম</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditTarget(null)} className="px-3 py-1.5 rounded-lg border">
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-[#0d381e] text-white font-bold">
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-stone-900">পাসওয়ার্ড রিসেট — @{passTarget.username}</h3>
              <button onClick={() => setPassTarget(null)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">নতুন পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPassTarget(null)} className="px-3 py-1.5 rounded-lg border">
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-[#ea7a1a] text-white font-bold">
                  পাসওয়ার্ড পরিবর্তন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
