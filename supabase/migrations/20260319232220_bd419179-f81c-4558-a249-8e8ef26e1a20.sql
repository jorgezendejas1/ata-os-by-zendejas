CREATE TABLE public.adc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  company_id TEXT NOT NULL,
  promoter_name TEXT NOT NULL,
  adc_date TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  desarrollo TEXT NOT NULL DEFAULT '',
  tipo_adc TEXT NOT NULL DEFAULT '',
  supervisor_ata TEXT NOT NULL DEFAULT '',
  supervisor_desarrollo TEXT NOT NULL DEFAULT '',
  se_retira_tia BOOLEAN NOT NULL DEFAULT false,
  tercer_aviso BOOLEAN NOT NULL DEFAULT false,
  descripcion TEXT NOT NULL DEFAULT '',
  fecha_limite TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.adc_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.adc_records FOR ALL USING (true) WITH CHECK (true);