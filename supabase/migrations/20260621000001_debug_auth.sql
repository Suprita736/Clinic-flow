CREATE OR REPLACE FUNCTION public.debug_auth()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'auth_uid', auth.uid(),
    'jwt_sub', current_setting('request.jwt.claim.sub', true),
    'jwt_claims', current_setting('request.jwt.claims', true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_auth() TO authenticated;
