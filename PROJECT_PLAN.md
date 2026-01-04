# 🏠 Habitex - Complete Platform Plan

**Last Edited: 2026-01-04**

> **Habitex** - A marketplace platform for real estate agents in Mexico

---

## 📊 Current Status

### ✅ Already Set Up
| Component | Status | Details |
|-----------|--------|---------|
| **Supabase** | ✅ Active | `https://vvvscafjvisaswpqhnvy.supabase.co` |
| **Stripe** | ✅ Active | Account: ATcraft Cloud Services, Balance: 90.60 MXN |
| **Database Tables** | ✅ Exists | `profiles`, `user_roles`, `invitation_tokens`, `subscriptions`, `credits`, `credit_transactions`, `audit_logs`, `properties` |
| **Frontend** | ✅ Basic | React + Vite + Tailwind |
| **SEO** | ✅ Implemented | Meta tags, Schema.org, sitemap |
| **Real-time** | ✅ Working | Supabase WebSocket subscriptions |

### 🔧 What Needs to Be Built
The current system is a simple admin panel. You need a full marketplace platform.

---

## 🎯 Platform Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HABITEX PLATFORM                                │
│                         (Habitex.mx)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  👥 PUBLIC PAGES                    🔐 AGENT DASHBOARD                  │
│  ├─ Landing Page (Search + About)   ├─ Subscription Management         │
│  ├─ Properties (All Listings)       ├─ Property CRUD                   │
│  ├─ Property Detail                 ├─ Credit Balance                  │
│  └─ Agent Profile (domain.com/barbara) └─ AI Tools (Coming Soon)       │
│                                                                         │
│  👑 ADMIN PANEL                     💳 PAYMENTS                         │
│  ├─ Invite Users                    ├─ Monthly Subscription (199 MXN)  │
│  ├─ Manage Trials                   ├─ Credit Top-ups                  │
│  ├─ View All Users                  └─ Stripe Webhooks                 │
│  └─ Platform Analytics                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 PHASE 1: Core Platform Foundation

### 1.1 Database Schema Updates
```sql
-- Add these fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS:
  - username TEXT UNIQUE  -- for domain.com/username
  - bio TEXT
  - whatsapp_number TEXT  -- for WhatsApp button
  - phone_number TEXT     -- for call button  
  - profile_image TEXT
  - cover_image TEXT
  - location TEXT
  - is_visible BOOLEAN DEFAULT true
  - onboarding_completed BOOLEAN DEFAULT false
```

**Priority:** 🔴 Critical  
**Effort:** Small

### 1.2 Public Pages

#### 🏠 Landing Page (`/`)
- Hero section with search bar
- Property type filter (Casa, Departamento, Terreno, etc.)
- Location filter (Colonias)
- Sale/Rent toggle
- Scroll down: About section, platform description
- Featured properties carousel
- "Eres agente? Únete" CTA

#### 🏘️ Properties Page (`/properties`)
- **Grid layout** of all public properties from all agents
- Each card shows:
  - Main image
  - Price (Sale and/or Rent)
  - Location
  - Beds/Baths/Size
  - Agent mini-profile (avatar + name)
- **Advanced Filters:**
  - 💰 Price range slider (separate for sale/rent)
  - 🛏️ Bedrooms (0, 1, 2, 3, 4+)
  - 🚿 Bathrooms (1, 2, 3+)
  - 📍 Location/Colonia dropdown
  - 🏷️ Property type
  - 📐 Size range
  - ⭐ Featured only
  - 🏖️ Near beach
- Sorting: Price ↑↓, Newest, Most viewed

#### 🏡 Property Detail (`/property/:slug`)
- Full image gallery (swipeable on mobile)
- Video player (if videos exist)
- All property details beautifully formatted
- Map with location (if enabled)
- Agent card with:
  - Photo, Name, Company
  - WhatsApp button → opens chat with agent's number
  - Call button → opens phone dialer
- Share buttons
- Related properties

#### 👤 Agent Profile (`/:username`)
Example: `domain.com/barbara`
- Agent cover image + avatar
- Name, company, bio, location
- Contact buttons (WhatsApp + Phone)
- Grid of their properties
- Filter by sale/rent

**Priority:** 🔴 Critical  
**Effort:** Large

### 1.3 Mobile-First Design Requirements
- ✅ All pages must be 100% responsive
- ✅ Touch-friendly filter interactions
- ✅ Swipeable image galleries
- ✅ Floating WhatsApp button (varies by context)
- ✅ Bottom navigation on mobile
- ✅ No horizontal scroll bugs
- ✅ Fast loading (lazy images)

---

## 📋 PHASE 2: User System & Onboarding

### 2.1 Invitation System (Admin Creates Links)
Admin can create invitation links with:
- Optional email (pre-fill)
- Trial days (0 = no trial, 7, 14, 30, etc.)
- Expiration date

```
https://domain.com/invite/abc123
```

### 2.2 Onboarding Flow (New User)
When user clicks invite link:

```
Step 1: Create Account
├─ Email (may be pre-filled)
├─ Password
└─ Confirm Password

Step 2: Personal Info
├─ Full Name
├─ Phone Number (for calls)
├─ WhatsApp Number (with country code)
└─ Profile Photo (optional)

Step 3: Business Info
├─ Company Name (optional)
├─ Username (for profile URL)
├─ Bio/Description
└─ Location/Area

Step 4: Subscription
├─ IF trial: "You have X days free trial!"
│   └─ Skip payment, start using
└─ IF no trial: "Subscribe for $199 MXN/month"
    └─ Stripe Checkout → then access

Step 5: 🎉 Welcome to Dashboard!
```

### 2.3 User Roles
| Role | Permissions |
|------|------------|
| **Admin** | Full access, invite users, manage platform |
| **Agent** | Own properties, own profile, own dashboard |

**Priority:** 🔴 Critical  
**Effort:** Large

---

## 📋 PHASE 3: Subscription & Access Control ✅ COMPLETED

### 3.1 Subscription Logic ✅ Implemented

```javascript
// Access Control Flow
function canAccessDashboard(user) {
  const sub = user.subscription;
  
  // Active subscription
  if (sub.status === 'active') return true;
  
  // In trial period
  if (sub.status === 'trialing' && sub.trial_ends_at > now) return true;
  
  // Grace period for past_due (give them time to fix payment)
  if (sub.status === 'past_due') return true; // but show warning
  
  // No access
  return false;
}
```

### 3.2 Visibility Rules ✅ Implemented
When subscription is **not active**:
- ❌ Profile page returns 404 (or "Agent unavailable")
- ❌ All properties hidden from public listings
- ❌ Cannot access dashboard (redirect to payment)
- ✅ Can still log in and see "Please renew subscription"

### 3.3 Stripe Integration ✅ Implemented

**Products Created:** (Already exist in Stripe account)
1. **Monthly Subscription** - 199 MXN/month
2. **Credit Packs:**
   - 20 credits - 20 MXN
   - 50 credits - 50 MXN
   - 100 credits - 100 MXN
   - 650 credits - 500 MXN
   - 1350 credits - 1000 MXN

**Webhooks Needed:** ✅ All implemented in `/api/stripe/webhook.ts`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `checkout.session.completed`

**Implementation Details:**
- `api/stripe/webhook.ts` - Handles all webhook events
- `api/stripe/create-checkout.ts` - Creates checkout sessions
- `src/hooks/useSubscription.ts` - Subscription state management
- `src/hooks/useCredits.ts` - Credits state management  
- `src/components/SubscriptionGuard.tsx` - Route protection
- `src/components/BillingTab.tsx` - Billing UI

**Priority:** ✅ Complete
**Effort:** Medium

---

## 📋 PHASE 4: Agent Dashboard ✅ COMPLETED

### 4.1 Dashboard Layout ✅ Implemented
```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Habitex                                   [ES/EN] [👤]  │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  📊 Overview │  Welcome, Barbara!                          │
│  🏘️ Properties│                                              │
│  👤 Profile  │  ┌──────────────┐ ┌──────────────┐          │
│  💳 Billing  │  │ 5 Active     │ │ 47 Credits   │          │
│  🎨 AI Tools │  │ Properties   │ │ Available    │          │
│  ⚙️ Settings │  └──────────────┘ └──────────────┘          │
│              │                                              │
│              │  ✅ AI Video Generator                       │
│              │  Create stunning property videos with AI!    │
│              │  [Select Property] → [Generate] → [Download] │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**Implementation Details:**
- `src/pages/Dashboard.tsx` - Main dashboard component with tab navigation
- `src/hooks/useDashboardStats.ts` - Fetches property stats via `get_agent_dashboard_stats` RPC
- Mobile responsive sidebar with hamburger menu
- Property count display

### 4.2 Properties Management ✅ Implemented
- List of own properties with thumbnail grid
- Add/Edit/Delete properties
- Toggle active/paused status
- Move up/down for display order (reordering)

**Implementation Details:**
- PropertyForm component for CRUD operations
- PropertyTable component for list view
- `handleMoveUp` / `handleMoveDown` functions for reordering

### 4.3 Profile Settings ✅ Implemented
- Edit all profile fields (name, bio, phone, WhatsApp, etc.)
- Preview profile page link
- Change username with real-time availability check
- Toggle profile visibility
- Profile and cover image uploads

**Implementation Details:**
- `src/components/ProfileSettings.tsx` - Full profile editing form
- Username validation with availability check
- Visibility toggle for public/private profiles

### 4.4 Billing ✅ Implemented
- Current plan status display
- Next billing date
- Credit balance (free + paid)
- Purchase credits via Stripe
- Manage subscription via Stripe Customer Portal

**Implementation Details:**
- `src/components/BillingTab.tsx` - Billing UI component
- `src/hooks/useSubscription.ts` - Subscription state
- `src/hooks/useCredits.ts` - Credits state
- Integration with `/api/stripe/create-checkout` for purchases

**Priority:** ✅ Complete
**Effort:** Large

---

## 📋 PHASE 5: Credits & AI Tools ✅ COMPLETED

### 5.1 Credit System ✅ Implemented

**Monthly Refresh:**
- 50 free credits included with subscription
- Reset on billing cycle via Stripe webhook
- Unused credits don't roll over

**Top-up Options:**
| Amount | Price |
|--------|-------|
| 20 credits | 20 MXN |
| 50 credits | 50 MXN |
| 100 credits | 100 MXN |
| 650 credits | 500 MXN |
| 1350 credits | 1000 MXN |

**Implementation Details:**
- `src/hooks/useCredits.ts` - Credit state management with real-time updates
- `src/components/BillingTab.tsx` - Credit purchase UI
- `api/stripe/webhook.ts` - Handles credit purchases and monthly reset
- Database functions: `add_credits()`, `deduct_credits()`, `get_user_credits()`

### 5.2 AI Video Generator ✅ FULLY IMPLEMENTED
**User Flow:**
1. Select property from listings (must have 3+ images)
2. Select 3 images in order for the video
3. Add optional notes for AI guidance
4. Generate 3 AI-enhanced frames (5 credits)
5. Review images with fullscreen viewer
6. Regenerate if needed (5 credits each) with optional updated notes
7. Approve images → Generate script (1 credit)
8. Edit script dialogue (max 25 words per scene for 8 seconds of speech)
9. Approve script → Generate final video (30 credits)
10. Download 9:16 video (24 seconds)

**Credit Costs:**
- Image generation: 5 credits
- Image regeneration: 5 credits
- Script generation: 1 credit
- Video generation: 30 credits
- **Total per complete video: 36 credits**

**Script Format (JSONB):**
```json
[
  { "dialogue": "spoken text", "action": "presenter action", "emotion": "delivery style" },
  { "dialogue": "...", "action": "...", "emotion": "..." },
  { "dialogue": "...", "action": "...", "emotion": "..." }
]
```
User only edits the `dialogue` field; `action` and `emotion` are AI-generated.

**Features:**
- Real-time job status tracking via Supabase subscriptions (optimized for status-only changes)
- Auto-resume active jobs on page reload
- **10-minute completed job persistence** - Completed jobs remain visible as current task for 10 minutes after completion
- **Unified AI Tools tab** - Accessed via AIToolsContainer with tool selector
- **Always-visible job history** - Prominent history section visible on all wizard steps
- Mobile-friendly layout with responsive actions
- Fullscreen image viewer with keyboard navigation
- Collapsible notes editor for regeneration
- Credit refunds on failure
- 20-minute timeout protection
- Credits update instantly in UI after operations

**Implementation Details:**
- `src/components/AIToolsContainer.tsx` - Unified AI tools container with tool selector
- `src/components/AIToolsTab.tsx` - Full wizard UI with step indicator
- `src/hooks/useVideoGeneration.ts` - Job state management with 10-min completed job persistence
- `src/hooks/useCredits.ts` - Credit tracking with real-time updates
- `api/video/generate-images.ts` - Start image generation (5 credits)
- `api/video/approve-images.ts` - Approve images, start script gen (1 credit)
- `api/video/approve-script.ts` - Approve script, start video render (30 credits)
- `video_generation_jobs` table - Job tracking with status flow
- `storage:jobs` bucket - User-scoped asset storage

**External Integrations:**
- n8n webhooks for AI processing:
  - `POST /webhook/real-estate/generate-video/generate-images`
  - `POST /webhook/real-estate/generate-video/approve-images`
  - `POST /webhook/real-estate/generate-video/approve-script`
- Uses `VIDEO_GENERATION_WEBHOOK_AUTH` environment variable

**Priority:** ✅ Complete
**Effort:** Large

---

### 5.3 Video Tour Generator ✅ FULLY IMPLEMENTED
Creates automated video tours from property images with transitions.

**User Flow:**
1. Select property from listings (must have at least 1 image)
2. Select 1-30 images in order for the video tour
3. Generate video (5 credits per image)
4. Download final video

**Credit Costs:**
- **5 credits per image selected**
- Example: 10 images = 50 credits

**Features:**
- Real-time job status tracking via Supabase subscriptions
- Auto-resume active jobs on page reload
- **10-minute completed job persistence** - Completed jobs remain visible as current task for 10 minutes after completion
- **Unified AI Tools tab** - Accessed via AIToolsContainer with tool selector (shared with Video Generator)
- **Always-visible job history** - Prominent history section visible on all wizard steps
- Mobile-friendly layout with larger thumbnails and action buttons
- Credit refunds on failure

**Implementation Details:**
- `src/components/AIToolsContainer.tsx` - Unified AI tools container with tool selector
- `src/components/VideoTourTab.tsx` - Full wizard UI with step indicator
- `src/hooks/useVideoTourGeneration.ts` - Job state management with 10-min completed job persistence
- `api/video/generate-tour.ts` - Start tour generation
- `tour_generation_jobs` table - Job tracking with status: processing, completed, failed

**External Integrations:**
- n8n webhook for video generation:
  - `POST /webhook/real-estate/generate-tour/generate-video`
- Uses `VIDEO_GENERATION_WEBHOOK_AUTH` environment variable

**Priority:** ✅ Complete
**Effort:** Medium

---

## 📋 PHASE 6: Internationalization (i18n) ✅ COMPLETED

### 6.1 Language Support ✅ Implemented
- 🇲🇽 Spanish (default)
- 🇺🇸 English

### 6.2 Implementation ✅ Complete
- Language toggle in header (always visible) ✅
- Save preference in localStorage + profile ✅
- All text in translation files ✅
- URL structure: same URLs, content changes ✅

**Implementation Details:**
- `src/i18n/index.ts` - i18next configuration with profile saving
- `src/i18n/en.ts` - English translations
- `src/i18n/es.ts` - Spanish translations
- `src/components/LanguageSwitcher.tsx` - EN/ES toggle with Supabase sync
- `src/hooks/useLanguageSync.ts` - Loads language preference on login
- `profiles.language_preference` - Database column for persistence

**Note:** Dashboard intentionally kept in Spanish (not translated per business decision)

**Priority:** ✅ Complete  
**Effort:** Medium

---

## 📋 PHASE 7: SEO & Branding ✅ COMPLETED

### 7.1 Branding ✅ Configured
- **Name:** Habitex
- **Tagline:** "Your Real Estate Marketplace in Mexico"
- **Colors:** Primary teal, secondary blue, accent orange
- **Logo:** Located in `/public/branding/`

### 7.2 SEO Enhancements ✅ Implemented
- ✅ Already have: Meta tags, Schema.org, sitemap
- ✅ Agent profile Schema.org (Person/RealEstateAgent)
- ⏳ Per-agent sitemaps (future enhancement)
- ✅ Social share meta tags per property

**Implementation Details:**
- `src/lib/seo.ts`:
  - `getAgentProfileSEO()` - Person/RealEstateAgent Schema.org
  - `getPropertyShareMeta()` - Social share OG tags
  - Enhanced with keywords and og:locale support
- `src/pages/AgentProfile.tsx` - Uses agent SEO function
- `public/robots.txt` - Search engine configuration
- `api/sitemap.xml.ts` - Dynamic sitemap generation

**Priority:** ✅ Complete  
**Effort:** Small

---

## 🗓️ Implementation Order

### Sprint 1 (Week 1-2): Foundation
1. ✅ Database schema updates (profiles with username, whatsapp, etc.)
2. ✅ Landing page with search
3. ✅ Properties page with filters
4. ✅ Agent profile pages (`/:username`)
5. ✅ Mobile-first responsive design

### Sprint 2 (Week 3-4): Users & Auth
1. ✅ Invitation link system
2. ✅ Onboarding flow
3. ✅ Stripe subscription integration
4. ✅ Access control middleware

### Sprint 3 (Week 5-6): Dashboard ✅ COMPLETED
1. ✅ Agent dashboard layout
2. ✅ Property management UI
3. ✅ Profile settings
4. ✅ Billing page

### Sprint 4 (Week 7): Polish ✅ COMPLETED
1. ✅ Credit system UI
2. ✅ AI tools placeholder
3. ✅ Internationalization
4. 🔄 Testing & bug fixes (ongoing)

---

## 🔗 Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | React Context + Hooks |
| Backend | Supabase (Database, Auth, Storage, Realtime) |
| Payments | Stripe (Subscriptions, Credits) |
| Maps | Google Maps API |
| Hosting | Vercel |
| i18n | react-i18next |

---

## 💰 Stripe Products to Create

Run these commands or create in dashboard:

### 1. Monthly Subscription
- **Name:** Suscripción Mensual
- **Price:** 199 MXN / month
- **Product ID:** Save for webhook handling

### 2. Credit Packs (One-time payments)
| Product | Price |
|---------|-------|
| 20 Créditos | 20 MXN |
| 50 Créditos | 50 MXN |
| 100 Créditos | 100 MXN |
| 650 Créditos | 500 MXN |
| 1350 Créditos | 1000 MXN |

---

## 📱 Key User Journeys

### Journey 1: Property Seeker
```
Landing Page → Search/Filter → Properties List → Property Detail → WhatsApp Agent
```

### Journey 2: New Agent (With Trial)
```
Invitation Link → Create Account → Onboarding → Dashboard → Add Properties
                                                     ↓
                              (Trial ends) → Subscribe → Continue
```

### Journey 3: Existing Agent
```
Login → Dashboard → Manage Properties / View Stats / Buy Credits
```

### Journey 4: Subscription Lapse
```
Payment Fails → Properties Hidden → Login → "Renew" Prompt → Pay → Restored
```

---

## ✅ Success Criteria

- [ ] Users can sign up via invitation and complete onboarding
- [ ] Subscription payment works (199 MXN/month)
- [ ] Agent profiles accessible at `domain.com/username`
- [ ] Properties display from all agents with advanced filters
- [ ] WhatsApp button uses property owner's number
- [ ] Mobile experience is flawless
- [ ] Language toggle works (EN/ES)
- [ ] Unpaid users have properties hidden
- [ ] Credit balance visible and top-ups work
- [ ] AI tools section shows "Coming Soon"

---

## 🚀 Next Steps

1. **Approve this plan** - Any changes or additions?
2. **Create Stripe products** - Monthly sub + credit packs
3. **Update database schema** - Add new profile fields
4. **Start Sprint 1** - Build landing + properties pages

---

*Last Updated: June 24, 2025*
