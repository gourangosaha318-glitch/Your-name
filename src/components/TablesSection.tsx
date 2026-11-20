import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Users,
  ShoppingCart,
  Truck,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import {
  toBengaliNumber,
  formatBengaliCurrency,
} from '../lib/bengaliUtils';
import {
  mockTransactions,
  mockEmployeeSubmissions,
  TransactionItem,
  EmployeeSubmissionItem,
} from '../data/mock';

interface TablesSectionProps {
  onNewTransaction?: () => void;
  transactions?: TransactionItem[];
}

export const TablesSection: React.FC<TablesSectionProps> = ({ onNewTransaction, transactions }) => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeSubmissionItem[]>(mockEmployeeSubmissions);
  const txList = transactions || mockTransactions;

  // Quick toggle employee submission status for interactivity
  const toggleEmployeeStatus = (empId: string) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === empId) {
          const nextState = !emp.isSubmitted;
          return {
            ...emp,
            isSubmitted: nextState,
            status: nextState ? 'জমা দেওয়া হয়েছে ✓' : 'অপেক্ষমাণ ⏳',
          };
        }
        return emp;
      })
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Table 1: সাম্প্রতিক লেনদেন (7 cols) */}
      <div className="lg:col-span-7 flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        {/* Dark Green Header Banner */}
        <div className="flex items-center justify-between bg-[#0d381e] px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold tracking-normal">
              সাম্প্রতিক লেনদেন
            </h2>
          </div>
          <button
            onClick={() => navigate('/daily-accounts')}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-white transition-colors"
          >
            <span>আরও দেখুন</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 font-bold text-stone-700">
                <th className="py-2.5 px-4">ধরন</th>
                <th className="py-2.5 px-4">বিবরণ</th>
                <th className="py-2.5 px-4">পরিমাণ</th>
                <th className="py-2.5 px-4">টাকা</th>
                <th className="py-2.5 px-4 text-right">তারিখ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {txList.map((tx: TransactionItem) => (
                <tr
                  key={tx.id}
                  className="hover:bg-amber-50/30 transition-colors"
                >
                  {/* ধরন with domain icon */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {tx.type === 'বিক্রয়' && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {tx.type === 'ক্রয়' && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                          <Truck className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {tx.type === 'খরচ' && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-700">
                          <Receipt className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span className="font-semibold">{tx.type}</span>
                    </div>
                  </td>

                  {/* বিবরণ */}
                  <td className="py-3 px-4 font-medium text-stone-900">
                    {tx.description}
                  </td>

                  {/* পরিমাণ */}
                  <td className="py-3 px-4 text-stone-600">
                    {tx.quantity}
                  </td>

                  {/* টাকা */}
                  <td className="py-3 px-4 font-bold text-stone-900">
                    {formatBengaliCurrency(tx.amount)}
                  </td>

                  {/* তারিখ */}
                  <td className="py-3 px-4 text-right text-stone-500 tabular-nums">
                    {toBengaliNumber(tx.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: কর্মচারীদের হিসাব জমা অবস্থা (5 cols) */}
      <div className="lg:col-span-5 flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        {/* Dark Green Header Banner */}
        <div className="flex items-center justify-between bg-[#0d381e] px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold tracking-normal">
              কর্মচারীদের হিসাব জমা অবস্থা
            </h2>
          </div>
          <button
            onClick={() => navigate('/employees')}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-white transition-colors"
          >
            <span>সকলের তালিকা</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 font-bold text-stone-700">
                <th className="py-2.5 px-4">কর্মচারীর নাম</th>
                <th className="py-2.5 px-4">পদবি</th>
                <th className="py-2.5 px-4 text-right">আজকের অবস্থা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-amber-50/30 transition-colors"
                >
                  {/* কর্মচারীর নাম */}
                  <td className="py-3 px-4 font-bold text-stone-900">
                    {emp.name}
                  </td>

                  {/* পদবি */}
                  <td className="py-3 px-4 text-stone-600 font-medium">
                    {emp.designation}
                  </td>

                  {/* অবস্থা Badge (interactive touch toggle) */}
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => toggleEmployeeStatus(emp.id)}
                      title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                        emp.isSubmitted
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 active:bg-emerald-300'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 active:bg-amber-300'
                      }`}
                    >
                      {emp.isSubmitted ? (
                        <>
                          <span>জমা দেওয়া হয়েছে</span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        </>
                      ) : (
                        <>
                          <span>অপেক্ষমাণ</span>
                          <span className="text-amber-700">⏳</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
