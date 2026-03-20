CREATE TABLE public.modules_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  company_id TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year, week_number, module_number)
);
ALTER TABLE public.modules_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.modules_entries FOR ALL USING (true) WITH CHECK (true);