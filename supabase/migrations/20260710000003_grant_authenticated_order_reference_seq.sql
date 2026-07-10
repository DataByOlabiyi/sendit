-- Same class of bug as the preceding three migrations, one level deeper:
-- the set_order_reference BEFORE INSERT trigger (generate_order_reference())
-- is not SECURITY DEFINER, so it runs as the inserting role and calls
-- NEXTVAL('order_reference_seq') under that role's own privileges. Table
-- grants don't extend to sequences in Postgres, so even with INSERT on
-- orders granted, the trigger itself failed with "permission denied for
-- sequence order_reference_seq". This is the only custom sequence in the
-- schema (other tables use gen_random_uuid(), which needs no grant).

GRANT USAGE ON SEQUENCE public.order_reference_seq TO authenticated;
