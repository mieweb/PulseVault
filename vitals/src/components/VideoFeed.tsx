'use client';

import { useState, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import VideoItem from './VideoItem';
import type { VideoMetadata } from '@/lib/api-client';
import { fetchVideos } from '@/lib/api-client';

interface VideoFeedProps {
  initialVideos?: VideoMetadata[];
}

/**
 * Infinite Scroll Video Feed
 * Uses react-virtuoso for virtualization and smooth scrolling
 */
export default function VideoFeed({ initialVideos = [] }: VideoFeedProps) {
  const [videos, setVideos] = useState<VideoMetadata[]>(initialVideos);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Load more videos when user scrolls to the end
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const nextPage = currentPage + 1;
    const newVideos = await fetchVideos(nextPage, 10);

    if (newVideos.length > 0) {
      setVideos((prev) => [...prev, ...newVideos]);
      setCurrentPage(nextPage);
    } else {
      setHasMore(false);
    }

    setLoading(false);
  }, [currentPage, loading, hasMore]);

  const handleVideoVisible = useCallback((videoId: string) => {
    console.log('Video visible:', videoId);
    // Could track analytics here
  }, []);

  if (videos.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No videos yet</h2>
          <p className="text-gray-400">Upload your first video to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      <Virtuoso
        data={videos}
        endReached={loadMore}
        overscan={2}
        itemContent={(index, video) => (
          <VideoItem
            key={video.videoId}
            video={video}
            onVisible={handleVideoVisible}
          />
        )}
        style={{ height: '100vh' }}
        components={{
          Footer: () =>
            loading ? (
              <div className="flex items-center justify-center h-screen bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : !hasMore ? (
              <div className="flex items-center justify-center h-screen bg-black text-white">
                <p className="text-gray-400">No more videos</p>
              </div>
            ) : null,
        }}
      />
    </div>
  );
}
