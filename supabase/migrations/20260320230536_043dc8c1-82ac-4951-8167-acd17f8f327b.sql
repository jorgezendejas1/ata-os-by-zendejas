CREATE TABLE public.powers_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  terminal_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  day_date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year, week_number, terminal_id, company_id, day_date)
);
ALTER TABLE public.powers_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.powers_entries FOR ALL USING (true) WITH CHECK (true);