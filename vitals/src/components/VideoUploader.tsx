'use client';

import { useState, useEffect } from 'react';
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import { Dashboard } from '@uppy/react';
import { finalizeUpload } from '@/lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface VideoUploaderProps {
  onUploadComplete?: (videoId: string) => void;
}

/**
 * Video Uploader with Resumable Uploads
 * Uses Uppy + tus for resumable upload support
 */
export default function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [uppy, setUppy] = useState<Uppy | null>(null);

  useEffect(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
        allowedFileTypes: ['video/*'],
        maxNumberOfFiles: 1,
      },
      autoProceed: false,
    });

    uppyInstance.use(Tus, {
      endpoint: `${API_BASE_URL}/uploads`,
      retryDelays: [0, 1000, 3000, 5000],
      removeFingerprintOnSuccess: true,
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
    });

    uppyInstance.on('upload-success', async (file, response) => {
      console.log('Upload successful:', file?.name, response);
      
      if (!file || !file.name) return;
      
      // Extract upload ID from tus response
      const uploadUrl = response.uploadURL;
      const uploadId = uploadUrl?.split('/').pop();
      
      if (!uploadId) {
        console.error('Failed to extract upload ID');
        return;
      }

      // Finalize the upload
      const result = await finalizeUpload(
        uploadId,
        file.name,
        'anonymous', // Would be replaced with actual user ID from auth
        {
          originalName: file.name,
          size: file.size || 0,
          type: file.type || 'video/mp4',
        }
      );

      if (result) {
        console.log('Upload finalized:', result);
        onUploadComplete?.(result.videoId);
      }
    });

    uppyInstance.on('upload-error', (file, error) => {
      console.error('Upload error:', file?.name, error);
    });

    setUppy(uppyInstance);

    return () => {
      uppyInstance.cancelAll();
    };
  }, [onUploadComplete]);

  if (!uppy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Video</h1>
        <p className="text-gray-600">
          Upload your video to PulseVault. Uploads are resumable and can handle connection interruptions.
        </p>
      </div>

      <Dashboard
        uppy={uppy}
        proudlyDisplayPoweredByUppy={false}
        height={450}
        note="Video files only, up to 5GB"
        theme="auto"
      />

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Upload Features</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Resumable uploads - continue after connection drops</li>
          <li>Automatic transcoding to HLS/DASH formats</li>
          <li>Multiple quality renditions for adaptive streaming</li>
          <li>HMAC-signed URLs for secure access</li>
        </ul>
      </div>
    </div>
  );
}
