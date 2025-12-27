/**
 * Input Sanitization Utilities
 * Uses DOMPurify for XSS protection
 */

import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify
 * Restrictive by default - only allow safe formatting tags
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [] as string[],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
};

/**
 * Plain text config - strips ALL HTML
 */
const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
};

/**
 * Sanitize HTML content, allowing only safe formatting tags
 * Use for rich text fields like descriptions
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG);
}

/**
 * Strip all HTML and return plain text
 * Use for titles, names, and other plain text fields
 */
export function sanitizePlainText(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, PLAIN_TEXT_CONFIG).trim();
}

/**
 * Sanitize a URL to prevent javascript: and data: exploits
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }
  
  // Allow only http, https, mailto, tel protocols
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('mailto:') &&
    !trimmed.startsWith('tel:') &&
    !trimmed.startsWith('/')  // Relative URLs
  ) {
    // If no protocol, assume https
    return 'https://' + url.trim();
  }
  
  return url.trim();
}

/**
 * Sanitize phone number - remove all non-numeric characters except +
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // Remove non-alphanumeric
    .replace(/\s+/g, '-')            // Replace spaces with hyphens
    .replace(/-+/g, '-')             // Remove consecutive hyphens
    .replace(/^-|-$/g, '')           // Remove leading/trailing hyphens
    .substring(0, 100);              // Limit length
}

/**
 * Escape special characters for use in URLs
 */
export function escapeForUrl(text: string): string {
  if (!text) return '';
  return encodeURIComponent(text);
}

/**
 * Validate and sanitize a file name
 * Prevents path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  
  return fileName
    .replace(/\.\./g, '')           // Prevent path traversal
    .replace(/[/\\:*?"<>|]/g, '_')  // Replace dangerous chars
    .substring(0, 255);             // Limit length
}

/**
 * Check if a MIME type is allowed for image uploads
 */
export function isAllowedImageType(mimeType: string): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
  ];
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Check if a MIME type is allowed for video uploads
 */
export function isAllowedVideoType(mimeType: string): boolean {
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Validate file magic bytes to verify actual file type
 * This prevents users from renaming files to bypass extension checks
 */
export async function validateFileMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // JPEG: FF D8 FF
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && 
                bytes[2] === 0x4E && bytes[3] === 0x47;
  
  // GIF: 47 49 46 38
  const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && 
                bytes[2] === 0x46 && bytes[3] === 0x38;
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && 
                 bytes[2] === 0x46 && bytes[3] === 0x46 &&
                 bytes[8] === 0x57 && bytes[9] === 0x45 && 
                 bytes[10] === 0x42 && bytes[11] === 0x50;
  
  // MP4: ftyp at offset 4
  const isMp4 = bytes[4] === 0x66 && bytes[5] === 0x74 && 
                bytes[6] === 0x79 && bytes[7] === 0x70;
  
  // WebM: 1A 45 DF A3
  const isWebm = bytes[0] === 0x1A && bytes[1] === 0x45 && 
                 bytes[2] === 0xDF && bytes[3] === 0xA3;
  
  return isJpeg || isPng || isGif || isWebp || isMp4 || isWebm;
}
