/**
 * R2 Auth Worker
 * 
 * Handles authenticated uploads and deletes to R2 storage.
 * Validates Supabase JWT tokens and enforces path-based authorization.
 * 
 * Security Model:
 * - Users can only write to paths starting with `users/{their-user-id}/`
 * - JWT is verified using Supabase's JWKS (ES256) or legacy secret (HS256)
 * - GET requests are proxied to public bucket (no auth required)
 * 
 * @see MIGRATION_PLAN.md for architecture details
 */

import * as jose from 'jose';

export interface Env {
  HABITEX_BUCKET: R2Bucket;
  SUPABASE_JWT_SECRET: string; // Legacy HS256 secret (fallback)
  SUPABASE_URL: string; // For JWKS endpoint
  ENVIRONMENT: string;
}

interface SupabaseJWTPayload {
  sub: string; // User ID
  email?: string;
  role?: string;
  aud: string;
  exp: number;
  iat: number;
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://habitex.mx',
  'https://www.habitex.mx',
  'https://manzanillo-real-estate.com',
  'https://www.manzanillo-real-estate.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

// Cache the JWKS for performance (refreshed every hour by Workers runtime)
let jwksCache: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600000; // 1 hour in ms

/**
 * Get or create cached JWKS
 */
function getJWKS(supabaseUrl: string): jose.JWTVerifyGetKey {
  const now = Date.now();
  if (!jwksCache || now - jwksCacheTime > JWKS_CACHE_TTL) {
    const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl);
    jwksCache = jose.createRemoteJWKSet(jwksUrl);
    jwksCacheTime = now;
  }
  return jwksCache;
}

/**
 * Get CORS headers based on the request origin
 */
function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  
  // In development, allow all origins
  const isAllowed = env.ENVIRONMENT === 'development' 
    || ALLOWED_ORIGINS.includes(origin)
    || origin.startsWith('http://localhost:');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, HEAD, OPTIONS, POST',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Verify Supabase JWT token and extract user info
 * Supports both ES256 (JWKS) and HS256 (legacy secret)
 */
async function verifySupabaseJWT(
  token: string, 
  env: Env
): Promise<SupabaseJWTPayload | null> {
  try {
    // Decode header to check algorithm
    const header = jose.decodeProtectedHeader(token);
    
    let payload: jose.JWTPayload;
    
    if (header.alg === 'ES256' && env.SUPABASE_URL) {
      // Use JWKS for ES256 tokens (new Supabase signing)
      const JWKS = getJWKS(env.SUPABASE_URL);
      const result = await jose.jwtVerify(token, JWKS, {
        algorithms: ['ES256'],
      });
      payload = result.payload;
    } else if (header.alg === 'HS256' && env.SUPABASE_JWT_SECRET) {
      // Use legacy secret for HS256 tokens
      const secretKey = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
      const result = await jose.jwtVerify(token, secretKey, {
        algorithms: ['HS256'],
      });
      payload = result.payload;
    } else {
      console.error(`Unsupported JWT algorithm: ${header.alg}`);
      return null;
    }
    
    // Validate required fields
    if (!payload.sub || typeof payload.sub !== 'string') {
      console.error('JWT missing sub claim');
      return null;
    }
    
    // Check expiration (jose does this automatically, but be explicit)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error('JWT expired');
      return null;
    }
    
    return {
      sub: payload.sub,
      email: payload.email as string | undefined,
      role: payload.role as string | undefined,
      aud: payload.aud as string,
      exp: payload.exp as number,
      iat: payload.iat as number,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Validate that a user can access the given path
 * Users can only access paths under their own user folder: users/{user_id}/*
 */
function validatePathAccess(path: string, userId: string): boolean {
  // Normalize path - remove leading/trailing slashes
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  
  // Path must start with users/{userId}/
  const expectedPrefix = `users/${userId}/`;
  
  if (!normalizedPath.startsWith(expectedPrefix)) {
    console.error(`Path access denied: ${normalizedPath} does not start with ${expectedPrefix}`);
    return false;
  }
  
  // Additional security: prevent path traversal attacks
  if (normalizedPath.includes('..') || normalizedPath.includes('//')) {
    console.error('Path traversal attempt detected');
    return false;
  }
  
  return true;
}

/**
 * Handle file upload (PUT)
 */
async function handleUpload(
  request: Request, 
  path: string, 
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
  const contentLength = request.headers.get('Content-Length');
  
  // Validate file size limits
  const maxSizeBytes = path.includes('/videos/') ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB videos, 5MB images
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    return new Response(JSON.stringify({ 
      error: 'File too large',
      maxSize: maxSizeBytes,
      unit: 'bytes'
    }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  try {
    // Upload to R2
    await env.HABITEX_BUCKET.put(path, request.body, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      path,
      message: 'File uploaded successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle file deletion (DELETE)
 */
async function handleDelete(
  path: string, 
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    await env.HABITEX_BUCKET.delete(path);
    
    return new Response(JSON.stringify({ 
      success: true,
      path,
      message: 'File deleted successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ 
      error: 'Delete failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle batch deletion (POST to /batch-delete)
 * Deletes all files matching a prefix (folder)
 */
async function handleBatchDelete(
  request: Request,
  userId: string,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as { prefix?: string };
    
    if (!body.prefix || typeof body.prefix !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Missing or invalid prefix parameter'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate the prefix is within user's folder
    if (!validatePathAccess(body.prefix, userId)) {
      return new Response(JSON.stringify({ 
        error: 'Forbidden: Cannot delete files outside your user folder'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // List all objects with the given prefix
    const listed = await env.HABITEX_BUCKET.list({ prefix: body.prefix });
    
    if (listed.objects.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        deleted: 0,
        message: 'No files found with the given prefix'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Delete all objects
    const keysToDelete = listed.objects.map(obj => obj.key);
    
    // R2 delete can handle multiple keys
    await Promise.all(
      keysToDelete.map(key => env.HABITEX_BUCKET.delete(key))
    );
    
    // If there are more objects (truncated), continue deleting
    let cursor = listed.truncated ? listed.cursor : null;
    let totalDeleted = keysToDelete.length;
    
    while (cursor) {
      const nextBatch = await env.HABITEX_BUCKET.list({ 
        prefix: body.prefix, 
        cursor 
      });
      
      const nextKeys = nextBatch.objects.map(obj => obj.key);
      await Promise.all(
        nextKeys.map(key => env.HABITEX_BUCKET.delete(key))
      );
      
      totalDeleted += nextKeys.length;
      cursor = nextBatch.truncated ? nextBatch.cursor : null;
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      deleted: totalDeleted,
      prefix: body.prefix,
      message: `Successfully deleted ${totalDeleted} files`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    return new Response(JSON.stringify({ 
      error: 'Batch delete failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * List files in a folder (POST to /list)
 */
async function handleList(
  request: Request,
  userId: string,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as { prefix?: string; limit?: number };
    
    if (!body.prefix || typeof body.prefix !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Missing or invalid prefix parameter'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate the prefix is within user's folder
    if (!validatePathAccess(body.prefix, userId)) {
      return new Response(JSON.stringify({ 
        error: 'Forbidden: Cannot list files outside your user folder'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const limit = body.limit || 100;
    const listed = await env.HABITEX_BUCKET.list({ 
      prefix: body.prefix,
      limit
    });
    
    const files = listed.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      etag: obj.etag,
    }));
    
    return new Response(JSON.stringify({ 
      success: true,
      files,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('List error:', error);
    return new Response(JSON.stringify({ 
      error: 'List failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.slice(1); // Remove leading /

    // GET/HEAD requests - proxy to public bucket (no auth required for reads)
    if (request.method === 'GET' || request.method === 'HEAD') {
      // Skip empty paths
      if (!path) {
        return new Response(JSON.stringify({ 
          service: 'R2 Auth Worker',
          status: 'healthy',
          version: '1.0.0'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const object = await env.HABITEX_BUCKET.get(path);
      if (!object) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');

      if (request.method === 'HEAD') {
        return new Response(null, { headers });
      }

      return new Response(object.body, { headers });
    }

    // ============================================
    // All write operations require authentication
    // ============================================
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7); // Remove 'Bearer '

    // Verify JWT token (supports ES256 via JWKS and HS256 via legacy secret)
    const user = await verifySupabaseJWT(token, env);
    if (!user) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle special endpoints (batch-delete, list)
    if (path === 'batch-delete' && request.method === 'POST') {
      return handleBatchDelete(request, user.sub, env, corsHeaders);
    }
    
    if (path === 'list' && request.method === 'POST') {
      return handleList(request, user.sub, env, corsHeaders);
    }

    // For PUT and DELETE, validate path access
    if (!validatePathAccess(path, user.sub)) {
      return new Response(JSON.stringify({ 
        error: 'Forbidden',
        message: 'You can only access files in your own user folder',
        expectedPrefix: `users/${user.sub}/`
      }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle PUT (upload)
    if (request.method === 'PUT') {
      return handleUpload(request, path, env, corsHeaders);
    }

    // Handle DELETE
    if (request.method === 'DELETE') {
      return handleDelete(path, env, corsHeaders);
    }

    // Method not allowed
    return new Response(JSON.stringify({ 
      error: 'Method Not Allowed',
      allowedMethods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'POST']
    }), {
      status: 405,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Allow': 'GET, HEAD, PUT, DELETE, OPTIONS, POST'
      },
    });
  },
};
