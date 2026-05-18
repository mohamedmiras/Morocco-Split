-- Run this script in your Supabase SQL Editor to create the expenses table

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_amount NUMERIC NOT NULL,
    paid_by_uid UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    split_mode TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    participants JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all expenses
CREATE POLICY "Enable read access for all authenticated users" ON public.expenses
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert expenses
CREATE POLICY "Enable insert for authenticated users" ON public.expenses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update expenses
CREATE POLICY "Enable update for authenticated users" ON public.expenses
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete expenses
CREATE POLICY "Enable delete for authenticated users" ON public.expenses
    FOR DELETE USING (auth.role() = 'authenticated');
