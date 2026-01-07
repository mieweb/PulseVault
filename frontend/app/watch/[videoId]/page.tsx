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
          <Link href="/feed">
            <Button variant="outline">Back to Feed</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayTitle = video.filename || "Untitled";
  const isReady = video.status === "transcoded";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/feed">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-card-foreground mb-2">
              {displayTitle}
            </h1>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {isReady && video.playbackUrl ? (
              <VideoPlayer videoUrl={video.playbackUrl} className="w-full" />
            ) : (
              <div className="aspect-video bg-muted flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    {video.status === "draft" && "Video is being prepared..."}
                    {video.status === "transcoding" && "Video is being transcoded..."}
                    {video.status === "failed" && "Video processing failed"}
                    {!video.status && "Video not ready"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please check back later
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center gap-4">
              {video.user && (
                <>
                  <Avatar>
                    <AvatarImage src={video.user.image || undefined} />
                    <AvatarFallback>
                      {video.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-card-foreground">
                      {video.user.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {video.user.email}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              {video.duration && (
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium text-card-foreground">
                    {formatDuration(video.duration)}
                  </p>
                </div>
              )}
              {video.width && video.height && (
                <div>
                  <p className="text-sm text-muted-foreground">Resolution</p>
                  <p className="font-medium text-card-foreground">
                    {video.width} × {video.height}
                  </p>
                </div>
              )}
              {video.transcodedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Transcoded</p>
                  <p className="font-medium text-card-foreground">
                    {new Date(video.transcodedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {video.renditions && video.renditions.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Qualities</p>
                  <p className="font-medium text-card-foreground">
                    {video.renditions.join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

