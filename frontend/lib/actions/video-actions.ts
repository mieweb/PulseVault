"use server";

import { getSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";

/**
 * Generate QR code for mobile upload
 * Creates a draft first, then generates QR code with draftId
 */
export async function generateUploadQRCode() {
  const session = await getSession();
  if (!session?.user) {
    unauthorized();
  }

  // Create draft first
  const draft = await createVideoDraft();

  // Get backend URL from environment or use default
  const backendUrl = process.env.BACKEND_URL || "http://pulsevault:3000";
  const serverUrl = process.env.BETTER_AUTH_URL || "http://localhost:8080";

  // Call backend to generate QR code with draftId
  const response = await fetch(`${backendUrl}/qr/deeplink?userId=${session.user.id}&draftId=${draft.videoId}&server=${encodeURIComponent(serverUrl)}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to generate QR code");
  }

  const qrData = await response.json();

  return {
    ...qrData,
    draftId: draft.videoId,
    videoId: draft.videoId, // Same as draftId
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
 * Create a new video draft in the database
 * Returns the draftId (which will be used as videoId)
 */
export async function createVideoDraft(title?: string, description?: string) {
  const session = await getSession();
  if (!session?.user) {
    unauthorized();
  }

  const videoId = uuidv4(); // This will be used as the videoId in the backend

  const video = await prisma.video.create({
    data: {
      videoId,
      userId: session.user.id,
      title: title || null,
      description: description || null,
      status: "draft",
    },
  });

  return {
    id: video.id,
    videoId: video.videoId,
    status: video.status,
  };
}

/**
 * Get user's videos from database
 */
export async function getUserVideos(userId: string, page = 1, limit = 20) {
  const session = await getSession();
  if (!session?.user) {
    unauthorized();
  }

  // Only allow users to see their own videos (unless admin)
  if (session.user.id !== userId && session.user.role !== "admin") {
    unauthorized();
  }

  const skip = (page - 1) * limit;

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.video.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    videos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get all videos (for feed)
 */
export async function getAllVideos(page = 1, limit = 20, status = "transcoded") {
  const skip = (page - 1) * limit;

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where: {
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.video.count({
      where: {
        status,
      },
    }),
  ]);

  return {
    videos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single video by videoId
 */
export async function getVideo(videoId: string) {
  const video = await prisma.video.findUnique({
    where: {
      videoId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return video;
}

/**
 * Update video status after upload/transcoding
 * This can be called by the frontend after checking backend metadata
 */
export async function updateVideoStatus(
  videoId: string,
  status: "uploaded" | "transcoding" | "transcoded" | "failed",
  metadata?: {
    filename?: string;
    originalSize?: number;
    duration?: number;
    width?: number;
    height?: number;
    renditions?: string[];
  }
) {
  const session = await getSession();
  if (!session?.user) {
    unauthorized();
  }

  // Get video to check ownership
  const video = await prisma.video.findUnique({
    where: {
      videoId,
    },
  });

  if (!video) {
    throw new Error("Video not found");
  }

  // Only allow owner or admin to update
  if (video.userId !== session.user.id && session.user.role !== "admin") {
    unauthorized();
  }

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === "uploaded" && !video.uploadedAt) {
    updateData.uploadedAt = new Date();
  }

  if (status === "transcoded" && !video.transcodedAt) {
    updateData.transcodedAt = new Date();
  }

  if (metadata) {
    if (metadata.filename) updateData.filename = metadata.filename;
    if (metadata.originalSize) updateData.originalSize = metadata.originalSize;
    if (metadata.duration) updateData.duration = metadata.duration;
    if (metadata.width) updateData.width = metadata.width;
    if (metadata.height) updateData.height = metadata.height;
    if (metadata.renditions) updateData.renditions = metadata.renditions;
  }

  const updated = await prisma.video.update({
    where: {
      videoId,
    },
    data: updateData,
  });

  return updated;
}

/**
 * Update video title/description
 */
export async function updateVideoMetadata(
  videoId: string,
  title?: string,
  description?: string
) {
  const session = await getSession();
  if (!session?.user) {
    unauthorized();
  }

  const video = await prisma.video.findUnique({
    where: {
      videoId,
    },
  });

  if (!video) {
    throw new Error("Video not found");
  }

  if (video.userId !== session.user.id && session.user.role !== "admin") {
    unauthorized();
  }

  const updated = await prisma.video.update({
    where: {
      videoId,
    },
    data: {
      title: title ?? video.title,
      description: description ?? video.description,
    },
  });

  return updated;
}
