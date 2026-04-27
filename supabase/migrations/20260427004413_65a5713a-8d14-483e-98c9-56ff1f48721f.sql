CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.app_settings
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.app_settings (key, value) VALUES
  ('primary_color', '#2563EB'),
  ('table_density', 'normal'),
  ('font_size', 'normal'),
  ('reports_show_sparklines', 'true'),
  ('reports_show_fractions', 'true'),
  ('reports_show_attendance_table', 'true'),
  ('sidebar_collapsed', 'false')
ON CONFLICT (key) DO NOTHING;