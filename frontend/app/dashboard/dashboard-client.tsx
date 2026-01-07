"use client";

import { Session } from "@/lib/auth";
import { UploadQRCard } from "@/components/upload-qr-card";
import { VideoFeed } from "@/components/video-feed";

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 items-start">
          {/* Left side - QR Card */}
          <div className="w-80 flex-shrink-0">
            <UploadQRCard />
          </div>
          
          {/* Right side - Scrollable Feed */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-card-foreground">Video Feed</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Browse all transcoded videos
              </p>
            </div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
              <VideoFeed initialVideos={initialVideos} initialPagination={initialPagination} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
