# 🚀 Complete Platform Migration Plan

**Created: January 5, 2026**  
**Last Updated: January 6, 2026**  
**Status: ✅ COMPLETE - All Phases Done**

---

## 📋 Executive Summary

This document outlines a complete infrastructure migration for the Habitex real estate platform:

1. **Storage Migration**: Supabase Storage → Cloudflare R2 ✅
2. **API Migration**: Vercel Serverless Functions → Supabase Edge Functions ✅
3. **Database Reset**: Complete wipe and schema redesign ✅
4. **Media Pipeline**: Automated thumbnail/preview generation for all uploads ✅
5. **Security Fixes**: RLS infinite recursion fix, subscription enforcement ✅

### Migration Completed (January 6, 2026)

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: R2 Infrastructure | ✅ DONE | Bucket, CORS, custom domain |
| Phase 2: R2 Auth Worker | ✅ DONE | JWT verification, path authorization |
| Phase 3: Media Processing | ✅ DONE | Image variants, video thumbnails |
| Phase 4: Database Schema | ✅ DONE | Triggers, cleanup functions |
| Phase 5: Edge Functions | ✅ DONE | Deployed with `--no-verify-jwt` |
| Phase 6: Frontend Rewrite | ✅ DONE | R2 storage abstraction |
| Phase 7: Vercel Cleanup | ✅ DONE | Removed old API routes |
| Phase 8: Testing & Go-Live | 🔄 IN PROGRESS | End-to-end testing |

### Important Deployment Notes

**Edge Functions**: Must be deployed with `--no-verify-jwt` flag:
```bash
npx supabase functions deploy ai-prefill --no-verify-jwt
npx supabase functions deploy video-generation --no-verify-jwt
npx supabase functions deploy properties --no-verify-jwt
npx supabase functions deploy storage-maintenance --no-verify-jwt
```

This allows the functions to receive the Authorization header and handle auth internally.

### Why This Migration?

| Current Problem | Solution |
|-----------------|----------|
| Mixed storage organization (images, videos, profiles all jumbled) | User-scoped hierarchical folder structure |
| No file cleanup on entity deletion (orphaned files) | Scheduled `storage-maintenance` job via pg_cron (daily 3 AM UTC) |
| 6+ deletion gaps causing storage waste | Single maintenance job scans for all orphaned files |
| Vercel API routes scattered, inconsistent security | Centralized Supabase Edge Functions with unified auth |
| No video thumbnails (uses placeholder images) | Automated thumbnail + GIF preview generation |
| High egress costs potential | R2 zero egress fees |

### What's NOT Migrating

| Component | Reason |
|-----------|--------|
| Stripe Webhooks (`/api/stripe/webhook.ts`) | Critical payment infrastructure, proven working |
| Sitemap (`/api/sitemap.xml.ts`) | Simple read-only endpoint, will be enhanced |
| n8n Backend | External system, only needs new R2 credentials |

---

## 🏗️ New Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                         React + Vite + TypeScript                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  src/lib/r2-storage.ts                                           │   │
│  │  • uploadFile() → R2 Auth Worker                                 │   │
│  │  • deleteFile() → R2 Auth Worker                                 │   │
│  │  • getPublicUrl() → CDN URL construction                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│   CLOUDFLARE R2      │ │  SUPABASE EDGE   │ │     VERCEL (KEPT)        │
│                      │ │   FUNCTIONS      │ │                          │
│ Bucket: habitex      │ │                  │ │ /api/stripe/webhook.ts   │
│ Domain: storage.     │ │ /properties      │ │ /api/stripe/create-      │
│ manzanillo-real-     │ │ /ai-prefill      │ │   checkout.ts            │
│ estate.com           │ │ /video-generation│ │ /api/sitemap.xml.ts      │
│                      │ │ /storage-        │ │                          │
│ R2 Auth Worker ◄─────┤ │  maintenance     │ │                          │
│ Media Processing     │ └────────┬─────────┘ └──────────────────────────┘
│ Worker               │          │
└──────────┬───────────┘          │
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                                │
│                                                                          │
│  Tables: profiles, properties, video_generation_jobs, credits, etc.     │
│  Scheduled: pg_cron runs storage-maintenance daily at 3:00 AM UTC       │
│  RLS: User-scoped access policies                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              n8n BACKEND                                 │
│                                                                          │
│  Uploads to R2 via S3 API:                                              │
│  • AI-generated images → users/{uid}/ai-jobs/{jid}/generated/           │
│  • Final videos → users/{uid}/ai-jobs/{jid}/output/video.mp4            │
│  (Thumbnails auto-generated by R2 Media Processing Worker)              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 New R2 Storage Schema

### Bucket Configuration

| Setting | Value |
|---------|-------|
| Bucket Name | `habitex` |
| Custom Domain | `storage.manzanillo-real-estate.com` |
| Public Access | Yes (for serving media via CDN) |
| CORS Origins | `https://habitex.mx`, `http://localhost:*` |

### Folder Structure

```
habitex/
├── users/
│   └── {user_id}/                          # UUID
│       │
│       ├── profile/
│       │   ├── avatar.jpg                  # 512x512, overwritten on update
│       │   └── cover.jpg                   # 1920x1080 (16:9), overwritten
│       │
│       ├── properties/
│       │   └── {property_id}/              # UUID
│       │       ├── images/
│       │       │   ├── 001.jpg             # Original upload
│       │       │   ├── 001.medium.jpg      # 800x600 max
│       │       │   ├── 001.thumb.jpg       # 160x160 crop
│       │       │   ├── 002.jpg
│       │       │   ├── 002.medium.jpg
│       │       │   ├── 002.thumb.jpg
│       │       │   └── ...                 # Up to 50 images
│       │       │
│       │       └── videos/
│       │           ├── 001.mp4             # Original video
│       │           ├── 001.thumb.jpg       # Thumbnail (480x270)
│       │           ├── 001.preview.gif     # 3-second animated preview
│       │           └── ...                 # Up to 3 videos
│       │
│       └── ai-jobs/
│           └── {job_id}/                   # UUID
│               ├── inputs/                 # Copies of selected property images
│               │   ├── 001.jpg
│               │   ├── 002.jpg
│               │   └── 003.jpg
│               │
│               ├── generated/              # AI-generated images (from n8n)
│               │   ├── 001.png
│               │   ├── 001.thumb.jpg       # Auto-generated thumbnail
│               │   ├── 002.png
│               │   ├── 002.thumb.jpg
│               │   ├── 003.png
│               │   └── 003.thumb.jpg
│               │
│               └── output/                 # Final video (from n8n)
│                   ├── video.mp4
│                   ├── video.thumb.jpg     # Auto-generated thumbnail
│                   └── video.preview.gif   # Auto-generated 3s preview
```

### File Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Property images | `{seq:3}.{ext}` | `001.jpg`, `002.png` |
| Image medium variant | `{seq:3}.medium.{ext}` | `001.medium.jpg` |
| Image thumbnail | `{seq:3}.thumb.jpg` | `001.thumb.jpg` |
| Property videos | `{seq:3}.{ext}` | `001.mp4` |
| Video thumbnail | `{seq:3}.thumb.jpg` | `001.thumb.jpg` |
| Video GIF preview | `{seq:3}.preview.gif` | `001.preview.gif` |
| Profile avatar | `avatar.{ext}` | `avatar.jpg` (overwrites) |
| Profile cover | `cover.{ext}` | `cover.jpg` (overwrites) |
| AI job video | `video.mp4` | Fixed name |

### Storage Limits

| Resource | Limit | Size Estimate |
|----------|-------|---------------|
| Images per property | 50 max | ~65MB with variants |
| Videos per property | 3 max | ~81MB with assets |
| Image file size | 5MB max | - |
| Video file size | 50MB max | - |
| Profile avatar | 512x512 | ~50KB |
| Profile cover | 1920x1080 | ~300KB |

### Image Variants Generated

| Variant | Max Dimensions | Format | Use Case |
|---------|----------------|--------|----------|
| Original | As uploaded (up to 5MB) | Original | Download, lightbox |
| Medium | 800x600 | JPEG 80% | Cards, previews |
| Thumbnail | 160x160 (crop) | JPEG 80% | Grids, lists |

### Video Assets Generated

| Asset | Dimensions | Format | Use Case |
|-------|------------|--------|----------|
| Thumbnail | 480x270 | JPEG | Poster image, cards |
| Preview GIF | 480x270 | GIF (3 sec) | Hover preview |

---

## 🔐 Security Model

### R2 Auth Worker

The Worker validates all write operations (PUT/DELETE):

```typescript
// Pseudocode for R2 Auth Worker
async function handleRequest(request: Request, env: Env) {
  // 1. Extract JWT from Authorization header
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  // 2. Verify Supabase JWT
  const user = await verifySupabaseJWT(token, env.SUPABASE_JWT_SECRET);
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  // 3. Extract path and validate user owns it
  const url = new URL(request.url);
  const path = url.pathname.slice(1); // Remove leading /
  
  // Path must start with users/{user.id}/
  if (!path.startsWith(`users/${user.id}/`)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // 4. Handle operation
  if (request.method === 'PUT') {
    await env.HABITEX_BUCKET.put(path, request.body, {
      httpMetadata: { contentType: request.headers.get('Content-Type') }
    });
    return new Response('OK');
  }
  
  if (request.method === 'DELETE') {
    await env.HABITEX_BUCKET.delete(path);
    return new Response('OK');
  }
  
  // GET requests go directly to public bucket URL
}
```

### n8n Access (S3 API)

n8n uses S3-compatible API with dedicated credentials:

| Setting | Value |
|---------|-------|
| Endpoint | `https://{account_id}.r2.cloudflarestorage.com` |
| Access Key ID | Generated in R2 dashboard |
| Secret Access Key | Generated in R2 dashboard |
| Bucket | `habitex` |
| Region | `auto` |

n8n should upload to paths matching the schema:
- AI images: `users/{user_id}/ai-jobs/{job_id}/generated/001.png`
- Final video: `users/{user_id}/ai-jobs/{job_id}/output/video.mp4`

---

## 🎬 Media Processing Pipeline

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   File Upload   │────▶│  R2 Event       │────▶│  Cloudflare     │
│   (R2 Bucket)   │     │  Notification   │     │  Queue          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Media Processing Worker                     │
│                                                                  │
│  Images:                       Videos:                           │
│  ┌───────────────────┐        ┌───────────────────────────────┐ │
│  │ Cloudflare Images │        │   FFmpeg Container (Lite)     │ │
│  │ API (5,000/mo     │        │   • 256 MiB RAM               │ │
│  │ free transforms)  │        │   • 2 GB disk                 │ │
│  │                   │        │   • Scales to zero            │ │
│  │ • medium.jpg      │        │                               │ │
│  │ • thumb.jpg       │        │   • Extract thumbnail         │ │
│  └───────────────────┘        │   • Generate 3s GIF preview   │ │
│                               │                               │ │
│                               │ 375 vCPU-min/mo free          │ │
│                               │ ≈ 4,500 videos/mo             │ │
│                               └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  Upload variants │
                               │  back to R2      │
                               └─────────────────┘
```

### Video Processing with Cloudflare Containers

Video thumbnail and GIF generation uses **Cloudflare Containers** with FFmpeg. This is included in the Workers Paid plan ($5/month) with generous free tier:

| Resource | Included Free | Estimated Usage |
|----------|---------------|-----------------|
| vCPU time | 375 minutes/month | ~5 sec/video = 4,500 videos |
| Memory hours | 25 GiB-hours/month | 256 MiB × 100 hrs |
| Disk hours | 200 GB-hours/month | 2 GB × 100 hrs |
| Container starts | Unlimited | Scales to zero when idle |

#### Container Workflow

1. Media Worker receives R2 event notification for new video upload
2. Worker invokes FFmpeg Container via service binding
3. Container downloads video from R2, extracts frame at 2s, generates 3s GIF
4. Container uploads `.thumb.jpg` and `.preview.gif` back to R2
5. Container automatically scales to zero when idle

#### Container Configuration

```
containers/
└── ffmpeg-processor/
    ├── Dockerfile          # Alpine + FFmpeg
    ├── wrangler.toml       # Container config
    └── src/
        └── index.ts        # HTTP API for processing
```

### Processing Rules

| File Pattern | Action |
|--------------|--------|
| `users/*/properties/*/images/*.{jpg,png,webp}` | Generate medium + thumbnail variants |
| `users/*/properties/*/videos/*.{mp4,mov,webm}` | Generate thumbnail + 3s GIF preview |
| `users/*/ai-jobs/*/generated/*.{png,jpg}` | Generate thumbnail |
| `users/*/ai-jobs/*/output/video.mp4` | Generate thumbnail + 3s GIF preview |
| `users/*/profile/avatar.*` | Resize to 512x512 (overwrite original) |
| `users/*/profile/cover.*` | Resize to 1920x1080 (overwrite original) |
| Files ending in `.thumb.*`, `.medium.*`, `.preview.*` | SKIP (already processed) |

### Media Worker Pseudocode

```typescript
export default {
  async queue(batch: MessageBatch<R2EventMessage>, env: Env) {
    for (const message of batch.messages) {
      const { key, action } = message.body;
      
      // Skip if already a variant
      if (key.includes('.thumb.') || key.includes('.medium.') || key.includes('.preview.')) {
        message.ack();
        continue;
      }
      
      // Skip delete events
      if (action === 'DeleteObject') {
        message.ack();
        continue;
      }
      
      // Determine file type and process
      if (isImage(key)) {
        await processImage(key, env);
      } else if (isVideo(key)) {
        await processVideo(key, env);
      }
      
      message.ack();
    }
  }
};

async function processImage(key: string, env: Env) {
  const object = await env.HABITEX_BUCKET.get(key);
  const buffer = await object.arrayBuffer();
  
  // Generate medium (800x600 max)
  const medium = await resizeImage(buffer, 800, 600);
  await env.HABITEX_BUCKET.put(key.replace(/\.[^.]+$/, '.medium.jpg'), medium);
  
  // Generate thumbnail (160x160 crop)
  const thumb = await cropImage(buffer, 160, 160);
  await env.HABITEX_BUCKET.put(key.replace(/\.[^.]+$/, '.thumb.jpg'), thumb);
}

async function processVideo(key: string, env: Env) {
  // Call FFmpeg Container via service binding
  const response = await env.FFMPEG_CONTAINER.fetch(new Request('http://container/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket: 'habitex',
      key: key,
      operations: ['thumbnail', 'gif']
    })
  }));
  
  if (!response.ok) {
    throw new Error(`Video processing failed: ${response.status}`);
  }
  
  // Container handles:
  // 1. Download video from R2
  // 2. Extract thumbnail at 2 second mark → {key}.thumb.jpg
  // 3. Generate 3-second GIF preview → {key}.preview.gif
  // 4. Upload both back to R2
}
```

---

## 🗄️ Database Schema Changes

### Complete Reset

All existing data will be deleted. New schema focuses on:
1. Proper file tracking for cleanup
2. Simplified structure
3. Better RLS policies

### Updated Tables

#### `properties` (Updated)

```sql
-- Add file count tracking and update video handling
ALTER TABLE properties ADD COLUMN image_count INT DEFAULT 0;
ALTER TABLE properties ADD COLUMN video_count INT DEFAULT 0;

-- images[] and videos[] store just the sequence numbers, not full URLs
-- Example: images = ['001', '002', '003']
-- Full URL constructed as: {CDN_URL}/users/{user_id}/properties/{id}/images/{seq}.jpg
```

#### `property_drafts` (Updated)

```sql
-- Track uploaded files for cleanup when draft abandoned
ALTER TABLE property_drafts ADD COLUMN uploaded_files TEXT[] DEFAULT '{}';
```

### Scheduled Cleanup (Replaces Triggers)

Instead of on-delete triggers, cleanup is handled by a scheduled job:

```sql
-- Function to invoke the storage-maintenance Edge Function
CREATE OR REPLACE FUNCTION run_storage_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key TEXT;
BEGIN
  -- Get service role key from vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key';
  
  -- Call the Edge Function
  PERFORM net.http_post(
    url := 'https://vvvscafjvisaswpqhnvy.supabase.co/functions/v1/storage-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'storage-maintenance-daily',
  '0 3 * * *',
  'SELECT run_storage_maintenance()'
);
```

**Benefits over triggers:**
- No race conditions with async media processing (ffmpeg)
- Handles all orphaned files (properties, AI jobs, users) in one sweep
- Simpler architecture - no pg_net calls from triggers
- More reliable - can be manually invoked if needed
- Better observability - logs in Edge Function dashboard

---

## 🔌 Supabase Edge Functions

### Function Consolidation

| Old Vercel Routes | New Edge Function | Purpose |
|-------------------|-------------------|---------|
| `/api/properties.ts` | `properties` | List/filter properties |
| `/api/prefill-property.ts` | `ai-prefill` | AI property form prefill |
| `/api/process-draft-prefill.ts` | `ai-prefill` | (merged) Background processing |
| `/api/video/generate-images.ts` | `video-generation` | Unified video pipeline |
| `/api/video/approve-images.ts` | `video-generation` | (merged) |
| `/api/video/approve-script.ts` | `video-generation` | (merged) |
| (new) | `storage-maintenance` | Scheduled R2 orphan cleanup (daily via pg_cron) |

### Edge Function: `properties`

```typescript
// supabase/functions/properties/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams)
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )
  
  // Build query with filters
  let query = supabase
    .from('properties')
    .select(`
      *,
      profiles!inner(username, full_name, profile_image, whatsapp_number)
    `)
    .eq('status', 'active')
  
  // Apply filters from params
  if (params.featured === 'true') query = query.eq('is_featured', true)
  if (params.type) query = query.eq('property_type', params.type)
  if (params.city) query = query.eq('location_city', params.city)
  // ... more filters
  
  const { data, error } = await query.limit(parseInt(params.limit) || 50)
  
  return new Response(JSON.stringify({ data, error }), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
    }
  })
})
```

### Edge Function: `ai-prefill`

```typescript
// supabase/functions/ai-prefill/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Verify authentication
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const body = await req.json()
  const { action, draft_id, text } = body
  
  if (action === 'start') {
    // Deduct 2 credits
    const { error: creditError } = await supabase.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: 2,
      p_product: 'IA Autocompletado'
    })
    
    if (creditError) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), { status: 402 })
    }
    
    // Call n8n webhook for AI processing
    const n8nResponse = await fetch(Deno.env.get('N8N_PREFILL_WEBHOOK')!, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('N8N_WEBHOOK_AUTH')}`
      },
      body: JSON.stringify({ draft_id, text, user_id: user.id })
    })
    
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  }
  
  return new Response('Invalid action', { status: 400 })
})
```

### Edge Function: `video-generation`

Unified endpoint for all video generation operations:

```typescript
// supabase/functions/video-generation/index.ts
serve(async (req) => {
  const { action, ...params } = await req.json()
  
  switch (action) {
    case 'generate-images':
      // Deduct 5 credits
      // Create job record
      // Call n8n webhook
      // Return job_id
      
    case 'approve-images':
      // Deduct 1 credit for script generation
      // Update job status
      // Call n8n webhook
      
    case 'approve-script':
      // Deduct 30 credits for video generation
      // Update job with edited script
      // Call n8n webhook
      
    case 'regenerate':
      // Delete old job files from R2
      // Deduct 5 credits
      // Create new job
      // Call n8n webhook
      
    default:
      return new Response('Invalid action', { status: 400 })
  }
})
```

### Edge Function: `storage-maintenance`

Scheduled cleanup job that runs daily to delete orphaned R2 files. This replaced the on-delete triggers for simpler, more reliable cleanup.

**Features:**
- Scans all R2 folders and compares against database records
- Finds orphaned property folders, AI job folders, and user folders
- Handles race conditions with async media processing (ffmpeg)
- Runs daily at 3:00 AM UTC via pg_cron
- Can also be invoked manually for dry-run preview

```typescript
// supabase/functions/storage-maintenance/index.ts
serve(async (req) => {
  // Verify service role key
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '').trim()
  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const dryRun = req.method === 'GET'
  
  // Scan R2 for all user/property/ai-job folders
  const orphaned = await findOrphanedFolders(supabase)
  
  // Delete if not dry run
  if (!dryRun) {
    for (const folder of orphaned) {
      await deleteFolder(folder.path)
    }
  }
  
  return new Response(JSON.stringify({ orphaned, deleted, dryRun }))
})
```

**Scheduled via pg_cron:**
```sql
SELECT cron.schedule(
  'storage-maintenance-daily',
  '0 3 * * *',  -- Daily at 3:00 AM UTC
  'SELECT run_storage_maintenance()'
);
```

---

## 🎨 Frontend Changes

### New Storage Abstraction

```typescript
// src/lib/r2-storage.ts

const R2_BASE_URL = import.meta.env.VITE_R2_STORAGE_URL; 
// https://storage.manzanillo-real-estate.com

const R2_WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;
// https://r2-auth.habitex.workers.dev

// --- Path Generators ---

export function getProfileAvatarPath(userId: string): string {
  return `users/${userId}/profile/avatar`;
}

export function getProfileCoverPath(userId: string): string {
  return `users/${userId}/profile/cover`;
}

export function getPropertyImagePath(userId: string, propertyId: string, seq: number): string {
  return `users/${userId}/properties/${propertyId}/images/${String(seq).padStart(3, '0')}`;
}

export function getPropertyVideoPath(userId: string, propertyId: string, seq: number): string {
  return `users/${userId}/properties/${propertyId}/videos/${String(seq).padStart(3, '0')}`;
}

// --- URL Generators ---

export function getPublicUrl(path: string, variant?: 'thumb' | 'medium' | 'preview'): string {
  if (variant === 'thumb') {
    return `${R2_BASE_URL}/${path}.thumb.jpg`;
  }
  if (variant === 'medium') {
    return `${R2_BASE_URL}/${path}.medium.jpg`;
  }
  if (variant === 'preview') {
    return `${R2_BASE_URL}/${path}.preview.gif`;
  }
  return `${R2_BASE_URL}/${path}`;
}

// --- Upload ---

export async function uploadFile(
  path: string,
  file: File,
  token: string
): Promise<{ success: boolean; url: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fullPath = `${path}.${ext}`;
  
  const response = await fetch(`${R2_WORKER_URL}/${fullPath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': file.type,
    },
    body: file,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  return {
    success: true,
    url: getPublicUrl(fullPath),
  };
}

// --- Delete ---

export async function deleteFile(path: string, token: string): Promise<void> {
  const response = await fetch(`${R2_WORKER_URL}/${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}

// --- Batch Delete (for property cleanup) ---

export async function deleteFolder(
  userId: string,
  folderPath: string,
  token: string
): Promise<void> {
  const response = await fetch(`${R2_WORKER_URL}/batch-delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix: `users/${userId}/${folderPath}`,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Folder delete failed: ${response.status}`);
  }
}
```

### Updated Components

#### ImageUpload.tsx Changes

```typescript
// Before: Supabase storage
const { error } = await supabase.storage
  .from('properties')
  .upload(filePath, file);

// After: R2 storage
import { uploadFile, getPropertyImagePath, deleteFile } from '@/lib/r2-storage';

const path = getPropertyImagePath(userId, propertyId, nextSequence);
const { url } = await uploadFile(path, file, session.access_token);

// On remove:
await deleteFile(imagePath, session.access_token);
```

#### VideoUpload.tsx Changes

Same pattern as ImageUpload, plus display thumbnails:

```typescript
// Display thumbnail instead of video element
<img 
  src={getPublicUrl(videoPath, 'thumb')} 
  alt="Video thumbnail"
  className="w-full h-full object-cover"
/>

// On hover, show GIF preview
<img 
  src={getPublicUrl(videoPath, 'preview')} 
  alt="Video preview"
  className="w-full h-full object-cover"
/>
```

#### PropertyDetail.tsx Changes

```typescript
// Video thumbnails - each video has its own thumbnail
const getVideoThumbnail = (videoPath: string) => {
  return getPublicUrl(videoPath, 'thumb');
};

// Video poster
<video
  src={getPublicUrl(videoPath)}
  poster={getVideoThumbnail(videoPath)}
  ...
/>

// Thumbnail carousel - use actual thumbnails
<img
  src={getVideoThumbnail(videos[index])}
  alt={`Video ${index + 1}`}
/>
```

---

## 📜 Vercel Routes (Kept)

### `/api/sitemap.xml.ts` (Enhanced)

Ensure sitemap captures ALL content:

```typescript
// Enhanced sitemap generation
export default async function handler(req, res) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Get all active properties
  const { data: properties } = await supabase
    .from('properties')
    .select('slug, updated_at, user_id, profiles!inner(username)')
    .eq('status', 'active');
  
  // Get all visible agent profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .eq('is_visible', true);
  
  const urls = [
    // Static pages
    { loc: 'https://habitex.mx/', priority: '1.0', changefreq: 'daily' },
    { loc: 'https://habitex.mx/properties', priority: '0.9', changefreq: 'daily' },
    
    // Agent profiles
    ...profiles.map(p => ({
      loc: `https://habitex.mx/${p.username}`,
      lastmod: p.updated_at,
      priority: '0.8',
      changefreq: 'weekly'
    })),
    
    // Properties
    ...properties.map(p => ({
      loc: `https://habitex.mx/property/${p.slug}`,
      lastmod: p.updated_at,
      priority: '0.7',
      changefreq: 'weekly'
    })),
  ];
  
  // Generate XML...
}
```

### `/api/stripe/webhook.ts` (Unchanged)

Keep as-is. Already handles:
- Subscription lifecycle
- Credit purchases
- Payment failures

### `/api/stripe/create-checkout.ts` (Unchanged)

Keep as-is.

---

## 🚀 n8n Configuration

### New R2 Credentials

Configure S3-compatible storage in n8n:

| Field | Value |
|-------|-------|
| Type | S3 Compatible |
| Endpoint | `https://{account_id}.r2.cloudflarestorage.com` |
| Access Key ID | *(from R2 dashboard)* |
| Secret Access Key | *(from R2 dashboard)* |
| Bucket | `habitex` |
| Region | `auto` |

### Upload Paths

n8n should upload to these paths (passed via webhook payload):

| Asset | Path Pattern |
|-------|--------------|
| AI-generated image 1 | `users/{user_id}/ai-jobs/{job_id}/generated/001.png` |
| AI-generated image 2 | `users/{user_id}/ai-jobs/{job_id}/generated/002.png` |
| AI-generated image 3 | `users/{user_id}/ai-jobs/{job_id}/generated/003.png` |
| Final video | `users/{user_id}/ai-jobs/{job_id}/output/video.mp4` |

**Note**: Thumbnails and GIF previews are auto-generated by the Media Processing Worker (using FFmpeg Container) after upload. n8n does not need to generate them.

### Updated Webhook Payloads

The Edge Functions will send these payloads to n8n:

```json
// generate-images webhook payload
{
  "job_id": "uuid",
  "user_id": "uuid",
  "property_id": "uuid",
  "selected_images": [
    "https://storage.manzanillo-real-estate.com/users/.../images/001.jpg",
    "https://storage.manzanillo-real-estate.com/users/.../images/002.jpg",
    "https://storage.manzanillo-real-estate.com/users/.../images/003.jpg"
  ],
  "notes": "Optional user notes",
  "output_paths": {
    "image_1": "users/{user_id}/ai-jobs/{job_id}/generated/001.png",
    "image_2": "users/{user_id}/ai-jobs/{job_id}/generated/002.png",
    "image_3": "users/{user_id}/ai-jobs/{job_id}/generated/003.png"
  },
  "callback_url": "https://{project}.supabase.co/functions/v1/video-generation-callback"
}
```

---

## ✅ Testing Checklist

### Phase 1: R2 Infrastructure
- [x] Bucket created and accessible (habitex, WNAM region)
- [x] Custom domain configured and SSL working
- [x] CORS allows frontend origins
- [x] S3 API credentials work with test upload

### Phase 2: R2 Auth Worker
- [x] Valid JWT allows upload
- [x] Invalid JWT rejected
- [x] User can only access own paths
- [x] Delete operations work

### Phase 3: Media Processing
- [x] Image upload triggers variant generation
- [x] FFmpeg Container deployed and working
- [x] Video upload triggers thumbnail + GIF generation
- [x] Processing completes within 30 seconds
- [x] Variants accessible via public URL

### Phase 4: Database
- [x] Schema migration successful (5 migrations applied)
- [x] RLS policies working (existing policies preserved)
- [x] Scheduled cleanup via pg_cron (runs daily at 3:00 AM UTC)
- [x] On-delete triggers removed (replaced by scheduled maintenance)

### Phase 5: Edge Functions
- [x] `properties` function created with filtering
- [x] `ai-prefill` deducts credits and calls n8n
- [x] `video-generation` handles all actions (generate-images, approve-images, approve-script)
- [x] `storage-maintenance` scans for orphaned R2 files and deletes them
- [x] Functions deployed to Supabase with `--no-verify-jwt`
- [x] Secrets configured in Supabase (R2 credentials, vault)
- [x] Functions tested with live requests

### Phase 6: Frontend
- [x] Image upload works
- [x] Video upload works with thumbnail preview
- [x] Profile image upload works
- [x] File deletion works
- [x] All media displays correctly

### Phase 7: Vercel
- [x] Sitemap includes all content (profiles + properties)
- [x] Stripe webhooks preserved (webhook.ts, create-checkout.ts)
- [x] Old routes removed (properties, prefill, video/*)

### Phase 8: Integration
- [ ] n8n uploads to correct paths
- [ ] AI video generation flow complete
- [ ] Credits deducted correctly
- [ ] Entity deletion cleans up files

---

## 📅 Phases

### Phase 1: R2 Infrastructure Setup ✅ COMPLETED
**Duration**: 1-2 hours  
**Dependencies**: None  
**Completed**: January 5, 2026

1. ✅ Create Cloudflare account (if needed)
2. ✅ Enable R2 in Cloudflare dashboard
3. ✅ Create `habitex` bucket (WNAM region, Standard storage class)
4. ⏳ Add custom domain `storage.manzanillo-real-estate.com` (manual step in dashboard)
5. ✅ Configure CORS policy (see `cloudflare/r2-cors-config.json`)
6. ⏳ Generate S3 API credentials for n8n (manual step in dashboard)
7. ⏳ Test with manual upload via S3 CLI or dashboard

**Files Created:**
- `cloudflare/r2-cors-config.json` - CORS configuration to apply
- `cloudflare/README.md` - Setup instructions
- `src/lib/r2-storage.ts` - Frontend storage abstraction
- `.env.example` - Environment variables template
- `.env.local.example` - Local development template

---

### Phase 2: R2 Auth Worker ✅ COMPLETED
**Duration**: 2-3 hours  
**Dependencies**: Phase 1  
**Completed**: January 5, 2026

1. ✅ Create Cloudflare Worker project
2. ✅ Implement JWT verification using Supabase JWT secret (using `jose` library)
3. ✅ Implement path-based authorization (`users/{user_id}/*` pattern)
4. ✅ Handle PUT (upload), DELETE, batch-delete, and list operations
5. ✅ Deploy worker
6. ✅ Add environment variables via `wrangler secret put SUPABASE_JWT_SECRET`
7. ⏳ Test upload/delete with valid and invalid tokens

**Deployed URL**: `https://r2-auth.atcraft-cloud.workers.dev`

**Worker Structure**:
```
workers/
└── r2-auth/
    ├── wrangler.toml
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts      # Full implementation with JWKS, CORS, all operations
```

**Worker Endpoints**:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/HEAD | `/{path}` | No | Read files from bucket (proxied, cached 1yr) |
| PUT | `/{path}` | JWT | Upload file to user's folder |
| DELETE | `/{path}` | JWT | Delete single file |
| POST | `/batch-delete` | JWT | Delete all files with prefix |
| POST | `/list` | JWT | List files in a folder |Se

---

### Phase 3: Media Processing Pipeline ✅ COMPLETED
**Duration**: 4-6 hours  
**Dependencies**: Phase 1  
**Completed**: January 6, 2026

1. ✅ Create Cloudflare Queue `habitex-media-processing`
2. ✅ Configure R2 Event Notification → Queue
3. ✅ Create Media Processing Worker:
   - ✅ Image resizing via FFmpeg Container
   - ✅ Video thumbnail extraction via FFmpeg Container
   - ✅ GIF generation via FFmpeg Container
4. ✅ Create FFmpeg Container for video/image processing
5. ✅ Deploy and test with sample uploads
6. ✅ Verify variants appear within 30 seconds

**Test Results (January 6, 2026):**
- Uploaded: `users/test-user/properties/test-property/images/001.jpeg`
- Generated: `001.thumb.jpg` (160x160), `001.medium.jpg` (800x600)
- Processing time: < 15 seconds

**Files Created:**
- `workers/media-processor/wrangler.toml` - Queue consumer configuration
- `workers/media-processor/package.json` - Dependencies
- `workers/media-processor/tsconfig.json` - TypeScript config
- `workers/media-processor/src/index.ts` - Main worker with queue handler
- `workers/media-processor/src/image-processor.ts` - Image resize & thumbnail generation
- `workers/media-processor/src/video-processor.ts` - Video processing (calls FFmpeg Container)
- `workers/media-processor/src/types.ts` - TypeScript type definitions

**Video Processing with Cloudflare Containers:**

Included in Workers Paid plan ($5/month):
- 375 vCPU-minutes/month free (~4,500 videos/month)
- 25 GiB-hours memory/month free
- Scales to zero when idle (no cost when not processing)

```
containers/
└── ffmpeg-processor/
    ├── Dockerfile          # Alpine + FFmpeg
    ├── wrangler.toml       # Container config
    └── src/
        └── index.ts        # HTTP API for processing
```

**Deployment Instructions:**
```bash
# 1. Create queues
wrangler queues create habitex-media-processing
wrangler queues create habitex-media-processing-dlq

# 2. Configure R2 event notification in Cloudflare Dashboard
# R2 > habitex > Settings > Event notifications > Add notification
# Queue: habitex-media-processing, Event: object-create

# 3. Deploy media-processor worker
cd workers/media-processor
npm install
npm run deploy

# 4. Deploy FFmpeg container (after creation)
cd containers/ffmpeg-processor
wrangler deploy
```

**Worker Structure**:
```
workers/
└── media-processor/
    ├── wrangler.toml
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts          # Queue consumer + HTTP endpoints
        ├── image-processor.ts # Image resizing logic
        ├── video-processor.ts # Video processing (calls FFmpeg Container)
        └── types.ts          # Type definitions

containers/
└── ffmpeg-processor/
    ├── Dockerfile            # Alpine + FFmpeg
    ├── wrangler.toml         # Container configuration
    └── src/
        └── index.ts          # HTTP API for thumbnail/GIF extraction
```

**Worker Endpoints**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/process` | Manual processing (debug) |

**Queue Consumer**:
- Receives R2 event notifications
- Auto-processes images → generates medium + thumb variants
- Auto-processes videos → generates thumb + preview.gif
- Handles profile images (avatar/cover) with auto-resize

---

### Phase 4: Database Reset & New Schema ✅ COMPLETED
**Duration**: 2-3 hours  
**Dependencies**: None (can run parallel)  
**Completed**: January 6, 2026

1. ✅ Enable `pg_net` extension (v0.19.5) for async HTTP calls from triggers
2. ✅ Apply schema updates:
   - Added `image_count` (INT DEFAULT 0) to properties
   - Added `video_count` (INT DEFAULT 0) to properties
   - Added `uploaded_files` (TEXT[] DEFAULT '{}') to property_drafts
3. ✅ Create cleanup trigger functions:
   - `get_supabase_url()` - Helper to get project URL from vault
   - `trigger_cleanup_property_files()` - Cleans up property folder on delete
   - `trigger_cleanup_video_job_files()` - Cleans up ai-jobs folder on delete
   - `trigger_cleanup_user_files()` - Cleans up entire user folder on delete
   - `trigger_cleanup_draft_files()` - Cleans up draft uploaded files on delete
4. ✅ Create cleanup triggers:
   - `on_property_delete` on properties table
   - `on_video_job_delete` on video_generation_jobs table
   - `on_user_delete` on profiles table
   - `on_draft_delete` on property_drafts table
5. ✅ Store Supabase URL in vault for trigger access

**Migrations Applied (January 6, 2026):**
- `enable_pg_net_extension` - Enable pg_net for async HTTP
- `add_file_count_columns_to_properties` - Add image_count, video_count
- `add_uploaded_files_to_property_drafts` - Add uploaded_files array
- `create_storage_cleanup_trigger_functions` - 5 helper/trigger functions
- `create_storage_cleanup_triggers` - 4 AFTER DELETE triggers

**Trigger Architecture:**
```
Entity Deletion → AFTER DELETE Trigger → pg_net.http_post() → Edge Function → R2 Cleanup
```

**Notes:**
- Triggers use `pg_net.http_post()` for async HTTP calls (non-blocking)
- All cleanup is handled by the `storage-cleanup` Edge Function (Phase 5)
- Triggers gracefully handle missing vault secrets with warnings
- Draft cleanup only fires if `uploaded_files` array is not empty

---

### Phase 5: Supabase Edge Functions ✅ COMPLETED
**Duration**: 6-8 hours  
**Dependencies**: Phase 4 ✅
**Completed**: January 6, 2026

1. ✅ Set up Supabase CLI for Edge Functions
2. ✅ Create `properties` function (public endpoint, filters by type/price/city/etc.)
3. ✅ Create `ai-prefill` function (consolidated, 2 credits)
4. ✅ Create `video-generation` function (consolidated: generate-images 5cr, approve-images 1cr, approve-script 30cr)
5. ✅ Create `storage-maintenance` function (scheduled orphan cleanup via pg_cron)
6. ✅ Create shared utilities (`_shared/cors.ts`, `_shared/supabase-client.ts`, `_shared/credits.ts`)
7. ✅ Add environment variables (R2 credentials, vault secrets)
8. ✅ Deploy all functions with `--no-verify-jwt`
9. ✅ Test each endpoint

**Files Created (January 6, 2026):**
- `supabase/functions/_shared/cors.ts` - CORS headers
- `supabase/functions/_shared/supabase-client.ts` - Supabase client utilities
- `supabase/functions/_shared/credits.ts` - Credit deduction/refund utilities
- `supabase/functions/properties/index.ts` - Public properties listing
- `supabase/functions/ai-prefill/index.ts` - AI property form prefill
- `supabase/functions/video-generation/index.ts` - Unified video generation pipeline
- `supabase/functions/storage-maintenance/index.ts` - Scheduled R2 orphan cleanup
- `supabase/functions/import_map.json` - Deno import map
- `.vscode/settings.json` - VS Code Deno settings

**Edge Functions Structure**:
```
supabase/
└── functions/
    ├── _shared/
    │   ├── cors.ts           # CORS headers
    │   ├── credits.ts        # Credit operations
    │   └── supabase-client.ts # Client factories
    ├── properties/
    │   └── index.ts          # GET - public listing
    ├── ai-prefill/
    │   └── index.ts          # POST - AI form prefill (2 credits)
    ├── video-generation/
    │   └── index.ts          # POST - unified video pipeline
    ├── storage-maintenance/
    │   └── index.ts          # GET/POST - scheduled orphan cleanup
    └── import_map.json
```

**Environment Variables (to be set in Supabase Dashboard):**
| Variable | Description |
|----------|-------------|
| `N8N_PREFILL_WEBHOOK` | n8n webhook URL for AI prefill |
| `N8N_VIDEO_WEBHOOK` | n8n webhook base URL for video generation |
| `N8N_WEBHOOK_AUTH` | Authorization header for n8n webhooks |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 S3 API access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API secret access key |

**Deployment Commands:**
```bash
# Set secrets
npx supabase secrets set N8N_PREFILL_WEBHOOK="https://n8n.atcraft.cloud/webhook/real-estate/prefill-property"
npx supabase secrets set N8N_VIDEO_WEBHOOK="https://n8n.atcraft.cloud/webhook/real-estate/generate-video"
npx supabase secrets set N8N_WEBHOOK_AUTH="Bearer your-token"
npx supabase secrets set R2_ACCOUNT_ID="your-account-id"
npx supabase secrets set R2_ACCESS_KEY_ID="your-access-key"
npx supabase secrets set R2_SECRET_ACCESS_KEY="your-secret-key"

# Deploy all functions (with --no-verify-jwt for custom auth handling)
npx supabase functions deploy properties --no-verify-jwt
npx supabase functions deploy ai-prefill --no-verify-jwt
npx supabase functions deploy video-generation --no-verify-jwt
npx supabase functions deploy storage-maintenance --no-verify-jwt
```

**Video Generation Actions:**
| Action | Credits | Description |
|--------|---------|-------------|
| `generate-images` | 5 | Start AI image generation from 3 selected images |
| `approve-images` | 1 | Approve generated images, start script generation |
| `approve-script` | 30 | Approve edited script, start video rendering |

---

### Phase 6: Frontend Rewrite ✅ COMPLETED
**Duration**: 8-10 hours  
**Dependencies**: Phase 2 ✅, Phase 3 ✅, Phase 5 ✅
**Completed**: January 6, 2026

1. ✅ `src/lib/r2-storage.ts` already created with comprehensive utilities
2. ✅ Updated `ImageUpload.tsx`:
   - Uses R2 storage via `uploadPropertyImage()`
   - Sequence-based naming (`001.jpg`, `002.jpg`, etc.)
   - Async delete on remove via `deleteFile()`
   - Upload progress bar display
3. ✅ Updated `VideoUpload.tsx`:
   - Uses R2 storage via `uploadPropertyVideo()`
   - Displays real thumbnails (`.thumb.jpg`)
   - Hover shows GIF preview (`.preview.gif`)
   - Delete cleans up video + thumb + preview
4. ✅ Updated `ProfileSettings.tsx`:
   - Uses `uploadAvatar()` from r2-storage
   - File validation with `isValidImageType()` and `validateFileSize()`
5. ✅ Updated `PropertyDetail.tsx`:
   - Uses real video thumbnails via `getVideoThumbnailUrl()` helper
   - Properly constructs R2 URLs for video posters
6. ✅ Updated `Dashboard.tsx`:
   - Removed manual storage cleanup code
   - Storage cleanup now handled by database triggers → Edge Functions
7. ✅ Updated hooks to use Edge Function URLs:
   - `prefillProperty.ts` - Uses `VITE_SUPABASE_FUNCTIONS_URL/ai-prefill`
   - `useVideoGeneration.ts` - Uses `VITE_SUPABASE_FUNCTIONS_URL/video-generation`
   - Both fall back to Vercel routes if env var not set
8. ✅ Updated `PropertyForm.tsx`:
   - Passes `userId` and `propertyId` to ImageUpload and VideoUpload
9. ✅ Added environment variables to `.env`:
   - `VITE_R2_STORAGE_URL=https://storage.manzanillo-real-estate.com`
   - `VITE_R2_WORKER_URL=https://r2-auth.atcraft-cloud.workers.dev`
   - `VITE_SUPABASE_FUNCTIONS_URL=https://vvvscafjvisaswpqhnvy.supabase.co/functions/v1`

**Key Implementation Notes:**
- Image reordering does NOT rename files - array order in database determines display order
- Sequence numbers are unique identifiers, not position indicators
- Variants (`.thumb.jpg`, `.medium.jpg`) are auto-generated by Media Processing Worker

---

### Phase 7: Vercel Cleanup & Sitemap ✅ COMPLETED
**Duration**: 2-3 hours  
**Dependencies**: Phase 5, Phase 6  
**Completed**: January 6, 2026

1. ✅ Enhanced `sitemap.xml.ts`:
   - ✅ Include all visible agent profiles (`/{username}`)
   - ✅ Include all active property pages (`/propiedad/{slug}`)
   - ✅ Added proper lastmod dates from database
   - ✅ Added changefreq (daily for home, weekly for profiles/properties)
   - ✅ Added priority (1.0 home, 0.9 listings, 0.8 featured/profiles, 0.7 regular properties)
   - ✅ Filter properties to only show those from visible agents
   - ✅ Added XML escaping for special characters in URLs
   - ✅ Added logging for monitoring sitemap generation
2. ✅ Removed old API routes:
   - ✅ Deleted `/api/properties.ts` (migrated to Edge Function)
   - ✅ Deleted `/api/prefill-property.ts` (migrated to Edge Function)
   - ✅ Deleted `/api/process-draft-prefill.ts` (migrated to Edge Function)
   - ✅ Deleted `/api/video/` folder entirely:
     - `/api/video/generate-images.ts`
     - `/api/video/approve-images.ts`
     - `/api/video/approve-script.ts`
     - `/api/video/check-job-status.ts`
3. ✅ Kept (verified working):
   - `/api/stripe/webhook.ts` - Stripe payment webhooks
   - `/api/stripe/create-checkout.ts` - Checkout session creation
   - `/api/sitemap.xml.ts` - Dynamic sitemap generation
4. ✅ Updated `vercel.json`:
   - Added explicit sitemap headers (cache 1hr, stale 2hr)
   - Removed generic `/api/(.*)` cache rule (no longer needed)
   - Kept stripe route configurations
   - Kept security headers for all routes
5. ⏳ Test sitemap output (manual verification after deploy)

**Remaining Vercel Routes:**
```
api/
├── sitemap.xml.ts     # Dynamic sitemap
└── stripe/
    ├── webhook.ts     # Stripe webhooks
    └── create-checkout.ts  # Checkout sessions
```

---

### Phase 8: Testing & Go-Live
**Duration**: 4-6 hours  
**Dependencies**: All previous phases

1. End-to-end testing:
   - [ ] Create new user account
   - [ ] Upload profile image
   - [ ] Create property with 5 images and 1 video
   - [ ] Verify thumbnails generated
   - [ ] View property on public page
   - [ ] Delete property
   - [ ] Verify files deleted from R2
2. AI video generation flow:
   - [ ] Start video generation
   - [ ] Verify n8n receives webhook
   - [ ] Mock n8n response / test with real n8n
   - [ ] Complete full flow
3. Provide n8n update instructions:
   - New R2 credentials
   - New Edge Function webhook URLs
   - New upload path patterns
4. Deploy to production
5. Monitor for errors

---

## 📝 Environment Variables Summary

### Cloudflare (Workers)

| Variable | Description |
|----------|-------------|
| `SUPABASE_JWT_SECRET` | For verifying user tokens |
| `HABITEX_BUCKET` | R2 bucket binding |
| `FFMPEG_CONTAINER` | Service binding to FFmpeg Container |
| `MEDIA_QUEUE` | Queue binding for processing |

### Cloudflare (FFmpeg Container)

| Variable | Description |
|----------|-------------|
| `HABITEX_BUCKET` | R2 bucket binding for reading/writing media |

### Supabase (Edge Functions)

| Variable | Description |
|----------|-------------|
| `N8N_PREFILL_WEBHOOK` | n8n webhook for AI prefill |
| `N8N_VIDEO_WEBHOOK` | n8n webhook for video generation |
| `N8N_WEBHOOK_AUTH` | Auth token for n8n calls |
| `R2_API_TOKEN` | Cloudflare API token for R2 |
| `R2_ACCOUNT_ID` | Cloudflare account ID |

### Vercel (Kept Routes)

| Variable | Description |
|----------|-------------|
| `STRIPE_*` | Existing Stripe variables (unchanged) |
| `SUPABASE_*` | Existing Supabase variables (unchanged) |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `VITE_R2_STORAGE_URL` | `https://storage.manzanillo-real-estate.com` |
| `VITE_R2_WORKER_URL` | `https://r2-auth.habitex.workers.dev` |
| `VITE_SUPABASE_FUNCTIONS_URL` | `https://{project}.supabase.co/functions/v1` |

---

## 📚 Reference Links

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Event Notifications](https://developers.cloudflare.com/r2/buckets/event-notifications/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Cloudflare Containers](https://developers.cloudflare.com/containers/) - Video processing with FFmpeg
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase pg_net Extension](https://supabase.com/docs/guides/database/extensions/pg_net)

---

**Document Version**: 1.2  
**Last Updated**: January 6, 2026  
**Author**: Migration Planning Session
