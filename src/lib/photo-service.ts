import { supabase } from './supabase';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class PhotoService {
  private static readonly BUCKET_NAME = 'collection-photos';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Upload a photo to Supabase storage
   */
  static async uploadPhoto(
    file: File, 
    collectionId: string, 
    type: 'material' | 'scale'
  ): Promise<PhotoUploadResult> {
    try {
      // Validate file
      if (!file) {
        return { success: false, error: 'No file provided' };
      }

      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'File must be an image' };
      }

      if (file.size > this.MAX_FILE_SIZE) {
        return { success: false, error: 'File size must be less than 10MB' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${collectionId}/${type}-${timestamp}.${fileExtension}`;

      console.log(`📸 Uploading photo: ${fileName}`);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Photo upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log(`✅ Photo uploaded successfully: ${publicUrl}`);

      return { success: true, url: publicUrl };

    } catch (error) {
      console.error('❌ Photo upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Delete a photo from Supabase storage
   */
  static async deletePhoto(photoUrl: string): Promise<PhotoUploadResult> {
    try {
      // Extract file path from URL
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const collectionId = pathParts[pathParts.length - 2];
      const fullPath = `${collectionId}/${fileName}`;

      console.log(`🗑️ Deleting photo: ${fullPath}`);

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fullPath]);

      if (error) {
        console.error('❌ Photo deletion error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Photo deleted successfully: ${fullPath}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Photo deletion error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Check if the storage bucket exists and is accessible
   */
  static async ensureBucketExists(): Promise<boolean> {
    try {
      // Check if bucket exists by trying to list files in it
      const { data: files, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      if (listError) {
        // If we get a 404 or similar error, the bucket doesn't exist
        if (listError.message?.includes('not found') || listError.message?.includes('does not exist')) {
          console.warn(`⚠️ Bucket ${this.BUCKET_NAME} does not exist. Please create it manually in Supabase dashboard.`);
          console.warn('📋 Instructions: Go to Storage > Create Bucket > Name: collection-photos > Public: Yes');
          return false;
        }
        
        // If it's a permission error, the bucket might exist but we can't access it
        if (listError.message?.includes('permission') || listError.message?.includes('policy')) {
          console.warn(`⚠️ Permission denied accessing bucket ${this.BUCKET_NAME}. Please check RLS policies.`);
          return false;
        }

        console.error('❌ Error checking bucket:', listError);
        return false;
      }

      console.log(`✅ Bucket ${this.BUCKET_NAME} is accessible`);
      return true;

    } catch (error) {
      console.error('❌ Error checking bucket:', error);
      return false;
    }
  }

  /**
   * Get photo URL from storage path
   */
  static getPhotoUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  }
}
