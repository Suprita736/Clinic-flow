-- Drop dependent views/RPCs before altering schema
DROP FUNCTION IF EXISTS public.next_token_number();
DROP FUNCTION IF EXISTS public.get_active_consultation();
DROP FUNCTION IF EXISTS public.get_queue_status_by_token(int);
DROP FUNCTION IF EXISTS public.get_queue_status_by_tracking_code(text);
DROP FUNCTION IF EXISTS public.perform_daily_reset();

-- Create Doctors table
CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialization text,
  is_active boolean DEFAULT true,
  status public.clinic_status DEFAULT 'active',
  currently_serving integer NULL,
  avg_consultation_seconds integer DEFAULT 480,
  created_at timestamptz DEFAULT now()
);

-- Seed demo data
INSERT INTO public.doctors (id, name, specialization)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Dr. Sharma', 'General Medicine'),
  ('22222222-2222-2222-2222-222222222222', 'Dr. Priya', 'Dermatology'),
  ('33333333-3333-3333-3333-333333333333', 'Dr. Raj', 'Pediatrics');

-- We must truncate queue_entries because we are adding a NOT NULL foreign key
TRUNCATE TABLE public.queue_entries RESTART IDENTITY CASCADE;

-- Add doctor_id to queue_entries
ALTER TABLE public.queue_entries 
ADD COLUMN doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE;

-- Recreate RPCs with Doctor logic

-- next_token_number scoped by doctor
CREATE OR REPLACE FUNCTION public.next_token_number(p_doctor_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(token_number), 0) + 1
  INTO v_next
  FROM public.queue_entries
  WHERE queue_date = current_date AND doctor_id = p_doctor_id;
  
  RETURN v_next;
END;
$$;

-- get_active_consultation scoped by doctor
CREATE OR REPLACE FUNCTION public.get_active_consultation(p_doctor_id uuid)
RETURNS TABLE (
  token_number integer,
  served_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT q.token_number, q.served_at
  FROM public.queue_entries q
  WHERE q.queue_date = current_date 
    AND q.status = 'in_progress'
    AND q.doctor_id = p_doctor_id
  ORDER BY q.served_at DESC
  LIMIT 1;
END;
$$;

-- perform_daily_reset resets all doctors
CREATE OR REPLACE FUNCTION public.perform_daily_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark all active tokens from past days as skipped
  UPDATE public.queue_entries
  SET status = 'skipped',
      updated_at = now()
  WHERE queue_date < current_date
    AND status IN ('waiting', 'in_progress');

  -- Clear currently_serving across all doctors
  UPDATE public.doctors
  SET currently_serving = null;
  
  -- Clear clinic_state legacy column just in case
  UPDATE public.clinic_state
  SET currently_serving = null
  WHERE id = 1;
END;
$$;

-- get_queue_status_by_tracking_code needs to join doctors
CREATE OR REPLACE FUNCTION public.get_queue_status_by_tracking_code(_tracking_code text)
RETURNS TABLE (
  token_number integer,
  patient_name text,
  status public.queue_status,
  people_ahead integer,
  currently_serving integer,
  total_waiting integer,
  estimated_wait_seconds integer,
  clinic_status public.clinic_status,
  queue_position integer,
  tracking_code text,
  doctor_name text,
  doctor_specialization text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_people_ahead integer;
  v_total_waiting integer;
  v_estimated_wait integer;
  v_pos integer;
  v_doctor RECORD;
BEGIN
  -- Find the entry and its doctor
  SELECT q.* INTO v_entry
  FROM public.queue_entries q
  WHERE q.tracking_code = _tracking_code 
    AND q.queue_date = current_date
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get doctor info
  SELECT * INTO v_doctor
  FROM public.doctors
  WHERE id = v_entry.doctor_id;

  -- If completed, skipped, or no_show
  IF v_entry.status IN ('completed', 'skipped', 'no_show') THEN
    RETURN QUERY SELECT 
      v_entry.token_number, 
      v_entry.patient_name, 
      v_entry.status, 
      0, 
      COALESCE(v_doctor.currently_serving, 0), 
      0, 
      0, 
      v_doctor.status, 
      0,
      v_entry.tracking_code,
      v_doctor.name,
      v_doctor.specialization;
    RETURN;
  END IF;

  -- If in_progress
  IF v_entry.status = 'in_progress' THEN
    RETURN QUERY SELECT 
      v_entry.token_number, 
      v_entry.patient_name, 
      v_entry.status, 
      0, 
      v_entry.token_number, 
      0, 
      0, 
      v_doctor.status, 
      0,
      v_entry.tracking_code,
      v_doctor.name,
      v_doctor.specialization;
    RETURN;
  END IF;

  -- Calculate people ahead and position for waiting entries
  SELECT COUNT(*)
  INTO v_people_ahead
  FROM public.queue_entries q
  WHERE q.queue_date = current_date
    AND q.doctor_id = v_entry.doctor_id
    AND q.status = 'waiting'
    AND COALESCE(q.recalled_at, q.created_at) < COALESCE(v_entry.recalled_at, v_entry.created_at);

  v_pos := v_people_ahead + 1;

  SELECT COUNT(*)
  INTO v_total_waiting
  FROM public.queue_entries q
  WHERE q.queue_date = current_date
    AND q.doctor_id = v_entry.doctor_id
    AND q.status = 'waiting';

  v_estimated_wait := (v_people_ahead + 1) * COALESCE(v_doctor.avg_consultation_seconds, 480);

  RETURN QUERY SELECT 
    v_entry.token_number, 
    v_entry.patient_name, 
    v_entry.status, 
    v_people_ahead, 
    COALESCE(v_doctor.currently_serving, 0), 
    v_total_waiting, 
    v_estimated_wait, 
    v_doctor.status, 
    v_pos,
    v_entry.tracking_code,
    v_doctor.name,
    v_doctor.specialization;
END;
$$;
