/**
 * Storage Cleanup Edge Function
 * 
 * Called by database triggers to delete R2 folders when entities are deleted.
 * This function receives calls from pg_net.http_post() in database triggers.
 * 
 * POST body:
 * {
 *   type: 'property' | 'video-job' | 'user' | 'draft',
 *   user_id: string,
 *   entity_id?: string,         // Required for property, video-job
 *   uploaded_files?: string[]   // Required for draft cleanup
 * }
 * 
 * Security: This endpoint is called by database triggers using service role.
 * It validates the service role key to ensure only internal calls are allowed.
 * 
 * LIMITATION: If the media processor (ffmpeg container) is still generating
 * thumbnails/GIFs when deletion occurs, those files won't exist yet and
 * won't be deleted. This is a known race condition. Orphaned files can be
 * cleaned up with a periodic maintenance job if needed.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Environment variables
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
const R2_BUCKET_NAME = 'habitex';

// S3 API endpoint for R2
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

interface CleanupRequest {
  type: 'property' | 'video-job' | 'user' | 'draft';
  user_id: string;
  entity_id?: string;
  uploaded_files?: string[];
}

/**
 * Generate AWS Signature V4 for S3 API requests
 * This is a simplified implementation for basic S3 operations
 */
async function signRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  payloadHash: string,
  queryString: string = '' // Add query string parameter
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  
  // Add required headers
  headers['x-amz-date'] = amzDate;
  headers['x-amz-content-sha256'] = payloadHash;
  headers['host'] = new URL(R2_ENDPOINT).host;

  // Create canonical request
  const signedHeaders = Object.keys(headers)
    .map(k => k.toLowerCase())
    .sort()
    .join(';');
  
  const canonicalHeaders = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join('\n') + '\n';

  // Sort query string parameters for canonical request
  const canonicalQueryString = queryString
    .split('&')
    .filter(p => p)
    .sort()
    .join('&');

  const canonicalRequest = [
    method,
    path,
    canonicalQueryString, // Include sorted query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const encoder = new TextEncoder();
  const canonicalRequestHash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(canonicalRequest)
  );
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHashHex,
  ].join('\n');

  // Calculate signature
  async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  }

  const kDate = await hmacSha256(encoder.encode('AWS4' + R2_SECRET_ACCESS_KEY), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256(kSigning, stringToSign);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Build authorization header
  headers['Authorization'] = [
    `${algorithm} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signatureHex}`,
  ].join(', ');

  return headers;
}

/**
 * List all objects with a given prefix
 */
async function listObjects(prefix: string): Promise<string[]> {
  const path = `/${R2_BUCKET_NAME}`;
  const queryString = `list-type=2&prefix=${encodeURIComponent(prefix)}`;
  
  const headers: Record<string, string> = {};
  const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA256 of empty string
  
  // Pass query string to signRequest for proper signature
  const signedHeaders = await signRequest('GET', path, headers, payloadHash, queryString);
  
  const response = await fetch(`${R2_ENDPOINT}${path}?${queryString}`, {
    method: 'GET',
    headers: signedHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('List objects error:', response.status, errorText);
    throw new Error(`Failed to list objects: ${response.status}`);
  }

  const text = await response.text();
  
  // Parse XML response to extract keys
  const keys: string[] = [];
  const keyMatches = text.matchAll(/<Key>([^<]+)<\/Key>/g);
  for (const match of keyMatches) {
    keys.push(match[1]);
  }
  
  return keys;
}

/**
 * Delete a single object from R2
 */
async function deleteObject(key: string): Promise<boolean> {
  const path = `/${R2_BUCKET_NAME}/${key}`;
  
  const headers: Record<string, string> = {};
  const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA256 of empty string
  
  const signedHeaders = await signRequest('DELETE', path, headers, payloadHash);
  
  const response = await fetch(`${R2_ENDPOINT}${path}`, {
    method: 'DELETE',
    headers: signedHeaders,
  });

  if (!response.ok && response.status !== 404) {
    console.error('Delete object error:', key, response.status);
    return false;
  }

  return true;
}

/**
 * Delete all objects with a given prefix (folder deletion)
 */
async function deleteFolder(prefix: string): Promise<{ deleted: number; failed: number }> {
  console.log(`Deleting folder: ${prefix}`);
  
  let deleted = 0;
  let failed = 0;
  
  try {
    const keys = await listObjects(prefix);
    console.log(`Found ${keys.length} objects to delete`);
    
    // Delete objects in parallel (batch of 10)
    for (let i = 0; i < keys.length; i += 10) {
      const batch = keys.slice(i, i + 10);
      const results = await Promise.all(batch.map(key => deleteObject(key)));
      
      for (const success of results) {
        if (success) {
          deleted++;
        } else {
          failed++;
        }
      }
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
  }
  
  return { deleted, failed };
}

/**
 * Delete specific files (for draft cleanup)
 */
async function deleteFiles(files: string[]): Promise<{ deleted: number; failed: number }> {
  console.log(`Deleting ${files.length} specific files`);
  
  let deleted = 0;
  let failed = 0;
  
  // Delete files in parallel (batch of 10)
  for (let i = 0; i < files.length; i += 10) {
    const batch = files.slice(i, i + 10);
    const results = await Promise.all(batch.map(file => deleteObject(file)));
    
    for (const success of results) {
      if (success) {
        deleted++;
      } else {
        failed++;
      }
    }
  }
  
  return { deleted, failed };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check configuration
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('Missing R2 configuration');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify this is an internal call (from database trigger with service role key)
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Extract bearer token from header
    const token = authHeader?.replace('Bearer ', '').trim();
    
    // Require service role key for all calls - this is a sensitive internal endpoint
    if (!token || token !== serviceRoleKey) {
      console.error('Unauthorized: Invalid or missing service role key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - service role key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CleanupRequest = await req.json();

    if (!body.type || !body.user_id) {
      return new Response(
        JSON.stringify({ error: 'type and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: { deleted: number; failed: number };
    let pathToDelete: string;

    switch (body.type) {
      case 'property':
        if (!body.entity_id) {
          return new Response(
            JSON.stringify({ error: 'entity_id is required for property cleanup' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        pathToDelete = `users/${body.user_id}/properties/${body.entity_id}/`;
        result = await deleteFolder(pathToDelete);
        break;

      case 'video-job':
        if (!body.entity_id) {
          return new Response(
            JSON.stringify({ error: 'entity_id is required for video-job cleanup' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        pathToDelete = `users/${body.user_id}/ai-jobs/${body.entity_id}/`;
        result = await deleteFolder(pathToDelete);
        break;

      case 'user':
        pathToDelete = `users/${body.user_id}/`;
        result = await deleteFolder(pathToDelete);
        break;

      case 'draft':
        if (!body.uploaded_files || body.uploaded_files.length === 0) {
          return new Response(
            JSON.stringify({ success: true, deleted: 0, failed: 0, message: 'No files to delete' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await deleteFiles(body.uploaded_files);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid cleanup type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Cleanup complete for ${body.type}: deleted ${result.deleted}, failed ${result.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        type: body.type,
        deleted: result.deleted,
        failed: result.failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Storage cleanup error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
