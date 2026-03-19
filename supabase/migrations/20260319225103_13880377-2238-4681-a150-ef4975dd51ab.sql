CREATE TABLE public.promoters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.promoters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.promoters FOR ALL USING (true) WITH CHECK (true);