-- Phase 4A: Secure Tracking Links
-- Adds a unique tracking_code column and auto-generates it via trigger.

-- 1. Add tracking_code column
ALTER TABLE public.queue_entries
ADD COLUMN IF NOT EXISTS tracking_code TEXT UNIQUE;

-- 2. Create function to auto-generate tracking codes
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tracking_code := NEW.token_number::TEXT || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
  RETURN NEW;
END;
$$;

-- 3. Create trigger to run before insert
DROP TRIGGER IF EXISTS trg_generate_tracking_code ON public.queue_entries;
CREATE TRIGGER trg_generate_tracking_code
  BEFORE INSERT ON public.queue_entries
  FOR EACH ROW
  WHEN (NEW.tracking_code IS NULL)
  EXECUTE FUNCTION public.generate_tracking_code();

-- 4. Backfill existing rows that lack a tracking code
UPDATE public.queue_entries
SET tracking_code = token_number::TEXT || '-' || substr(md5(random()::text || id::text), 1, 4)
WHERE tracking_code IS NULL;

-- 5. Create RPC to look up by tracking code
CREATE OR REPLACE FUNCTION public.get_queue_status_by_tracking_code(_tracking_code TEXT)
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
  tracking_code TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_entry public.queue_entries%ROWTYPE;
  serving INT;
  ahead INT;
  total INT;
  avg_secs INT;
  cstatus clinic_status;
BEGIN
  SELECT * INTO target_entry
  FROM public.queue_entries
  WHERE public.queue_entries.tracking_code = _tracking_code
    AND queue_date = CURRENT_DATE
  LIMIT 1;

  SELECT currently_serving, avg_consultation_seconds, public.clinic_state.status
    INTO serving, avg_secs, cstatus
  FROM public.clinic_state WHERE id = 1;

  SELECT COUNT(*) INTO total
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE AND public.queue_entries.status IN ('waiting', 'in_progress');

  IF target_entry.id IS NULL THEN
    RETURN QUERY SELECT
      0,
      'Unknown'::TEXT,
      'completed'::queue_status,
      0, serving, total, 0, cstatus, 0,
      _tracking_code;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO ahead
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE
    AND public.queue_entries.status = 'waiting'
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
    target_entry.tracking_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_status_by_tracking_code(TEXT) TO anon, authenticated;
