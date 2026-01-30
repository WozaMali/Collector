# Database Setup Guide for Collector App

This guide covers all database setup requirements for the Woza Mali Collector App.

## 📋 Prerequisites

- Supabase project created
- Access to Supabase SQL Editor
- Admin access to your Supabase project

## 🚀 Setup Steps (Run in Order)

### Step 1: Install Base Schema

Run the main schema installation script:

```sql
-- Run in Supabase SQL Editor
-- File: schemas/00-install-all.sql
```

This installs the complete database schema with all core tables.

### Step 2: Setup Address Fields (REQUIRED)

**⚠️ CRITICAL**: This script is required for the Collector App to function properly. It sets up address fields and RLS policies that allow collectors to access user addresses.

```sql
-- Run in Supabase SQL Editor
-- File: schemas/ensure_address_fields_in_users.sql
-- Location: ../schemas/ensure_address_fields_in_users.sql (from WozaMaliCollector directory)
```

**What this script does:**
- ✅ Adds address fields to `users` table:
  - `street_addr` - Street address
  - `suburb` - Suburb/neighborhood
  - `city` - City
  - `postal_code` - Postal/ZIP code
  - `first_name`, `last_name`, `date_of_birth` - User profile fields
  - `area_id` - For collector area assignment

- ✅ Sets up Row Level Security (RLS) policies:
  - `users_self_select` - Users can view their own data
  - `users_admin_select` - Admin/Office can view all users
  - `users_collector_select` - **Collectors can view resident/member/customer users** (for pickup scheduling)
  - `users_self_update` - Users can update their own data
  - `users_admin_update` - Admin can update any user
  - `users_insert_self` - Users can insert their own row (for sign-up)

- ✅ Creates performance indexes:
  - Index on `city` for filtering
  - Index on `suburb` for filtering
  - Index on `postal_code` for filtering
  - Index on `area_id` for collector area filtering

- ✅ Safe to run multiple times (idempotent)

**Why this is required:**
Without this script, collectors will not be able to:
- View user addresses for pickup scheduling
- Access customer/member location information
- Filter users by city, suburb, or postal code
- Assign users to collection areas

### Step 3: Create Test Accounts (Optional)

For development and testing:

```sql
-- Run in Supabase SQL Editor
-- File: create-test-collector.sql
```

This creates test collector accounts for development.

### Step 4: Additional Setup (As Needed)

#### Photo Capture Setup
If you need photo capture functionality:
- See `PHOTO_SETUP_INSTRUCTIONS.md` for details
- Run `add-photo-fields.sql` to add photo fields

#### Member Display Fix
If members are not appearing:
- See `ISSUE_FIXES_README.md` for troubleshooting
- Run `fix-member-display-complete.sql` to resolve RLS issues

## 🔍 Verification

After running the scripts, verify everything is set up correctly:

### Check Address Fields
```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('street_addr', 'suburb', 'city', 'postal_code', 'first_name', 'last_name', 'date_of_birth', 'area_id')
ORDER BY column_name;
```

### Check RLS Policies
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;
```

You should see these policies:
- `users_self_select`
- `users_admin_select`
- `users_collector_select` ⬅️ **This is critical for collectors!**
- `users_self_update`
- `users_admin_update`
- `users_insert_self`

### Check Indexes
```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND indexname LIKE 'idx_users_%'
ORDER BY indexname;
```

## 🐛 Troubleshooting

### Collectors Can't See User Addresses

**Problem**: Collectors getting 403 Forbidden when trying to access user data.

**Solution**: Ensure `schemas/ensure_address_fields_in_users.sql` has been run. The `users_collector_select` policy must exist.

### Address Fields Missing

**Problem**: Error messages about missing columns like `street_addr` or `suburb`.

**Solution**: Run `schemas/ensure_address_fields_in_users.sql` again. It's safe to run multiple times.

### RLS Policies Not Working

**Problem**: Even after running the script, collectors still can't access data.

**Solution**:
1. Verify RLS is enabled on the `users` table:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'users';
   ```
2. Check that the collector user has the correct role
3. Ensure the `users_collector_select` policy exists and is active

## 📚 Related Documentation

- `README.md` - Main Collector App documentation
- `COLLECTOR_PERMISSIONS_FIX.md` - Troubleshooting permission issues
- `ISSUE_FIXES_README.md` - Common issues and fixes
- `PHOTO_SETUP_INSTRUCTIONS.md` - Photo capture setup

## ✅ Quick Checklist

Before running the Collector App, ensure:

- [ ] Base schema installed (`schemas/00-install-all.sql`)
- [ ] **Address fields script run (`schemas/ensure_address_fields_in_users.sql`)** ⬅️ **REQUIRED**
- [ ] RLS policies verified (especially `users_collector_select`)
- [ ] Address fields exist in `users` table
- [ ] Test collector account created (optional)
- [ ] Environment variables configured in `.env.local`

## 🆘 Support

If you encounter issues:
1. Check the verification queries above
2. Review Supabase logs for detailed errors
3. See `COLLECTOR_PERMISSIONS_FIX.md` for permission troubleshooting
4. Check `ISSUE_FIXES_README.md` for common issues

---

**Remember**: The `schemas/ensure_address_fields_in_users.sql` script is **REQUIRED** for the Collector App to function properly. Do not skip this step!

