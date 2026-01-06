/**
 * Storage Maintenance Edge Function
 * 
 * Periodic cleanup job to delete orphaned files in R2 storage.
 * This handles files that were created by async media processing (ffmpeg)
 * after the parent entity was already deleted.
 * 
 * Run via cron (e.g., daily) or manually when needed.
 * 
 * Security: Requires service role key authentication.
 * 
 * GET /storage-maintenance?dry_run=true  - Preview what would be deleted
 * POST /storage-maintenance              - Actually delete orphaned files
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Environment variables
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
const R2_BUCKET_NAME = 'habitex';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

interface OrphanedFolder {
  path: string;
  type: 'property' | 'ai-job' | 'user';
  userId: string;
  entityId?: string;
}

interface MaintenanceResult {
  scanned: number;
  orphaned: OrphanedFolder[];
  deleted: number;
  failed: number;
  dryRun: boolean;
}

/**
 * Generate AWS Signature V4 for S3 API requests
 */
async function signRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  payloadHash: string,
  queryString: string = ''
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  
  headers['x-amz-date'] = amzDate;
  headers['x-amz-content-sha256'] = payloadHash;
  headers['host'] = new URL(R2_ENDPOINT).host;

  const signedHeaders = Object.keys(headers)
    .map(k => k.toLowerCase())
    .sort()
    .join(';');

  const canonicalHeaders = Object.keys(headers)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join('\n') + '\n';

  // Sort query string parameters for canonical request
  const sortedQueryString = queryString
    .split('&')
    .filter(p => p.length > 0)
    .sort()
    .join('&');

  const canonicalRequest = [
    method,
    path,
    sortedQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const encoder = new TextEncoder();
  const canonicalRequestHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest)))
  ).map(b => b.toString(16).padStart(2, '0')).join('');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
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
  const signature = Array.from(
    new Uint8Array(await hmacSha256(kSigning, stringToSign))
  ).map(b => b.toString(16).padStart(2, '0')).join('');

  headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return headers;
}

/**
 * List all objects with a given prefix
 */
async function listObjects(prefix: string, delimiter?: string): Promise<{ keys: string[]; prefixes: string[] }> {
  const path = `/${R2_BUCKET_NAME}`;
  let queryString = `list-type=2&prefix=${encodeURIComponent(prefix)}`;
  if (delimiter) {
    queryString += `&delimiter=${encodeURIComponent(delimiter)}`;
  }
  
  const headers: Record<string, string> = {};
  const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  
  const signedHeaders = await signRequest('GET', path, headers, payloadHash, queryString);
  
  const response = await fetch(`${R2_ENDPOINT}${path}?${queryString}`, {
    method: 'GET',
    headers: signedHeaders,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('List objects error:', response.status, text);
    return { keys: [], prefixes: [] };
  }

  const xml = await response.text();
  
  // Parse keys (files)
  const keys: string[] = [];
  const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
  for (const match of keyMatches) {
    keys.push(match[1]);
  }
  
  // Parse common prefixes (folders when using delimiter)
  const prefixes: string[] = [];
  const prefixMatches = xml.matchAll(/<Prefix>([^<]+)<\/Prefix>/g);
  for (const match of prefixMatches) {
    // Skip the search prefix itself
    if (match[1] !== prefix) {
      prefixes.push(match[1]);
    }
  }

  return { keys, prefixes };
}

/**
 * Delete a single object
 */
async function deleteObject(key: string): Promise<boolean> {
  const path = `/${R2_BUCKET_NAME}/${key}`;
  
  const headers: Record<string, string> = {};
  const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  
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
 * Delete all objects with a given prefix
 */
async function deleteFolder(prefix: string): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;
  
  const { keys } = await listObjects(prefix);
  
  for (let i = 0; i < keys.length; i += 10) {
    const batch = keys.slice(i, i + 10);
    const results = await Promise.all(batch.map(key => deleteObject(key)));
    
    for (const success of results) {
      if (success) deleted++;
      else failed++;
    }
  }

  return { deleted, failed };
}

/**
 * Get all valid property IDs for a user
 */
async function getValidPropertyIds(supabase: ReturnType<typeof createClient>, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching properties:', error);
    return new Set();
  }
  
  return new Set(data?.map(p => p.id) || []);
}

/**
 * Get all valid AI job IDs for a user
 */
async function getValidAIJobIds(supabase: ReturnType<typeof createClient>, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('video_generation_jobs')
    .select('id')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching AI jobs:', error);
    return new Set();
  }
  
  return new Set(data?.map(j => j.id) || []);
}

/**
 * Get all valid user IDs
 */
async function getValidUserIds(supabase: ReturnType<typeof createClient>): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return new Set();
  }
  
  return new Set(data?.map(p => p.id) || []);
}

/**
 * Scan for orphaned folders
 */
async function findOrphanedFolders(supabase: ReturnType<typeof createClient>): Promise<OrphanedFolder[]> {
  const orphaned: OrphanedFolder[] = [];
  
  // Get all user folders
  const { prefixes: userFolders } = await listObjects('users/', '/');
  console.log(`Found ${userFolders.length} user folders`);
  
  // Get valid user IDs
  const validUsers = await getValidUserIds(supabase);
  console.log(`Found ${validUsers.size} valid users in database`);
  
  for (const userFolder of userFolders) {
    // Extract user ID from path like "users/uuid/"
    const userId = userFolder.replace('users/', '').replace('/', '');
    
    if (!validUsers.has(userId)) {
      // Entire user folder is orphaned
      orphaned.push({
        path: userFolder,
        type: 'user',
        userId,
      });
      continue;
    }
    
    // Check properties folder
    const { prefixes: propertyFolders } = await listObjects(`users/${userId}/properties/`, '/');
    const validProperties = await getValidPropertyIds(supabase, userId);
    
    for (const propFolder of propertyFolders) {
      const propertyId = propFolder.split('/').filter(Boolean).pop()!;
      
      if (!validProperties.has(propertyId)) {
        orphaned.push({
          path: propFolder,
          type: 'property',
          userId,
          entityId: propertyId,
        });
      }
    }
    
    // Check AI jobs folder
    const { prefixes: aiJobFolders } = await listObjects(`users/${userId}/ai-jobs/`, '/');
    const validAIJobs = await getValidAIJobIds(supabase, userId);
    
    for (const jobFolder of aiJobFolders) {
      const jobId = jobFolder.split('/').filter(Boolean).pop()!;
      
      if (!validAIJobs.has(jobId)) {
        orphaned.push({
          path: jobFolder,
          type: 'ai-job',
          userId,
          entityId: jobId,
        });
      }
    }
  }
  
  return orphaned;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check configuration
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('Missing R2 configuration');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify service role key
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  
  if (!token || token !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - service role key required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const dryRun = req.method === 'GET' || url.searchParams.get('dry_run') === 'true';
    
    console.log(`Starting storage maintenance (dry_run=${dryRun})`);
    
    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Find orphaned folders
    const orphaned = await findOrphanedFolders(supabase);
    console.log(`Found ${orphaned.length} orphaned folders`);
    
    const result: MaintenanceResult = {
      scanned: orphaned.length,
      orphaned,
      deleted: 0,
      failed: 0,
      dryRun,
    };
    
    // Delete orphaned folders if not dry run
    if (!dryRun && orphaned.length > 0) {
      for (const folder of orphaned) {
        console.log(`Deleting orphaned ${folder.type}: ${folder.path}`);
        const { deleted, failed } = await deleteFolder(folder.path);
        result.deleted += deleted;
        result.failed += failed;
      }
    }
    
    console.log(`Maintenance complete: deleted=${result.deleted}, failed=${result.failed}`);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Maintenance error:', error);
    return new Response(
      JSON.stringify({ error: 'Maintenance failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
