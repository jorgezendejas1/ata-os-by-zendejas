-- Tabla terminals
CREATE TABLE public.terminals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  has_zones BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allowed_companies TEXT[] NOT NULL DEFAULT '{}',
  allowed_schedules TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.terminals
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.terminals
  (id, name, has_zones, is_active, allowed_companies, allowed_schedules, sort_order)
VALUES
  ('t1', 'Terminal 1', false, false,
   ARRAY['c1','c2','c3','c4','c5'],
   ARRAY['h_1000','h_1200','h_1600','h_1900','h_2100'], 1),
  ('t2n', 'T2 Nacional', true, true,
   ARRAY['c1','c2'],
   ARRAY['h_0900','h_1000','h_1200','h_1600','h_1800','h_2000','h_cierre'], 2),
  ('t2i', 'T2 Internacional', false, true,
   ARRAY['c1','c4','c5'],
   ARRAY['h_1000','h_1200','h_1400','h_1600','h_1900','h_2100'], 3),
  ('t3', 'Terminal 3', false, true,
   ARRAY['c1','c4','c3','c5','c2','c6'],
   ARRAY['h_0900','h_1200','h_1600','h_1800','h_2030'], 4),
  ('t4', 'Terminal 4', false, true,
   ARRAY['c1','c4','c3','c5','c2','c6'],
   ARRAY['h_0900','h_1200','h_1600','h_1900','h_2100'], 5);

-- Tabla email_templates
CREATE TABLE public.email_templates (
  email_type TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT '',
  bcc_recipients TEXT[] NOT NULL DEFAULT '{}',
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.email_templates
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.email_templates
  (email_type, label, company_id, bcc_recipients, subject_template, body_template)
VALUES
  ('ASISTENCIA_CID', 'Asistencia CID', 'c4',
   ARRAY['vtrava@elcid.com.mx','efhernandez@elcid.com.mx','alexruizrame@hotmail.com','josepepepepe@hotmail.com','ocitherlet@elcid.com.mx','fhernandez@ata-supervisor.com'],
   'CID - {start} al {end} de {month}  {year} - Reporte',
   E'Estimado equipo,\n\nAdjunto el reporte de asistencia correspondiente a la semana del {start} al {end} de {month} {year}.\n\nAtentamente,\nJorge Zendejas Lovera\nSupervisor | Airport Travel Advisors\nCel. 998 939 0506'),
  ('ASISTENCIA_SUN', 'Asistencia Sunset', 'c1',
   ARRAY[]::TEXT[],
   'SUN - {start} al {end} de {month}  {year} - Reporte',
   E'Estimado equipo,\n\nAdjunto el reporte de asistencia correspondiente a la semana del {start} al {end} de {month} {year}.\n\nAtentamente,\nJorge Zendejas Lovera\nSupervisor | Airport Travel Advisors\nCel. 998 939 0506'),
  ('ASISTENCIA_XCA', 'Asistencia XCA', 'c2',
   ARRAY['mdominguezdu@mexicodestinationclub.com','sanguiano@mexicodestinationclub.com','mnavarroc@mexicodestinationclub.com','jgonzalezr@experienciasxcaret.com.mx','mhernandezch@experienciasxcaret.com.mx','padelmoral@mexicodestinationclub.com','fhernandez@ata-supervisor.com','aolimon@mexicodestinationclub.com'],
   'XCA - {start} al {end} de {month}  {year} - Reporte',
   E'Estimado equipo,\n\nAdjunto el reporte de asistencia correspondiente a la semana del {start} al {end} de {month} {year}.\n\nAtentamente,\nJorge Zendejas Lovera\nSupervisor | Airport Travel Advisors\nCel. 998 939 0506'),
  ('ASISTENCIA_VDP', 'Asistencia VDP', 'c3',
   ARRAY['gtemktb@villagroupcancun.com','adireccionmktcan@villagroup.com','bob.kistner@taferresorts.com','miguel.juarez@taferresorts.com','fgc1422@gmail.com','asismarketing@villagroup.com','marin.manuel14@yahoo.com.mx','auxmkt@taferresorts.com','fhernandez@ata-supervisor.com'],
   'VDP - {start} al {end} de {month}  {year} - Reporte',
   E'Estimado equipo,\n\nAdjunto el reporte de asistencia correspondiente a la semana del {start} al {end} de {month} {year}.\n\nAtentamente,\nJorge Zendejas Lovera\nSupervisor | Airport Travel Advisors\nCel. 998 939 0506'),
  ('ASISTENCIA_KRY', 'Asistencia KRY', 'c5',
   ARRAY['tfischer@kivc.com','eliz07-11@hotmail.com','gsierra@kivc.com','ccomeau@kivc.com','fhernandez@ata-supervisor.com'],
   'KRY - {start} al {end} de {month}  {year} - Reporte',
   E'Estimado equipo,\n\nAdjunto el reporte de asistencia correspondiente a la semana del {start} al {end} de {month} {year}.\n\nAtentamente,\nJorge Zendejas Lovera\nSupervisor | Airport Travel Advisors\nCel. 998 939 0506'),
  ('PREMIOS', 'Premios', '',
   ARRAY['vtrava@elcid.com.mx','efhernandez@elcid.com.mx','alexruizrame@hotmail.com','josepepepepe@hotmail.com','ocitherlet@elcid.com.mx','mdominguezdu@mexicodestinationclub.com','sanguiano@mexicodestinationclub.com','mnavarroc@mexicodestinationclub.com','jgonzalezr@experienciasxcaret.com.mx','mhernandezch@experienciasxcaret.com.mx','padelmoral@mexicodestinationclub.com','aolimon@mexicodestinationclub.com','gtemktb@villagroupcancun.com','adireccionmktcan@villagroup.com','bob.kistner@taferresorts.com','miguel.juarez@taferresorts.com','fgc1422@gmail.com','asismarketing@villagroup.com','marin.manuel14@yahoo.com.mx','auxmkt@taferresorts.com','tfischer@kivc.com','eliz07-11@hotmail.com','gsierra@kivc.com','ccomeau@kivc.com','fhernandez@ata-supervisor.com','gbernal@grand-club.com'],
   'PREMIOS - {start} al {end} de {month}  {year}',
   E'Estimado equipo,\n\nAdjunto el reporte de premios correspondiente a la semana del {start} al {end} de {month} {year}.\n\nAtentamente,\nJorge Zendejas Lovera\nSupervisor | Airport Travel Advisors\nCel. 998 939 0506'),
  ('MODULOS_T4', 'Módulos T4', '',
   ARRAY['sanguiano@mexicodestinationclub.com','gtemktb@villagroupcancun.com','rroths@airport-ta.com','jruiz@airport-ta.com','elizgarcia@airport-ta.com','gsierra@kivc.com','marin.manuel14@yahoo.com.mx','mnavarroc@mexicodestinationclub.com','padelmoral@mexicodestinationclub.com','fhernandez@ata-supervisor.com'],
   'T4 POSICIONES DE MÓDULOS - {start} al {end} de {month}  {year}',
   E'Estimado equipo,\n\nAdjunto las posiciones de módulos de Terminal 4 para la semana del {start} al {end} de {month} {year}.\n\nAtentamente,\nJorge Zendejas Lovera\nSupervisor | Airport Travel Advisors\nCel. 998 939 0506');