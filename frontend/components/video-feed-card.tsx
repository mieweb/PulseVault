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
    /** Set when uploaded via external app (e.g. Time Harbour); shown as "Uploaded via X" */
    externalApp?: string | null;
    externalUserEmail?: string | null;
    externalUserId?: string | null;
  };
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatExternalAppName(app: string): string {
  const lower = app.toLowerCase();
  if (lower === "timeharbour" || lower === "timeharbor") return "Time Harbour";
  return app.charAt(0).toUpperCase() + app.slice(1).toLowerCase();
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
                {video.externalApp && (
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Uploaded via {formatExternalAppName(video.externalApp)}
                    {video.externalUserEmail ? ` · ${video.externalUserEmail}` : ""}
                  </p>
                )}
                <Link href={`/watch/${video.videoId}`}>
                  <h3 className="font-semibold text-sm text-card-foreground hover:text-primary transition-colors line-clamp-2">
                    {displayTitle}
                  </h3>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex-1">
              {video.externalApp && (
                <p className="text-xs text-muted-foreground mb-1">
                  Uploaded via {formatExternalAppName(video.externalApp)}
                  {video.externalUserEmail ? ` · ${video.externalUserEmail}` : ""}
                </p>
              )}
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

