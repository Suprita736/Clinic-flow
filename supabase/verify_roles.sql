-- ClinicFlow: Verify user roles
-- Run this in Supabase SQL Editor to check which users have roles assigned.
-- Users with NULL in the role column are affected by the bug.

SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'role' AS meta_role,
  u.raw_user_meta_data->>'full_name' AS meta_name,
  ur.role AS assigned_role,
  ur.created_at AS role_created_at,
  p.full_name AS profile_name,
  CASE
    WHEN ur.role IS NULL THEN '❌ MISSING — will default to patient'
    ELSE '✅ OK'
  END AS status
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
