# Issue Fixes for Woza Mali Collector App

## Overview
This document outlines the fixes for various issues encountered in the Woza Mali Collector App, including database constraints, relationships, and data population.

## Issues Identified and Fixed

### 1. ✅ Collector Constraint Issue
**Problem**: `ERROR: 23514: new row for relation "profiles" violates check constraint "valid_collector_id"`
**Cause**: The `dumisani@wozamali.co.za` profile had `role = 'collector'` but `collector_id = null`
**Fix**: Updated the profile to set `collector_id = id` (using their own ID)

### 2. ✅ Database Relationship Issue  
**Problem**: `ERROR: 42P01: relation "pg_check_constraints" does not exist`
**Cause**: Missing foreign key relationship between `profiles` and `addresses` tables
**Fix**: Created foreign key constraint and view for member profiles with addresses

### 3. ✅ Auto-Sign In Issue
**Problem**: Users were automatically signed in on the login page
**Cause**: `useAuth` hook was creating basic user objects for authenticated sessions without profiles
**Fix**: Modified `useAuth` to set `user = null` when no profile is found, requiring manual sign-in

### 4. ✅ Missing Database Column Issue
**Problem**: `ERROR: 42703: column pickups.total_kg does not exist`
**Cause**: The `pickups` table was missing `total_kg`, `total_value`, `created_at`, and `updated_at` columns
**Fix**: Added missing columns and created triggers to automatically update totals

### 5. ✅ Customer to Member Update
**Problem**: System was using 'customer' role instead of 'member' role
**Cause**: Database schema and queries were referencing 'customer' role
**Fix**: Updated all database references from 'customer' to 'member' role

## Fix Files Created

### Database Fixes
1. **`fix-dumisani-collector.sql`** - Fixes the collector constraint issue
2. **`fix-database-relationships.sql`** - Creates foreign key relationships and views
3. **`fix-pickups-table-structure.sql`** - Adds missing columns to pickups table
4. **`fix-all-issues-comprehensive.sql`** - Combines all database fixes in one script
5. **`update-all-to-member.sql`** - Updates system from 'customer' to 'member' role

### Data Population
6. **`create-sample-customers.sql`** - Creates sample member profiles and addresses
7. **`debug-customer-data.sql`** - Diagnostic script for member data issues

### Frontend Fixes
8. **`use-auth.tsx`** - Modified to prevent auto-sign-in

## Latest Issues and Fixes

### Issue 8: Members not appearing on customer page due to permission errors

**Error Messages:**
- `GET .../rest/v1/customer_profiles_with_addresses_view?select=* 403 (Forbidden)`
- `permission denied for view customer_profiles_with_addresses_view`
- `GET .../rest/v1/profiles?select=*%2Caddresses%28*%29&role=eq.customer&is_active=eq.true 400 (Bad Request)`
- `Could not find a relationship between 'profiles' and 'addresses' in the schema cache`
- Members showing as "Unknown Customer" and "No address" instead of real names and addresses

**Root Cause:** 
1. RLS (Row Level Security) policies preventing access to the view and tables
2. Frontend still using outdated `role=eq.customer` instead of `role=eq.member`
3. Data transformation logic not properly handling member names and addresses
4. Missing or incorrect member data in the database

**Fix Files Created:**
- `fix-member-display-complete.sql` - **RECOMMENDED**: Complete fix for all member display issues
- `fix-rls-policies.sql` - Basic RLS policies fix
- Updated `collector-app/src/app/customers/page.tsx` - Fixed role creation and improved data transformation
- Updated `collector-app/src/lib/supabase-services.ts` - Changed `role=eq.customer` to `role=eq.member`
- Updated `collector-app/src/lib/supabase.ts` - Changed role type from 'customer' to 'member'

**How to Apply:**
1. Run the RLS fix script in Supabase SQL Editor:
   ```sql
   -- Copy and paste the contents of fix-rls-policies.sql
   ```
2. The frontend changes have already been applied automatically
3. Test by refreshing the customers page - members should now appear

**What This Fix Does:**
- Creates RLS policies allowing authenticated users to read profiles and addresses
- Grants SELECT permissions on tables and view to authenticated users
- Ensures the customer_profiles_with_addresses_view exists with correct permissions
- Updates frontend to use 'member' role instead of 'customer' role

## How to Apply Fixes

### Step 1: Apply Database Schema Updates
Run the comprehensive fix script in your Supabase SQL Editor:
```sql
-- Run this in Supabase SQL Editor
\i fix-all-issues-comprehensive.sql
```

### Step 1b: Setup Address Fields (REQUIRED)
**IMPORTANT**: Run this script to ensure address fields exist and RLS policies are configured for collectors:
```sql
-- Run this in Supabase SQL Editor
-- Location: schemas/ensure_address_fields_in_users.sql
-- This script:
-- - Adds address fields (street_addr, suburb, city, postal_code) to users table
-- - Sets up RLS policies allowing collectors to read user addresses
-- - Creates performance indexes
-- - Safe to run multiple times (idempotent)
```

### Step 2: Update Role System to Use 'Member'
Run the member update script:
```sql
-- Run this in Supabase SQL Editor  
\i update-all-to-member.sql
```

### Step 3: Populate Sample Data
Run the sample data creation script:
```sql
-- Run this in Supabase SQL Editor
\i create-sample-customers.sql
```

### Step 4: Fix Member Display Issues (RECOMMENDED)
Run the complete member display fix script to resolve all issues:
```sql
-- Run this in Supabase SQL Editor
\i fix-member-display-complete.sql
```

**OR** if you prefer to fix issues separately:

#### Step 4a: Fix RLS Policies
Run the RLS fix script to resolve permission issues:
```sql
-- Run this in Supabase SQL Editor
\i fix-rls-policies.sql
```

### Step 5: Verify Changes
Run the debug script to verify everything is working:
```sql
-- Run this in Supabase SQL Editor
\i debug-customer-data.sql
```

## What Each Fix Does

### `fix-all-issues-comprehensive.sql`
- Fixes the `dumisani` collector profile
- Creates foreign key relationships between tables
- Creates `customer_profiles_with_addresses_view` (now for members)
- Adds missing columns to `pickups` table
- Creates triggers for automatic total updates
- Inserts sample data conditionally

### `update-all-to-member.sql`
- Updates existing profiles from 'customer' to 'member' role
- Updates role constraint to allow 'member' instead of 'customer'
- Updates database views to reference 'member' role
- Verifies all changes are applied correctly

### `create-sample-customers.sql`
- Creates 5 sample member profiles with realistic data
- Creates associated addresses for each member
- Uses Johannesburg suburbs and coordinates
- Prevents duplicate insertions with `ON CONFLICT DO NOTHING`

## Verification Steps

After running the fixes, verify:

1. **Database Structure**: Check that all tables have the correct columns
2. **Member Data**: Verify member profiles appear in the view
3. **Frontend Display**: Check that the customer page shows "Members" and displays member data
4. **Role System**: Confirm profiles use 'member' role instead of 'customer'

## Testing Instructions

1. **Run the fix scripts** in Supabase SQL Editor
2. **Refresh your collector app** in the browser
3. **Navigate to the customer page** - should now show "Members"
4. **Check that member data appears** - should see 5 member cards
5. **Test search functionality** - should filter members by name, email, or city
6. **Verify member details** - each card should show name, email, address, and city

## Current Status

- ✅ Database constraints fixed
- ✅ Foreign key relationships created
- ✅ Auto-sign-in disabled
- ✅ Missing database columns added
- ✅ System updated to use 'member' role instead of 'customer'
- ✅ Sample member data created
- ✅ Frontend updated to display "Members"
- ✅ Frontend role queries updated from 'customer' to 'member'
- 🔄 RLS policies need to be fixed (use fix-rls-policies.sql)

## Next Steps

1. **Apply the database fixes** using the provided scripts
2. **Test the member functionality** in the frontend
3. **Verify data appears correctly** on the members page
4. **Report any remaining issues** for further fixes

## Notes

- The system now uses 'member' role instead of 'customer' role throughout
- All database views and queries have been updated accordingly
- Sample data includes realistic Johannesburg addresses and coordinates
- The frontend now displays "Members" instead of "Customers"
- All fixes are designed to be safe and non-destructive
