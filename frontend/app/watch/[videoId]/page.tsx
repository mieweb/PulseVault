import { getVideo } from "@/lib/actions/video-actions";
import { VideoPlayer } from "@/components/video-player";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type WatchPageProps = {
  params: Promise<{ videoId: string }>;
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId } = await params;
  const video = await getVideo(videoId);

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Video not found</h1>
          <p className="text-muted-foreground mb-4">
            The video you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayTitle = video.filename || "Untitled";
  const isReady = video.status === "transcoded";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6">
        <Link href="/dashboard" className="flex-shrink-0 mb-2 sm:mb-3">
          <Button variant="ghost" size="sm" className="h-8 sm:h-10">
            <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Back</span>
          </Button>
        </Link>

        <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full">
          {/* Title - compact on mobile */}
          <div className="flex-shrink-0 mb-2 sm:mb-3 lg:mb-4">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-card-foreground line-clamp-2">
              {displayTitle}
            </h1>
          </div>

          {/* Video Player - responsive sizing */}
          <div className="flex-shrink-0 mb-2 sm:mb-3 lg:mb-4">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {isReady ? (
                video.playbackUrl ? (
                  <div className="w-full h-[35vh] sm:h-[45vh] md:h-[55vh] lg:h-[65vh] flex items-center justify-center">
                    <VideoPlayer 
                      videoUrl={video.playbackUrl} 
                      className="w-full h-full" 
                    />
                  </div>
                ) : (
                  <div className="h-[35vh] sm:h-[45vh] md:h-[55vh] bg-muted flex items-center justify-center">
                    <div className="text-center px-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                        Video is ready but playback URL is unavailable
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Please refresh the page or try again later
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-[35vh] sm:h-[45vh] md:h-[55vh] bg-muted flex items-center justify-center">
                  <div className="text-center px-4">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                      {video.status === "draft" && "Video is being prepared..."}
                      {video.status === "transcoding" && "Video is being transcoded..."}
                      {video.status === "failed" && "Video processing failed"}
                      {!video.status && "Video not ready"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please check back later
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata - scrollable if needed, compact on mobile */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="bg-card rounded-lg border border-border p-3 sm:p-4 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                {video.user && (
                  <>
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10">
                      <AvatarImage src={video.user.image || undefined} />
                      <AvatarFallback className="text-xs sm:text-sm">
                        {video.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs sm:text-sm lg:text-base text-card-foreground truncate">
                        {video.user.name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {video.user.email}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 pt-2 sm:pt-3 lg:pt-4 border-t border-border">
                {video.duration && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium text-xs sm:text-sm lg:text-base text-card-foreground">
                      {formatDuration(video.duration)}
                    </p>
                  </div>
                )}
                {video.width && video.height && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Resolution</p>
                    <p className="font-medium text-xs sm:text-sm lg:text-base text-card-foreground">
                      {video.width} × {video.height}
                    </p>
                  </div>
                )}
                {video.transcodedAt && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Transcoded</p>
                    <p className="font-medium text-xs sm:text-sm lg:text-base text-card-foreground">
                      {new Date(video.transcodedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {video.renditions && video.renditions.length > 0 && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Qualities</p>
                    <p className="font-medium text-xs sm:text-sm lg:text-base text-card-foreground truncate">
                      {video.renditions.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

