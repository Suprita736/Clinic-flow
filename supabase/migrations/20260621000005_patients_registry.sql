-- Phase 5.1: Patient Registry
-- Creates a patients table to store patient history, uniquely identified by phone number.

CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  visit_count integer DEFAULT 1,
  last_visit_date date DEFAULT current_date,
  preferred_doctor_id uuid REFERENCES public.doctors(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for searching patients by name and phone
CREATE INDEX IF NOT EXISTS patients_name_idx ON public.patients(name);
CREATE INDEX IF NOT EXISTS patients_phone_idx ON public.patients(phone);

-- Function to search patients securely
CREATE OR REPLACE FUNCTION public.search_patients(search_query text)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  visit_count integer,
  last_visit_date date,
  preferred_doctor_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.phone, p.visit_count, p.last_visit_date, p.preferred_doctor_id
  FROM public.patients p
  WHERE p.name ILIKE '%' || search_query || '%'
     OR p.phone ILIKE '%' || search_query || '%'
  ORDER BY p.last_visit_date DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_patients(text) TO authenticated;
