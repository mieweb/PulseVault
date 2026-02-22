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
import { generateConfigureAppDeeplink } from "@/lib/actions/video-actions";
import { Loader2, Settings } from "lucide-react";

/**
 * Setup your app: QR + Configure app button.
 * Generates a long-lived destination token (no draftId). Pulse app adds this vault
 * as an upload destination; user can then choose it when uploading from camera drafts.
 */
export function ConfigureAppCard() {
  const [data, setData] = useState<{
    deeplink: string;
    server: string;
    expiresAt: string;
    expiresIn: number;
    qrData: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateConfigureAppDeeplink();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate setup link");
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureApp = () => {
    if (data?.deeplink) {
      window.location.href = data.deeplink;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Setup your app
        </CardTitle>
        <CardDescription className="text-xs">
          Give Pulse access to upload to this vault for 30 days. Scan the QR or tap Configure app on your phone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {error && (
          <div className="w-full p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}
        {data ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="p-2 bg-white rounded-lg border-2 border-border">
              <QRCodeSVG
                value={data.qrData}
                size={180}
                level="M"
                includeMargin={true}
              />
            </div>
            <div className="w-full space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires:</span>
                <span className="text-right">{new Date(data.expiresAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid for:</span>
                <span>{Math.floor(data.expiresIn / 86400)} days</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Generate a setup link to add this vault as an upload destination in Pulse.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-3">
        <Button
          onClick={data ? handleConfigureApp : handleGenerate}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : data ? (
            "Configure app"
          ) : (
            "Generate setup link"
          )}
        </Button>
        {data && (
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
            size="sm"
          >
            New setup link
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
