CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  email_type TEXT NOT NULL,
  company_id TEXT DEFAULT '',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  to_recipients TEXT[] NOT NULL DEFAULT ARRAY['karladavila@airport-ta.com','dbriseno@ata-supervisor.com'],
  bcc_recipients TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX email_queue_unique_idx ON public.email_queue (month, year, week_number, email_type, COALESCE(company_id, ''));
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.email_queue FOR ALL USING (true) WITH CHECK (true);