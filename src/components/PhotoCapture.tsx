'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  X, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

interface PhotoCaptureProps {
  onPhotoCapture: (photo: File | null, type: 'material' | 'scale') => void;
  type: 'material' | 'scale';
  isOptional?: boolean;
  existingPhoto?: string | null;
  onRemovePhoto?: () => void;
}

export default function PhotoCapture({ 
  onPhotoCapture, 
  type, 
  isOptional = false,
  existingPhoto = null,
  onRemovePhoto
}: PhotoCaptureProps) {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(existingPhoto);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsCapturing(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${type}-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(blob);
        setCapturedPhoto(previewUrl);
        
        // Notify parent component
        onPhotoCapture(file, type);
        
        // Stop camera
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }

      setError(null);
      const previewUrl = URL.createObjectURL(file);
      setCapturedPhoto(previewUrl);
      onPhotoCapture(file, type);
    }
  };

  const removePhoto = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
    }
    setCapturedPhoto(null);
    onPhotoCapture(null, type);
    onRemovePhoto?.();
  };

  const getTypeLabel = () => {
    return type === 'material' ? 'Material' : 'Scale';
  };

  const getTypeIcon = () => {
    return type === 'material' ? '📦' : '⚖️';
  };

  return (
    <Card className="app-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getTypeIcon()}</span>
            <span>{getTypeLabel()} Photo</span>
            {isOptional && (
              <Badge variant="secondary" className="app-card-inner-subtle text-gray-300 border-0">
                Optional
              </Badge>
            )}
          </div>
          {capturedPhoto && (
            <Button
              variant="outline"
              size="sm"
              onClick={removePhoto}
              className="text-red-400 hover:text-red-300 border-red-600 hover:bg-red-900"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
        <CardDescription className="text-gray-400 text-sm">
          {type === 'material' 
            ? 'Take a photo of the collected materials'
            : 'Take a photo of the scale showing the weight (optional)'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-900 border border-red-700 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {capturedPhoto ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedPhoto}
                alt={`${getTypeLabel()} photo`}
                className="w-full h-64 object-cover rounded-lg border border-[var(--app-border)]"
              />
              <div className="absolute top-2 right-2">
                <Badge className="bg-[var(--app-accent)] text-white border-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Captured
                </Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  removePhoto();
                  startCamera();
                }}
                className="border-[var(--app-border)] text-gray-300 hover:brightness-110 hover:text-white"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isCapturing ? (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover rounded-lg border border-[var(--app-border)]"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={capturePhoto}
                    className="app-btn-primary"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={stopCamera}
                    className="border-[var(--app-border)] text-gray-300 hover:brightness-110 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-full h-64 border-2 border-dashed border-[var(--app-border)] rounded-lg flex flex-col items-center justify-center app-card-inner-subtle">
                  <Camera className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-400 mb-2">No photo captured</p>
                  <p className="text-sm text-gray-500">
                    {type === 'material' 
                      ? 'Take a photo of the collected materials'
                      : 'Take a photo of the scale showing the weight'
                    }
                  </p>
                </div>
                <div className="flex space-x-2 justify-center">
                  <Button
                    onClick={startCamera}
                    className="app-btn-primary"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
