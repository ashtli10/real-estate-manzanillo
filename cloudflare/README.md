# Cloudflare R2 Configuration

This folder contains configuration and setup files for Cloudflare R2 storage.

## Bucket: `habitex`

Created: January 2026
Location: WNAM (Western North America)

## Setup Instructions

### 1. Apply CORS Configuration

Via Cloudflare Dashboard:
1. Go to **R2 > habitex > Settings**
2. Scroll to **CORS Policy**
3. Click **Edit CORS policy**
4. Paste contents of `r2-cors-config.json`
5. Click **Save**

### 2. Enable Public Access

#### Option A: Custom Domain (Recommended for Production)
1. Go to **R2 > habitex > Settings**
2. Under **Custom Domains**, click **Connect Domain**
3. Enter: `storage.manzanillo-real-estate.com`
4. Follow DNS verification steps
5. Wait for SSL certificate (~15 minutes)

### 3. Generate S3 API Credentials (for n8n)

1. Go to **R2 Overview** (not inside the bucket)
2. Click **Manage R2 API Tokens** in the right sidebar
3. Click **Create API token**
4. Configure:
   - **Token name**: `n8n-habitex-access`
   - **Permissions**: Object Read & Write
   - **Specify bucket(s)**: Select `habitex`
5. Click **Create API Token**
6. Save the **Access Key ID** and **Secret Access Key** immediately

## Folder Structure

See `MIGRATION_PLAN.md` for complete folder schema:

```
habitex/
├── users/
│   └── {user_id}/
│       ├── profile/
│       │   ├── avatar.jpg
│       │   └── cover.jpg
│       ├── properties/{property_id}/
│       │   ├── images/
│       │   └── videos/
│       └── ai-jobs/{job_id}/
│           ├── inputs/
│           ├── generated/
│           └── output/
```

## Environment Variables

After setup, add to your `.env`:

```env
# If using Custom Domain:
VITE_R2_STORAGE_URL=https://storage.manzanillo-real-estate.com

# If using R2.dev subdomain (testing):
VITE_R2_STORAGE_URL=https://pub-xxxx.r2.dev

# R2 Auth Worker (deployed in Phase 2):
VITE_R2_WORKER_URL=https://r2-auth.habitex.workers.dev
```

## Next Steps

1. ✅ Create bucket\n2. ✅ Apply CORS policy
3. ✅ Enable public access (custom domain)
4. ✅ Generate S3 API credentials for n8n
5. ✅ Deploy R2 Auth Worker (Phase 2)
6. ✅ Deploy Media Processing Worker (Phase 3)
7. ✅ Deploy FFmpeg Container for image/video processing
8. ✅ Database schema migration (Phase 4)
9. ✅ Frontend rewrite for R2 storage (Phase 6)

---

## Media Processing Worker (Phase 3) ✅ COMPLETED

The Media Processing Worker automatically generates image variants and video thumbnails when files are uploaded to R2.

**Status**: Fully operational as of January 6, 2026

**Deployed Workers**:
- `media-processor` - Queue consumer that triggers processing on R2 uploads
- `ffmpeg-processor` - Container-based image/video processing

### Setup Instructions

#### 1. Create Cloudflare Queue

```bash
# Create the main processing queue
wrangler queues create habitex-media-processing

# Create dead letter queue for failed messages
wrangler queues create habitex-media-processing-dlq
```

#### 2. Configure R2 Event Notifications

Via Cloudflare Dashboard:
1. Go to **R2 > habitex > Settings**
2. Scroll to **Event notifications**
3. Click **Add notification**
4. Configure:
   - **Event types**: Object creation (all)
   - **Queue**: `habitex-media-processing`
   - **Prefix filter**: `users/` (optional, filters to only user uploads)
5. Click **Save**

Alternatively, via Wrangler:
```bash
wrangler r2 bucket notification create habitex \
  --queue habitex-media-processing \
  --event-type object-create
```

#### 3. Deploy the Worker

```bash
cd workers/media-processor
npm install
npm run deploy
```

#### 4. Verify Deployment

```bash
# Check worker logs
wrangler tail media-processor

# Test health endpoint
curl https://media-processor.atcraft-cloud.workers.dev/health
```

### Processing Rules

| File Pattern | Generated Variants |
|--------------|-------------------|
| `users/*/properties/*/images/*` | `.medium.jpg` (800x600), `.thumb.jpg` (160x160) |
| `users/*/properties/*/videos/*` | `.thumb.jpg` (480x270), `.preview.gif` (3s) |
| `users/*/ai-jobs/*/generated/*` | `.thumb.jpg` (160x160) |
| `users/*/ai-jobs/*/output/*` | `.thumb.jpg` (480x270), `.preview.gif` (3s) |
| `users/*/profile/avatar.*` | Resized to 512x512 (overwrites) |
| `users/*/profile/cover.*` | Resized to 1920x1080 (overwrites) |

### Video Processing with Cloudflare Containers

Video thumbnail and GIF generation uses **Cloudflare Containers** with FFmpeg. This solution is included in the Workers Paid plan ($5/month) with generous free tier limits.

#### Free Tier Limits (Workers Paid)

| Resource | Included Free | Notes |
|----------|---------------|-------|
| vCPU time | 375 minutes/month | ~5 seconds per video = 4,500 videos/month |
| Memory hours | 25 GiB-hours/month | 256 MiB instance = 100 hours runtime |
| Disk hours | 200 GB-hours/month | 2 GB instance = 100 hours runtime |
| Container starts | Unlimited | Scales to zero when idle |

#### How It Works

1. **Media Processor Worker** receives R2 event notification for new video
2. Worker calls the **FFmpeg Container** via internal service binding
3. Container extracts thumbnail frame and generates 3-second GIF preview
4. Container uploads variants back to R2
5. Container scales to zero when idle (no cost when not processing)

#### Container Configuration

The FFmpeg Container uses the `lite` instance type:
- **CPU**: Shared vCPU
- **Memory**: 256 MiB
- **Disk**: 2 GB
- **Startup**: ~500ms cold start

#### Container Location

```
containers/
└── ffmpeg-processor/
    ├── Dockerfile          # Alpine + FFmpeg
    ├── wrangler.toml       # Container configuration
    └── src/
        └── index.ts        # HTTP API for processing
```

#### Operations

| Operation | Estimated Time | vCPU Used |
|-----------|---------------|-----------|
| Resize image (medium + thumb) | ~2-3 seconds | 2-3 seconds |
| Extract video thumbnail | ~2 seconds | 2 seconds |
| Generate 3s GIF | ~3 seconds | 3 seconds |
| **Total per video** | ~5 seconds | 5 seconds |

With 375 vCPU-minutes/month free, you can process approximately **4,500 videos/month** or **7,500+ images/month** at no additional cost.

### Test Upload

To test the processing pipeline:

```bash
# Upload an image to trigger processing
wrangler r2 object put "habitex/users/test-user/properties/test-prop/images/001.jpg" \
  --file="path/to/image.jpg" --content-type="image/jpeg" --remote

# Wait ~15 seconds, then verify variants were generated
wrangler r2 object get "habitex/users/test-user/properties/test-prop/images/001.thumb.jpg" \
  --file="test-thumb.jpg" --remote
wrangler r2 object get "habitex/users/test-user/properties/test-prop/images/001.medium.jpg" \
  --file="test-medium.jpg" --remote
```

### Manual Processing

For debugging or reprocessing:

```bash
curl -X POST https://media-processor.atcraft-cloud.workers.dev/process \
  -H "Content-Type: application/json" \
  -d '{"key": "users/abc123/properties/xyz789/images/001.jpg"}'
```

### Monitoring

```bash
# View real-time logs
wrangler tail media-processor

# View queue status
wrangler queues list

# View dead letter queue for failures
wrangler queues messages habitex-media-processing-dlq
```