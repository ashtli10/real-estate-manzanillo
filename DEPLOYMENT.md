# BN Inmobiliaria - Deployment & SEO Guide

**Last Edited: 2025-06-29**

## Deployment to Vercel

This application is optimized for deployment on Vercel with the following features:

### Prerequisites
1. Vercel account
2. Supabase project with the following environment variables set

### Environment Variables

Set these in your Vercel project settings:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Deployment Steps

1. **Connect to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel
   ```

2. **Configure Domain**
   - Set your custom domain in Vercel dashboard
   - Update `SITE_URL` in `src/lib/seo.ts` to match your domain

3. **Verify API Routes**
   - `/api/properties` - Real-time property data
   - `/api/sitemap.xml` - Dynamic sitemap

## SEO Features

### Implemented Features

✅ **Meta Tags**
- Dynamic title, description, and keywords for all pages
- Open Graph tags for social media sharing
- Twitter Card tags
- Geo-location tags for local SEO

✅ **Structured Data (Schema.org)**
- RealEstateAgent organization schema
- Property (House/Store) schema with:
  - Address information
  - Geo-coordinates
  - Price and availability
  - Property details (rooms, size, etc.)

✅ **Sitemap**
- Dynamic XML sitemap at `/sitemap.xml`
- Auto-updates with new properties
- Proper change frequency and priority settings

✅ **Robots.txt**
- Located at `/public/robots.txt`
- Configured to allow all crawlers
- References sitemap location

✅ **Internal Linking**
- Breadcrumb navigation on all pages
- Contextual links between pages
- Proper anchor text usage

✅ **Performance**
- Optimized images
- Code splitting
- Caching headers

### SEO Testing

1. **Test Structured Data**
   ```
   https://search.google.com/test/rich-results
   ```
   Enter your URL to validate Schema.org markup

2. **Test Mobile-Friendliness**
   ```
   https://search.google.com/test/mobile-friendly
   ```

3. **PageSpeed Insights**
   ```
   https://pagespeed.web.dev/
   ```

4. **Validate Sitemap**
   - Check `/sitemap.xml` is accessible
   - Submit to Google Search Console

### Google Search Console Setup

1. **Add Property**
   - Go to https://search.google.com/search-console
   - Add your domain
   - Verify ownership (DNS or file upload)

2. **Submit Sitemap**
   - Navigate to Sitemaps section
   - Submit: `https://www.bninmobiliaria.com/sitemap.xml`

3. **Monitor Coverage**
   - Check for indexing errors
   - Review performance metrics

## Real-Time Features

### API Endpoints

**GET /api/properties**
- Returns real-time property data from Supabase
- Query parameters:
  - `featured=true` - Only featured properties
  - `limit=10` - Limit results
  - `propertyType=house` - Filter by type
  - `minPrice=1000000` - Minimum price
  - `maxPrice=5000000` - Maximum price
  - `nearBeach=true` - Beach proximity filter
  - `slug=property-slug` - Single property by slug

Example:
```
GET /api/properties?featured=true&limit=6
```

**GET /api/sitemap.xml**
- Generates dynamic XML sitemap
- Includes all published properties
- Updates automatically

### Real-Time Subscriptions

The app uses Supabase real-time subscriptions to update properties automatically when:
- New properties are added
- Properties are updated
- Properties are deleted

This is implemented via the `useRealtimeProperties` hook.

## Performance Optimization

### Current Build Stats
- Main bundle: ~598 KB (170 KB gzipped)
- CSS: ~42 KB (7.4 KB gzipped)

### Optimization Tips
1. Consider implementing dynamic imports for large components
2. Use image optimization (WebP format)
3. Implement lazy loading for images
4. Consider CDN for static assets

## Monitoring

### Recommended Tools
- **Google Analytics** - Track user behavior
- **Google Search Console** - Monitor SEO performance
- **Vercel Analytics** - Monitor deployment and performance
- **Supabase Dashboard** - Monitor database performance

## Security Headers

The following security headers are configured in `vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

## Cache Strategy

- **API Routes**: 60 seconds cache with stale-while-revalidate
- **Sitemap**: 1 hour cache with stale-while-revalidate

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review browser console for client-side errors
4. Verify environment variables are set correctly
