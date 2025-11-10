-- Simple Fix for Collector Permissions
-- This script addresses the immediate 403/42501 errors

-- 1. Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create a simple policy allowing authenticated users to read customer profiles
CREATE POLICY "Allow authenticated users to read customer profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        role = 'customer' OR id = auth.uid()
    );

-- 3. Enable RLS on addresses table
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- 4. Create a simple policy allowing authenticated users to read addresses
CREATE POLICY "Allow authenticated users to read addresses" ON addresses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = addresses.profile_id 
            AND profiles.role = 'customer'
        )
        OR profile_id = auth.uid()
    );

-- 5. Enable RLS on pickups table
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

-- 6. Create a simple policy allowing authenticated users to read pickups
CREATE POLICY "Allow authenticated users to read pickups" ON pickups
    FOR SELECT
    TO authenticated
    USING (
        collector_id = auth.uid() OR customer_id = auth.uid()
    );

-- 7. Grant basic permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON addresses TO authenticated;
GRANT SELECT ON pickups TO authenticated;

-- 8. Check if policies were created
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'addresses', 'pickups')
ORDER BY tablename;
