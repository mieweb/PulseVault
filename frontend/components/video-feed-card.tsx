"use client";

import { VideoPlayer } from "@/components/video-player";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import Link from "next/link";

type VideoFeedCardProps = {
  video: {
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
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoFeedCard({ video }: VideoFeedCardProps) {
  const displayTitle = video.filename || "Untitled";
  const isReady = video.status === "transcoded";

  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Video Player - starts directly */}
      <div className="w-full bg-black">
        {isReady && video.playbackUrl ? (
          <div className="w-full aspect-[9/16] sm:aspect-video flex items-center justify-center">
            <VideoPlayer 
              videoUrl={video.playbackUrl} 
              className="w-full h-full" 
            />
          </div>
        ) : (
          <div className="w-full aspect-[9/16] sm:aspect-video bg-muted flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-sm text-muted-foreground mb-1">
                {video.status === "transcoding" && "Video is being transcoded..."}
                {video.status === "draft" && "Video is being prepared..."}
                {video.status === "failed" && "Video processing failed"}
                {!video.status && "Video not ready"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="px-4 py-3 space-y-2">
        {/* User info and title */}
        <div className="flex items-start gap-3">
          {video.user ? (
            <>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={video.user.image || undefined} />
                <AvatarFallback className="text-xs">
                  {video.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-card-foreground truncate mb-1">
                  {video.user.name}
                </p>
                <Link href={`/watch/${video.videoId}`}>
                  <h3 className="font-semibold text-sm text-card-foreground hover:text-primary transition-colors line-clamp-2">
                    {displayTitle}
                  </h3>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex-1">
              <Link href={`/watch/${video.videoId}`}>
                <h3 className="font-semibold text-sm text-card-foreground hover:text-primary transition-colors line-clamp-2">
                  {displayTitle}
                </h3>
              </Link>
            </div>
          )}
        </div>
        
        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {video.duration && (
            <span>{formatDuration(video.duration)}</span>
          )}
          <Link 
            href={`/watch/${video.videoId}`}
            className="text-primary hover:underline"
          >
            Watch full video →
          </Link>
        </div>
      </div>
    </Card>
  );
}

