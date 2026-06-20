-- =============================================================================
-- Migration: price_predictions table
-- Issue #11 – Async Worker Architecture
--
-- This table acts as both the job queue and the result store.
-- Workers use SELECT ... FOR UPDATE SKIP LOCKED for safe concurrent consumption.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Job status enum
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.prediction_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Core table
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_predictions (
  -- Primary identity
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Ownership – links job to the authenticated user who requested it
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Job input payload
  symbol            TEXT NOT NULL,           -- commodity name  (e.g. "tomato")
  location          TEXT NOT NULL,           -- mandi location  (e.g. "delhi")
  quantity          TEXT NOT NULL DEFAULT '1 kg',
  vendor_language   TEXT NOT NULL DEFAULT 'hindi',
  buyer_message     TEXT,

  -- Result payload (populated by worker)
  prediction        JSONB,                   -- full PriceAnalysis JSON
  confidence        NUMERIC(4, 3),           -- 0.000 – 1.000

  -- Job lifecycle
  status            public.prediction_status NOT NULL DEFAULT 'pending',
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,

  -- Timestamps (all mandatory per spec)
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at        TIMESTAMP WITH TIME ZONE,
  completed_at      TIMESTAMP WITH TIME ZONE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Indexes for worker hot-path and status polling
-- ────────────────────────────────────────────────────────────────────────────

-- Worker claim query: pending rows ordered by creation time
CREATE INDEX IF NOT EXISTS idx_price_predictions_pending
  ON public.price_predictions (created_at ASC)
  WHERE status = 'pending';

-- Status polling by job_id (primary lookup for GET /predict/:job_id)
CREATE INDEX IF NOT EXISTS idx_price_predictions_job_id
  ON public.price_predictions (job_id);

-- User's own job history
CREATE INDEX IF NOT EXISTS idx_price_predictions_user_id
  ON public.price_predictions (user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Constraints
-- ────────────────────────────────────────────────────────────────────────────

-- Confidence must be in [0, 1] if set
ALTER TABLE public.price_predictions
  ADD CONSTRAINT confidence_range
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

-- Retry cap at 3 attempts
ALTER TABLE public.price_predictions
  ADD CONSTRAINT max_attempts
  CHECK (attempt_count <= 3);

-- completed_at is only meaningful when status = 'completed' or 'failed'
ALTER TABLE public.price_predictions
  ADD CONSTRAINT completed_at_requires_terminal_status
  CHECK (
    completed_at IS NULL
    OR status IN ('completed', 'failed')
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.price_predictions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own prediction jobs
CREATE POLICY "Users can create prediction jobs"
  ON public.price_predictions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own jobs (status polling)
CREATE POLICY "Users can view own prediction jobs"
  ON public.price_predictions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Workers (service_role) bypass RLS to claim and update jobs
-- (service_role key is never exposed to the browser)

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Realtime publication (enables Supabase Realtime push to frontend)
-- ────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_predictions;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Helper function: mark a job as failed atomically
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_prediction_failed(
  p_job_id      UUID,
  p_error_msg   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.price_predictions
  SET
    status        = 'failed',
    error_message = p_error_msg,
    completed_at  = now()
  WHERE job_id = p_job_id
    AND status  = 'processing';
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Helper function: claim next pending job (safe concurrent worker)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_next_prediction_job()
RETURNS SETOF public.price_predictions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    UPDATE public.price_predictions
    SET
      status        = 'processing',
      started_at    = now(),
      attempt_count = attempt_count + 1
    WHERE id = (
      SELECT id
      FROM   public.price_predictions
      WHERE  status = 'pending'
        AND  attempt_count < 3
      ORDER  BY created_at ASC
      LIMIT  1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;
