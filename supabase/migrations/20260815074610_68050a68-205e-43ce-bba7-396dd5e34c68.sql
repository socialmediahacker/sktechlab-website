ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS home_slot text;
ALTER TABLE public.templates ADD CONSTRAINT templates_home_slot_check CHECK (home_slot IS NULL OR home_slot IN ('demo','showcase'));
CREATE INDEX IF NOT EXISTS templates_home_slot_idx ON public.templates (home_slot, sort_order);