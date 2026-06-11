
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_token_number() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_queue_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_token_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_queue_status() TO authenticated;
