INSERT INTO public.user_roles (user_id, role)
VALUES ('bc16407c-d807-4b5e-8f24-258177e8ef22', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;