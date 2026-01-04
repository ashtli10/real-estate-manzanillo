/**
 * Serverless function to generate dynamic sitemap
 * This endpoint is designed for Vercel serverless functions
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SITE_URL = 'https://www.habitex.mx';

interface RequestHandler {
  (req: any, res: any): Promise<void>;
}

const handler: RequestHandler = async (req, res) => {
  // Set appropriate headers for XML
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published properties
    const { data: properties, error } = await supabase
      .from('properties')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      res.status(500).send('Error generating sitemap');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const urls = [
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
      ...(properties || []).map(property => ({
        loc: `${SITE_URL}/propiedad/${property.slug}`,
        lastmod: property.updated_at?.split('T')[0] || today,
        changefreq: 'weekly',
        priority: '0.8'
      }))
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.status(200).send(xml);

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Error generating sitemap');
  }
};

export default handler;
