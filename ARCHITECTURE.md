# BN Inmobiliaria - Architecture Overview

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

## SEO Components

### Dynamic Meta Tags (All Pages)
- **Home**: Brand-focused, local keywords
- **Properties**: Catalog description, filtering info
- **PropertyDetail**: Property-specific title, price, location

### Structured Data (Schema.org)
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

### Sitemap Structure
```xml
<urlset>
  <url>
    <loc>https://www.bninmobiliaria.com</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.bninmobiliaria.com/propiedades</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.bninmobiliaria.com/propiedad/[slug]</loc>
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

## Monitoring & Analytics

### Recommended Setup
1. **Google Search Console**: Submit sitemap, monitor indexing
2. **Google Analytics**: Track user behavior
3. **Vercel Analytics**: Monitor deployment performance
4. **Supabase Dashboard**: Monitor database queries

## File Structure
```
├── api/
│   ├── properties.ts          # Property API endpoint
│   └── sitemap.xml.ts         # Sitemap generator
├── public/
│   ├── robots.txt             # Crawler instructions
│   └── seo-validator.html     # SEO testing tool
├── src/
│   ├── components/
│   │   └── Breadcrumb.tsx     # Navigation breadcrumbs
│   ├── hooks/
│   │   └── useRealtimeProperties.ts  # Real-time subscriptions
│   ├── lib/
│   │   └── seo.ts             # SEO utilities
│   └── pages/
│       ├── Home.tsx           # SEO: Home page
│       ├── Properties.tsx     # SEO: Properties list
│       └── PropertyDetail.tsx # SEO: Property detail
├── DEPLOYMENT.md              # Deployment guide
├── IMPLEMENTATION_SUMMARY.md  # This summary
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
