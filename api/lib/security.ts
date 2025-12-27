/**
 * API Security Utilities
 * Shared security helpers for API routes
 */

// Allowed origins for CORS - update with your production domains
const ALLOWED_ORIGINS = [
  'https://www.bninmobiliaria.com',
  'https://bninmobiliaria.com',
  'https://real-estate-manzanillo.vercel.app',
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

/**
 * Set secure CORS headers based on the request origin
 */
export function setSecureCORSHeaders(req: any, res: any): void {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow any localhost
    if (origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  // If origin not allowed, don't set the header (browser will block the request)
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

/**
 * Validate a return URL to prevent open redirect vulnerabilities
 */
export function validateReturnUrl(returnUrl: string | undefined, origin: string | undefined): string {
  const defaultUrl = '/dashboard';
  
  if (!returnUrl) {
    return origin ? `${origin}${defaultUrl}` : defaultUrl;
  }
  
  // If it's a relative URL, prepend origin
  if (returnUrl.startsWith('/')) {
    return origin ? `${origin}${returnUrl}` : returnUrl;
  }
  
  // If it's an absolute URL, validate it's from an allowed origin
  try {
    const url = new URL(returnUrl);
    const isAllowedOrigin = ALLOWED_ORIGINS.some(allowed => {
      const allowedUrl = new URL(allowed);
      return url.origin === allowedUrl.origin;
    });
    
    if (isAllowedOrigin) {
      return returnUrl;
    }
    
    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return returnUrl;
      }
    }
  } catch {
    // Invalid URL, return default
  }
  
  return origin ? `${origin}${defaultUrl}` : defaultUrl;
}

/**
 * Create a generic error response (hides internal details in production)
 */
export function createErrorResponse(error: unknown, genericMessage: string): { error: string; details?: string } {
  if (process.env.NODE_ENV === 'development') {
    return {
      error: genericMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
  
  // In production, only return generic message
  return { error: genericMessage };
}

/**
 * Simple in-memory rate limiter for serverless functions
 * Note: This is per-instance, so it's not perfect for distributed deployments
 * For production, use Redis-based rate limiting (e.g., Upstash)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  
  if (record.count >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetTime - now 
    };
  }
  
  record.count++;
  return { 
    allowed: true, 
    remaining: maxRequests - record.count, 
    resetIn: record.resetTime - now 
  };
}

/**
 * Get client IP for rate limiting
 */
export function getClientIP(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}
