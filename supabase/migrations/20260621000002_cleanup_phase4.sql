-- Migration for Phase 4 Cleanup: Removing Family Tokens

-- 1. Drop columns from queue_entries
ALTER TABLE public.queue_entries 
DROP COLUMN IF EXISTS family_count, 
DROP COLUMN IF EXISTS family_members;

-- 2. Recreate get_my_queue_status without family_count
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
    'queue_position', ahead + 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_queue_status() TO authenticated;

-- 3. Recreate get_queue_status_by_token without family_count
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
  queue_position INT
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
  WHERE public.queue_entries.token_number = _token_number
    AND queue_date = CURRENT_DATE
  ORDER BY coalesce(recalled_at, created_at) ASC
  LIMIT 1;

  SELECT currently_serving, avg_consultation_seconds, public.clinic_state.status
    INTO serving, avg_secs, cstatus
  FROM public.clinic_state WHERE id = 1;

  SELECT COUNT(*) INTO total
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE AND public.queue_entries.status IN ('waiting', 'in_progress');

  IF target_entry.id IS NULL THEN
    RETURN QUERY SELECT 
      _token_number, 
      'Unknown'::TEXT, 
      'completed'::queue_status, 
      0, serving, total, 0, cstatus, 0;
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
    ahead + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_status_by_token(INT) TO anon, authenticated;
