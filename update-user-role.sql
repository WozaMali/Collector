-- Update User Role to Collector
-- This script changes dumisani@wozamali.co.za from customer to collector role

-- 1. First, let's check the current user and their role
SELECT 
    id,
    email,
    role,
    is_active,
    created_at,
    updated_at
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';

-- 2. Update the user's role to collector
UPDATE profiles 
SET 
    role = 'collector',
    updated_at = NOW()
WHERE email = 'dumisani@wozamali.co.za';

-- 3. Verify the change was made
SELECT 
    id,
    email,
    role,
    is_active,
    created_at,
    updated_at
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';

-- 4. If you need to also update the auth.users table metadata (optional)
-- This updates the user's metadata in Supabase Auth
UPDATE auth.users 
SET 
    raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        '"collector"'
    )
WHERE email = 'dumisani@wozamali.co.za';

-- 5. Check all users with collector role to verify
SELECT 
    id,
    email,
    role,
    is_active,
    created_at
FROM profiles 
WHERE role = 'collector'
ORDER BY created_at DESC;

-- 6. If you need to create a collector profile for this user (if it doesn't exist)
-- Uncomment and run this if the user doesn't exist in profiles table
/*
INSERT INTO profiles (
    id,
    email,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'dumisani@wozamali.co.za'),
    'dumisani@wozamali.co.za',
    'collector',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;
*/
