"use client";

import { Session } from "@/lib/auth";
import { UploadQRCard } from "@/components/upload-qr-card";

export default function UploadClient({ session }: { 
  session: Session;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-card-foreground">Upload from Mobile</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Generate a QR code to upload videos from your mobile device
          </p>
        </div>
        
        {/* Upload QR Card */}
        <div className="w-full max-w-md mx-auto">
          <UploadQRCard />
        </div>
      </div>
    </div>
  );
}

