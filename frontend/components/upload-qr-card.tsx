"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateUploadQRCode, type QRCodeData } from "@/lib/actions/video-actions";
import { Loader2 } from "lucide-react";

export function UploadQRCard() {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateUploadQRCode();
      setQrData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Upload from Mobile</CardTitle>
        <CardDescription className="text-xs">
          Scan QR code with mobile app
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {error && (
          <div className="w-full p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}
        
        {qrData ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="p-2 bg-white rounded-lg border-2 border-border">
              <QRCodeSVG
                value={qrData.qrData}
                size={180}
                level="M"
                includeMargin={true}
              />
            </div>
            <div className="w-full space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires:</span>
                <span className="text-right text-xs">{new Date(qrData.expiresAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid for:</span>
                <span>{Math.floor(qrData.expiresIn / 3600)}h</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Click to generate QR code
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3">
        <Button
          onClick={handleGenerateQR}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : qrData ? (
            "New QR Code"
          ) : (
            "Generate QR Code"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

