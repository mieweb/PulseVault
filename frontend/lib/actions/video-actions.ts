"use server";

import { getSession } from "@/lib/get-session";

const BACKEND_URL = process.env.BACKEND_URL;

export interface QRCodeData {
  deeplink: string;
  server: string;
  token: string;
  expiresAt: string;
  expiresIn: number;
  tokenId: string;
  draftId: string | null;
  userId: string;
  organizationId: string | null;
  oneTimeUse: boolean;
  qrData: string;
}

export async function generateUploadQRCode(): Promise<QRCodeData> {
  const session = await getSession();
  
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;
  
  // Get public server URL (Nginx URL) for uploads
  // Use DEV_SERVER_IP if set, otherwise fallback to BETTER_AUTH_URL
  const publicServerUrl = process.env.DEV_SERVER_IP 
    ? `http://${process.env.DEV_SERVER_IP}:8080`
    : (process.env.BETTER_AUTH_URL || "http://localhost:8080");
  
  // Call backend directly via Docker network
  const url = new URL(`${BACKEND_URL}/qr/deeplink`);
  url.searchParams.set("userId", userId);
  url.searchParams.set("server", publicServerUrl);
  // Optional: can add draftId later when video model is implemented
  
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    // No cache to ensure fresh QR codes
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to generate QR code: ${response.status} ${errorText}`
    );
  }

  const data: QRCodeData = await response.json();
  return data;
}

