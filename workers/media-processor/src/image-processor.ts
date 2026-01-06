/**
 * Image Processing Module
 * 
 * Handles image resizing using FFmpeg Container.
 * Generates medium (800x600) and thumbnail (160x160) variants.
 */

import type { Env } from './types';

// Image processing configuration
const CONFIG = {
  medium: {
    maxWidth: 800,
    maxHeight: 600,
    quality: 2, // FFmpeg quality (1-31, lower = better)
    format: 'jpeg' as const,
  },
  thumb: {
    size: 160,
    quality: 2,
    format: 'jpeg' as const,
  },
  avatar: {
    size: 512,
    quality: 2,
    format: 'jpeg' as const,
  },
  cover: {
    width: 1920,
    height: 1080,
    quality: 2,
    format: 'jpeg' as const,
  },
};

/**
 * Check if a file key represents an image
 */
export function isImage(key: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const lowerKey = key.toLowerCase();
  return imageExtensions.some(ext => lowerKey.endsWith(ext));
}

/**
 * Check if this is a generated variant (should skip processing)
 */
export function isVariant(key: string): boolean {
  return key.includes('.thumb.') || 
         key.includes('.medium.') || 
         key.includes('.preview.');
}

/**
 * Determine what type of image processing is needed based on path
 */
export function getImageProcessingType(key: string): 'property' | 'avatar' | 'cover' | 'ai-generated' | null {
  if (key.includes('/profile/avatar')) {
    return 'avatar';
  }
  if (key.includes('/profile/cover')) {
    return 'cover';
  }
  if (key.includes('/properties/') && key.includes('/images/')) {
    return 'property';
  }
  if (key.includes('/ai-jobs/') && key.includes('/generated/')) {
    return 'ai-generated';
  }
  return null;
}

/**
 * Response from FFmpeg Container image resize
 */
interface FFmpegImageResponse {
  success: boolean;
  variants?: {
    [name: string]: {
      data: string; // base64
      size: number;
    };
  };
  error?: string;
  processingTime?: number;
}

/**
 * Process a property image - generate medium and thumbnail variants
 * Uses FFmpeg Container for reliable image resizing
 */
export async function processPropertyImage(
  key: string,
  _imageBuffer: ArrayBuffer,
  env: Env
): Promise<{ medium: string; thumb: string }> {
  const basePath = key.replace(/\.[^.]+$/, '');
  const sourceUrl = `${env.R2_PUBLIC_URL}/${key}`;
  
  // Check if FFmpeg Container is available
  if (!env.FFMPEG_CONTAINER) {
    throw new Error('FFmpeg Container not configured');
  }
  
  console.log(`Processing image via FFmpeg Container: ${key}`);
  
  // Call FFmpeg Container to resize image
  const response = await env.FFMPEG_CONTAINER.fetch(
    new Request('http://ffmpeg-container/resize-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: sourceUrl,
        variants: [
          { 
            name: 'medium', 
            width: CONFIG.medium.maxWidth, 
            height: CONFIG.medium.maxHeight, 
            fit: 'scale-down',
            quality: CONFIG.medium.quality
          },
          { 
            name: 'thumb', 
            width: CONFIG.thumb.size, 
            height: CONFIG.thumb.size, 
            fit: 'cover',
            quality: CONFIG.thumb.quality
          }
        ]
      }),
    })
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FFmpeg Container error: ${response.status} - ${errorText}`);
  }

  const result: FFmpegImageResponse = await response.json();

  if (!result.success || !result.variants) {
    throw new Error(`FFmpeg processing failed: ${result.error}`);
  }

  console.log(`Image processed in ${result.processingTime}ms`);

  // Save medium variant
  const mediumKey = `${basePath}.medium.jpg`;
  const mediumData = Uint8Array.from(atob(result.variants.medium.data), c => c.charCodeAt(0));
  await env.HABITEX_BUCKET.put(mediumKey, mediumData, {
    httpMetadata: { contentType: 'image/jpeg' },
  });
  console.log(`Saved medium: ${result.variants.medium.size} bytes`);

  // Save thumbnail variant
  const thumbKey = `${basePath}.thumb.jpg`;
  const thumbData = Uint8Array.from(atob(result.variants.thumb.data), c => c.charCodeAt(0));
  await env.HABITEX_BUCKET.put(thumbKey, thumbData, {
    httpMetadata: { contentType: 'image/jpeg' },
  });
  console.log(`Saved thumb: ${result.variants.thumb.size} bytes`);

  return { medium: mediumKey, thumb: thumbKey };
}

/**
 * Process an avatar image - resize to 512x512 and overwrite original
 */
export async function processAvatarImage(
  key: string,
  _imageBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  const sourceUrl = `${env.R2_PUBLIC_URL}/${key}`;
  
  if (!env.FFMPEG_CONTAINER) {
    throw new Error('FFmpeg Container not configured');
  }
  
  console.log(`Processing avatar via FFmpeg Container: ${key}`);
  
  const response = await env.FFMPEG_CONTAINER.fetch(
    new Request('http://ffmpeg-container/resize-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: sourceUrl,
        variants: [{ 
          name: 'avatar', 
          width: CONFIG.avatar.size, 
          height: CONFIG.avatar.size, 
          fit: 'cover',
          quality: CONFIG.avatar.quality
        }]
      }),
    })
  );

  if (!response.ok) {
    throw new Error(`FFmpeg Container error: ${response.status}`);
  }

  const result: FFmpegImageResponse = await response.json();
  if (!result.success || !result.variants) {
    throw new Error(`FFmpeg processing failed: ${result.error}`);
  }

  // Overwrite original with resized version
  const avatarData = Uint8Array.from(atob(result.variants.avatar.data), c => c.charCodeAt(0));
  await env.HABITEX_BUCKET.put(key, avatarData, {
    httpMetadata: { contentType: 'image/jpeg' },
  });
  console.log(`Saved avatar: ${result.variants.avatar.size} bytes`);

  return key;
}

/**
 * Process a cover image - resize to 1920x1080 and overwrite original
 */
export async function processCoverImage(
  key: string,
  _imageBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  const sourceUrl = `${env.R2_PUBLIC_URL}/${key}`;
  
  if (!env.FFMPEG_CONTAINER) {
    throw new Error('FFmpeg Container not configured');
  }
  
  console.log(`Processing cover via FFmpeg Container: ${key}`);
  
  const response = await env.FFMPEG_CONTAINER.fetch(
    new Request('http://ffmpeg-container/resize-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: sourceUrl,
        variants: [{ 
          name: 'cover', 
          width: CONFIG.cover.width, 
          height: CONFIG.cover.height, 
          fit: 'cover',
          quality: CONFIG.cover.quality
        }]
      }),
    })
  );

  if (!response.ok) {
    throw new Error(`FFmpeg Container error: ${response.status}`);
  }

  const result: FFmpegImageResponse = await response.json();
  if (!result.success || !result.variants) {
    throw new Error(`FFmpeg processing failed: ${result.error}`);
  }

  // Overwrite original with resized version
  const coverData = Uint8Array.from(atob(result.variants.cover.data), c => c.charCodeAt(0));
  await env.HABITEX_BUCKET.put(key, coverData, {
    httpMetadata: { contentType: 'image/jpeg' },
  });
  console.log(`Saved cover: ${result.variants.cover.size} bytes`);

  return key;
}

/**
 * Process an AI-generated image - only generate thumbnail
 */
export async function processAIGeneratedImage(
  key: string,
  _imageBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  const basePath = key.replace(/\.[^.]+$/, '');
  const sourceUrl = `${env.R2_PUBLIC_URL}/${key}`;

  if (!env.FFMPEG_CONTAINER) {
    throw new Error('FFmpeg Container not configured');
  }
  
  console.log(`Processing AI image via FFmpeg Container: ${key}`);
  
  const response = await env.FFMPEG_CONTAINER.fetch(
    new Request('http://ffmpeg-container/resize-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: sourceUrl,
        variants: [{ 
          name: 'thumb', 
          width: CONFIG.thumb.size, 
          height: CONFIG.thumb.size, 
          fit: 'cover',
          quality: CONFIG.thumb.quality
        }]
      }),
    })
  );

  if (!response.ok) {
    throw new Error(`FFmpeg Container error: ${response.status}`);
  }

  const result: FFmpegImageResponse = await response.json();
  if (!result.success || !result.variants) {
    throw new Error(`FFmpeg processing failed: ${result.error}`);
  }

  const thumbKey = `${basePath}.thumb.jpg`;
  const thumbData = Uint8Array.from(atob(result.variants.thumb.data), c => c.charCodeAt(0));
  await env.HABITEX_BUCKET.put(thumbKey, thumbData, {
    httpMetadata: { contentType: 'image/jpeg' },
  });
  console.log(`Saved AI thumb: ${result.variants.thumb.size} bytes`);

  return thumbKey;
}

/**
 * Get image dimensions from buffer (basic implementation)
 * For full support, use a proper image parsing library
 */
export async function getImageDimensions(
  buffer: ArrayBuffer
): Promise<{ width: number; height: number } | null> {
  const view = new DataView(buffer);
  
  // Check for JPEG
  if (view.getUint8(0) === 0xFF && view.getUint8(1) === 0xD8) {
    return getJpegDimensions(view);
  }
  
  // Check for PNG
  if (view.getUint8(0) === 0x89 && view.getUint8(1) === 0x50) {
    return getPngDimensions(view);
  }
  
  return null;
}

function getJpegDimensions(view: DataView): { width: number; height: number } | null {
  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xFF) break;
    
    const marker = view.getUint8(offset + 1);
    
    // SOF markers (Start of Frame)
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      const height = view.getUint16(offset + 5);
      const width = view.getUint16(offset + 7);
      return { width, height };
    }
    
    const length = view.getUint16(offset + 2);
    offset += 2 + length;
  }
  return null;
}

function getPngDimensions(view: DataView): { width: number; height: number } | null {
  // PNG dimensions are at bytes 16-23 in the IHDR chunk
  if (view.byteLength < 24) return null;
  
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return { width, height };
}
