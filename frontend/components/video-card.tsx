"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";

type VideoCardProps = {
  video: {
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
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoCard({ video }: VideoCardProps) {
  const displayTitle = video.filename || "Untitled";
  const isReady = video.status === "transcoded";

  return (
    <Link href={`/watch/${video.videoId}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
        <div className="aspect-video bg-muted relative overflow-hidden">
          {/* Thumbnail placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 ml-1" />
              </div>
              {!isReady && (
                <span className="text-xs px-2 py-1 bg-background/80 rounded">
                  {video.status}
                </span>
              )}
            </div>
          </div>
          
          {/* Duration badge */}
          {video.duration && isReady && (
            <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold truncate text-card-foreground group-hover:text-primary transition-colors">
            {displayTitle}
          </h3>
          {video.user && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {video.user.name}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

