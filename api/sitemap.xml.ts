/**
 * Enhanced Sitemap Generator for Habitex
 * 
 * Generates comprehensive sitemap including:
 * - Static pages (home, properties listing)
 * - All visible agent profiles (/{username})
 * - All active property listings (/propiedad/{slug})
 * 
 * @see MIGRATION_PLAN.md Phase 7
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SITE_URL = 'https://www.habitex.mx';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

interface RequestHandler {
  (req: any, res: any): Promise<void>;
}

/**
 * Escapes special XML characters in URLs
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats a date to YYYY-MM-DD format for sitemap lastmod
 */
function formatDate(date: string | null | undefined, fallback: string): string {
  if (!date) return fallback;
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return fallback;
  }
}

const handler: RequestHandler = async (req, res) => {
  // Set appropriate headers for XML
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  res.setHeader('X-Robots-Tag', 'noindex'); // Sitemap itself shouldn't be indexed

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split('T')[0];

    // Fetch all visible agent profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .eq('is_visible', true)
      .not('username', 'is', null)
      .order('updated_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Fetch all active properties with their owner info
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        slug,
        updated_at,
        is_featured,
        profiles!inner(username, is_visible)
      `)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
    }

    // Filter properties to only include those from visible agents
    const visibleProperties = (properties || []).filter(
      (p: any) => p.profiles?.is_visible === true
    );

    // Build sitemap URLs
    const urls: SitemapUrl[] = [
      // Static pages - highest priority
      {
        loc: SITE_URL,
        lastmod: today,
        changefreq: 'daily',
        priority: '1.0'
      },
      {
        loc: `${SITE_URL}/propiedades`,
        lastmod: today,
        changefreq: 'daily',
        priority: '0.9'
      },
      
      // Agent profile pages - high priority
      ...(profiles || [])
        .filter((p: any) => p.username) // Ensure username exists
        .map((profile: any) => ({
          loc: `${SITE_URL}/${escapeXml(profile.username)}`,
          lastmod: formatDate(profile.updated_at, today),
          changefreq: 'weekly' as const,
          priority: '0.8'
        })),
      
      // Property pages - featured properties get higher priority
      ...visibleProperties.map((property: any) => ({
        loc: `${SITE_URL}/propiedad/${escapeXml(property.slug)}`,
        lastmod: formatDate(property.updated_at, today),
        changefreq: 'weekly' as const,
        priority: property.is_featured ? '0.8' : '0.7'
      }))
    ];

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    // Log sitemap stats for monitoring
    console.log(`[Sitemap] Generated: ${urls.length} URLs (${(profiles || []).length} profiles, ${visibleProperties.length} properties)`);

    res.status(200).send(xml);

  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Error generating sitemap</error>');
  }
};

export default handler;
