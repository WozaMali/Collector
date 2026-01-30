-- Simple Role Update for dumisani@wozamali.co.za
-- Changes user role from customer to collector

-- Update the user's role to collector
UPDATE profiles 
SET 
    role = 'collector',
    updated_at = NOW()
WHERE email = 'dumisani@wozamali.co.za';

-- Verify the change
SELECT 
    email,
    role,
    updated_at
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';
