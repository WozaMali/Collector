# Collector App Permissions Fix

## Problem
Your collector app is experiencing these errors:
- `403 (Forbidden)` when trying to access profiles
- `permission denied for table profiles` (error code 42501)
- `400 (Bad Request)` when trying to access pickups

## Root Cause
The issue is that your Supabase database doesn't have proper Row Level Security (RLS) policies set up for collectors to access customer data. The anonymous key has very limited permissions.

## Solution Steps

### 1. Run the Database Fix Script
You need to run one of these SQL scripts in your Supabase SQL Editor:

**Option A: Simple Fix (Recommended for quick resolution)**
```sql
-- Run the contents of simple-collector-fix.sql
```

**Option B: Comprehensive Fix (For production use)**
```sql
-- Run the contents of fix-collector-permissions.sql
```

**Option C: Address Fields & RLS Setup (Required for address access)**
```sql
-- Run the contents of schemas/ensure_address_fields_in_users.sql
-- This ensures address fields exist and sets up RLS policies for collectors
-- to access user addresses for pickup scheduling
```

### 2. How to Run the Script
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the script content
4. Click "Run" to execute

### 3. What the Script Does
- Enables Row Level Security (RLS) on tables
- Creates policies allowing authenticated collectors to read customer data
- Grants necessary permissions to authenticated users
- Sets up proper access control

### 4. Test the Fix
After running the script:
1. Restart your collector app development server
2. Try logging in as a collector
3. Check if the dashboard loads without permission errors

### 5. Alternative Solutions

#### Option A: Use Service Role Key (Not Recommended for Production)
If you need a quick fix for development, you could temporarily use the service role key:

```typescript
// In src/lib/supabase.ts - NOT recommended for production
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

#### Option B: Create a Dedicated Collector Role
Create a specific database role for collectors with limited permissions.

## Security Notes
- The RLS policies ensure collectors can only access data they need
- Collectors can read customer profiles but cannot modify them
- Each collector can only see pickups assigned to them
- The policies are secure and follow the principle of least privilege

## Troubleshooting

### If you still get permission errors:
1. Check if RLS is enabled on your tables
2. Verify the policies were created successfully
3. Ensure your user is properly authenticated
4. Check the browser console for detailed error messages

### To verify policies are working:
```sql
-- Check if policies exist
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

## Next Steps
After fixing the permissions:
1. Test all collector functionality
2. Set up proper user authentication flow
3. Consider implementing more granular permissions if needed
4. Monitor for any remaining permission issues

## Support
If you continue to have issues after running the fix script, check:
1. Supabase logs for detailed error information
2. Browser network tab for HTTP status codes
3. Database schema to ensure tables exist as expected
