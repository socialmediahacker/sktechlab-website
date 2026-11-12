ALTER TABLE public.builder_sessions
  ADD COLUMN IF NOT EXISTS payment_amount_inr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS payment_note text,
  ADD COLUMN IF NOT EXISTS payment_submission_id uuid;