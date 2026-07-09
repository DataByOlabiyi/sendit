-- push_subscriptions was created with an RLS policy but no table-level GRANT
-- for the authenticated role. RLS only restricts which rows a role can see;
-- Postgres still denies the query entirely without the base privilege, so
-- every subscribe/unsubscribe attempt has failed with "permission denied for
-- table push_subscriptions" since the feature was first scaffolded.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
