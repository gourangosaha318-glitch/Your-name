/**
 * Realistic Mock Data for "মা ফ্লাওয়ার মিল", ঘোড়াধাপহাট, বগুড়া
 * Matches design reference layout and values exactly.
 */

export interface StatItem {
  id: string;
  title: string;
  value: number;
  unit: string;
  iconName: 'wheat' | 'gear' | 'sack-blue' | 'sack-purple' | 'sack-teal';
  bgGradient: string;
  shadowColor: string;
}

export interface MonthlyBarData {
  month: string;
  sales: number;      // মোট বিক্রয়
  expenses: number;   // মোট ব্যয়
  salesFormatted?: string;
  expensesFormatted?: string;
}

export interface StockDonutItem {
  name: string;
  value: number;
  unit: string;
  color: string;
  percentage?: number;
}

export interface TodaySummary {
  totalSales: number;
  totalExpenses: number;
  netIncome: number;
  dueAmount: number;
}

export interface TransactionItem {
  id: string;
  type: 'বিক্রয়' | 'ক্রয়' | 'খরচ' | 'আদায়';
  typeColor: string;
  icon: 'cart' | 'truck' | 'bill';
  description: string;
  quantity: string;
  amount: number;
  date: string;
}

export interface EmployeeSubmissionItem {
  id: string;
  name: string;
  designation: string;
  status: 'জমা দেওয়া হয়েছে ✓' | 'অপেক্ষমাণ ⏳';
  isSubmitted: boolean;
  time?: string;
  collectionAmount?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  time: string;
  type: 'alert' | 'info' | 'success';
  read: boolean;
}

// 5 Stat Cards matching the top row
export const mockStatCards: StatItem[] = [
  {
    id: 'wheat-purchase',
    title: 'আজকের মোট গম ক্রয়',
    value: 5000,
    unit: 'কেজি',
    iconName: 'wheat',
    bgGradient: 'from-[#ea580c] to-[#f97316]', // Vibrant Orange
    shadowColor: 'rgba(234, 88, 12, 0.25)',
  },
  {
    id: 'wheat-grinding',
    title: 'আজকের গম ভাঙানো',
    value: 5000,
    unit: 'কেজি',
    iconName: 'gear',
    bgGradient: 'from-[#15803d] to-[#16a34a]', // Forest to Emerald Green
    shadowColor: 'rgba(22, 163, 74, 0.25)',
  },
  {
    id: 'flour-prod',
    title: 'আটা উৎপাদন',
    value: 120,
    unit: 'বস্তা',
    iconName: 'sack-blue',
    bgGradient: 'from-[#0369a1] to-[#0284c7]', // Sky to Ocean Blue
    shadowColor: 'rgba(2, 132, 199, 0.25)',
  },
  {
    id: 'maida-prod',
    title: 'ময়দা উৎপাদন',
    value: 100,
    unit: 'বস্তা',
    iconName: 'sack-purple',
    bgGradient: 'from-[#7e22ce] to-[#9333ea]', // Deep Purple
    shadowColor: 'rgba(147, 51, 234, 0.25)',
  },
  {
    id: 'bran-prod',
    title: 'ভুসি উৎপাদন',
    value: 80,
    unit: 'বস্তা',
    iconName: 'sack-teal',
    bgGradient: 'from-[#0f766e] to-[#0d9488]', // Deep Teal
    shadowColor: 'rgba(13, 148, 136, 0.25)',
  },
];

// Monthly Bar Chart Data (Jan - May)
export const mockMonthlyChartData: MonthlyBarData[] = [
  { month: 'জানুয়ারি', sales: 86000, expenses: 68000 },
  { month: 'ফেব্রুয়ারি', sales: 106000, expenses: 88000 },
  { month: 'মার্চ', sales: 126000, expenses: 96000 },
  { month: 'এপ্রিল', sales: 132000, expenses: 104000 },
  { month: 'মে', sales: 178000, expenses: 136000 },
];

// Stock Donut Chart Data (Total: 340 bags)
export const mockStockData: StockDonutItem[] = [
  { name: 'আটা', value: 100, unit: 'বস্তা', color: '#ea580c' },   // Orange
  { name: 'ময়দা', value: 120, unit: 'বস্তা', color: '#0d9488' },  // Teal/Cyan
  { name: 'ভুসি', value: 80, unit: 'বস্তা', color: '#0284c7' },   // Blue
  { name: 'সুজি', value: 40, unit: 'বস্তা', color: '#7e22ce' },   // Purple
];

// Today's Financial Summary
export const mockTodaySummary: TodaySummary = {
  totalSales: 120000,    // মোট বিক্রয়
  totalExpenses: 80000,   // মোট খরচ
  netIncome: 80000,       // আজকের আয় (image displays ৳ ৮০,০০০ in green)
  dueAmount: 50000,       // বকেয়া টাকা (image displays ৳ ৫০,০০০ in red)
};

// Recent Transactions (সাম্প্রতিক লেনদেন)
export const mockTransactions: TransactionItem[] = [
  {
    id: 'tx-1',
    type: 'বিক্রয়',
    typeColor: 'text-emerald-700 bg-emerald-50',
    icon: 'cart',
    description: 'আটা (৫০ বস্তা)',
    quantity: '৫০ বস্তা',
    amount: 60000,
    date: '29-10-2025',
  },
  {
    id: 'tx-2',
    type: 'বিক্রয়',
    typeColor: 'text-emerald-700 bg-emerald-50',
    icon: 'cart',
    description: 'ময়দা (৪০ বস্তা)',
    quantity: '৪০ বস্তা',
    amount: 48000,
    date: '29-10-2025',
  },
  {
    id: 'tx-3',
    type: 'ক্রয়',
    typeColor: 'text-sky-700 bg-sky-50',
    icon: 'truck',
    description: 'গম ক্রয়',
    quantity: '৩,০০০ কেজি',
    amount: 75000,
    date: '29-10-2025',
  },
  {
    id: 'tx-4',
    type: 'খরচ',
    typeColor: 'text-rose-700 bg-rose-50',
    icon: 'bill',
    description: 'বিদ্যুৎ বিল',
    quantity: '-',
    amount: 5000,
    date: '29-10-2025',
  },
];

// Employee Daily Submissions Status (কর্মচারীদের হিসাব জমা অবস্থা)
export const mockEmployeeSubmissions: EmployeeSubmissionItem[] = [
  {
    id: 'emp-1',
    name: 'রফিকুল ইসলাম',
    designation: 'উৎপাদন কর্মী',
    status: 'জমা দেওয়া হয়েছে ✓',
    isSubmitted: true,
    time: 'বিকাল ৫:১৫',
    collectionAmount: 0,
  },
  {
    id: 'emp-2',
    name: 'মোঃ হানিফ মিয়া',
    designation: 'বিক্রয় কর্মী',
    status: 'জমা দেওয়া হয়েছে ✓',
    isSubmitted: true,
    time: 'সন্ধ্যা ৬:২০',
    collectionAmount: 64000,
  },
  {
    id: 'emp-3',
    name: 'আব্দুল করিম',
    designation: 'গুদাম কর্মী',
    status: 'অপেক্ষমাণ ⏳',
    isSubmitted: false,
    collectionAmount: 32000,
  },
  {
    id: 'emp-4',
    name: 'মিজানুর রহমান',
    designation: 'হিসাবরক্ষক',
    status: 'জমা দেওয়া হয়েছে ✓',
    isSubmitted: true,
    time: 'সন্ধ্যা ৭:০০',
    collectionAmount: 110000,
  },
];

// Notification Alerts
export const mockNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'গুদামে গমের স্টক পুনরায় ক্রয় স্তরে পৌঁছেছে (৫০ বস্তা অবশিষ্ট)',
    time: '১০ মিনিট আগে',
    type: 'alert',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'আব্দুল করিমের আজকের ডেলিভারি হিসাব জমা বাকি আছে',
    time: '১ ঘন্টা আগে',
    type: 'info',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'মেসার্স শাহ সুলতান ট্রেডার্স থেকে ৳ ৫০,০০০ বকেয়া ক্যাশ আদায় হয়েছে',
    time: '২ ঘন্টা আগে',
    type: 'success',
    read: false,
  },
];

// Mill Profile
export const millConfig = {
  name: 'মা ফ্লাওয়ার মিল',
  shortName: 'মা ফ্লাওয়ার মিল',
  location: 'ঘোড়াধাপহাট, বগুড়া',
  phone: '০১৭১২-৩৪৫৬৭৮, ০১৭৯৮-৭৬৫৪৩২',
  established: '২০১৮',
  tagline: 'গম থেকে আটা, আপনার বিশ্বাস আমাদের শক্তি',
  sidebarSlogan: 'সঠিক হিসাব, সফল ব্যবসা',
  ownerName: 'প্রশাসক (মালিক)',
  ownerRole: 'মিল মালিক ও ব্যবস্থাপক',
  ownerEmail: 'admin@maflowermill.com',
};

// Manager Daily Submission to Boss Model
export interface DailyReportSubmission {
  id: string;
  date: string;
  banglaDate: string;
  submittedBy: string;
  designation: string;
  time: string;
  wheatUsedKg: number;
  production: {
    flourBags: number;  // আটা
    maidaBags: number;  // ময়দা
    branBags: number;   // ভুসি
    sujiBags: number;   // সুজি
  };
  stockCount: {
    flour: number;
    maida: number;
    bran: number;
    suji: number;
    totalStockBags: number;
  };
  finances: {
    totalSales: number;
    bagSales?: number;
    retailFlourSales?: number;
    dueCollected: number;
    wheatPurchaseCost: number;
    factoryExpenses: number;
    netCashToBoss: number;
  };
  managerNotes?: string;
  status: 'pending' | 'approved';
  statusText: 'অপেক্ষমাণ ⏳' | 'অনুমোদিত ✓';
  approvedBy?: string;
  approvedTime?: string;
  bossRemarks?: string;
}

export const mockDailySubmissions: DailyReportSubmission[] = [
  {
    id: 'sub-20251029',
    date: '২৯-১০-২০২৫',
    banglaDate: '১৩ কার্তিক ১৪৩২',
    submittedBy: 'মিজানুর রহমান',
    designation: 'ম্যানেজার ও প্রধান হিসাবরক্ষক',
    time: 'সন্ধ্যা ৭:৩০',
    wheatUsedKg: 5000,
    production: {
      flourBags: 120,
      maidaBags: 100,
      branBags: 80,
      sujiBags: 40,
    },
    stockCount: {
      flour: 100,
      maida: 120,
      bran: 80,
      suji: 40,
      totalStockBags: 340,
    },
    finances: {
      totalSales: 120000,
      bagSales: 108000,
      retailFlourSales: 12000,
      dueCollected: 25000,
      wheatPurchaseCost: 75000,
      factoryExpenses: 5000,
      netCashToBoss: 65000,
    },
    managerNotes: 'আজকের সকালের শিফটে ৫০০০ কেজি গম ভাঙানো সম্পন্ন হয়েছে। সকল রোল স্বাভাবিক ছিল। বিদ্যুৎ বিল পরিশোধ করা হয়েছে।',
    status: 'pending',
    statusText: 'অপেক্ষমাণ ⏳',
  },
  {
    id: 'sub-20251028',
    date: '২৮-১০-২০২৫',
    banglaDate: '১২ কার্তিক ১৪৩২',
    submittedBy: 'মিজানুর রহমান',
    designation: 'ম্যানেজার ও প্রধান হিসাবরক্ষক',
    time: 'সন্ধ্যা ৭:১৫',
    wheatUsedKg: 4800,
    production: {
      flourBags: 115,
      maidaBags: 95,
      branBags: 76,
      sujiBags: 38,
    },
    stockCount: {
      flour: 90,
      maida: 110,
      bran: 75,
      suji: 35,
      totalStockBags: 310,
    },
    finances: {
      totalSales: 110000,
      bagSales: 102000,
      retailFlourSales: 8000,
      dueCollected: 18000,
      wheatPurchaseCost: 60000,
      factoryExpenses: 3200,
      netCashToBoss: 64800,
    },
    managerNotes: 'দিনশেষে গুদামের ফিজিক্যাল বস্তা গণনা সঠিক পাওয়া গেছে। ক্যাশ বাক্সের টাকা বসের টেবিল ক্যাশে জমা করা হয়েছে।',
    status: 'approved',
    statusText: 'অনুমোদিত ✓',
    approvedBy: 'প্রশাসক (মালিক)',
    approvedTime: 'রাত ৮:২০',
    bossRemarks: 'হিসাব পরীক্ষা করে সঠিক পেয়েছি। অনুমোদন করা হলো।',
  },
];
