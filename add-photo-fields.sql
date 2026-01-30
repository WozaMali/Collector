-- Add photo fields to unified_collections table
-- This script adds photo storage fields to support material and scale photos

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

-- Create storage bucket for collection photos
-- Note: This needs to be run in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'collection-photos',
--   'collection-photos',
--   true,
--   10485760, -- 10MB
--   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
-- );

-- Create RLS policies for storage bucket
-- Note: These policies need to be created in Supabase dashboard
-- Policy for authenticated users to upload photos
-- CREATE POLICY "Authenticated users can upload collection photos" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'collection-photos' AND
--   auth.role() = 'authenticated'
-- );

-- Policy for authenticated users to view collection photos
-- CREATE POLICY "Authenticated users can view collection photos" ON storage.objects
-- FOR SELECT USING (
--   bucket_id = 'collection-photos' AND
--   auth.role() = 'authenticated'
-- );

-- Policy for authenticated users to delete collection photos
-- CREATE POLICY "Authenticated users can delete collection photos" ON storage.objects
-- FOR DELETE USING (
--   bucket_id = 'collection-photos' AND
--   auth.role() = 'authenticated'
-- );

-- Update existing collections to have null photo fields
UPDATE unified_collections 
SET 
  material_photo_url = NULL,
  scale_photo_url = NULL,
  material_photo_path = NULL,
  scale_photo_path = NULL
WHERE material_photo_url IS NULL;

-- Create index for photo fields for better query performance
CREATE INDEX IF NOT EXISTS idx_unified_collections_material_photo 
ON unified_collections(material_photo_url) 
WHERE material_photo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unified_collections_scale_photo 
ON unified_collections(scale_photo_url) 
WHERE scale_photo_url IS NOT NULL;

-- Add a function to clean up orphaned photos
CREATE OR REPLACE FUNCTION cleanup_orphaned_photos()
RETURNS void AS $$
DECLARE
  photo_record RECORD;
  photo_exists BOOLEAN;
BEGIN
  -- Find photos that are referenced in the database but don't exist in storage
  FOR photo_record IN 
    SELECT DISTINCT material_photo_path as photo_path FROM unified_collections 
    WHERE material_photo_path IS NOT NULL
    UNION
    SELECT DISTINCT scale_photo_path as photo_path FROM unified_collections 
    WHERE scale_photo_path IS NOT NULL
  LOOP
    -- Check if photo exists in storage (this would need to be implemented with storage API)
    -- For now, we'll just log the paths that need cleanup
    RAISE NOTICE 'Photo path to check: %', photo_record.photo_path;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_orphaned_photos() TO authenticated;

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

-- Add comments for the view
COMMENT ON VIEW collections_with_photos IS 'View of collections with photo availability flags';
