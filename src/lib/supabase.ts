import { createClient } from '@supabase/supabase-js';

// Read from client environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-flour-mill.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key-ma-flower-mill';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('demo-flour-mill')
);

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL Schema & Row Level Security (RLS) for Supabase.
 * Hostinger / GitHub / Supabase deployment ready.
 */
export const SUPABASE_SQL_SCHEMA = `
-- ================================================================
-- মা ফ্লাওয়ার মিল (ঘোড়াধাপহাট, বগুড়া)
-- Supabase Database Schema & Row Level Security (RLS)
-- ================================================================

-- ১. গম ক্রয় টেবিল (Wheat Purchases)
CREATE TABLE IF NOT EXISTS public.wheat_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  quantity_kg NUMERIC(10, 2) NOT NULL,
  price_per_kg NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  due_amount NUMERIC(12, 2) DEFAULT 0,
  purchase_date DATE DEFAULT CURRENT_DATE,
  memo_number TEXT,
  notes TEXT
);

-- ২. গম ভাঙানো ও উৎপাদন টেবিল (Production Logs)
CREATE TABLE IF NOT EXISTS public.productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  production_date DATE DEFAULT CURRENT_DATE,
  wheat_used_kg NUMERIC(10, 2) NOT NULL,
  flour_bags INTEGER DEFAULT 0,      -- আটা (বস্তা)
  maida_bags INTEGER DEFAULT 0,      -- ময়দা (বস্তা)
  bran_bags INTEGER DEFAULT 0,       -- ভুসি (বস্তা)
  suji_bags INTEGER DEFAULT 0,       -- সুজি (বস্তা)
  operator_name TEXT,
  shift TEXT DEFAULT 'দিন',
  status TEXT DEFAULT 'সম্পন্ন'
);

-- ৩. গুদাম ও স্টক টেবিল (Inventory / Stock)
CREATE TABLE IF NOT EXISTS public.inventory_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT UNIQUE NOT NULL, -- আটা, ময়দা, ভুসি, সুজি, গোটা গম
  category TEXT NOT NULL,
  current_stock NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,                -- বস্তা / কেজি
  reorder_level NUMERIC(10, 2) DEFAULT 20,
  unit_price NUMERIC(10, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ৪. বিক্রয় ও মেমো টেবিল (Sales & Memos)
CREATE TABLE IF NOT EXISTS public.sales_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  memo_no TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT DEFAULT 'বস্তা',
  rate NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) NOT NULL,
  due_amount NUMERIC(12, 2) DEFAULT 0,
  sale_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'ক্যাশ'
);

-- ৫. সাম্প্রতিক লেনদেন ও আয়-ব্যয় (Transactions & Financial Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  type TEXT NOT NULL,                 -- 'বিক্রয়', 'ক্রয়', 'খরচ', 'আদায়'
  description TEXT NOT NULL,
  quantity_text TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  tx_date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  reference_no TEXT
);

-- ৬. কর্মচারীদের হিসাব জমা অবস্থা (Employee Submissions)
CREATE TABLE IF NOT EXISTS public.employee_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  submission_date DATE DEFAULT CURRENT_DATE,
  is_submitted BOOLEAN DEFAULT false,
  collected_cash NUMERIC(12, 2) DEFAULT 0,
  submitted_time TIMESTAMPTZ,
  notes TEXT
);

-- ৭. ক্রেতা ও সরবরাহকারী ডিরেক্টরি (Parties)
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  party_type TEXT NOT NULL,          -- 'ক্রেতা' বা 'সরবরাহকারী'
  phone TEXT,
  address TEXT,
  opening_balance NUMERIC(12, 2) DEFAULT 0,
  current_balance NUMERIC(12, 2) DEFAULT 0
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

ALTER TABLE public.wheat_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- শুধুমাত্র অথেন্টিকেটেড মিল মালিক ও কর্মচারীদের এক্সেস পারমিশন
CREATE POLICY "Authenticated users have full access" ON public.wheat_purchases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access" ON public.productions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access" ON public.inventory_stocks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access" ON public.sales_memos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access" ON public.transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access" ON public.employee_submissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access" ON public.parties
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;
