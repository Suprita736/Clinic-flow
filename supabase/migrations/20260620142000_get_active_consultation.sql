-- Expose a safe, non-sensitive Security Definer function to return the currently active token's start time and token number
CREATE OR REPLACE FUNCTION public.get_active_consultation()
RETURNS TABLE (token_number INT, served_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT token_number, served_at
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE AND status = 'in_progress'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_consultation() TO authenticated;

-- Create function to nudge clinic_state updated_at
CREATE OR REPLACE FUNCTION public.nudge_clinic_state()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clinic_state SET updated_at = now() WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_nudge_clinic_state ON public.queue_entries;

-- Trigger whenever queue_entries are inserted, updated or deleted
CREATE TRIGGER trigger_nudge_clinic_state
AFTER INSERT OR UPDATE OR DELETE ON public.queue_entries
FOR EACH ROW EXECUTE FUNCTION public.nudge_clinic_state();
