"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VideoFeedCard } from "./video-feed-card";
import { Loader2 } from "lucide-react";
import { getAllVideos } from "@/lib/actions/video-actions";

type Video = {
  videoId: string;
  title?: string | null;
  filename?: string | null;
  duration?: number | null;
  status: string;
  playbackUrl?: string | null;
  user?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
};

type VideoFeedProps = {
  initialVideos: Video[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function VideoFeed({ initialVideos, initialPagination }: VideoFeedProps) {
  const [videos, setVideos] = useState(initialVideos);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (pagination.page >= pagination.totalPages || loading) return;

    setLoading(true);
    setError(null);
    try {
      const nextPage = pagination.page + 1;
      const data = await getAllVideos(nextPage, 20);
      setVideos((prevVideos) => [...prevVideos, ...data.videos]);
      setPagination(data.pagination);
    } catch (err) {
      setError("Failed to load more videos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.totalPages, loading]);

  // Intersection Observer for auto-pagination
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting && !loading && pagination.page < pagination.totalPages) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "200px", // Start loading 200px before reaching the element
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loadMore, loading, pagination.page, pagination.totalPages]);

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No videos available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instagram-style vertical feed */}
      <div className="max-w-2xl mx-auto space-y-6">
        {videos.map((video) => (
          <VideoFeedCard key={video.videoId} video={video} />
        ))}
      </div>

      {/* Intersection observer target for auto-loading */}
      {pagination.page < pagination.totalPages && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more videos...</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-center text-destructive text-sm">{error}</div>
      )}

      {/* Show message when all videos are loaded */}
      {pagination.page >= pagination.totalPages && videos.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No more videos</p>
        </div>
      )}
    </div>
  );
}

