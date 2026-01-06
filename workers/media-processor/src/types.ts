/**
 * Type definitions for the Media Processing Worker
 */

/**
 * Service binding interface for Cloudflare Containers
 */
interface ServiceBinding {
  fetch(request: Request): Promise<Response>;
}

/**
 * Environment bindings for the worker
 */
export interface Env {
  // R2 bucket binding
  HABITEX_BUCKET: R2Bucket;
  
  // FFmpeg Container service binding (Cloudflare Containers)
  FFMPEG_CONTAINER?: ServiceBinding;
  
  // Environment variables
  ENVIRONMENT: string;
  R2_PUBLIC_URL: string;
  
  // Image processing settings
  IMAGE_MEDIUM_MAX_WIDTH: string;
  IMAGE_MEDIUM_MAX_HEIGHT: string;
  IMAGE_THUMB_SIZE: string;
  IMAGE_QUALITY: string;
  
  // Video processing settings
  VIDEO_THUMB_WIDTH: string;
  VIDEO_THUMB_HEIGHT: string;
  VIDEO_GIF_DURATION: string;
  
  // Profile image settings
  AVATAR_SIZE: string;
  COVER_WIDTH: string;
  COVER_HEIGHT: string;
}

/**
 * R2 Event Notification message format
 * Sent when objects are created/deleted in the bucket
 */
export interface R2EventMessage {
  /** The action that triggered the event */
  action: 'PutObject' | 'DeleteObject' | 'CopyObject' | 'CompleteMultipartUpload';
  
  /** The bucket name */
  bucket: string;
  
  /** The object key (path) */
  object: {
    key: string;
    size: number;
    eTag: string;
  };
  
  /** Event timestamp */
  eventTime: string;
  
  /** Account ID */
  account: string;
}

/**
 * Queue message batch
 */
export interface QueueMessage<T> {
  body: T;
  id: string;
  timestamp: Date;
  ack(): void;
  retry(): void;
}

export interface MessageBatch<T> {
  messages: QueueMessage<T>[];
  queue: string;
  ackAll(): void;
  retryAll(): void;
}

/**
 * Processing result tracking
 */
export interface ProcessingResult {
  key: string;
  success: boolean;
  variants?: string[];
  error?: string;
  processingTime?: number;
}

/**
 * Supported image formats
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif';

/**
 * Supported video formats
 */
export type VideoFormat = 'mp4' | 'mov' | 'webm' | 'avi' | 'mkv';

/**
 * Image resize options
 */
export interface ImageResizeOptions {
  width: number;
  height: number;
  fit: 'inside' | 'cover' | 'contain' | 'fill';
  quality: number;
  format?: ImageFormat;
}

/**
 * Video processing options
 */
export interface VideoProcessingOptions {
  thumbnailTimestamp?: number;
  gifStartTime?: number;
  gifDuration?: number;
  outputWidth?: number;
  outputHeight?: number;
}
