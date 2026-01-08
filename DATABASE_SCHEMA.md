# 🗄️ Database Schema Documentation

**Last Edited: 2026-01-08**

> **Note:** The `tour_generation_jobs` table has been removed. Run the SQL at the end of this file to drop it from your database.

**Habitex Platform**  
*Complete Database Setup with Strict RLS Policies*

---

## 🆕 Recent Changes (January 6, 2026)

### Storage Maintenance (Scheduled Cleanup)
- **Replaced on-delete triggers** with scheduled `storage-maintenance` Edge Function
- **pg_cron runs daily at 3:00 AM UTC** via `run_storage_maintenance()` function
- **Benefits**: No race conditions with async media processing, simpler architecture, more reliable

### Invitation Token Fix
- **Fixed** `validate_invitation_token` and `use_invitation_token` search_path to `public` with schema-qualified table access (prevents `42P01` relation errors on invite links)

### Security Improvements
- **Fixed infinite recursion in RLS policies**: Created `is_admin()` SECURITY DEFINER function to check admin status without triggering RLS on `user_roles` table
- **All RLS policies updated** to use `is_admin()` instead of self-referencing subqueries
- **Edge Functions deployed** with `--no-verify-jwt` flag (auth handled inside functions)

### Property Status Simplification
- **Simplified status values**: Only `draft`, `active`, `paused` (removed: pending, sold, rented, archived)
- **Subscription enforcement trigger**: Cannot set status to `active` without active subscription
- **Automatic property pausing**: When subscription ends, all active properties become `paused`
- **Automatic reactivation**: When subscription resumes, all paused properties become `active`

### Dashboard Stats Simplification
- **Simplified `get_agent_dashboard_stats()`**: Now only returns `user_id`, `total_properties`, `active_properties`
- Removed: `total_views`, `total_leads`, `views_this_week`, `leads_this_month` (tables deleted)

### Key Features
1. **Auto-saving drafts** - Form state preserved across sessions
2. **Supabase Edge Functions** - AI prefill, video generation, storage cleanup
3. **R2 Storage** - All media on Cloudflare R2 with cleanup triggers
4. **Credit tracking** - Proper transaction logging for AI usage

---

## �📊 Database Overview

The platform uses **10 tables + 2 storage buckets** with comprehensive Row Level Security (RLS) policies, performance indexes, and helper functions for secure and efficient data access.

### Tables Summary

| Table | Rows | RLS | Description |
|-------|------|-----|-------------|
| **profiles** | 2 | ✅ | User/Agent profiles with contact info and settings |
| **user_roles** | 2 | ✅ | Role assignments (admin, agent, user) |
| **invitation_tokens** | 0 | ✅ | Invitation links for new agent registration |
| **subscriptions** | 1 | ✅ | Stripe subscription management |
| **credits** | 3 | ✅ | AI credits balance tracking |
| **credit_transactions** | 0 | ✅ | Credit usage and purchase history |
| **audit_logs** | 0 | ✅ | System audit trail (admin only) |
| **properties** | 1 | ✅ | Property listings with full details |
| **property_drafts** | 1+ | ✅ | Persistent property form drafts with AI prefill support |
| **video_generation_jobs** | 0 | ✅ | AI video generation job tracking |
| **storage:properties** | - | ✅ | Property images bucket |
| **storage:jobs** | - | ✅ | AI video generation assets bucket |

---

## 🔒 Security Model

### RLS Policy Counts by Table

- **profiles**: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- **properties**: 6 policies (3 SELECT variants, INSERT, UPDATE, DELETE)
- **property_drafts**: 5 policies (CRUD for own, admin full access)
- **subscriptions**: 5 policies
- **credits**: 4 policies
- **credit_transactions**: 4 policies
- **invitation_tokens**: 4 policies (admin-only)
- **user_roles**: 5 policies
- **audit_logs**: 2 policies (admin-only)
- **video_generation_jobs**: 4 policies (SELECT, INSERT, UPDATE for own, admin full access)
- **storage:properties bucket**: 4 policies (INSERT, UPDATE, DELETE, SELECT)
- **storage:jobs bucket**: 5 policies (SELECT, INSERT, UPDATE, DELETE for own folder, service role full access)

### Key Security Features

1. **Subscription-Based Visibility**: Properties from agents without active subscriptions are automatically hidden from public view
2. **Admin Separation**: Admin-only tables (invitations, audit logs) strictly controlled
3. **Self-Service with Limits**: Users can manage their own data but cannot access others'
4. **Audit Trail**: Credit transactions and audit logs are append-only
5. **Secure File Storage**: Only authenticated users can upload/modify images, public read access

---

## 📋 Table Details

### 1. **profiles**
Stores agent/user profile information including contact details and settings.

**Key Columns:**
- `id` (UUID, PK) - Links to auth.users
- `email` (TEXT) - User email
- `username` (TEXT, UNIQUE) - For profile URL (domain.com/username)
- `full_name`, `phone_number`, `whatsapp_number`
- `company_name`, `bio`, `location`
- `profile_image`, `cover_image`
- `is_visible` (BOOLEAN) - Public visibility toggle
- `onboarding_completed` (BOOLEAN)
- `stripe_customer_id` (TEXT)
- `language_preference` (TEXT) - 'es' or 'en'

**RLS Policies:**
- ✅ Public can view visible profiles
- ✅ Users can view/update own profile
- ✅ Admins can view/update/delete all profiles
- ❌ Only user can insert their own profile

**Indexes:**
- `idx_profiles_username`
- `idx_profiles_email`
- `idx_profiles_is_visible`
- `idx_profiles_stripe_customer_id`

---

### 2. **user_roles**
Role-based access control.

**Key Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `role` (TEXT) - 'admin', 'agent', 'user'

**RLS Policies:**
- ✅ Users can view own roles
- ✅ Admins can view all roles
- ✅ Users can self-assign 'agent' role during onboarding
- ❌ Only admins can assign other roles
- ❌ Only admins can update/delete roles

**Indexes:**
- `idx_user_roles_user_id`
- `idx_user_roles_role`

---

### 3. **invitation_tokens**
Admin-generated invitation links for new agents.

**Key Columns:**
- `id` (UUID, PK)
- `token` (TEXT, UNIQUE) - Random token
- `email` (TEXT, NULLABLE) - Pre-fill email
- `trial_days` (INT) - 0-90 days, default 14
- `expires_at` (TIMESTAMPTZ)
- `used_at`, `used_by`
- `created_by` (UUID, FK → auth.users)
- `notes` (TEXT) - Internal notes

**RLS Policies:**
- ❌ Only admins can SELECT/INSERT/UPDATE/DELETE
- 🔒 Public functions `validate_invitation_token()` and `use_invitation_token()` handle token usage

**Indexes:**
- `idx_invitation_tokens_token`
- `idx_invitation_tokens_email`
- `idx_invitation_tokens_expires_at`

---

### 4. **subscriptions**
Stripe subscription tracking.

**Key Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, UNIQUE, FK → auth.users)
- `stripe_subscription_id` (TEXT)
- `stripe_customer_id` (TEXT)
- `status` (TEXT) - 'trialing', 'active', 'past_due', 'canceled', 'paused', 'incomplete', 'incomplete_expired', 'none'
- `plan_type` (TEXT) - 'standard', 'premium', 'enterprise', 'none'
- `trial_ends_at`, `current_period_start`, `current_period_end`
- `cancel_at_period_end` (BOOLEAN)
- `canceled_at` (TIMESTAMPTZ)

**RLS Policies:**
- ✅ Users can view own subscription
- ✅ Users can insert own subscription (one-time)
- ❌ Only admins can update subscriptions (Stripe webhooks use admin role)
- ❌ Only admins can delete subscriptions

**Helper Function:**
- `has_active_subscription(user_id UUID) → BOOLEAN`

**Indexes:**
- `idx_subscriptions_user_id`
- `idx_subscriptions_status`
- `idx_subscriptions_stripe_subscription_id`
- `idx_subscriptions_stripe_customer_id`

---

### 5. **credits**
AI credit balance tracking.

**Key Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, UNIQUE, FK → auth.users)
- `balance` (INT) - Purchased credits
- `free_credits_remaining` (INT) - Monthly free credits (50)
- `last_free_credit_reset` (TIMESTAMPTZ)

**RLS Policies:**
- ✅ Users can view own credits
- ✅ Users can insert own credits (handled by trigger)
- ❌ Only admins can update credits directly
- 🔒 Use `add_credits()` and `deduct_credits()` functions

**Functions:**
- `add_credits(user_id, amount, type, description)`
- `deduct_credits(user_id, amount, description)` - Deducts from free first, then paid
- `get_user_credits(user_id) → (balance, free_remaining, last_reset)`

**Indexes:**
- `idx_credits_user_id`

---

### 6. **credit_transactions**
Audit trail for all credit changes.

**Key Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `amount` (INT) - Positive for add, negative for deduct
- `product` (TEXT, NOT NULL, DEFAULT 'Créditos') - Human-readable Spanish product/service name
- `description` (TEXT, NULLABLE) - Optional additional notes
- `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ)

**Product Values (Spanish, human-readable):**
- `Créditos mensuales` - Monthly subscription credits
- `Compra de créditos` - Credit purchase
- `Video IA - Imágenes` - AI Video: Image generation
- `Video IA - Guión` - AI Video: Script generation
- `Video IA - Renderizado` - AI Video: Final video render
- `IA Autocompletado` - AI property prefill
- `Reembolso - Video IA` - AI Video refund

**RLS Policies:**
- ✅ Users can view own transactions
- ✅ Admins can view all transactions
- ❌ Only admins can insert transactions (via functions)
- ❌ Only admins can delete (for corrections)
- 🔒 No updates allowed (append-only)

**Indexes:**
- `idx_credit_transactions_user_id`
- `idx_credit_transactions_created_at`
- `idx_credit_transactions_product`

---

### 7. **audit_logs**
System-wide audit trail (admin only).

**Key Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, NULLABLE, FK → auth.users)
- `action` (TEXT)
- `resource_type`, `resource_id`
- `details` (JSONB)
- `ip_address`, `user_agent`

**RLS Policies:**
- ❌ Only admins can view
- ✅ System can insert (authenticated users for logging)
- 🔒 No updates or deletes (permanent audit trail)

**Indexes:**
- `idx_audit_logs_user_id`
- `idx_audit_logs_created_at`
- `idx_audit_logs_action`

---

### 8. **properties**
Property listings with full details.

**Key Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users) - Property owner
- `title`, `description`, `slug` (UNIQUE)
- `property_type` (TEXT) - 'casa', 'departamento', 'terreno', 'local', 'oficina', 'bodega', 'otro'
- `status` (TEXT) - 'draft', 'active', 'paused' (enforced by CHECK constraint)
  - `draft`: Not published, user is still editing
  - `active`: Published and visible (requires active subscription)
  - `paused`: System-managed, set when subscription lapses
- `price`, `currency` (default 'MXN')
- `is_for_sale`, `is_for_rent`, `rent_price`, `rent_currency`
- `images`, `videos` (TEXT[])
- `location_city`, `location_state`, `location_neighborhood`, `location_address`
- `location_lat`, `location_lng`, `show_map`
- `characteristics` (JSONB) - Property features
- `custom_bonuses` (JSONB)
- `is_featured`, `display_order`
- `image_count` (INT, DEFAULT 0) - Number of images uploaded (max 75)
- `video_count` (INT, DEFAULT 0) - Number of videos uploaded (max 3)

**RLS Policies:**
- ✅ **Public can view active properties** IF:
  - Property status = 'active'
  - Owner profile is_visible = true
  - Owner has active subscription (`has_active_subscription()`)
- ✅ Users can view/update/delete own properties
- ✅ Admins can view/update/delete all properties
- ✅ Users can insert their own properties

**Triggers:**
- `generate_property_slug()` - Auto-generates slug from title + type + random suffix
- `update_properties_updated_at()` - Auto-updates updated_at on changes
- `on_property_delete` - Cleans up R2 storage files via Edge Function (pg_net)

**Indexes:**
- `idx_properties_user_id`
- `idx_properties_status`
- `idx_properties_property_type`
- `idx_properties_is_featured`
- `idx_properties_slug`
- `idx_properties_location_neighborhood`
- `idx_properties_created_at`
- `idx_properties_price`
- `idx_properties_is_for_sale`
- `idx_properties_is_for_rent`
- `idx_properties_active_sale` (composite)
- `idx_properties_active_rent` (composite)

---

### 9. **property_drafts**
Persistent storage for property form drafts, allowing users to save progress and resume later.

**Key Columns:**
- `id` (UUID, PK) - Draft identifier
- `user_id` (UUID, FK → auth.users) - Draft owner
- `property_id` (UUID, FK → properties, NULLABLE) - NULL for new properties, set when editing existing
- `pre_allocated_property_id` (UUID, NULLABLE) - Pre-allocated UUID for new properties. Generated when draft is created, used for R2 upload paths so files are stored in final location from the start. Used as the property ID when inserting new property.
- `form_data` (JSONB) - Complete form state as PropertyInsert
- `current_step` (TEXT) - Current wizard step ('basic', 'price', 'location', etc.)
- `ai_text` (TEXT, NULLABLE) - AI prefill input text
- `uploaded_files` (TEXT[], DEFAULT '{}') - R2 file paths for cleanup on draft deletion
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Unique Constraint:**
- `(user_id, property_id)` - One draft per property per user

**RLS Policies:**
- ✅ Users can view own drafts
- ✅ Users can insert own drafts
- ✅ Users can update own drafts
- ✅ Users can delete own drafts
- ✅ Admins can manage all drafts

**Triggers:**
- `trigger_update_property_drafts_updated_at` - Auto-updates updated_at on changes
- `on_draft_delete` - Cleans up uploaded R2 files via Edge Function (pg_net)

**Helper Functions:**
- `cleanup_old_property_drafts()` - Deletes drafts older than 7 days

**Indexes:**
- `idx_property_drafts_user_id`
- `idx_property_drafts_updated_at`

---

### 10. **video_generation_jobs**
Tracks AI video generation jobs with status, generated images, scripts, and final video URLs.

**Key Columns:**
- `id` (UUID, PK) - Job identifier
- `user_id` (UUID, FK → auth.users) - Job owner
- `property_id` (UUID, FK → properties) - Associated property
- `status` (TEXT) - 'pending', 'processing', 'images_ready', 'script_ready', 'completed', 'failed'
- `selected_images` (TEXT[]) - 3 images selected by user from property
- `notes` (TEXT) - Optional custom instructions
- `image_urls` (TEXT[]) - 3 generated AI images
- `script` (JSONB) - Array of 3 script scene objects:
  ```json
  [
    { "dialogue": "spoken text", "action": "presenter action", "emotion": "delivery style" },
    { "dialogue": "...", "action": "...", "emotion": "..." },
    { "dialogue": "...", "action": "...", "emotion": "..." }
  ]
  ```
- `video_url` (TEXT) - Final video URL
- `error_message` (TEXT) - Error details if failed
- `credits_charged` (INT) - Total credits charged for this job
- `credits_refunded` (BOOLEAN) - Whether credits were refunded
- `completed_at` (TIMESTAMPTZ) - Completion timestamp

**RLS Policies:**
- ✅ Users can view own video jobs
- ✅ Users can insert own video jobs
- ✅ Users can update own video jobs (for script editing)
- ✅ Admins can manage all video jobs (full CRUD)

**Triggers:**
- `trigger_update_video_generation_jobs_updated_at` - Auto-updates updated_at on changes
- `on_video_job_delete` - Cleans up R2 storage files via Edge Function (pg_net)

**Indexes:**
- `idx_video_generation_jobs_user_id`
- `idx_video_generation_jobs_property_id`
- `idx_video_generation_jobs_status`
- `idx_video_generation_jobs_created_at`

**Status Flow:**
```
pending → processing → images_ready → (user approves) → 
processing → script_ready → (user approves) →
processing → completed
                    ↓
                  failed (at any step, with refund)
```

**Deletion Behavior:**
- When regenerating images, the old job is deleted first
- Deletion cascades to storage: all generated images (in `/jobs/{user_id}/{job_id}/`) are removed
- Uses proper URL parsing to handle query parameters in image URLs
- Explicit `user_id` filter ensures only own jobs can be deleted
- Comprehensive error logging for debugging storage/database failures

---

### 10. **storage.objects (properties bucket)**
File storage for property images with RLS protection.

**Bucket Configuration:**
- `bucket_id`: 'properties'
- `public`: true (for serving images via CDN)
- Files stored at: `properties/{timestamp}-{random}.{ext}`

**RLS Policies:**
- ✅ **INSERT** - Authenticated users can upload to properties bucket
- ✅ **UPDATE** - Authenticated users can update images in properties bucket
- ✅ **DELETE** - Authenticated users can delete images in properties bucket
- ✅ **SELECT** - Public read access (anyone can view property images)

---

### 11. **storage.objects (jobs bucket)**
File storage for AI-generated video assets with user-scoped access.

**Bucket Configuration:**
- `bucket_id`: 'jobs'
- `public`: true (for sharing completed video URLs)
- Files stored at: `jobs/{user_id}/{job_id}/{filename}`

**RLS Policies:**
- ✅ **SELECT** - Users can read files in their own folder (`jobs/{userId}/*`)
- ✅ **INSERT** - Users can upload to their own folder
- ✅ **UPDATE** - Users can update files in their own folder
- ✅ **DELETE** - Users can delete files in their own folder
- ✅ **ALL** - Service role has full access (for API/webhooks)

---

## 🔧 Helper Functions

### Security Functions

1. **`is_admin(check_user_id UUID DEFAULT NULL) → BOOLEAN`** ⭐ NEW
   - SECURITY DEFINER function that bypasses RLS to check admin status
   - Prevents infinite recursion when used in RLS policies
   - Returns false if user is NULL or not an admin
   - Used by ALL RLS policies for admin checks

2. **`has_role(user_id UUID, role TEXT) → BOOLEAN`**
   - Checks if user has specific role
   - ⚠️ DEPRECATED for RLS policies - use `is_admin()` instead

3. **`has_active_subscription(user_id UUID) → BOOLEAN`**
   - Returns true if user has active subscription
   - Considers: 'active', 'trialing' (with valid trial_ends_at), 'past_due'
   - **Critical for property visibility**

### Credit Management Functions

4. **`add_credits(user_id UUID, amount INT, product TEXT DEFAULT 'Créditos')`**
   - Adds credits to user balance
   - Creates transaction record with product name
   - Used for: subscription grants, purchases, refunds, bonuses

5. **`deduct_credits(user_id UUID, amount INT, product TEXT DEFAULT 'Créditos')`**
   - Deducts credits (free first, then paid)
   - Creates transaction record with product name
   - Returns false if insufficient balance
   - Security: Only user can deduct own credits

6. **`get_user_credits(user_id UUID) → (balance, free_remaining, last_reset)`**
   - Gets current credit status
   - Security: Only user can view own credits

### Subscription Functions

7. **`get_subscription_status(user_id UUID) → TABLE(...)`**
   - Returns full subscription details
   - Includes computed `is_active` field

### Property Status Management Functions ⭐ NEW

8. **`enforce_subscription_for_active_status()` (TRIGGER FUNCTION)**
   - Prevents setting property status to `active` without subscription
   - Blocks changing `paused` to anything except `draft` without subscription
   - Called by `enforce_subscription_on_property_status` trigger

9. **`pause_user_properties(p_user_id UUID) → INTEGER`**
   - Sets all `active` properties to `paused` for a user
   - Called by Stripe webhook when subscription becomes inactive
   - Returns count of properties paused

10. **`reactivate_user_properties(p_user_id UUID) → INTEGER`**
    - Sets all `paused` properties to `active` for a user
    - Called by Stripe webhook when subscription becomes active
    - Returns count of properties reactivated

### Invitation Functions

11. **`validate_invitation_token(token TEXT) → (is_valid, email, trial_days)`**
   - Checks if token is valid and not expired
   - Returns token details

12. **`use_invitation_token(token TEXT, user_id UUID) → BOOLEAN`**
   - Marks token as used
   - Creates subscription with trial period
   - Returns false if token invalid/expired/already used

### Utility Triggers

13. **`generate_property_slug()`**
   - Auto-generates unique slug from title + property type + random suffix
   - Example: "casa-en-mexico-departamento-a3b4c5d6"

14. **`update_*_updated_at()`**
    - Triggers for profiles, subscriptions, credits, properties
    - Auto-updates `updated_at` timestamp

### Storage Cleanup Functions (pg_net)

These functions are used by AFTER DELETE triggers to clean up R2 storage when entities are deleted. They use the `pg_net` extension for async HTTP calls to Edge Functions with service role authentication.

15. **`get_supabase_url()`**
    - Retrieves Supabase project URL from vault
    - Used by cleanup triggers for Edge Function calls

16. **`get_service_role_key()`**
    - Retrieves Supabase service role key from vault
    - Used by cleanup triggers to authenticate Edge Function calls
    - **Vault secret required:** `supabase_service_role_key`

12. **`trigger_cleanup_property_files()`**
    - Called by `on_property_delete` trigger
    - Uses service role key for authentication
    - Cleans up: `users/{user_id}/properties/{property_id}/*`

13. **`trigger_cleanup_video_job_files()`**
    - Called by `on_video_job_delete` trigger
    - Uses service role key for authentication
    - Cleans up: `users/{user_id}/ai-jobs/{job_id}/*`

14. **`trigger_cleanup_user_files()`**
    - Called by `on_user_delete` trigger
    - Uses service role key for authentication
    - Cleans up: `users/{user_id}/*` (entire user folder)

15. **`trigger_cleanup_draft_files()`**
    - Called by `on_draft_delete` trigger
    - Uses service role key for authentication
    - Cleans up specific files listed in `uploaded_files` array

**Vault Secrets Required:**
```sql
-- Add these secrets to vault for cleanup triggers to work:
INSERT INTO vault.secrets (name, secret) VALUES 
  ('supabase_url', 'https://YOUR_PROJECT_REF.supabase.co'),
  ('supabase_service_role_key', 'YOUR_SERVICE_ROLE_KEY');
```

---

## 📊 Dashboard Statistics Function

### `get_agent_dashboard_stats(agent_user_id UUID)`
Aggregated statistics for agent dashboard with security.

**Parameters:**
- `agent_user_id` (UUID, optional) - User to get stats for (defaults to auth.uid())

**Returns:**
- `user_id` (UUID)
- `total_properties` (BIGINT)
- `active_properties` (BIGINT)

**Security:**
- Users can only view their own stats
- Admins can view any user's stats

**Usage:**
```sql
-- Get own stats
SELECT * FROM get_agent_dashboard_stats();

-- Admin getting stats for specific user
SELECT * FROM get_agent_dashboard_stats('user-uuid-here');
```

---

## 🎯 Key Security Patterns

### 1. Subscription-Aware Property Visibility

Properties are only visible to public if:
```sql
status = 'active'
AND owner.is_visible = true
AND has_active_subscription(owner.id) = true
```

This ensures:
- Unpaid agents' properties are automatically hidden
- Properties remain in database for when agent renews
- No manual intervention required

### 2. Admin-Only Operations

Tables with admin-only access:
- `invitation_tokens` - Only admins manage invitations
- `audit_logs` - Only admins view audit trail
- Subscription updates - Only admins (via Stripe webhooks)
- Credit updates - Only admins (direct updates, not via functions)

### 3. Self-Service with Limits

Users can:
- ✅ View/update own profile, properties, credits, subscription
- ✅ Insert own properties (no quantity limit enforced at DB level)
- ✅ Self-assign 'agent' role during onboarding
- ❌ Cannot modify subscription status (only Stripe webhooks)
- ❌ Cannot directly update credits (must use functions)
- ❌ Cannot modify other users' data

---

## 🔍 Performance Optimization

### Index Strategy

1. **Foreign Keys**: All FK columns indexed
2. **Common Filters**: Status, type, location indexed
3. **Sorting**: created_at, price indexed
4. **Partial Indexes**: For boolean flags (is_featured, is_visible)
5. **Composite Indexes**: For common query patterns (status + is_for_sale + created_at)

### Query Patterns

**Most Common Queries:**
1. Get active properties for public listing
2. Get agent's own properties
3. Get dashboard stats for agent
4. Search properties by location/type/price

All optimized with appropriate indexes.

---

## ✅ Migration Summary

**Total Migrations Applied:** 45

**Key Migrations:**
1. `create_performance_indexes` - 30+ indexes for fast queries
2. `create_subscription_helper_function` - has_active_subscription()
3. `rebuild_*_rls_policies` - 8 migrations rebuilding RLS policies
4. `create_update_triggers` - Auto-update timestamps
5. `remove_analytics_tables` - Removed property_views and property_leads tables

**Phase 4 Migrations (January 6, 2026):**
1. `enable_pg_net_extension` - Enable async HTTP for triggers
2. `add_file_count_columns_to_properties` - Add image_count, video_count
3. `add_uploaded_files_to_property_drafts` - Track draft file uploads
4. `create_storage_cleanup_trigger_functions` - R2 cleanup functions
5. `create_storage_cleanup_triggers` - 4 AFTER DELETE triggers

---

## 🚀 Next Steps

### Database ✅ COMPLETE
- ✅ All tables created
- ✅ Strict RLS policies in place
- ✅ Performance indexes added
- ✅ Helper functions and triggers active
- ✅ Storage cleanup triggers (pg_net) ready

### Edge Functions ✅ COMPLETE (Phase 5)
- ✅ `storage-cleanup` - R2 folder deletion via S3 API
- ✅ `properties` - Public property listing with filters
- ✅ `ai-prefill` - AI property form prefill (2 credits)
- ✅ `video-generation` - AI video pipeline (unified endpoint)

### Frontend ✅ COMPLETE (Phase 6)
- ✅ ImageUpload.tsx - R2 storage with sequence-based naming
- ✅ VideoUpload.tsx - R2 storage with thumbnail/preview display
- ✅ ProfileSettings.tsx - R2 avatar upload
- ✅ PropertyDetail.tsx - R2 video thumbnails
- ✅ Dashboard.tsx - Cleanup via DB triggers
- ✅ All hooks use Edge Function URLs with Vercel fallback

### Remaining Work (Phase 7+)
1. **Vercel Cleanup**
   - Remove old API routes (properties, prefill, video/*)
   - Keep Stripe webhooks and sitemap
   - Enhance sitemap with agent profiles

2. **Edge Function Deployment**
   - Deploy functions to Supabase
   - Configure secrets (N8N_*, R2_*)
   - Test with live requests

3. **Integration Testing**
   - Full end-to-end flow testing
   - n8n webhook updates

---

## 📖 Usage Examples

### Check User Access

```sql
-- Check if user can access dashboard
SELECT has_active_subscription(auth.uid());

-- Check user role
SELECT has_role(auth.uid(), 'admin');

-- Get user credits
SELECT * FROM get_user_credits(auth.uid());
```

### Property Queries

```sql
-- Get all public properties (respects RLS)
SELECT * FROM properties WHERE status = 'active';

-- Get agent's own properties
SELECT * FROM properties WHERE user_id = auth.uid();

-- Get dashboard stats
SELECT * FROM get_agent_dashboard_stats();
```

### Credit Operations

```sql
-- Add credits (via function, not direct INSERT)
SELECT add_credits(
  auth.uid(), 
  100, 
  'purchased', 
  'Purchased 100 credits via Stripe'
);

-- Deduct credits
SELECT deduct_credits(
  auth.uid(), 
  5, 
  'AI video frame generation'
);
```

---

**Last Updated:** January 6, 2026  
**Database Version:** PostgreSQL 14.1 (Supabase)  
**Status:** ✅ Production Ready  
**Total RLS Policies:** 39 (35 table policies + 4 storage policies)
**Storage:** Cloudflare R2 with cleanup triggers via pg_net

---

## 🚨 Migration: Drop tour_generation_jobs Table

Run the following SQL in the Supabase SQL editor to remove the deprecated `tour_generation_jobs` table:

```sql
-- Drop tour_generation_jobs table and all related objects
DROP TABLE IF EXISTS tour_generation_jobs CASCADE;

-- Remove any related triggers (if they exist)
DROP FUNCTION IF EXISTS update_tour_generation_jobs_updated_at() CASCADE;
```
