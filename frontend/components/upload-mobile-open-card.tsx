"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StoreBadges } from "@/components/store-badges";
import { generateUploadQRCode } from "@/lib/actions/video-actions";
import { Loader2, Smartphone } from "lucide-react";

/**
 * Shown on mobile: button to open Pulse app via deeplink.
 * Fetches deeplink from same API as QR, then opens it.
 */
export function UploadMobileOpenCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenInPulse = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateUploadQRCode();
      if (data.deeplink) {
        window.location.href = data.deeplink;
        return;
      }
      setError("No deeplink received");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open Pulse app");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Upload from this device
        </CardTitle>
        <CardDescription className="text-xs">
          Open the Pulse app to upload videos directly
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {error && (
          <div className="w-full p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}
        <p className="text-sm text-muted-foreground text-center">
          Tap the button below to open Pulse and start uploading.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 pt-3">
        <Button
          onClick={handleOpenInPulse}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Opening Pulse...
            </>
          ) : (
            "Open in Pulse App"
          )}
        </Button>
        <div className="w-full pt-2 border-t border-border">
          <StoreBadges
            heading="Don't have PulseCam? Download here"
            layout="inline"
            size="md"
            className="w-full"
          />
        </div>
      </CardFooter>
    </Card>
  );
}
