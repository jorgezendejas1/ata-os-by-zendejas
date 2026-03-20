CREATE TABLE public.premios_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  terminal_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  eficiencia NUMERIC DEFAULT 0,
  show_factor NUMERIC DEFAULT 0,
  gerente_pw1 NUMERIC DEFAULT 0,
  asistencia_score NUMERIC DEFAULT 0,
  adc_pct NUMERIC DEFAULT 0,
  adc_score NUMERIC DEFAULT 0,
  total_score NUMERIC DEFAULT 0,
  lugar INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year, week_number, terminal_id, company_id)
);
ALTER TABLE public.premios_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.premios_entries FOR ALL USING (true) WITH CHECK (true);