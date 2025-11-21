'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  videoId: string;
  signedUrl: string;
  isVisible: boolean;
  onEnded?: () => void;
  className?: string;
}

/**
 * Video Player Component with HLS support
 * Uses hls.js for desktop browsers and native HLS for iOS/Safari
 */
export default function VideoPlayer({
  videoId,
  signedUrl,
  isVisible,
  onEnded,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !signedUrl) return;

    const isHLSUrl = signedUrl.includes('.m3u8');

    // Check if browser supports HLS natively (iOS/Safari)
    const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl');

    if (isHLSUrl && Hls.isSupported()) {
      // Use hls.js for browsers that don't support HLS natively
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(signedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed for video:', videoId);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('Fatal HLS error:', data);
          setError('Failed to load video');
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, attempting recovery');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, attempting recovery');
              hls.recoverMediaError();
              break;
            default:
              console.error('Unrecoverable error');
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (isHLSUrl && canPlayHLS) {
      // Native HLS support (iOS/Safari)
      video.src = signedUrl;
    } else {
      // Direct video file
      video.src = signedUrl;
    }

    return () => {
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, [signedUrl, videoId]);

  // Handle autoplay based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible && !isPlaying) {
      video.play().catch((err) => {
        console.log('Autoplay prevented:', err);
        setError('Click to play');
      });
      setIsPlaying(true);
    } else if (!isVisible && isPlaying) {
      video.pause();
      setIsPlaying(false);
    }
  }, [isVisible, isPlaying]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      setError(null);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        loop={false}
        muted={false}
        onEnded={handleEnded}
        onClick={handlePlayPause}
      />
      
      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 text-white cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="text-center">
            <p className="text-lg">{error}</p>
            <p className="text-sm mt-2">Tap to play</p>
          </div>
        </div>
      )}

      {!isPlaying && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
