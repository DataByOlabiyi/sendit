-- Same class of bug as 20260710000000 (riders) and 20260709000000
-- (push_subscriptions): orders has RLS policies but was never given a
-- table-level GRANT for the authenticated role. This blocks more than
-- direct queries against orders — the proof-of-delivery and
-- chat-attachments storage.objects SELECT policies also reference
-- public.orders, so Postgres denies signed-URL/list requests against
-- those buckets too (and rider-documents, since Postgres evaluates all
-- permissive policies for the same command together) with "permission
-- denied for table orders".

GRANT SELECT ON public.orders TO authenticated;
