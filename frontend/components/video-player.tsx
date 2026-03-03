"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

type VideoPlayerProps = {
  videoUrl: string | null;
  className?: string;
};

export function VideoPlayer({ videoUrl, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) {
      setError("No video URL provided");
      setLoading(false);
      return;
    }

    // Dynamically import hls.js only on client side
    const initPlayer = async () => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        setError("Video element not available");
        setLoading(false);
        return;
      }

      try {
        const Hls = (await import("hls.js")).default;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });

          hlsRef.current = hls;

          hls.loadSource(videoUrl);
          hls.attachMedia(videoElement);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            setError(null);
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error("HLS Error:", data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error("Network error loading:", videoUrl);
                  setError(`Network error: ${data.details || "Please try again."}`);
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error("Media error:", data);
                  setError("Media error. Trying to recover...");
                  hls.recoverMediaError();
                  break;
                default:
                  console.error("Fatal HLS error:", data);
                  setError(`Failed to load video: ${data.details || "Unknown error"}`);
                  hls.destroy();
                  break;
              }
            }
          });

          return () => {
            hls.destroy();
          };
        } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS support (Safari)
          videoRef.current.src = videoUrl;
          videoRef.current.addEventListener("loadedmetadata", () => {
            setLoading(false);
          });
          videoRef.current.addEventListener("error", () => {
            setError("Failed to load video");
            setLoading(false);
          });
        } else {
          setError("HLS not supported in this browser");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize video player:", err);
        setError("Failed to initialize video player");
        setLoading(false);
      }
    };

    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [videoUrl]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        controls
        className="w-full h-full max-h-full object-contain"
        autoPlay={false}
        playsInline
      />
    </div>
  );
}

