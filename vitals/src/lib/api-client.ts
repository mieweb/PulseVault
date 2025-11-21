/**
 * API Client for PulseVault Backend
 * Handles communication with Fastify backend for media and uploads
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface VideoMetadata {
  videoId: string;
  filename: string;
  userId: string;
  originalSize: number;
  originalChecksum: string;
  uploadedAt: string;
  status: string;
  [key: string]: string | number | boolean | undefined;
}

export interface SignedUrl {
  url: string;
  expiresAt: string;
  expiresIn: number;
}

export interface Rendition {
  name: string;
  height: number;
  bitrate: string;
  audioBitrate: string;
}

export interface RenditionsResponse {
  renditions: string[];
  status: string;
  masterPlaylist: string | null;
}

/**
 * Fetch videos list with pagination
 */
export async function fetchVideos(page: number = 1, limit: number = 10): Promise<VideoMetadata[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/videos?page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

/**
 * Get video metadata
 */
export async function fetchVideoMetadata(videoId: string, token: string): Promise<VideoMetadata | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/media/videos/${videoId}/metadata?token=${token}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
}

/**
 * Get signed URL for media access
 */
export async function getSignedUrl(videoId: string, mediaPath: string, expiry: number = 300): Promise<SignedUrl | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/media/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId, mediaPath, expiry }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}

/**
 * Get available renditions for a video
 */
export async function fetchRenditions(videoId: string, token: string): Promise<RenditionsResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/media/videos/${videoId}/renditions?token=${token}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch renditions: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching renditions:', error);
    return null;
  }
}

/**
 * Finalize an upload
 */
export async function finalizeUpload(
  uploadId: string,
  filename: string,
  userId?: string,
  metadata?: Record<string, string | number | boolean>
): Promise<VideoMetadata | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/uploads/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uploadId, filename, userId, metadata }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to finalize upload: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error finalizing upload:', error);
    return null;
  }
}

export { API_BASE_URL };
