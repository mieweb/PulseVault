'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoUploader from '@/components/VideoUploader';
import Link from 'next/link';

export default function UploadPage() {
  const router = useRouter();
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);

  const handleUploadComplete = (videoId: string) => {
    setUploadedVideoId(videoId);
    
    // Show success message and redirect after 3 seconds
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              PulseVault
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              ← Back to Feed
            </Link>
          </div>
        </div>
      </nav>

      {/* Upload Component */}
      <VideoUploader onUploadComplete={handleUploadComplete} />

      {/* Success Message */}
      {uploadedVideoId && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <p className="font-semibold">Upload Complete!</p>
              <p className="text-sm">Redirecting to feed...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
