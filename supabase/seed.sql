-- ---------------------------------------------------------------------------
-- Seed Data (Development Only)
-- ---------------------------------------------------------------------------

-- NOTE: Run this AFTER creating auth users via Supabase dashboard or CLI.
-- This seeds an admin user. Replace the UUID with the actual auth user ID.

-- To create the admin auth user:
-- supabase auth admin create-user --email admin@sendit.com --password Admin@123456 --email-confirm

-- Then update the UUID below to match the created user's ID.

-- INSERT INTO users (id, email, full_name, role)
-- VALUES ('YOUR-ADMIN-USER-UUID', 'admin@sendit.com', 'SendIt Admin', 'admin')
-- ON CONFLICT (id) DO NOTHING;
