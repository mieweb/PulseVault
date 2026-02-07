"use client";

import { Session } from "@/lib/auth";
import { UploadQRCard } from "@/components/upload-qr-card";
import { UploadMobileOpenCard } from "@/components/upload-mobile-open-card";
import { useEffect, useState } from "react";

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export default function UploadClient({ session }: { 
  session: Session;
}) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-card-foreground">Upload from Mobile</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {isMobile === null ? (
              "Detecting device..."
            ) : isMobile ? (
              "Open the Pulse app to upload videos from this device"
            ) : (
              "Generate a QR code to upload videos from your mobile device"
            )}
          </p>
        </div>
        
        <div className="w-full max-w-md mx-auto">
          {isMobile === null ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : isMobile ? (
            <UploadMobileOpenCard />
          ) : (
            <UploadQRCard />
          )}
        </div>
      </div>
    </div>
  );
}

