"use client";

import { useState, useEffect } from "react";
import { VideoCard } from "./video-card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getAllVideos } from "@/lib/actions/video-actions";

type Video = {
  videoId: string;
  title?: string | null;
  filename?: string | null;
  duration?: number | null;
  status: string;
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

  const loadMore = async () => {
    if (pagination.page >= pagination.totalPages || loading) return;

    setLoading(true);
    setError(null);
    try {
      const nextPage = pagination.page + 1;
      const data = await getAllVideos(nextPage, 20);
      setVideos([...videos, ...data.videos]);
      setPagination(data.pagination);
    } catch (err) {
      setError("Failed to load more videos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No videos available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.videoId} video={video} />
        ))}
      </div>

      {pagination.page < pagination.totalPages && (
        <div className="flex justify-center">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}

      {error && (
        <div className="text-center text-destructive text-sm">{error}</div>
      )}
    </div>
  );
}

