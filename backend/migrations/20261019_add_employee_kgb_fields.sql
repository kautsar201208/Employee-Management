ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS tmt_cpns date,
ADD COLUMN IF NOT EXISTS tmt_kgb_terakhir date,
ADD COLUMN IF NOT EXISTS kgb_selanjutnya date;
