"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TopVideo = {
  videoId: string;
  watched50Count: number;
};

export default function AnalyticsClient({ topVideos }: { topVideos: TopVideo[] }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-card-foreground" />
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">
                Top Videos by 50% Watch Rate
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Videos ranked by unique viewers who watched past the halfway point
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden border-border">
          {topVideos.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No analytics data yet. Events will appear after videos are watched.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-6 py-3 font-semibold text-card-foreground w-12">
                      #
                    </th>
                    <th className="text-left px-6 py-3 font-semibold text-card-foreground">
                      Video ID
                    </th>
                    <th className="text-right px-6 py-3 font-semibold text-card-foreground">
                      50% Watch Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topVideos.map((video, index) => (
                    <tr
                      key={video.videoId}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => router.push(`/watch/${video.videoId}`)}
                    >
                      <td className="px-6 py-4 text-muted-foreground font-mono">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-primary hover:underline">
                          {video.videoId}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          {video.watched50Count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
