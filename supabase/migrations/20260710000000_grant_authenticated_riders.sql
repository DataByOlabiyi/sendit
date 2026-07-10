-- riders was created with RLS policies but no table-level GRANT for the
-- authenticated role. RLS only restricts which rows a role can see; Postgres
-- still denies the query entirely without the base privilege. This is why
-- every non-service-role read/write against riders (admin approve/suspend/
-- reject actions, storage signed-URL generation for rider-documents, a
-- rider's own client-side profile edits) has always failed with "permission
-- denied for table riders" and had to be routed through the service-role
-- admin client instead.

GRANT SELECT, UPDATE ON public.riders TO authenticated;
