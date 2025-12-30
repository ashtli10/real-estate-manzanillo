# 🗄️ Database Schema Documentation

**Last Edited: 2025-12-29**

**Real Estate Manzanillo Platform**  
*Complete Database Setup with Strict RLS Policies*

---

## 📊 Database Overview

The platform uses **8 tables + 1 storage bucket** with comprehensive Row Level Security (RLS) policies, performance indexes, and helper functions for secure and efficient data access.

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
| **storage.objects** | - | ✅ | Property images (properties bucket) |

---

## 🔒 Security Model

### RLS Policy Counts by Table

- **profiles**: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- **properties**: 6 policies (3 SELECT variants, INSERT, UPDATE, DELETE)
- **subscriptions**: 5 policies
- **credits**: 4 policies
- **credit_transactions**: 4 policies
- **invitation_tokens**: 4 policies (admin-only)
- **user_roles**: 5 policies
- **audit_logs**: 2 policies (admin-only)
- **storage.objects (properties bucket)**: 4 policies (INSERT, UPDATE, DELETE, SELECT)

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
- `type` (TEXT) - 'purchased', 'used', 'free_monthly', 'refund', 'bonus'
- `description` (TEXT)
- `metadata` (JSONB)

**RLS Policies:**
- ✅ Users can view own transactions
- ✅ Admins can view all transactions
- ❌ Only admins can insert transactions (via functions)
- ❌ Only admins can delete (for corrections)
- 🔒 No updates allowed (append-only)

**Indexes:**
- `idx_credit_transactions_user_id`
- `idx_credit_transactions_created_at`
- `idx_credit_transactions_type`

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
- `status` (TEXT) - 'draft', 'pending', 'active', 'sold', 'rented', 'paused', 'archived'
- `price`, `currency` (default 'MXN')
- `is_for_sale`, `is_for_rent`, `rent_price`, `rent_currency`
- `images`, `videos` (TEXT[])
- `location_city`, `location_state`, `location_neighborhood`, `location_address`
- `location_lat`, `location_lng`, `show_map`
- `characteristics` (JSONB) - Property features
- `custom_bonuses` (JSONB)
- `is_featured`, `display_order`

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

### 9. **storage.objects (properties bucket)**
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

## 🔧 Helper Functions

### Security Functions

1. **`has_role(user_id UUID, role TEXT) → BOOLEAN`**
   - Checks if user has specific role
   - Used extensively in RLS policies

2. **`has_active_subscription(user_id UUID) → BOOLEAN`**
   - Returns true if user has active subscription
   - Considers: 'active', 'trialing' (with valid trial_ends_at), 'past_due'
   - **Critical for property visibility**

### Credit Management Functions

3. **`add_credits(user_id UUID, amount INT, type TEXT, description TEXT)`**
   - Adds credits to user balance
   - Creates transaction record
   - Types: 'purchased', 'free_monthly', 'bonus', 'refund'

4. **`deduct_credits(user_id UUID, amount INT, description TEXT)`**
   - Deducts credits (free first, then paid)
   - Creates transaction record
   - Returns false if insufficient balance
   - Security: Only user can deduct own credits

5. **`get_user_credits(user_id UUID) → (balance, free_remaining, last_reset)`**
   - Gets current credit status
   - Security: Only user can view own credits

### Subscription Functions

6. **`get_subscription_status(user_id UUID) → TABLE(...)`**
   - Returns full subscription details
   - Includes computed `is_active` field

### Invitation Functions

7. **`validate_invitation_token(token TEXT) → (is_valid, email, trial_days)`**
   - Checks if token is valid and not expired
   - Returns token details

8. **`use_invitation_token(token TEXT, user_id UUID) → BOOLEAN`**
   - Marks token as used
   - Creates subscription with trial period
   - Returns false if token invalid/expired/already used

### Utility Triggers

9. **`generate_property_slug()`**
   - Auto-generates unique slug from title + property type + random suffix
   - Example: "casa-en-manzanillo-departamento-a3b4c5d6"

10. **`update_*_updated_at()`**
    - Triggers for profiles, subscriptions, credits, properties
    - Auto-updates `updated_at` timestamp

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

**Total Migrations Applied:** 32

**Key Migrations:**
1. `create_performance_indexes` - 30+ indexes for fast queries
2. `create_subscription_helper_function` - has_active_subscription()
3. `rebuild_*_rls_policies` - 8 migrations rebuilding RLS policies
4. `create_update_triggers` - Auto-update timestamps
5. `remove_analytics_tables` - Removed property_views and property_leads tables

---

## 🚀 Next Steps

### Database ✅ COMPLETE
- ✅ All tables created
- ✅ Strict RLS policies in place
- ✅ Performance indexes added
- ✅ Helper functions and triggers active

### Application Development (Pending)
1. **Stripe Webhook Integration**
   - Handle subscription lifecycle events
   - Update subscriptions table via admin role
   - Process credit purchases

2. **Frontend Implementation**
   - Public property listing with filters
   - Agent dashboard
   - Credit management UI

3. **Edge Functions** (None yet)
   - Stripe webhook handler
   - Email notifications
   - Image processing/optimization
   - AI video generation (future)

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

**Last Updated:** December 29, 2025  
**Database Version:** PostgreSQL 14.1 (Supabase)  
**Status:** ✅ Production Ready  
**Total RLS Policies:** 39 (35 table policies + 4 storage policies)
