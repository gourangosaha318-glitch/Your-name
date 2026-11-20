import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, History, Search, RefreshCw, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { AuditLogEntry } from '../types/mill';
import { toBengaliNumber } from '../lib/bengaliUtils';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '300' });
      if (roleFilter) qs.set('role', roleFilter);
      const res = await apiFetch<{ logs: AuditLogEntry[] }>(`/api/audit-logs?${qs.toString()}`);
      setLogs(res.logs || []);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return logs.filter(
      (l) =>
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.username.toLowerCase().includes(q) ||
        l.recordType.toLowerCase().includes(q) ||
        l.recordId.toLowerCase().includes(q)
    );
  }, [logs, searchTerm]);

  return (
    <div className="space-y-5 pb-10">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
          <NavLink to="/" className="hover:text-emerald-800">ড্যাশবোর্ড</NavLink>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-stone-800">অপরিবর্তনীয় অডিট লগ</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d381e] text-amber-400">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">সিস্টেম অডিট ও নিরাপত্তা লগ (Owner Only)</h1>
              <p className="text-xs sm:text-sm text-stone-500">
                লগইন, ভুল পাসওয়ার্ড/পিন, ভাউচার অনুমোদন, মেমো ও স্টক পরিবর্তনের অপরিবর্তনীয় (Append-Only) ইতিহাস
              </p>
            </div>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 px-3 py-2 text-xs font-bold text-stone-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="অ্যাকশন, ইউজার, আইডি বা বিবরণ দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-stone-200 pl-9 pr-3 py-2 text-xs focus:border-emerald-700 focus:outline-hidden"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-800"
        >
          <option value="">সকল ভূমিকা (All Roles)</option>
          <option value="OWNER">OWNER</option>
          <option value="MANAGER">MANAGER</option>
          <option value="TESTER">TESTER</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <th className="py-3 px-4 font-bold">তারিখ ও সময়</th>
                <th className="py-3 px-4 font-bold">ইউজার ও ভূমিকা</th>
                <th className="py-3 px-4 font-bold">অ্যাকশন</th>
                <th className="py-3 px-4 font-bold">রেকর্ড</th>
                <th className="py-3 px-4 font-bold">বিস্তারিত বিবরণ</th>
                <th className="py-3 px-4 font-bold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((l) => {
                const isWarning = l.action.includes('FAIL') || l.action.includes('LOCK') || l.action.includes('REJECT');
                return (
                  <tr key={l.id} className={isWarning ? 'bg-rose-50/40' : 'hover:bg-stone-50'}>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-stone-800">{toBengaliNumber(l.date)}</div>
                      <div className="text-[10px] text-stone-400">{toBengaliNumber(l.time)}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-mono font-bold text-stone-800">@{l.username}</div>
                      <span className="text-[10px] font-bold text-stone-500">{l.role}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                          isWarning ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {isWarning && <ShieldAlert className="h-3 w-3" />}
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-stone-700">{l.recordType}</div>
                      <div className="font-mono text-[10px] text-stone-400">{l.recordId}</div>
                    </td>
                    <td className="py-2.5 px-4 text-stone-700 max-w-md">
                      <p>{l.details}</p>
                      {(l.previousValue || l.newValue) && (
                        <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                          {l.previousValue ? `পূর্ব: ${l.previousValue} → ` : ''}
                          {l.newValue ? `নতুন: ${l.newValue}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[10px] text-stone-400">{l.ipAddress}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    কোনো অডিট লগ পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
