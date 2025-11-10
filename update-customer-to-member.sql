-- ============================================================================
-- UPDATE CUSTOMER TO MEMBER THROUGHOUT THE SYSTEM
-- ============================================================================
-- This script updates the database schema and data to use 'member' instead of 'customer'

-- 1. First, let's check what we currently have
SELECT 
    'CURRENT STATE' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'customer' THEN 1 END) as customer_count,
    COUNT(CASE WHEN role = 'member' THEN 1 END) as member_count
FROM profiles;

-- 2. Update existing profiles from 'customer' to 'member'
UPDATE profiles 
SET role = 'member' 
WHERE role = 'customer';

-- 3. Update the role constraint to allow 'member' instead of 'customer'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('member', 'collector', 'admin'));

-- 4. Update the customer_profiles_with_addresses_view to use 'member'
DROP VIEW IF EXISTS customer_profiles_with_addresses_view;

CREATE OR REPLACE VIEW customer_profiles_with_addresses_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'id', a.id,
                'line1', a.line1,
                'suburb', a.suburb,
                'city', a.city,
                'postal_code', a.postal_code,
                'lat', a.lat,
                'lng', a.lng,
                'is_primary', a.is_primary
            ) ORDER BY a.is_primary DESC, a.created_at ASC
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'::json
    ) as addresses
FROM profiles p
LEFT JOIN addresses a ON p.id = a.profile_id
WHERE p.role = 'member' AND p.is_active = true
GROUP BY p.id, p.email, p.full_name, p.phone, p.role, p.is_active, p.created_at, p.updated_at;

-- 5. Update any other views or functions that reference 'customer'
-- Check if there are other views that need updating
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND definition LIKE '%customer%';

-- 6. Update the sample data creation to use 'member' role
-- (This will be used in future insertions)
-- Example: INSERT INTO profiles (..., role, ...) VALUES (..., 'member', ...)

-- 7. Verify the changes
SELECT 
    'AFTER UPDATE' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'member' THEN 1 END) as member_count,
    COUNT(CASE WHEN role = 'collector' THEN 1 END) as collector_count,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
FROM profiles;

-- 8. Test the updated view
SELECT 
    'VIEW TEST' as test_type,
    COUNT(*) as view_record_count
FROM customer_profiles_with_addresses_view;

-- 9. Show sample data from the updated view
SELECT 
    id,
    email,
    full_name,
    role,
    jsonb_array_length(addresses::jsonb) as address_count
FROM customer_profiles_with_addresses_view
LIMIT 3;

-- 10. Final verification
SELECT 
    'FINAL VERIFICATION' as status,
    (SELECT COUNT(*) FROM profiles WHERE role = 'member') as member_profiles,
    (SELECT COUNT(*) FROM addresses) as total_addresses,
    (SELECT COUNT(*) FROM customer_profiles_with_addresses_view) as view_records;
