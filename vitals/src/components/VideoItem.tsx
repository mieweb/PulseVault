'use client';

import { useEffect, useRef, useState } from 'react';
import VideoPlayer from './VideoPlayer';
import { getSignedUrl } from '@/lib/api-client';
import type { VideoMetadata } from '@/lib/api-client';

interface VideoItemProps {
  video: VideoMetadata;
  onVisible?: (videoId: string) => void;
}

/**
 * Video Item with Intersection Observer
 * Automatically manages video playback based on viewport visibility
 */
export default function VideoItem({ video, onVisible }: VideoItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Intersection Observer for visibility detection
  useEffect(() => {
    const currentContainer = containerRef.current;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting && entry.intersectionRatio > 0.5;
          setIsVisible(visible);
          
          if (visible) {
            onVisible?.(video.videoId);
          }
        });
      },
      {
        threshold: [0, 0.5, 1],
        rootMargin: '0px',
      }
    );

    if (currentContainer) {
      observer.observe(currentContainer);
    }

    return () => {
      if (currentContainer) {
        observer.unobserve(currentContainer);
      }
    };
  }, [video.videoId, onVisible]);

  // Fetch signed URL when component mounts
  useEffect(() => {
    async function loadSignedUrl() {
      setLoading(true);
      
      // Determine media path based on video status
      const mediaPath = video.status === 'ready' 
        ? 'hls/master.m3u8'
        : 'original.mp4';
      
      const urlData = await getSignedUrl(video.videoId, mediaPath, 300);
      
      if (urlData) {
        // Construct full URL with base
        const fullUrl = urlData.url.startsWith('http') 
          ? urlData.url 
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${urlData.url}`;
        setSignedUrl(fullUrl);
      }
      
      setLoading(false);
    }

    loadSignedUrl();
  }, [video.videoId, video.status]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen snap-start snap-always flex items-center justify-center bg-black"
      data-video-id={video.videoId}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : signedUrl ? (
        <>
          <VideoPlayer
            videoId={video.videoId}
            signedUrl={signedUrl}
            isVisible={isVisible}
            className="w-full h-full"
          />
          
          {/* Video Info Overlay */}
          <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
            <h3 className="text-lg font-semibold mb-1">{video.filename}</h3>
            <p className="text-sm opacity-80">
              Uploaded {new Date(video.uploadedAt).toLocaleDateString()}
            </p>
            {video.status === 'processing' && (
              <p className="text-sm text-yellow-400 mt-1">⏳ Processing...</p>
            )}
          </div>
        </>
      ) : (
        <div className="text-white text-center">
          <p className="text-lg">Failed to load video</p>
          <p className="text-sm opacity-70 mt-2">Video ID: {video.videoId}</p>
        </div>
      )}
    </div>
  );
}
