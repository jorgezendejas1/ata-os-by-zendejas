ALTER TABLE public.targets ALTER COLUMN count TYPE numeric USING count::numeric;
ALTER TABLE public.staffing ALTER COLUMN count TYPE numeric USING count::numeric;