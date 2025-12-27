# Inmobiliaria Manzanillo - Setup Guide

This document provides instructions for setting up and using the Inmobiliaria Manzanillo real estate marketplace.

## Overview

Inmobiliaria Manzanillo is a secure, multi-tenant real estate marketplace platform built for agents and brokers in Manzanillo, Colima, Mexico. The platform features:

- **Invitation-only signups** - Secure agent onboarding via admin-generated links
- **Subscription model** - 199 MXN/month with configurable trial periods
- **AI Credits system** - 50 free credits/month + unlimited paid top-ups
- Beautiful sea-inspired design with blues, whites, and sand colors
- Fully responsive layout optimized for mobile and desktop
- Secure multi-tenant property management
- Real-time property updates via Supabase subscriptions
- Stripe integration for payments and subscriptions

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database, Authentication, Storage, RLS)
- **Payments**: Stripe (Subscriptions, One-time payments)
- **Hosting**: Vercel (Serverless Functions)
- **Icons**: Lucide React
- **Validation**: Zod + React Hook Form
- **SEO**: JSON-LD Structured Data (Schema.org)

## Initial Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe (set STRIPE_MODE to 'live' for production)
STRIPE_MODE=test
VITE_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_...
```

### 2. Database Migrations

Run all migrations in the `supabase/migrations` folder in order:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in chronological order
4. The marketplace foundation migration creates:
   - `profiles` - User profile data
   - `invitation_tokens` - Signup invitation links
   - `subscriptions` - User subscriptions
   - `credits` - AI credit balances
   - `credit_transactions` - Credit usage history
   - `audit_logs` - Security audit trail

### 3. Create Admin User

To access the admin panel:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Enter an email and password for the admin
5. Save the user
6. Add the user to the `user_roles` table with role `admin`

The admin can then log in at `/login` or by clicking the "Admin" button in the header.

### 4. Configure Stripe Webhooks

For payment processing to work correctly:

1. Go to your Stripe Dashboard → Developers → Webhooks
2. Add an endpoint: `https://your-domain.com/api/stripe-webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_TEST_WEBHOOK_SECRET` (or live equivalent)

### 5. Add Sample Data (Optional)

To populate the database with sample properties:

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `seed-data.sql` (in the project root)
4. Paste and run the SQL in the editor

This will create 6 sample properties with realistic data and images.

## Platform Workflow

### Invitation-Only Signups

1. Admin logs in and goes to Admin → Invitations tab
2. Click "Nueva invitación" to create an invitation link
3. Optionally pre-fill email and set trial days (default: 14)
4. Copy the generated link and share with the agent
5. Agent uses the link to sign up at `/signup?token=...`
6. Agent account is created with the configured trial period

### Subscription Management

- Users can view subscription status in Dashboard → Suscripción
- Subscribe or manage subscription via Stripe Checkout/Portal
- Subscription status syncs automatically via webhooks
- When subscription expires/fails, user properties are hidden from public

### AI Credits

- Every user gets 50 free credits reset monthly
- Additional credits can be purchased in packages
- Credits are deducted when using AI tools (coming soon)

## Using the Website

### Public Pages

#### Home Page (`/`)
- Hero section with description of Inmobiliaria Manzanillo
- Three benefit cards highlighting key features
- Automatic carousel of featured properties
- Grid of featured properties below the carousel

#### Properties Page (`/propiedades`)
- Complete catalog of active properties
- Search bar for filtering by title, location, or description
- Filters for property type, price range, and beach proximity
- Responsive grid layout with property cards

#### Property Detail Page (`/propiedad/:id`)
- Image gallery with navigation
- Price and location information
- Key statistics (bedrooms, bathrooms, size, parking)
- Custom bonus tags
- Detailed description
- Property details in organized sections
- Amenities list
- Google Maps integration (if coordinates are provided)
- Contact form

### Admin Panel

#### Login (`/login`)
- Secure authentication using Supabase Auth
- Only registered admin users can access

#### Admin Dashboard (`/admin`)
After logging in, admins can:

**Create Properties:**
1. Click "Nueva Propiedad"
2. Fill in all property details:
   - Basic info: title, description, price
   - Location: city, state, neighborhood, address
   - Property details: type, bedrooms, bathrooms, sizes, parking, levels, age, condition
   - Amenities: comma-separated list
   - Custom bonuses: comma-separated tags
   - Images: one URL per line
   - Settings: featured status, display order, status, near beach
3. Click "Guardar"

**Edit Properties:**
1. Click the edit icon next to any property
2. Modify the desired fields
3. Click "Guardar"

**Delete Properties:**
1. Click the trash icon next to any property
2. Confirm deletion

**Reorder Properties:**
- Use the up/down arrows to change the display order
- This affects both the catalog and carousel order

## Property Fields Explained

### Basic Information
- **Title**: Property name (shown in cards and detail page)
- **Description**: Full property description
- **Price**: Price in MXN

### Location
- **City**: City name (default: Manzanillo)
- **State**: State name (default: Colima)
- **Neighborhood**: Neighborhood or subdivision name
- **Address**: Full street address
- **Coordinates**: Latitude and longitude for map display

### Property Details
- **Type**: house, apartment, land, or commercial
- **Bedrooms**: Number of bedrooms
- **Bathrooms**: Number of bathrooms (supports decimals like 2.5)
- **Total Size**: Total lot size in m²
- **Construction Size**: Built area in m²
- **Parking Spaces**: Number of parking spots
- **Levels**: Number of floors
- **Age**: Property age in years (0 for new)
- **Condition**: new, used, or remodeled
- **Orientation**: Cardinal direction (N, S, E, W)

### Features
- **Amenities**: Array of features (kitchen, pool, garden, etc.)
- **Custom Bonuses**: Special tags displayed prominently
- **Services Included**: Water, electricity, gas, internet
- **Nearby Services**: Schools, hospitals, shopping

### Media
- **Images**: Array of image URLs (use Pexels or other stock photo sites)

### Settings
- **Is Featured**: Show in homepage carousel
- **Display Order**: Numeric order for sorting
- **Status**: active, sold, or rented (only active shown publicly)
- **Near Beach**: Special beach proximity badge

## Image Guidelines

For best results with property images:

1. **Use high-quality images** from Pexels or similar stock photo sites
2. **Recommended resolution**: 1600x1000 or higher
3. **First image** is used as the main thumbnail
4. **Multiple images** create a gallery on the detail page
5. **Example URL format**: `https://images.pexels.com/photos/[ID]/pexels-photo-[ID].jpeg?auto=compress&cs=tinysrgb&w=1600`

## Customization Tips

### Colors
The site uses a sea-inspired color palette:
- **Primary Blue**: `from-blue-600 to-cyan-500`
- **Accent Cyan**: `from-cyan-500 to-blue-500`
- **Sand/Neutral**: Grays and whites

To customize colors, search for these Tailwind classes in the component files.

### Content
All user-facing text is in Spanish. To modify:
- Edit text strings in component files (`.tsx` files)
- Update metadata in `index.html`

### Branding
- Logo appears in the header (currently using Building2 icon)
- To add a custom logo image, replace the icon in `Header.tsx`
- Update company information in `Footer.tsx`

## Security Notes

- **RLS (Row Level Security)** is enabled on the properties table
- **Public users** can only read active properties
- **Admin users** can create, update, and delete all properties
- **Authentication** is required for all admin operations
- **Passwords** are securely hashed by Supabase
- **Never expose** Supabase service role key in frontend code

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Supabase connection in `.env` file
3. Ensure admin user is created in Supabase Auth
4. Check that RLS policies are correctly applied

## New Features

### SEO Optimization
- **Dynamic Meta Tags**: All pages now have proper title, description, and social media tags
- **Structured Data**: Properties include Schema.org markup for better search engine understanding
- **Sitemap**: Auto-generated sitemap at `/sitemap.xml`
- **Breadcrumbs**: Navigation breadcrumbs on all pages for better UX and SEO

### Real-Time Updates
- **Live Property Data**: Properties update automatically when changes are made in the database
- **API Endpoint**: `/api/properties` provides real-time property data with filtering
- **WebSocket Subscriptions**: Automatic updates without page refresh

### SEO Testing
- Visit `/seo-validator.html` to test SEO implementation locally
- See `DEPLOYMENT.md` for production deployment and SEO testing guides

## Production Deployment

Before deploying to production:

1. **Set environment variables** on your hosting platform (Vercel)
2. **Create admin user** in production Supabase
3. **Add real property data** through admin panel
4. **Test all features** on mobile and desktop
5. **Submit sitemap** to Google Search Console
6. **Verify structured data** using Google Rich Results Test
5. **Update contact information** in Footer component
6. **Configure custom domain** if desired

The site is optimized and ready for production use!
