# Habitex - Architecture Overview

**Last Edited: 2026-01-06**

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
├─────────────────────────────────────────────────────────────────┤
│  React SPA (Vite + TypeScript)                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Pages:                                                 │     │
│  │  • Home (SEO optimized, dynamic meta)                 │     │
│  │  • Properties (SEO optimized, breadcrumbs)            │     │
│  │  • PropertyDetail (Schema.org structured data)        │     │
│  │  • Dashboard (Property management, AI tools)          │     │
│  │  • AgentProfile (domain.com/{username})               │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Hooks & Utils:                                        │     │
│  │  • useRealtimeProperties (WebSocket subscriptions)    │     │
│  │  • usePropertyDraft (persistent form drafts)          │     │
│  │  • useSubscription, useCredits (billing state)        │     │
│  │  • r2-storage.ts (Cloudflare R2 abstraction)         │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                    │
          ┌────────┴────────┐
          ▼                 ▼
┌──────────────────┐   ┌──────────────────────────────────────────┐
│   CLOUDFLARE R2  │   │          SUPABASE EDGE FUNCTIONS          │
│                  │   │                                            │
│ Bucket: habitex  │   │  /ai-prefill (2 credits)                  │
│ CDN: storage.    │   │   • AI-powered property form prefill      │
│ manzanillo-real- │   │   • Deployed with --no-verify-jwt         │
│ estate.com       │   │                                            │
│                  │   │  /video-generation (5+1+30 credits)        │
│ R2 Auth Worker   │   │   • Unified video pipeline                │
│ Media Processor  │   │   • generate-images, approve-*, regenerate │
└──────────────────┘   │                                            │
                       │  /properties (public)                      │
                       │   • List/filter active properties          │
                       │                                            │
                       │  /storage-cleanup (internal)               │
                       │   • R2 folder deletion via DB triggers     │
                       └──────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
┌──────────────────────────────────┐   ┌──────────────────────────────┐
│          VERCEL (KEPT)            │   │      SUPABASE DATABASE       │
│                                   │   │                              │
│  /api/stripe/webhook.ts          │   │  Tables: profiles, properties│
│   • Subscription lifecycle       │   │  user_roles, credits, etc.   │
│   • Pauses/reactivates props     │   │                              │
│                                   │   │  Functions:                  │
│  /api/stripe/create-checkout.ts  │   │  • is_admin() - RLS helper   │
│   • Checkout sessions            │   │  • pause_user_properties()   │
│                                   │   │  • reactivate_user_props()   │
│  /api/sitemap.xml.ts             │   │                              │
│   • Dynamic sitemap              │   │  Triggers:                   │
└──────────────────────────────────┘   │  • enforce_subscription_*    │
                                       │  • on_property_delete        │
                                       │  • on_user_delete            │
                                       └──────────────────────────────┘
```

## Property Status Flow

Properties have only 3 statuses (simplified January 6, 2026):

```
┌───────────┐
│   DRAFT   │ ← User editing, not published
└─────┬─────┘
      │ User publishes (requires subscription)
      ▼
┌───────────┐
│  ACTIVE   │ ← Published, visible to public
└─────┬─────┘
      │ Subscription lapses (automatic)
      ▼
┌───────────┐
│  PAUSED   │ ← System-managed, hidden from public
└─────┬─────┘
      │ Subscription resumes (automatic)
      ▼
┌───────────┐
│  ACTIVE   │ ← Back to published
└───────────┘

Database enforces:
• Cannot set ACTIVE without subscription (trigger)
• Cannot change PAUSED to ACTIVE without subscription (trigger)
• Stripe webhook calls pause_user_properties() on subscription end
• Stripe webhook calls reactivate_user_properties() on subscription resume
```
│  • Favicon, manifest, images                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                         PostgreSQL / WebSocket
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                       Supabase Backend                           │
├─────────────────────────────────────────────────────────────────┤
│  Services:                                                      │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Database (PostgreSQL)                                  │     │
│  │  • Properties table with RLS                          │     │
│  │  • Real-time subscriptions enabled                    │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Authentication                                         │     │
│  │  • Admin user management                              │     │
│  │  • Secure login/logout                                │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Storage                                                │     │
│  │  • Property images                                    │     │
│  │  • Media files                                        │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                         Payment Processing
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                         Stripe Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  Products:                                                      │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Subscription                                           │     │
│  │  • Plan Estándar: 199 MXN/month                       │     │
│  │  • Includes 50 free AI credits/month                  │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Credit Packs                                           │     │
│  │  • 20, 50, 100, 650, 1350 credits                     │     │
│  │  • One-time purchases                                 │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Webhooks                                               │     │
│  │  • customer.subscription.created/updated/deleted      │     │
│  │  • invoice.payment_succeeded/failed                   │     │
│  │  • checkout.session.completed                         │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                        Crawlers / Search Engines
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    Search Engine Optimization                    │
├─────────────────────────────────────────────────────────────────┤
│  • Meta Tags (Title, Description, Keywords)                     │
│  • Open Graph (Social media sharing)                            │
│  • Twitter Cards                                                │
│  • JSON-LD Structured Data (Schema.org)                         │
│  • Dynamic Sitemap (XML)                                        │
│  • Robots.txt                                                   │
│  • Canonical URLs                                               │
│  • Breadcrumb Navigation                                        │
│  • Geo-location Tags (Local SEO)                                │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Page Load (Initial SEO)
```
User → Vercel (HTML) → Browser
                     → Parse meta tags
                     → Load structured data
                     → Render breadcrumbs
```

### 2. Real-Time Updates
```
Admin adds/edits property → Supabase Database
                         → WebSocket notification
                         → All connected clients
                         → Auto-update UI
```

### 3. API Request
```
Client → /api/properties?featured=true
      → Vercel Function
      → Supabase Query
      → Cache (60s)
      → JSON Response
```

### 4. Sitemap Generation
```
Search Engine → /sitemap.xml
             → Vercel Function
             → Query all properties
             → Generate XML
             → Cache (1 hour)
             → XML Response
```

### 5. Subscription Flow
```
User clicks "Subscribe" → /api/stripe/create-checkout
                        → Stripe Checkout Session
                        → User completes payment
                        → Stripe Webhook → /api/stripe/webhook
                        → Update subscriptions table
                        → User gets access
```

### 6. Credit Purchase Flow
```
User clicks "Buy Credits" → /api/stripe/create-checkout
                          → Stripe Checkout Session
                          → User completes payment
                          → Stripe Webhook → /api/stripe/webhook
                          → Add credits via add_credits() function
                          → Credits available immediately
```

### 7. AI Video Generation Flow
```
User selects property → Select 3 images → Add notes (optional)
                      → /api/video/generate-images (5 credits)
                      → Creates job in video_generation_jobs
                      → POST to n8n webhook
                      → Real-time listen to job status
                      
n8n processes images → Updates job: status='images_ready'
                     → image_urls populated with 3 AI images
                     
User reviews images → Approve or Regenerate
                    → If Regenerate: deletes old job and images from storage
                    → Creates new job (5 more credits)
                    → If Approve: /api/video/approve-images (30 credits)
                    
n8n generates script → Updates job: status='script_ready'
                     → script array populated with 3 texts
                     
User edits script → Adjust text for each scene (max 25 words)
                  → /api/video/approve-script
                  
n8n renders video → Updates job: status='completed'
                  → video_url populated with final video
                  
User downloads → 9:16 vertical video (24 seconds)

Error at any step → status='failed', credits refunded
```

## Subscription & Access Control

### Access Control Logic
```javascript
function canAccessDashboard(subscription) {
  // Active subscription
  if (status === 'active') return true;
  
  // In trial period
  if (status === 'trialing' && trial_ends_at > now) return true;
  
  // Grace period for past_due
  if (status === 'past_due') return true; // but show warning
  
  // No access
  return false;
}
```

### Property Status Rules (Simplified Jan 6, 2026)
| Status | Description | Visible to Public | User Can Set |
|--------|-------------|-------------------|--------------|
| `draft` | User is editing, not yet published | ❌ | ✅ |
| `active` | Published, visible to all | ✅ | ✅ (requires subscription) |
| `paused` | Auto-paused due to lapsed subscription | ❌ | ❌ (system-managed) |

**Database Enforcement:**
- Trigger `enforce_subscription_on_property_status` blocks setting `active` without subscription
- `pause_user_properties(user_id)` called by Stripe webhook on subscription end
- `reactivate_user_properties(user_id)` called by Stripe webhook on subscription resume

### React Hooks
- `useSubscription(userId)`: Subscription state, access control
- `useCredits(userId)`: Credit balance, purchase functions
- `useDashboardStats(userId)`: Dashboard statistics (total/active property counts)
- `useAuth()`: Authentication state from AuthContext
- `useRealtimeProperties()`: Real-time property updates via WebSocket
- `useLanguageSync()`: Syncs language preference from Supabase profile on login
- `useVideoGeneration(userId)`: AI video generation workflow state and actions

### Components
- `SubscriptionGuard`: Route protection wrapper
- `BillingTab`: Subscription/credits management UI
- `AIToolsTab`: AI video generation wizard with multi-step workflow
- `ProfileSettings`: Full profile editing with username validation and automatic property slug updates on username change
- `PropertyForm`: Property CRUD form (status dropdown: draft/active only; shows read-only "Paused" if system-paused)
- `PropertyTable`: Property list with actions (toggle disabled for paused properties)
- `LanguageSwitcher`: EN/ES language toggle with persistence

## Internationalization (i18n)

### Configuration
- **Library**: react-i18next
- **Default Language**: Spanish (es)
- **Supported**: Spanish (es), English (en)
- **Persistence**: localStorage + Supabase profile

### Files
- `src/i18n/index.ts`: i18next configuration
- `src/i18n/en.ts`: English translations
- `src/i18n/es.ts`: Spanish translations
- `src/hooks/useLanguageSync.ts`: Profile sync hook

### Language Flow
```
User changes language → LanguageSwitcher
                      → Update i18next
                      → Save to localStorage
                      → If logged in, save to profiles.language_preference
                      
User logs in → useLanguageSync
            → Load profiles.language_preference
            → Update i18next if preference exists
```

## SEO Components

### Dynamic Meta Tags (All Pages)
- **Home**: Brand-focused, local keywords
- **Properties**: Catalog description, filtering info
- **PropertyDetail**: Property-specific title, price, location

### Structured Data (Schema.org)

**Property Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "House",
  "name": "Property Title",
  "address": { ... },
  "geo": { ... },
  "offers": { ... }
}
```

**Agent Profile Schema (Person/RealEstateAgent):**
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "additionalType": "https://schema.org/RealEstateAgent",
  "name": "Agent Name",
  "jobTitle": "Real Estate Agent",
  "image": "...",
  "telephone": "...",
  "email": "...",
  "worksFor": { "@type": "Organization", "name": "..." }
}
```

### Sitemap Structure
```xml
<urlset>
  <url>
    <loc>https://www.habitex.mx</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.habitex.mx/propiedades</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.habitex.mx/propiedad/[slug]</loc>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Security Features

- **Input Validation**: All API parameters validated
- **Rate Limiting**: Max limit of 100 items per request
- **Security Headers**: 
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
- **RLS**: Row Level Security on Supabase
- **CORS**: Configured for API routes

## Performance Optimizations

- **Caching Strategy**: 
  - API: 60 seconds with stale-while-revalidate
  - Sitemap: 1 hour
- **Bundle Size**: 170 KB gzipped
- **Code Splitting**: Ready for implementation
- **Image Optimization**: Lazy loading supported

## Monitoring

### Recommended Setup
1. **Google Search Console**: Submit sitemap, monitor indexing
2. **Vercel Analytics**: Monitor deployment performance
3. **Supabase Dashboard**: Monitor database queries

## File Structure
```
├── api/
│   ├── sitemap.xml.ts         # Dynamic sitemap generator
│   └── stripe/
│       ├── webhook.ts         # Stripe webhook handler
│       └── create-checkout.ts # Checkout session creation
├── supabase/
│   └── functions/             # Edge Functions
│       ├── _shared/           # Shared utilities (cors, credits, client)
│       ├── properties/        # Public property listing
│       ├── ai-prefill/        # AI property form prefill
│       ├── video-generation/  # Unified video pipeline
│       └── storage-cleanup/   # R2 folder cleanup
├── workers/
│   ├── r2-auth/               # JWT verification + R2 access
│   └── media-processor/       # Image/video variant generation
├── containers/
│   └── ffmpeg-processor/      # FFmpeg for video thumbnails/GIFs
├── cloudflare/
│   ├── r2-cors-config.json    # R2 bucket CORS policy
│   └── README.md              # Cloudflare setup instructions
├── public/
│   ├── robots.txt             # Crawler instructions
│   ├── seo-validator.html     # SEO testing tool
│   └── branding/              # Logo and brand assets
├── src/
│   ├── components/
│   │   ├── Breadcrumb.tsx     # Navigation breadcrumbs
│   │   ├── SubscriptionGuard.tsx # Route protection
│   │   ├── BillingTab.tsx     # Billing UI component
│   │   ├── AIToolsContainer.tsx # AI tools container
│   │   ├── AIToolsTab.tsx     # AI video generation wizard
│   │   ├── ProfileSettings.tsx # Profile editing component
│   │   ├── LanguageSwitcher.tsx # EN/ES language toggle
│   │   └── admin/
│   │       ├── PropertyForm.tsx  # Property CRUD form
│   │       ├── PropertyTable.tsx # Property list display
│   │       ├── ImageUpload.tsx   # R2 image upload with variants
│   │       └── VideoUpload.tsx   # R2 video upload with thumbnails
│   ├── hooks/
│   │   ├── useRealtimeProperties.ts  # Real-time subscriptions
│   │   ├── useSubscription.ts # Subscription state management
│   │   ├── useCredits.ts      # Credits state management
│   │   ├── useDashboardStats.ts # Dashboard statistics hook
│   │   ├── useLanguageSync.ts # Language preference sync from profile
│   │   ├── useVideoGeneration.ts # AI video workflow (Edge Functions)
│   │   └── useAuth.ts         # Auth context hook
│   ├── i18n/
│   │   ├── index.ts           # i18next configuration
│   │   ├── en.ts              # English translations
│   │   └── es.ts              # Spanish translations
│   ├── lib/
│   │   ├── r2-storage.ts      # R2 storage abstraction
│   │   ├── prefillProperty.ts # AI prefill (Edge Function client)
│   │   └── seo.ts             # SEO utilities
│   └── pages/
│       ├── Home.tsx           # SEO: Home page
│       ├── Properties.tsx     # SEO: Properties list
│       ├── PropertyDetail.tsx # SEO: Property detail
│       ├── Dashboard.tsx      # Agent dashboard
│       ├── AgentProfile.tsx   # Public agent profile page
│       └── OnboardingPage.tsx # New user onboarding
├── DEPLOYMENT.md              # Deployment guide
├── ARCHITECTURE.md            # This file
├── PROJECT_PLAN.md            # Project roadmap and phases
├── DATABASE_SCHEMA.md         # Database documentation
├── MIGRATION_PLAN.md          # R2/Edge Functions migration
└── vercel.json               # Vercel configuration
```

## Recent Component Updates (January 2026)

### RLS Security Fix (January 6, 2026)

Fixed infinite recursion in Row Level Security policies across all tables:

**Problem:** `user_roles` RLS policies referenced `user_roles` table, causing:
```
ERROR: infinite recursion detected in policy for relation "user_roles"
```

**Solution:** Created `is_admin()` SECURITY DEFINER function that bypasses RLS:
```sql
CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';
```

All tables now use `is_admin()` instead of self-referencing subqueries.

### Property Status Simplification (January 6, 2026)

Reduced property status from 7 values to 3:
- **Before:** draft, pending, active, sold, rented, paused, archived
- **After:** draft, active, paused

Database enforcement via trigger blocks setting `active` without subscription.

### Property Form Enhancement

#### PropertyForm.tsx
- **7-step wizard**: AI → Info → Precio → Lugar → Características → Fotos → Extras
- **Step navigation**: Centered progress indicators with connecting lines
- **Auto-saving**: Form state persisted in `property_drafts` table
- **Status dropdown**: Only shows draft/active; read-only "Paused" if system-managed
- **Mobile optimization**: Responsive design with proper touch targets

#### ImageUpload.tsx  
- **Mobile-first**: Tap-to-select interface (no drag-drop on mobile)
- **Grid layout**: Responsive image grid with proper spacing
- **File validation**: Size, type, and count limitations

#### usePropertyDraft.ts Hook
- **Auto-save**: Debounced form state persistence
- **Draft management**: Create, update, delete operations
- **Step tracking**: Current wizard step preservation
- **AI text storage**: Temporary storage for AI prefill input

### Data Flow: AI Property Prefill

```
User inputs text → PropertyForm
                → Save to draft (ai_text field)
                → Call Supabase Edge Function (ai-prefill)
                → AI webhook processing
                → Return filled form_data
                → Deduct 2 credits
                → Log transaction ('IA Autocompletado')
                → Apply data to form
```

### Mobile UX Improvements

1. **Touch-friendly**: Large tap targets for all interactive elements
2. **No drag-drop**: Image upload uses file picker on mobile
3. **Responsive design**: Adapts to screen sizes with proper spacing
4. **Progress indicators**: Clear visual feedback on form completion
5. **Silent operations**: No confirmation dialogs for draft management

---

## Testing Checklist

### Development
- [x] Build succeeds
- [x] Dev server runs
- [x] No TypeScript errors
- [x] No security vulnerabilities
- [x] RLS policies work without recursion

### Production (User Action Required)
- [x] Edge Functions deployed with --no-verify-jwt
- [ ] Deploy frontend to Vercel
- [ ] Test all pages load
- [ ] Validate structured data
- [ ] Submit sitemap
- [ ] Test real-time updates
- [ ] Check mobile responsiveness
- [ ] Run PageSpeed Insights

## Resources

- **Deployment**: See DEPLOYMENT.md
- **Setup**: See SETUP.md
- **API Docs**: See DEPLOYMENT.md → API Endpoints section
- **SEO Validator**: Visit /seo-validator.html
