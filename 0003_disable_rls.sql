-- Fix RLS for store_state table when using new Supabase keys
-- Run this in Supabase SQL Editor if you get "permission denied for table store_state"

-- Option 1: Disable RLS entirely (simplest for single-tenant app)
ALTER TABLE store_state DISABLE ROW LEVEL SECURITY;

-- Option 2: Keep RLS but allow service role (legacy JWT keys)
-- CREATE POLICY "service_role_all" ON store_state FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Option 3: Allow authenticated users (if using Supabase Auth)
-- CREATE POLICY "authenticated_all" ON store_state FOR ALL TO authenticated USING (true) WITH CHECK (true);