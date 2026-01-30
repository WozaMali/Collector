# Photo Capture Setup Instructions

## Database Schema Setup

To enable photo capture functionality, you need to run the following SQL commands in your Supabase dashboard:

### 1. Add Photo Fields to unified_collections Table

```sql
-- Add photo fields to unified_collections table
ALTER TABLE unified_collections 
ADD COLUMN IF NOT EXISTS material_photo_url TEXT,
ADD COLUMN IF NOT EXISTS scale_photo_url TEXT,
ADD COLUMN IF NOT EXISTS material_photo_path TEXT,
ADD COLUMN IF NOT EXISTS scale_photo_path TEXT;

-- Add comments for documentation
COMMENT ON COLUMN unified_collections.material_photo_url IS 'Public URL for the material photo';
COMMENT ON COLUMN unified_collections.scale_photo_url IS 'Public URL for the scale photo (optional)';
COMMENT ON COLUMN unified_collections.material_photo_path IS 'Storage path for the material photo';
COMMENT ON COLUMN unified_collections.scale_photo_path IS 'Storage path for the scale photo (optional)';
```

### 2. Create Storage Bucket

In your Supabase dashboard, go to Storage and create a new bucket:

- **Bucket Name**: `collection-photos`
- **Public**: Yes
- **File Size Limit**: 10MB
- **Allowed MIME Types**: `image/jpeg, image/png, image/webp, image/gif`

### 3. Set Up Storage Policies

Create the following RLS policies for the `collection-photos` bucket:

```sql
-- Policy for authenticated users to upload photos
CREATE POLICY "Authenticated users can upload collection photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'collection-photos' AND
  auth.role() = 'authenticated'
);

-- Policy for authenticated users to view collection photos
CREATE POLICY "Authenticated users can view collection photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'collection-photos' AND
  auth.role() = 'authenticated'
);

-- Policy for authenticated users to delete collection photos
CREATE POLICY "Authenticated users can delete collection photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'collection-photos' AND
  auth.role() = 'authenticated'
);
```

### 4. Create Indexes for Performance

```sql
-- Create index for photo fields for better query performance
CREATE INDEX IF NOT EXISTS idx_unified_collections_material_photo 
ON unified_collections(material_photo_url) 
WHERE material_photo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unified_collections_scale_photo 
ON unified_collections(scale_photo_url) 
WHERE scale_photo_url IS NOT NULL;
```

### 5. Create View for Collections with Photos

```sql
-- Add a view for collections with photos
CREATE OR REPLACE VIEW collections_with_photos AS
SELECT 
  uc.*,
  CASE 
    WHEN uc.material_photo_url IS NOT NULL THEN true 
    ELSE false 
  END as has_material_photo,
  CASE 
    WHEN uc.scale_photo_url IS NOT NULL THEN true 
    ELSE false 
  END as has_scale_photo
FROM unified_collections uc;

-- Grant access to the view
GRANT SELECT ON collections_with_photos TO authenticated;
```

## Features Added

### 1. Photo Capture Component (`PhotoCapture.tsx`)
- **Camera Integration**: Uses device camera for taking photos
- **File Upload**: Alternative to camera for selecting existing photos
- **Photo Preview**: Shows captured/selected photos before upload
- **Validation**: Checks file type and size (max 10MB)
- **Optional Scale Photo**: Scale photo is optional, material photo is required

### 2. Photo Service (`photo-service.ts`)
- **Upload Photos**: Handles photo upload to Supabase storage
- **Delete Photos**: Manages photo deletion from storage
- **Bucket Management**: Ensures storage bucket exists
- **Error Handling**: Comprehensive error handling and logging

### 3. Updated Collection Modal
- **Photo Capture UI**: Added photo capture sections for material and scale
- **Upload Integration**: Photos are uploaded when collection is saved
- **Progress Indication**: Shows upload progress in the UI
- **Database Updates**: Photo URLs are stored in the collection record

## Usage

1. **Open Collection Modal**: Click "Collect" button on any user in the Users page
2. **Fill Collection Details**: Add materials, weights, and prices as usual
3. **Take Material Photo**: Use the camera or file picker to capture material photo (required)
4. **Take Scale Photo**: Optionally capture scale photo showing weight
5. **Save Collection**: Photos will be uploaded automatically when saving

## Technical Details

- **Storage Location**: Photos are stored in `collection-photos/{collection_id}/` folder
- **File Naming**: `{type}-{timestamp}.{extension}` (e.g., `material-1703123456789.jpg`)
- **Supported Formats**: JPEG, PNG, WebP, GIF
- **Max File Size**: 10MB per photo
- **Mobile Optimized**: Uses back camera on mobile devices for better quality

## Troubleshooting

### Camera Not Working
- Check browser permissions for camera access
- Ensure HTTPS connection (required for camera access)
- Try using file upload as alternative

### Upload Fails
- Check Supabase storage bucket exists and is public
- Verify RLS policies are set correctly
- Check file size (must be under 10MB)

### Database Errors
- Ensure photo fields are added to unified_collections table
- Check that the user has proper permissions
- Verify the collection record exists before uploading photos
