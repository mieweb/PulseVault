"use client";

import { Session } from "@/lib/auth";
import { VideoFeed } from "@/components/video-feed";

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

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function DashboardClient({ session, initialVideos, initialPagination }: { 
  session: Session;
  initialVideos: Video[];
  initialPagination: Pagination;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-0 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="overflow-y-auto">
          <VideoFeed initialVideos={initialVideos} initialPagination={initialPagination} />
        </div>
      </div>
    </div>
  );
}
