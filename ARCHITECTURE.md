# Habitex - Architecture Overview

**Last Edited: 2026-01-04**

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
├─────────────────────────────────────────────────────────────────┤
│  React SPA (Vite)                                               │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Pages:                                                 │     │
│  │  • Home (SEO optimized, dynamic meta)                 │     │
│  │  • Properties (SEO optimized, breadcrumbs)            │     │
│  │  • PropertyDetail (Schema.org structured data)        │     │
│  │  • Admin (Property management)                        │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Hooks & Utils:                                        │     │
│  │  • useRealtimeProperties (WebSocket subscriptions)    │     │
│  │  • usePropertyDraft (persistent form drafts)          │     │
│  │  • SEO utilities (meta tags, structured data)         │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                         HTTP / WebSocket
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Platform                           │
├─────────────────────────────────────────────────────────────────┤
│  API Routes (Serverless Functions):                             │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/properties                                        │     │
│  │  • GET properties with filters                        │     │
│  │  • Real-time data from Supabase                       │     │
│  │  • Caching: 60s + stale-while-revalidate              │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/sitemap.xml                                       │     │
│  │  • Dynamic sitemap generation                         │     │
│  │  • Auto-updates with property changes                 │     │
│  │  • Caching: 1 hour                                    │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/stripe/webhook                                    │     │
│  │  • Stripe webhook handler                             │     │
│  │  • Subscription lifecycle events                      │     │
│  │  • Credit purchase processing                         │     │
│  │  • Uses Supabase service role (bypasses RLS)          │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/stripe/create-checkout                            │     │
│  │  • Creates Stripe checkout sessions                   │     │
│  │  • Subscription + credit pack purchases               │     │
│  │  • Customer portal session creation                   │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/prefill-property                                  │     │
│  │  • AI-powered property form prefill                   │     │
│  │  • Requires authentication (JWT)                      │     │
│  │  • Charges 2 credits per request                      │     │
│  │  • Validates characteristics against definitions      │     │
│  │  • Proxies to external AI webhook securely            │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/video/generate-images                             │     │
│  │  • Starts AI video image generation                   │     │
│  │  • Requires authentication (JWT)                      │     │
│  │  • Charges 5 credits per request                      │     │
│  │  • Creates job in video_generation_jobs table         │     │
│  │  • Calls n8n webhook for processing                   │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/video/approve-images                              │     │
│  │  • Approves generated images, starts script gen       │     │
│  │  • Requires authentication (JWT)                      │     │
│  │  • Charges 1 credit for script generation             │     │
│  │  • Calls n8n webhook for script generation            │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/video/approve-script                              │     │
│  │  • Approves edited script, starts final video gen     │     │
│  │  • Requires authentication (JWT)                      │     │
│  │  • Charges 30 credits for video generation            │     │
│  │  • Accepts ScriptScene[] with dialogue/action/emotion │     │
│  │  • Calls n8n webhook for video rendering              │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ /api/video/generate-tour                              │     │
│  │  • Generates video tour from property images         │     │
│  │  • Requires authentication (JWT)                      │     │
│  │  • Charges 5 credits per image selected              │     │
│  │  • Accepts 1-30 images + clip duration (3s/6s)       │     │
│  │  • Creates job in tour_generation_jobs table         │     │
│  │  • Calls n8n webhook for video generation            │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                  │
│  Static Assets:                                                 │
│  • /robots.txt                                                  │
│  • /seo-validator.html                                          │
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
                    → If Regenerate: new job (5 more credits)
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

### Visibility Rules
- **No subscription**: Properties hidden from public
- **Subscription active**: Properties visible
- **Past due**: Access with warning banner
- **Canceled**: No access, prompt to resubscribe

### React Hooks
- `useSubscription(userId)`: Subscription state, access control
- `useCredits(userId)`: Credit balance, purchase functions
- `useDashboardStats(userId)`: Dashboard statistics (property counts)
- `useAuth()`: Authentication state from AuthContext
- `useRealtimeProperties()`: Real-time property updates via WebSocket
- `useLanguageSync()`: Syncs language preference from Supabase profile on login
- `useVideoGeneration(userId)`: AI video generation workflow state and actions

### Components
- `SubscriptionGuard`: Route protection wrapper
- `BillingTab`: Subscription/credits management UI
- `AIToolsTab`: AI video generation wizard with multi-step workflow
- `ProfileSettings`: Full profile editing with username validation and automatic property slug updates on username change
- `PropertyForm`: Property CRUD form
- `PropertyTable`: Property list with actions
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
│   ├── properties.ts          # Property API endpoint
│   ├── prefill-property.ts    # AI property prefill endpoint
│   ├── sitemap.xml.ts         # Sitemap generator
│   ├── stripe/
│   │   ├── webhook.ts         # Stripe webhook handler
│   │   └── create-checkout.ts # Checkout session creation
│   └── video/
│       ├── generate-images.ts # Start AI image generation (5 credits)
│       ├── approve-images.ts  # Approve images, start script gen (30 credits)
│       └── approve-script.ts  # Approve script, start video render
├── public/
│   ├── robots.txt             # Crawler instructions
│   ├── seo-validator.html     # SEO testing tool
│   └── branding/              # Logo and brand assets
├── src/
│   ├── components/
│   │   ├── Breadcrumb.tsx     # Navigation breadcrumbs
│   │   ├── SubscriptionGuard.tsx # Route protection
│   │   ├── BillingTab.tsx     # Billing UI component
│   │   ├── AIToolsContainer.tsx # Unified AI tools with tool selector
│   │   ├── AIToolsTab.tsx     # AI video generation wizard
│   │   ├── VideoTourTab.tsx   # Video tour generation wizard
│   │   ├── ProfileSettings.tsx # Profile editing component
│   │   ├── LanguageSwitcher.tsx # EN/ES language toggle
│   │   └── admin/
│   │       ├── PropertyForm.tsx  # Property CRUD form
│   │       ├── PropertyTable.tsx # Property list display
│   │       ├── ImageUpload.tsx   # Image upload component
│   │       └── VideoUpload.tsx   # Video upload component
│   ├── hooks/
│   │   ├── useRealtimeProperties.ts  # Real-time subscriptions
│   │   ├── useSubscription.ts # Subscription state management
│   │   ├── useCredits.ts      # Credits state management
│   │   ├── useDashboardStats.ts # Dashboard statistics hook
│   │   ├── useLanguageSync.ts # Language preference sync from profile
│   │   ├── useVideoGeneration.ts # AI video generation workflow (10-min job persistence)
│   │   ├── useVideoTourGeneration.ts # Video tour generation workflow (10-min job persistence)
│   │   └── useAuth.ts         # Auth context hook
│   ├── i18n/
│   │   ├── index.ts           # i18next configuration
│   │   ├── en.ts              # English translations
│   │   └── es.ts              # Spanish translations
│   ├── lib/
│   │   └── seo.ts             # SEO utilities (meta, Schema.org, agent SEO)
│   └── pages/
│       ├── Home.tsx           # SEO: Home page
│       ├── Properties.tsx     # SEO: Properties list
│       ├── PropertyDetail.tsx # SEO: Property detail
│       ├── Dashboard.tsx      # Agent dashboard (tabs: overview, properties, profile, billing, ai-tools)
│       ├── AgentProfile.tsx   # Public agent profile page (with Schema.org)
│       └── OnboardingPage.tsx # New user onboarding
├── DEPLOYMENT.md              # Deployment guide
├── ARCHITECTURE.md            # This file
├── PROJECT_PLAN.md            # Project roadmap and phases
├── DATABASE_SCHEMA.md         # Database documentation
└── vercel.json               # Vercel configuration
```

## Testing Checklist

### Development
- [x] Build succeeds
- [x] Dev server runs
- [x] No TypeScript errors
- [x] No security vulnerabilities

### Production (User Action Required)
- [ ] Deploy to Vercel
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
