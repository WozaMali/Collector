'use client';

import React, { useState } from 'react';
import PhotoCapture from '@/components/PhotoCapture';
import { PhotoService } from '@/lib/photo-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function TestPhotosPage() {
  const [materialPhoto, setMaterialPhoto] = useState<File | null>(null);
  const [scalePhoto, setScalePhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testUpload = async () => {
    if (!materialPhoto && !scalePhoto) {
      setError('Please capture at least one photo');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const testCollectionId = `test-${Date.now()}`;
      const results = [];

      if (materialPhoto) {
        const materialResult = await PhotoService.uploadPhoto(materialPhoto, testCollectionId, 'material');
        results.push(`Material photo: ${materialResult.success ? 'Success' : 'Failed - ' + materialResult.error}`);
      }

      if (scalePhoto) {
        const scaleResult = await PhotoService.uploadPhoto(scalePhoto, testCollectionId, 'scale');
        results.push(`Scale photo: ${scaleResult.success ? 'Success' : 'Failed - ' + scaleResult.error}`);
      }

      setResult(results.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Photo Capture Test</h1>
          <p className="text-gray-400">Test the photo capture functionality</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PhotoCapture
            onPhotoCapture={(photo) => setMaterialPhoto(photo)}
            type="material"
            isOptional={false}
          />
          
          <PhotoCapture
            onPhotoCapture={(photo) => setScalePhoto(photo)}
            type="scale"
            isOptional={true}
          />
        </div>

        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Test Upload</CardTitle>
            <CardDescription className="text-gray-400">
              Test uploading photos to Supabase storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testUpload} 
              disabled={uploading || (!materialPhoto && !scalePhoto)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {uploading ? 'Uploading...' : 'Test Upload'}
            </Button>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-900 border border-red-700 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {result && (
              <div className="flex items-start space-x-2 p-3 bg-green-900 border border-green-700 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                <div className="text-green-200 text-sm">
                  <p className="font-medium mb-1">Upload Results:</p>
                  <pre className="whitespace-pre-wrap">{result}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-2">
            <p>Before testing, make sure you have:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Added photo fields to unified_collections table</li>
              <li>Created collection-photos storage bucket in Supabase</li>
              <li>Set up proper RLS policies for the storage bucket</li>
              <li>Check the PHOTO_SETUP_INSTRUCTIONS.md file for details</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
