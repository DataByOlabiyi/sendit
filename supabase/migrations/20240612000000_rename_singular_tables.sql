-- Rename singular table names to plural for consistency.
-- All other tables in the schema use plural nouns; these two were the outliers.

ALTER TABLE rider_wallet RENAME TO rider_wallets;
ALTER TABLE admin_audit_log RENAME TO admin_audit_logs;

-- Update RLS policies that reference the old names (Supabase re-attaches policies
-- to the table, but policy names that embed the table name may need manual review).
-- No policy name changes are required here — policy names are metadata only.
