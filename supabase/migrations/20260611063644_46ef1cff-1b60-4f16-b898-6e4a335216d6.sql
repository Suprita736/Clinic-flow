
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('patient', 'receptionist');

-- Queue status enum
CREATE TYPE public.queue_status AS ENUM ('waiting', 'in_progress', 'completed', 'skipped');

-- Clinic operational status enum
CREATE TYPE public.clinic_status AS ENUM ('active', 'paused', 'break');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can set their own role" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- CLINIC STATE (single row)
CREATE TABLE public.clinic_state (
  id INT NOT NULL PRIMARY KEY DEFAULT 1,
  status clinic_status NOT NULL DEFAULT 'active',
  currently_serving INT,
  avg_consultation_seconds INT NOT NULL DEFAULT 900,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_state_single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_state TO authenticated;
GRANT ALL ON public.clinic_state TO service_role;
ALTER TABLE public.clinic_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view clinic state" ON public.clinic_state
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Receptionists can update clinic state" ON public.clinic_state
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'receptionist'))
  WITH CHECK (public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "Receptionists can insert clinic state" ON public.clinic_state
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'receptionist'));
INSERT INTO public.clinic_state (id, status) VALUES (1, 'active');

-- QUEUE ENTRIES
CREATE TABLE public.queue_entries (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number INT NOT NULL,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status queue_status NOT NULL DEFAULT 'waiting',
  queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  served_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_entries TO authenticated;
GRANT ALL ON public.queue_entries TO service_role;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view their own entry, receptionists view all" ON public.queue_entries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "Patients can join queue for themselves" ON public.queue_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "Receptionists can update queue entries" ON public.queue_entries
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'receptionist'))
  WITH CHECK (public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "Receptionists can delete queue entries" ON public.queue_entries
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'receptionist'));
CREATE TRIGGER queue_entries_updated_at BEFORE UPDATE ON public.queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_queue_entries_date_status ON public.queue_entries (queue_date, status, token_number);

-- next token for today
CREATE OR REPLACE FUNCTION public.next_token_number()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(token_number), 0) + 1
  FROM public.queue_entries
  WHERE queue_date = CURRENT_DATE
$$;

-- patient live queue status
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
  ORDER BY token_number ASC
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
    AND token_number < my_entry.token_number;

  RETURN json_build_object(
    'has_entry', true,
    'token_number', my_entry.token_number,
    'my_status', my_entry.status,
    'people_ahead', ahead,
    'currently_serving', serving,
    'total_waiting', total,
    'estimated_wait_seconds', ahead * avg_secs,
    'clinic_status', cstatus,
    'position', ahead + 1
  );
END;
$$;

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_state;
ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;
ALTER TABLE public.clinic_state REPLICA IDENTITY FULL;
