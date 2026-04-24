-- Cambiar companies.id de uuid a text para alinear con los IDs c1..c6 que usa la app
ALTER TABLE public.companies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.companies ALTER COLUMN id TYPE text USING id::text;

-- Seed de las 6 empresas core
INSERT INTO public.companies 
  (id, name, short_name, abbreviation, color, text_color, active, terminals)
VALUES
  ('c1','Grupo Sunset','Sunset','SUN','#92d050','#000000',true,ARRAY[]::TEXT[]),
  ('c2','Grupo Xcaret','XCA','XCA','#948a54','#ffffff',true,ARRAY[]::TEXT[]),
  ('c3','Villa del Palmar','VDP','VDP','#f8cbad','#000000',true,ARRAY[]::TEXT[]),
  ('c4','El Cid','CID','CID','#bdd7ee','#000000',true,ARRAY[]::TEXT[]),
  ('c5','Krystal','KRY','KRY','#ffff00','#000000',true,ARRAY[]::TEXT[]),
  ('c6','Krystal Grand','KRY G','KRY','#afafaf','#000000',true,ARRAY[]::TEXT[])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  abbreviation = EXCLUDED.abbreviation,
  color = EXCLUDED.color,
  text_color = EXCLUDED.text_color,
  active = EXCLUDED.active;