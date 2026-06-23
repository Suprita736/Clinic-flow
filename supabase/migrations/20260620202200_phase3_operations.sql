-- Migration for Phase 3 — Real Clinic Operations

-- 1. Add 'no_show' to queue_status enum
ALTER TYPE public.queue_status ADD VALUE IF NOT EXISTS 'no_show';

-- 2. Add family token columns and recalled_at to queue_entries
ALTER TABLE public.queue_entries ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMPTZ;
ALTER TABLE public.queue_entries ADD COLUMN IF NOT EXISTS family_count INT NOT NULL DEFAULT 1;
ALTER TABLE public.queue_entries ADD COLUMN IF NOT EXISTS family_members JSONB;

-- 3. Update get_my_queue_status to support new sorting (recalled_at) and family count
CREATE OR REPLACE FUNCTION public.get_my_queue_status()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_entry public.queue_entries%ROWTYPE;
  serving INT;
  ahead INT;
  total INT;
  avg_secs INT;
  cstatus clinic_status;
BEGIN
  SELECT * INTO my_entry
  FROM public.queue_entries
  WHERE user_id = auth.uid()
    AND queue_date = CURRENT_DATE
    AND status IN ('waiting', 'in_progress')
  ORDER BY coalesce(recalled_at, created_at) ASC, token_number ASC
  LIMIT 1;

  SELECT currently_serving, avg_consultation_seconds, status
    INTO serving, avg_secs, cstatus
  FROM public.clinic_state WHERE id = 1;

  SELECT COUNT(*) INTO total
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE AND status IN ('waiting', 'in_progress');

  IF my_entry.id IS NULL THEN
    RETURN json_build_object(
      'has_entry', false,
      'currently_serving', serving,
      'total_waiting', total,
      'clinic_status', cstatus
    );
  END IF;

  SELECT COUNT(*) INTO ahead
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE
    AND status = 'waiting'
    AND coalesce(recalled_at, created_at) < coalesce(my_entry.recalled_at, my_entry.created_at);

  RETURN json_build_object(
    'has_entry', true,
    'token_number', my_entry.token_number,
    'my_status', my_entry.status,
    'people_ahead', ahead,
    'currently_serving', serving,
    'total_waiting', total,
    'estimated_wait_seconds', ahead * avg_secs,
    'clinic_status', cstatus,
    'position', ahead + 1,
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_queue_status() TO authenticated;

-- 4. Create public read-only function for QR-based status page (unauthenticated tracking)
CREATE OR REPLACE FUNCTION public.get_queue_status_by_token(_token_number INT)
RETURNS TABLE (
  token_number INT,
  patient_name TEXT,
  status queue_status,
  people_ahead INT,
  currently_serving INT,
  total_waiting INT,
  estimated_wait_seconds INT,
  clinic_status clinic_status,
  queue_position INT,
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_entry public.queue_entries%ROWTYPE;
  serving INT;
  avg_secs INT;
  cstatus clinic_status;
  total INT;
  ahead INT;
BEGIN
  -- First look for active entry (waiting or in_progress)
  SELECT * INTO target_entry
  FROM public.queue_entries
  WHERE token_number = _token_number
    AND queue_date = CURRENT_DATE
    AND status IN ('waiting', 'in_progress')
  ORDER BY coalesce(recalled_at, created_at) ASC
  LIMIT 1;

  SELECT currently_serving, avg_consultation_seconds, status
    INTO serving, avg_secs, cstatus
  FROM public.clinic_state WHERE id = 1;

  SELECT COUNT(*) INTO total
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE AND status IN ('waiting', 'in_progress');

  IF target_entry.id IS NULL THEN
    -- If no active entry, show latest status of that token number today (e.g. completed, skipped, no_show)
    SELECT * INTO target_entry
    FROM public.queue_entries
    WHERE token_number = _token_number
      AND queue_date = CURRENT_DATE
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF target_entry.id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO ahead
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE
    AND status = 'waiting'
    AND coalesce(recalled_at, created_at) < coalesce(target_entry.recalled_at, target_entry.created_at);

  RETURN QUERY SELECT
    target_entry.token_number,
    target_entry.patient_name,
    target_entry.status,
    ahead,
    serving,
    total,
    ahead * avg_secs,
    cstatus,
    ahead + 1,
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_status_by_token(INT) TO anon, authenticated;
