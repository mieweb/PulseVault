'use client';

import { useEffect, useState } from 'react';
import VideoFeed from '@/components/VideoFeed';
import { fetchVideos } from '@/lib/api-client';
import type { VideoMetadata } from '@/lib/api-client';
import Link from 'next/link';

export default function Home() {
  const [initialVideos, setInitialVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialVideos() {
      try {
        const videos = await fetchVideos(1, 10);
        setInitialVideos(videos);
      } catch (err) {
        console.error('Failed to load videos:', err);
        setError('Failed to load videos');
      } finally {
        setLoading(false);
      }
    }

    loadInitialVideos();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-4">
            Make sure the PulseVault backend is running on {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-white font-bold text-xl">PulseVault</h1>
          <div className="flex gap-2">
            <Link
              href="/upload"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Upload
            </Link>
            <Link
              href="/my-uploads"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
            >
              My Uploads
            </Link>
          </div>
        </div>
      </nav>

      {/* Video Feed */}
      <VideoFeed initialVideos={initialVideos} />
    </div>
  );
}

