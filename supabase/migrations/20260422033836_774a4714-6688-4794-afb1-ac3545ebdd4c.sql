CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#cccccc',
  text_color TEXT NOT NULL DEFAULT '#000000',
  active BOOLEAN NOT NULL DEFAULT true,
  terminals TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.companies
  FOR ALL USING (true) WITH CHECK (true);