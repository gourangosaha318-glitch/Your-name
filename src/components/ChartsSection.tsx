import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Trophy, ArrowRight } from 'lucide-react';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  formatSouthAsianNumber,
} from '../lib/bengaliUtils';
import {
  mockMonthlyChartData,
  mockStockData,
  mockTodaySummary,
} from '../data/mock';
import { useSales } from '../context/SalesContext';

interface ChartsSectionProps {
  onViewFullReport?: () => void;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ onViewFullReport }) => {
  const { dailySummary } = useSales();
  const totalStock = mockStockData.reduce((sum, item) => sum + item.value, 0);

  // Custom Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-lg text-xs">
          <p className="font-bold text-stone-800 mb-1.5">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
              <span className="text-stone-600">মোট বিক্রয়:</span>
              <span className="font-bold text-[#16a34a]">
                {formatBengaliCurrency(payload[0]?.value || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
              <span className="text-stone-600">মোট ব্যয়:</span>
              <span className="font-bold text-[#f97316]">
                {formatBengaliCurrency(payload[1]?.value || 0)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  // Custom Active Shape with animation & glowing drop shadow
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22))',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          }}
        />
        {/* Subtle decorative outer halo ring on hover */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 11}
          outerRadius={outerRadius + 14}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.7}
        />
      </g>
    );
  };

  const PieComponent = Pie as React.ComponentType<any>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* 1. Bar Chart: মাসিক বিক্রয় ও আয়-ব্যয় চিত্র (5 cols) */}
      <div className="lg:col-span-5 flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        {/* Dark Green Header Banner */}
        <div className="flex items-center gap-2.5 bg-[#0d381e] px-4 py-2.5 text-white">
          <BarChart3 className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold tracking-normal">
            মাসিক বিক্রয় ও আয়-ব্যয় চিত্র
          </h2>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 px-4 pt-3 pb-1 text-xs font-medium text-stone-700">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
            <span>মোট বিক্রয়</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
            <span>মোট ব্যয়</span>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-64 w-full p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mockMonthlyChartData}
              margin={{ top: 10, right: 10, left: 15, bottom: 20 }}
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#475569', fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(val) => toBengaliNumber(formatSouthAsianNumber(val))}
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                domain={[0, 200000]}
                ticks={[0, 50000, 100000, 150000, 200000]}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="sales"
                name="মোট বিক্রয়"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                dataKey="expenses"
                name="মোট ব্যয়"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Donut Chart: পণ্যানুসারে স্টক (বস্তা) (4 cols) */}
      <div className="lg:col-span-4 flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        {/* Dark Green Header Banner */}
        <div className="flex items-center gap-2.5 bg-[#0d381e] px-4 py-2.5 text-white">
          <PieIcon className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold tracking-normal">
            পণ্যানুসারে স্টক (বস্তা)
          </h2>
        </div>

        {/* Donut Chart with Center Total + Legend */}
        <div className="flex flex-1 flex-col sm:flex-row items-center justify-between p-4">
          {/* Donut with Center Text */}
          <div className="relative h-56 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <PieComponent
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={renderActiveShape}
                  data={mockStockData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                  onMouseEnter={(_: any, index: number) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {mockStockData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="cursor-pointer transition-all duration-300 hover:opacity-90"
                    />
                  ))}
                </PieComponent>
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Display: Always fixed clean display of Total Stock */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[11px] font-medium text-stone-500 block">
                মোট স্টক
              </span>
              <span className="text-2xl font-black text-stone-900 leading-tight block">
                {toBengaliNumber(totalStock)}
              </span>
              <span className="text-[11px] font-semibold text-stone-600 block">
                বস্তা
              </span>
            </div>
          </div>

          {/* Interactive Legend Items */}
          <div className="flex flex-col gap-2 pl-2 pr-2 py-2 w-full sm:w-auto">
            {mockStockData.map((item, index) => {
              const isItemActive = activeIndex === index;
              return (
                <button
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => setActiveIndex(isItemActive ? null : index)}
                  className={`flex items-center justify-between sm:justify-start gap-3 text-xs rounded-lg px-2.5 py-1.5 transition-all text-left ${
                    isItemActive
                      ? 'bg-amber-100/70 shadow-xs scale-102 font-bold'
                      : 'hover:bg-stone-100/70 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full shrink-0 shadow-2xs transition-transform ${
                        isItemActive ? 'scale-125' : ''
                      }`}
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-stone-800">{item.name}</span>
                  </div>
                  <span className="font-semibold text-stone-600 tabular-nums">
                    {toBengaliNumber(item.value)} {item.unit}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Today's Summary Card: আজকের সারসংক্ষেপ (3 cols) */}
      <div className="lg:col-span-3 flex flex-col justify-between overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        {/* Dark Green Header Banner */}
        <div className="flex items-center gap-2 bg-[#0d381e] px-4 py-2.5 text-white">
          <Trophy className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold tracking-normal">
            আজকের সারসংক্ষেপ
          </h2>
        </div>

        {/* Financial Line Items */}
        <div className="flex-1 space-y-3 p-4 text-sm">
          {/* মোট বিক্রয় */}
          <div className="border-b border-stone-100 pb-2.5">
            <div className="flex items-center justify-between">
              <span className="text-stone-700 font-medium">মোট বিক্রয়</span>
              <span className="font-bold text-stone-900 text-base">
                {formatBengaliCurrency(dailySummary.totalDailySales)}
              </span>
            </div>
            <div className="mt-1.5 space-y-0.5 text-[11px] text-stone-500">
              <div className="flex items-center justify-between">
                <span>• বস্তাভিত্তিক ({toBengaliNumber(dailySummary.totalBagsSold)} বস্তা)</span>
                <span className="font-semibold text-stone-700">
                  {formatBengaliCurrency(dailySummary.bagBasedSales)}
                </span>
              </div>
              <div className="flex items-center justify-between text-amber-800">
                <span>• খুচরা ময়দা (টাকা)</span>
                <span className="font-bold">
                  {formatBengaliCurrency(dailySummary.retailFlourSales)}
                </span>
              </div>
            </div>
          </div>

          {/* মোট খরচ */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-stone-700 font-medium">মোট খরচ</span>
            <span className="font-bold text-stone-900 text-base">
              {formatBengaliCurrency(mockTodaySummary.totalExpenses)}
            </span>
          </div>

          {/* আজকের আয় (Green) */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="font-bold text-emerald-700">আজকের আয়</span>
            <span className="text-lg font-black text-emerald-700">
              {formatBengaliCurrency(dailySummary.netIncome)}
            </span>
          </div>

          {/* বকেয়া টাকা (Red) */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-600">বকেয়া টাকা</span>
            <span className="text-lg font-black text-rose-600">
              {formatBengaliCurrency(mockTodaySummary.dueAmount + dailySummary.totalDueToday - 10000)}
            </span>
          </div>
        </div>

        {/* Action Button: সম্পূর্ণ রিপোর্ট দেখুন → */}
        <div className="p-4 pt-0">
          <button
            onClick={onViewFullReport}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#15803d] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#166534] active:scale-[0.99] transition-all"
          >
            <span>সম্পূর্ণ রিপোর্ট দেখুন</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
