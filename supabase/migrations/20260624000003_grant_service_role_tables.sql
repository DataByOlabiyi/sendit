-- service_role bypasses RLS but still needs table-level privileges.
-- The initial schema had no GRANT statements; only public.users received
-- an explicit service_role grant in a later hotfix. Every admin client
-- query on any other table was silently returning 403 → null.

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure tables created by future migrations also get the grant automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
