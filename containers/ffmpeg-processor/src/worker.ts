/**
 * FFmpeg Processor Worker Entry Point
 * 
 * Uses Cloudflare Containers to run FFmpeg for video processing.
 * The Worker forwards requests to the container which runs the actual FFmpeg.
 */

import { Container, getContainer } from '@cloudflare/containers';

export interface Env {
  FFMPEG_CONTAINER: DurableObjectNamespace;
  HABITEX_BUCKET: R2Bucket;
  ENVIRONMENT: string;
}

/**
 * FFmpegProcessor Container Class
 * 
 * Extends the Cloudflare Container class which manages the Docker container
 * running FFmpeg.
 */
export class FFmpegProcessor extends Container {
  // The port the container server listens on
  defaultPort = 8080;
  
  // Sleep immediately after request completes to minimize vCPU usage
  // Cold start is only ~500ms, no additional cost
  sleepAfter = '10s';
  
  // Enable internet access for downloading videos
  enableInternet = true;

  /**
   * Override fetch to handle our video and image processing API
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health check - check both Worker and container
    if (url.pathname === '/health') {
      try {
        const containerRunning = this.ctx.container?.running ?? false;
        return Response.json({
          status: 'healthy',
          service: 'ffmpeg-processor',
          timestamp: new Date().toISOString(),
          containerRunning,
        });
      } catch {
        return Response.json({
          status: 'healthy',
          service: 'ffmpeg-processor',
          timestamp: new Date().toISOString(),
          containerRunning: 'unknown',
        });
      }
    }

    // Process video - forward to container
    if (url.pathname === '/process' && request.method === 'POST') {
      try {
        const body = await request.json() as ProcessRequest;
        const result = await this.processVideoInContainer(body);
        return Response.json(result);
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    // Process image resize - forward to container
    if (url.pathname === '/resize-image' && request.method === 'POST') {
      try {
        const body = await request.json() as ImageResizeRequest;
        const result = await this.processImageInContainer(body);
        return Response.json(result);
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  /**
   * Process image by calling the FFmpeg container
   */
  private async processImageInContainer(request: ImageResizeRequest): Promise<ImageResizeResponse> {
    const startTime = Date.now();

    try {
      // Call the container's /resize-image endpoint using containerFetch
      // This will automatically start the container and wait for the port to be ready
      const containerResponse = await this.containerFetch('http://container/resize-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: request.imageUrl,
          variants: request.variants,
        }),
      });

      if (!containerResponse.ok) {
        const errorText = await containerResponse.text();
        throw new Error(`Container error: ${containerResponse.status} - ${errorText}`);
      }

      const containerResult = await containerResponse.json() as ContainerImageResponse;

      if (!containerResult.success) {
        throw new Error(containerResult.error || 'Container image processing failed');
      }

      return {
        success: true,
        variants: containerResult.variants,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error('Image processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Process video by calling the FFmpeg container
   */
  private async processVideoInContainer(request: ProcessRequest): Promise<ProcessResponse> {
    const startTime = Date.now();

    try {
      // Get the video from R2 to verify it exists
      const videoObject = await this.env.HABITEX_BUCKET.head(request.key);
      if (!videoObject) {
        return {
          success: false,
          error: `Video not found: ${request.key}`,
          processingTime: Date.now() - startTime,
        };
      }

      // Build the public URL for the video
      const r2PublicUrl = 'https://storage.manzanillo-real-estate.com';
      const videoUrl = `${r2PublicUrl}/${request.key}`;
      
      const basePath = request.key.replace(/\.[^.]+$/, '');

      // Call the container's /process endpoint using containerFetch
      // This will automatically start the container and wait for the port to be ready
      const containerResponse = await this.containerFetch('http://container/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          operations: request.operations,
          thumbnailTime: request.thumbnailTime ?? 2,
          gifStart: request.gifStart ?? 0,
          gifDuration: request.gifDuration ?? 3,
        }),
      });

      if (!containerResponse.ok) {
        const errorText = await containerResponse.text();
        throw new Error(`Container error: ${containerResponse.status} - ${errorText}`);
      }

      const containerResult = await containerResponse.json() as ContainerResponse;

      if (!containerResult.success) {
        throw new Error(containerResult.error || 'Container processing failed');
      }

      const results: ProcessResponse = { success: true };

      // Save thumbnail to R2
      if (containerResult.thumbnailData) {
        const thumbnailKey = `${basePath}.thumb.jpg`;
        const thumbnailBuffer = Uint8Array.from(atob(containerResult.thumbnailData), c => c.charCodeAt(0));
        await this.env.HABITEX_BUCKET.put(thumbnailKey, thumbnailBuffer, {
          httpMetadata: { contentType: 'image/jpeg' },
        });
        results.thumbnail = thumbnailKey;
      }

      // Save GIF to R2
      if (containerResult.gifData) {
        const gifKey = `${basePath}.preview.gif`;
        const gifBuffer = Uint8Array.from(atob(containerResult.gifData), c => c.charCodeAt(0));
        await this.env.HABITEX_BUCKET.put(gifKey, gifBuffer, {
          httpMetadata: { contentType: 'image/gif' },
        });
        results.gif = gifKey;
      }

      results.processingTime = Date.now() - startTime;
      return results;

    } catch (error) {
      console.error('Video processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        processingTime: Date.now() - startTime,
      };
    }
  }
}

interface ProcessRequest {
  key: string;
  operations: ('thumbnail' | 'gif')[];
  thumbnailTime?: number;
  gifStart?: number;
  gifDuration?: number;
}

interface ProcessResponse {
  success: boolean;
  thumbnail?: string;
  gif?: string;
  error?: string;
  processingTime?: number;
}

interface ContainerResponse {
  success: boolean;
  thumbnailData?: string;
  thumbnailSize?: number;
  gifData?: string;
  gifSize?: number;
  error?: string;
  processingTime?: number;
}

// Image processing interfaces
interface ImageVariantRequest {
  name: string;
  width: number;
  height: number;
  fit?: 'cover' | 'contain' | 'scale-down';
  quality?: number;
}

interface ImageResizeRequest {
  imageUrl: string;
  variants: ImageVariantRequest[];
}

interface ImageResizeResponse {
  success: boolean;
  variants?: {
    [name: string]: {
      data: string;
      size: number;
    };
  };
  error?: string;
  processingTime?: number;
}

interface ContainerImageResponse {
  success: boolean;
  variants?: {
    [name: string]: {
      data: string;
      size: number;
    };
  };
  error?: string;
  processingTime?: number;
}

/**
 * Main Worker fetch handler
 * Routes requests to the FFmpegProcessor container
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Get the container instance using getContainer helper
    const container = getContainer(env.FFMPEG_CONTAINER, 'processor');

    // Health check endpoint at Worker level
    if (url.pathname === '/health' && request.method === 'GET') {
      return container.fetch(request);
    }

    // Route /process requests to a container instance (video processing)
    if (url.pathname === '/process' && request.method === 'POST') {
      return container.fetch(request);
    }

    // Route /resize-image requests to a container instance (image processing)
    if (url.pathname === '/resize-image' && request.method === 'POST') {
      return container.fetch(request);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};
