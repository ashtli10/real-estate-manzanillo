/**
 * Media Processing Worker
 * 
 * Cloudflare Worker that processes uploaded media files:
 * - Images: Generates medium (800x600) and thumbnail (160x160) variants
 * - Videos: Generates thumbnail (480x270) and 3-second GIF preview
 * - Profile images: Resizes avatars to 512x512, covers to 1920x1080
 * 
 * Triggered by R2 Event Notifications via Cloudflare Queue.
 * 
 * @see MIGRATION_PLAN.md - Phase 3: Media Processing Pipeline
 */

import type { Env, R2EventMessage, MessageBatch, ProcessingResult } from './types';
import {
  isImage,
  isVariant,
  getImageProcessingType,
  processPropertyImage,
  processAvatarImage,
  processCoverImage,
  processAIGeneratedImage,
} from './image-processor';
import {
  isVideo,
  getVideoProcessingType,
  processVideo,
} from './video-processor';

/**
 * Worker export with queue consumer handler
 */
export default {
  /**
   * Queue consumer - processes R2 event notifications
   * 
   * Receives batches of messages when files are uploaded to the R2 bucket.
   * Each message contains the object key and action (PutObject, DeleteObject, etc.)
   */
  async queue(
    batch: MessageBatch<R2EventMessage>,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const results: ProcessingResult[] = [];

    for (const message of batch.messages) {
      const startTime = Date.now();
      const { action, object } = message.body;
      const key = object.key;

      console.log(`Processing: ${action} - ${key}`);

      try {
        // Skip delete events - nothing to process
        if (action === 'DeleteObject') {
          console.log(`Skipping delete event for: ${key}`);
          message.ack();
          continue;
        }

        // Skip if already a variant (prevent infinite loop)
        if (isVariant(key)) {
          console.log(`Skipping variant: ${key}`);
          message.ack();
          continue;
        }

        // Process based on file type
        if (isImage(key)) {
          const result = await handleImageProcessing(key, env);
          results.push({
            key,
            success: result.success,
            variants: result.variants,
            processingTime: Date.now() - startTime,
          });
        } else if (isVideo(key)) {
          const result = await handleVideoProcessing(key, env);
          results.push({
            key,
            success: result.success,
            variants: result.variants,
            processingTime: Date.now() - startTime,
          });
        } else {
          console.log(`Unknown file type, skipping: ${key}`);
        }

        message.ack();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing ${key}:`, errorMessage);
        
        results.push({
          key,
          success: false,
          error: errorMessage,
          processingTime: Date.now() - startTime,
        });

        // Retry the message (will go to DLQ after max retries)
        message.retry();
      }
    }

    // Log batch summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Batch complete: ${successful} succeeded, ${failed} failed`);
  },

  /**
   * HTTP handler for manual processing or health checks
   */
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        worker: 'media-processor',
        environment: env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Manual processing endpoint (for debugging)
    if (url.pathname === '/process' && request.method === 'POST') {
      try {
        const body = await request.json() as { key: string };
        const { key } = body;

        if (!key) {
          return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        let result: { success: boolean; variants?: string[]; error?: string };

        if (isImage(key)) {
          result = await handleImageProcessing(key, env);
        } else if (isVideo(key)) {
          result = await handleVideoProcessing(key, env);
        } else {
          return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Media Processing Worker', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

/**
 * Handle image processing based on the file path
 */
async function handleImageProcessing(
  key: string,
  env: Env
): Promise<{ success: boolean; variants?: string[] }> {
  const processingType = getImageProcessingType(key);

  if (!processingType) {
    console.log(`Unknown image path pattern: ${key}`);
    return { success: true, variants: [] };
  }

  // Fetch the image from R2
  const object = await env.HABITEX_BUCKET.get(key);
  if (!object) {
    console.error(`Object not found: ${key}`);
    return { success: false };
  }

  const imageBuffer = await object.arrayBuffer();
  console.log(`Processing ${processingType} image: ${key} (${imageBuffer.byteLength} bytes)`);

  switch (processingType) {
    case 'property': {
      const result = await processPropertyImage(key, imageBuffer, env);
      console.log(`Generated variants: ${result.medium}, ${result.thumb}`);
      return { success: true, variants: [result.medium, result.thumb] };
    }

    case 'avatar': {
      const result = await processAvatarImage(key, imageBuffer, env);
      console.log(`Avatar resized: ${result}`);
      return { success: true, variants: [result] };
    }

    case 'cover': {
      const result = await processCoverImage(key, imageBuffer, env);
      console.log(`Cover resized: ${result}`);
      return { success: true, variants: [result] };
    }

    case 'ai-generated': {
      const result = await processAIGeneratedImage(key, imageBuffer, env);
      console.log(`AI image thumbnail: ${result}`);
      return { success: true, variants: [result] };
    }

    default:
      return { success: true, variants: [] };
  }
}

/**
 * Handle video processing
 */
async function handleVideoProcessing(
  key: string,
  env: Env
): Promise<{ success: boolean; variants?: string[] }> {
  const processingType = getVideoProcessingType(key);

  if (!processingType) {
    console.log(`Unknown video path pattern: ${key}`);
    return { success: true, variants: [] };
  }

  console.log(`Processing ${processingType} video: ${key}`);

  const result = await processVideo(key, env);

  if (result) {
    console.log(`Generated variants: ${result.thumbnail}, ${result.preview}`);
    return { success: true, variants: [result.thumbnail, result.preview] };
  }

  // Video processing failed but we still acknowledge the message
  // Thumbnails can be generated later or manually
  console.warn(`Video processing incomplete for: ${key}`);
  return { success: true, variants: [] };
}
