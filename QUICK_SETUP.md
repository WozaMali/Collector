# Quick Photo Setup Guide

## 🚨 Current Issue
The photo storage bucket doesn't exist yet. You need to create it manually in Supabase.

## ✅ Quick Fix (2 minutes)

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to **Storage** in the left sidebar
3. Click **"New Bucket"**

### Step 2: Create the Bucket
- **Bucket Name**: `collection-photos`
- **Public**: ✅ **Yes** (check this box)
- **File Size Limit**: `10485760` (10MB)
- **Allowed MIME Types**: `image/jpeg, image/png, image/webp, image/gif`

### Step 3: Set Up Permissions
After creating the bucket, go to **Storage** > **Policies** and add these policies:

```sql
-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload collection photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'collection-photos' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to view photos
CREATE POLICY "Authenticated users can view collection photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'collection-photos' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete photos
CREATE POLICY "Authenticated users can delete collection photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'collection-photos' AND
  auth.role() = 'authenticated'
);
```

### Step 4: Add Database Fields
Run this SQL in the **SQL Editor**:

```sql
-- Add photo fields to unified_collections table
ALTER TABLE unified_collections 
ADD COLUMN IF NOT EXISTS material_photo_url TEXT,
ADD COLUMN IF NOT EXISTS scale_photo_url TEXT,
ADD COLUMN IF NOT EXISTS material_photo_path TEXT,
ADD COLUMN IF NOT EXISTS scale_photo_path TEXT;
```

## 🎉 That's It!
After completing these steps, the photo capture functionality will work perfectly!

## 🔍 Testing
1. Go to the Users page
2. Click "Collect" on any user
3. Take photos using the camera or file picker
4. Save the collection - photos will be uploaded automatically

## 📱 Features Available
- **Material Photo**: Required - shows what was collected
- **Scale Photo**: Optional - shows the weight on the scale
- **Camera Integration**: Uses device camera
- **File Upload**: Alternative to camera
- **Mobile Optimized**: Works great on phones and tablets
