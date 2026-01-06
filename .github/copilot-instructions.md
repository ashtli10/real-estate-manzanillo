# Project Guidelines for AI Assistance

## 🏠 Project Overview

**Habitex** is a real estate marketplace platform for agents in Mexico (Manzanillo area). Agents pay a monthly subscription to list properties, and the platform provides AI-powered tools for property management and video generation.

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Storage | Cloudflare R2 (bucket: `habitex`, CDN: storage.manzanillo-real-estate.com) |
| Media Processing | Cloudflare Workers + Containers (auto thumbnails/GIFs) |
| API | Supabase Edge Functions (properties, ai-prefill, video-generation) |
| Payments | Stripe (subscriptions + credit packs) |
| Hosting | Vercel (frontend + Stripe webhooks) |
| i18n | react-i18next (ES/EN) |

### CLI Tools Available
| Tool | Purpose | Example Commands |
|------|---------|------------------|
| **Wrangler** | Cloudflare CLI for R2, Workers, D1 | `wrangler r2 bucket list`, `wrangler deploy` |
| **Supabase CLI** | Database migrations, Edge Functions | `npx supabase db push`, `npx supabase functions deploy` |

### ⚠️ CRITICAL: CLI-Only Policy

**NEVER use MCP tools for Supabase or Cloudflare operations.** Always use CLI commands:

**Supabase (via `npx supabase`):**
- Create migrations: `npx supabase migration new <name>` → then edit the SQL file
- Apply migrations: `npx supabase db push`
- Pull remote schema: `npx supabase db pull`
- Deploy functions: `npx supabase functions deploy <name>`
- Mark migration as applied: `npx supabase migration repair --status applied <timestamp>`

**Cloudflare (via `wrangler`):**
- List R2 buckets: `wrangler r2 bucket list`
- Apply CORS policies: `wrangler r2 bucket cors set habitex --file cloudflare/r2-cors-config.json`
- Deploy Workers: `wrangler deploy` (from worker directory)
- View logs: `wrangler tail`

**Wrangler is installed globally.** Use it to:
- List/create R2 buckets: `wrangler r2 bucket list`
- Apply CORS policies: `wrangler r2 bucket cors set habitex --file cloudflare/r2-cors-config.json`
- Deploy Workers: `wrangler deploy` (from worker directory)
- View logs: `wrangler tail`

### Key Features
- Property listings with images/videos
- Agent profiles at `domain.com/{username}`
- AI property form prefill
- AI video generation
- Subscription management
- Credit purchase packs

---

## 📚 Critical: Always Consult Documentation First

**Before doing anything, you MUST read these files:**

| Document | Purpose |
|----------|---------|
| `DATABASE_SCHEMA.md` | Table definitions, RLS policies, triggers, helper functions |
| `ARCHITECTURE.md` | System design, data flows, component structure |
| `PROJECT_PLAN.md` | Features, roadmap, implementation status |
| `MIGRATION_PLAN.md` | **ACTIVE** - R2 storage + Edge Functions migration |

These files are the **source of truth**. Code must align with these specs.

---

## 🚨 Migration Status (January 2026)

**Migration is NEARLY COMPLETE (Phase 6 Done)**. The following has been migrated:

1. ✅ **Supabase Storage → Cloudflare R2** with new folder schema
2. ✅ **Vercel API Routes → Supabase Edge Functions** (created, pending deployment)
3. ✅ **Frontend rewritten** to use R2 storage and Edge Functions
4. ⏳ **Edge Functions deployment** (Phase 7 - manual step)
5. ⏳ **Vercel route cleanup** (Phase 7 - after Edge Functions verified)

### R2 Storage Structure (ACTIVE)
```
habitex/
└── users/{user_id}/
    ├── profile/
    │   ├── avatar.jpg          # 512x512, overwrites on update
    │   └── cover.jpg           # 1920x1080
    ├── properties/{property_id}/
    │   ├── images/
    │   │   ├── 001.jpg         # Original
    │   │   ├── 001.medium.jpg  # 800x600 (auto-generated)
    │   │   └── 001.thumb.jpg   # 160x160 (auto-generated)
    │   └── videos/
    │       ├── 001.mp4
    │       ├── 001.thumb.jpg   # Video thumbnail (auto-generated)
    │       └── 001.preview.gif # 3-second preview (auto-generated)
    └── ai-jobs/{job_id}/
        ├── generated/          # AI images
        └── output/video.mp4    # Final video
```

**Important**: Image sequence numbers (001, 002, etc.) are unique identifiers, NOT position indicators. Array order in database determines display order. Reordering images does NOT rename files.

### Supabase Edge Functions (Created)
| Function | Purpose | Status |
|----------|---------|--------|
| `properties` | List/filter properties | ✅ Created |
| `ai-prefill` | AI property form prefill | ✅ Created |
| `video-generation` | Unified video pipeline | ✅ Created |
| `storage-cleanup` | Delete R2 folders on entity deletion | ✅ Created |

### Kept on Vercel
- `/api/stripe/webhook.ts` - Stripe payment webhooks
- `/api/stripe/create-checkout.ts` - Checkout sessions
- `/api/sitemap.xml.ts` - Dynamic sitemap

---

## 🔒 Security Standards

**Follow these principles at all times:**

1. **Row Level Security (RLS)**: All tables MUST have RLS policies. Never bypass unless documented
2. **Edge Functions for Secrets**: All API calls with secrets go through Edge Functions, never client-side
3. **No Client-Side Secrets**: Never expose API keys in frontend code
4. **JWT Validation**: All authenticated endpoints must verify Supabase JWT
5. **Path-Based Authorization**: R2 storage uses `users/{user_id}/*` path validation
6. **Input Validation**: Validate on both client and server
7. **Credit Deduction**: Always deduct credits BEFORE calling external services

### Authentication Flow
```typescript
// Edge Function pattern
const authHeader = req.headers.get('Authorization');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
});
const { data: { user } } = await supabase.auth.getUser();
if (!user) return new Response('Unauthorized', { status: 401 });
```

---

## 📁 Project Structure

```
├── api/                        # Vercel serverless (BEING MIGRATED)
│   └── stripe/                 # KEEP - Stripe webhooks
├── supabase/
│   └── functions/              # Edge Functions (NEW)
├── workers/                    # Cloudflare Workers (NEW)
│   ├── r2-auth/               # Storage authentication
│   └── media-processor/       # Thumbnail/GIF generation
├── src/
│   ├── components/
│   │   ├── admin/             # PropertyForm, ImageUpload, etc.
│   │   └── *.tsx              # Shared components
│   ├── hooks/                 # useAuth, useCredits, useSubscription, etc.
│   ├── i18n/                  # en.ts, es.ts translations
│   ├── lib/
│   │   ├── r2-storage.ts      # NEW - R2 abstraction
│   │   └── seo.ts             # SEO utilities
│   ├── pages/                 # Route components
│   └── integrations/supabase/ # Supabase client + types
├── DATABASE_SCHEMA.md
├── ARCHITECTURE.md
├── PROJECT_PLAN.md
└── MIGRATION_PLAN.md          # ACTIVE MIGRATION
```

---

## 🗄️ Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User/agent profiles, stripe_customer_id |
| `properties` | Property listings (images, videos, location, price) |
| `property_drafts` | Auto-saved form state |
| `subscriptions` | Stripe subscription status |
| `credits` | Credit balance (free + paid) |
| `credit_transactions` | Credit usage audit log |
| `video_generation_jobs` | AI video job tracking |
| `user_roles` | Role assignments (admin, agent) |

### Important Functions
```sql
-- Check subscription access
has_active_subscription(user_id UUID) → BOOLEAN

-- Credit operations
add_credits(p_user_id, p_amount, p_product)
deduct_credits(p_user_id, p_amount, p_product)
get_user_credits(user_id) → (balance, free_remaining, last_reset)
```

---

## 📝 Documentation Sync

**When making changes:**

1. Update the relevant `.md` file to match implementation
2. Add/update `Last Edited: YYYY-MM-DD` at the top
3. Keep code and docs in sync - docs are the source of truth

---

## 🎨 Coding Guidelines
