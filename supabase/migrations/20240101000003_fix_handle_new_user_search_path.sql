-- Fix handle_new_user trigger: add SET search_path = public so that the
-- user_role enum (in public schema) resolves correctly when GoTrue fires the
-- trigger as supabase_auth_admin (which has search_path=auth only).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant necessary table privileges so the app can read/write user profiles.
-- In newer Supabase projects, anon/authenticated/service_role don't get
-- automatic SELECT/INSERT/UPDATE/DELETE — RLS controls row-level access,
-- but table-level GRANTs still need to be present.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT ALL ON public.users TO service_role;
