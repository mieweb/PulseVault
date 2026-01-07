"use server";

import { getSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate QR code for mobile upload
 * Generates draftId (UUID) - NO database entry created
 * Videos are stored in backend storage with metadata, no DB needed
 */
export async function generateUploadQRCode() {
  const session = await getSession();
  if (!session?.user) {
    unauthorized();
  }

  // Generate draftId (UUID) - just for caching on device, no DB entry yet
  const draftId = uuidv4();

  // Get backend URL from environment or use default
  const backendUrl = process.env.BACKEND_URL || "http://pulsevault:3000";
  const serverUrl = process.env.BETTER_AUTH_URL || "http://localhost:8080";

  // Call backend to generate QR code with draftId
  const response = await fetch(`${backendUrl}/qr/deeplink?userId=${session.user.id}&draftId=${draftId}&server=${encodeURIComponent(serverUrl)}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to generate QR code");
  }

  const qrData = await response.json();

  return {
    ...qrData,
    draftId: draftId,
    videoId: draftId, // Same as draftId
  };
}

export type QRCodeData = {
  deeplink: string;
  server: string;
  token: string;
  expiresAt: string;
  expiresIn: number;
  tokenId: string;
  draftId: string | null;
  videoId: string;
  userId: string;
  organizationId: string | null;
  oneTimeUse: boolean;
  qrData: string;
};

/**
 * Get all videos (for feed) - fetched directly from backend storage
 * No database entries needed - all data comes from storage metadata
 */
export async function getAllVideos(page = 1, limit = 20) {
  const backendUrl = process.env.BACKEND_URL || "http://pulsevault:3000";
  
  try {
    // Fetch all videos from backend storage
    const response = await fetch(`${backendUrl}/media/videos`, {
      method: "GET",
      cache: "no-store", // Always fetch fresh data
    });
  
    if (!response.ok) {
      console.error(`Failed to fetch videos: ${response.status} ${response.statusText}`);
      return {
        videos: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const allVideos = await response.json();
    
    // Backend already filters to only transcoded videos, but double-check
    const transcodedVideos = allVideos.filter((v: any) => 
      v.status === "transcoded"
    );

    // Paginate
    const skip = (page - 1) * limit;
    const total = transcodedVideos.length;
    const paginatedVideos = transcodedVideos.slice(skip, skip + limit);
  
    // Get user info for each video (from userId in metadata)
    // Note: We'll need to fetch user data separately or include it in metadata
    const videosWithUsers = await Promise.all(
      paginatedVideos.map(async (video: any) => {
        // Get user info if userId exists in metadata
        let user = null;
        if (video.userId) {
          try {
            // Import prisma only for user lookup
            const { default: prisma } = await import("@/lib/prisma");
            const userData = await prisma.user.findUnique({
              where: { id: video.userId },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            });
            user = userData;
          } catch (err) {
            console.error(`Failed to fetch user ${video.userId}:`, err);
          }
        }

        return {
          ...video,
          user,
        };
      })
    );

    return {
      videos: videosWithUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching videos from backend:", error);
    return {
      videos: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Get single video by videoId with signed playback URL
 * Fetches directly from backend storage metadata
 */
export async function getVideo(videoId: string) {
  const backendUrl = process.env.BACKEND_URL || "http://pulsevault:3000";
  
  try {
    // Get signed URL for metadata
    const signResponse = await fetch(`${backendUrl}/media/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        path: "metadata",
        expiresIn: 300,
      }),
    });

    if (!signResponse.ok) {
      console.error(`Failed to sign metadata URL: ${signResponse.status}`);
      return null;
    }

    const { url: metadataUrl } = await signResponse.json();
    
    // Construct full URL if relative
    let fullMetadataUrl = metadataUrl;
    if (!metadataUrl.startsWith('http://') && !metadataUrl.startsWith('https://')) {
      fullMetadataUrl = `${backendUrl}${metadataUrl}`;
    }

    // Fetch metadata
    const metadataResponse = await fetch(fullMetadataUrl);
    if (!metadataResponse.ok) {
      console.error(`Failed to fetch metadata: ${metadataResponse.status}`);
      return null;
    }

    const metadata = await metadataResponse.json();

    // Get user info if userId exists
    let user = null;
    if (metadata.userId) {
      try {
        const { default: prisma } = await import("@/lib/prisma");
        user = await prisma.user.findUnique({
          where: { id: metadata.userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });
      } catch (err) {
        console.error(`Failed to fetch user ${metadata.userId}:`, err);
      }
    }

    // Generate playback URL only for transcoded videos
    let playbackUrl: string | null = null;
    if (metadata.status === "transcoded") {
      try {
        const playbackSignResponse = await fetch(`${backendUrl}/media/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            path: "hls/master.m3u8",
            expiresIn: 3600, // 1 hour
          }),
  });

        if (playbackSignResponse.ok) {
          const { url: playbackSignedUrl } = await playbackSignResponse.json();
          // Convert relative URL to absolute URL
          const publicUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                           process.env.BETTER_AUTH_URL?.replace(/\/$/, '') || 
                           "http://localhost:8080";
  
          playbackUrl = playbackSignedUrl.startsWith('http') 
            ? playbackSignedUrl 
            : `${publicUrl}${playbackSignedUrl}`;
        }
      } catch (error) {
        console.error("Failed to generate playback URL:", error);
      }
    }

    return {
      videoId: metadata.videoId || videoId,
      userId: metadata.userId,
      status: metadata.status,
      filename: metadata.filename,
      originalSize: metadata.originalSize,
      duration: metadata.duration,
      width: metadata.width || metadata.dimensions?.width,
      height: metadata.height || metadata.dimensions?.height,
      renditions: metadata.renditions || [],
      transcodedAt: metadata.transcodedAt ? new Date(metadata.transcodedAt) : null,
      uploadedAt: metadata.uploadedAt ? new Date(metadata.uploadedAt) : null,
      createdAt: metadata.uploadedAt ? new Date(metadata.uploadedAt) : new Date(),
      user,
      playbackUrl,
    };
  } catch (error) {
    console.error(`Error fetching video ${videoId}:`, error);
    return null;
}
}

// Removed syncVideoStatus - no longer needed since we fetch directly from backend storage
