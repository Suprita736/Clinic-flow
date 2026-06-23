-- Migration for Daily Queue Reset and queue_position alignment

-- 1. Daily Queue Reset Function
CREATE OR REPLACE FUNCTION public.perform_daily_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark any active entries from previous days as no_show
  UPDATE public.queue_entries
  SET status = 'no_show', updated_at = now()
  WHERE queue_date < CURRENT_DATE
    AND status IN ('waiting', 'in_progress');

  -- If no one is actively being served today, ensure currently_serving is NULL
  IF NOT EXISTS (
    SELECT 1 FROM public.queue_entries
    WHERE queue_date = CURRENT_DATE AND status = 'in_progress'
  ) THEN
    UPDATE public.clinic_state 
    SET currently_serving = NULL, updated_at = now()
    WHERE id = 1 AND currently_serving IS NOT NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.perform_daily_reset() TO authenticated;

-- 2. Update get_my_queue_status to return 'queue_position' as the JSON key
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
    'queue_position', ahead + 1,
    'family_count', my_entry.family_count
  );
END;
$$;
