/**
 * SEO Utilities for BN Inmobiliaria
 * Handles meta tags, structured data, and SEO optimization
 */

import type { Property } from '../types/property';
import { formatPrice } from '../types/property';

export interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  structuredData?: object;
}

const SITE_NAME = 'BN Inmobiliaria';
const SITE_URL = 'https://www.bninmobiliaria.com';
const DEFAULT_IMAGE = 'https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=1200';

/**
 * Updates document meta tags for SEO
 */
export function updateMetaTags(config: SEOConfig) {
  // Update title
  document.title = config.title;

  // Update or create meta description
  updateMetaTag('name', 'description', config.description);

  // Canonical URL
  if (config.canonical) {
    updateLinkTag('canonical', config.canonical);
  }

  // Open Graph tags
  updateMetaTag('property', 'og:title', config.title);
  updateMetaTag('property', 'og:description', config.description);
  updateMetaTag('property', 'og:type', config.ogType || 'website');
  updateMetaTag('property', 'og:url', config.canonical || window.location.href);
  updateMetaTag('property', 'og:image', config.ogImage || DEFAULT_IMAGE);
  updateMetaTag('property', 'og:site_name', SITE_NAME);

  // Twitter Card tags
  updateMetaTag('name', 'twitter:card', 'summary_large_image');
  updateMetaTag('name', 'twitter:title', config.title);
  updateMetaTag('name', 'twitter:description', config.description);
  updateMetaTag('name', 'twitter:image', config.ogImage || DEFAULT_IMAGE);

  // Structured data
  if (config.structuredData) {
    updateStructuredData(config.structuredData);
  }
}

/**
 * Helper to update or create meta tags
 */
function updateMetaTag(attrName: string, attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

/**
 * Helper to update or create link tags
 */
function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
}

/**
 * Updates structured data (JSON-LD) in the document
 */
function updateStructuredData(data: object) {
  // Remove existing structured data
  const existing = document.querySelector('script[type="application/ld+json"]#structured-data');
  if (existing) {
    existing.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'structured-data';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Generates SEO config for home page
 */
export function getHomeSEO(): SEOConfig {
  return {
    title: `${SITE_NAME} - Tu hogar ideal en Manzanillo, Colima`,
    description: 'BN Inmobiliaria - Especialistas en bienes raíces en Manzanillo, Colima. Encuentra tu hogar ideal cerca de las playas, plazas comerciales y restaurantes. Casas, departamentos y terrenos en venta y renta.',
    canonical: SITE_URL,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
      description: 'Especialistas en bienes raíces en Manzanillo, Colima',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Manzanillo',
        addressRegion: 'Colima',
        addressCountry: 'MX'
      },
      areaServed: {
        '@type': 'City',
        name: 'Manzanillo',
        '@id': 'https://www.wikidata.org/wiki/Q1129876'
      }
    }
  };
}

/**
 * Generates SEO config for properties list page
 */
export function getPropertiesListSEO(): SEOConfig {
  return {
    title: `Propiedades en Venta y Renta en Manzanillo - ${SITE_NAME}`,
    description: 'Explora nuestro catálogo completo de propiedades en Manzanillo, Colima. Casas, departamentos, terrenos y locales comerciales. Filtra por precio, tipo y ubicación.',
    canonical: `${SITE_URL}/propiedades`,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Propiedades en Manzanillo',
      description: 'Catálogo de propiedades en venta y renta',
      url: `${SITE_URL}/propiedades`
    }
  };
}

/**
 * Generates SEO config for individual property page
 */
export function getPropertySEO(property: Property): SEOConfig {
  const PRICE_CONSULT_TEXT = 'Consultar precio';
  const price = property.is_for_sale ? formatPrice(property.price) : PRICE_CONSULT_TEXT;
  const location = [property.location_neighborhood, property.location_city]
    .filter(Boolean)
    .join(', ');

  const title = `${property.title} - ${price} - ${SITE_NAME}`;
  const description = property.description
    ? property.description.substring(0, 155) + '...'
    : `${property.title} en ${location}. ${property.bedrooms} recámaras, ${property.bathrooms} baños, ${property.total_size_m2}m².`;

  const images = property.images && property.images.length > 0 
    ? property.images[0] 
    : DEFAULT_IMAGE;

  // Build structured data for property
  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': property.property_type === 'commercial' ? 'Store' : 'House',
    name: property.title,
    description: property.description || title,
    url: `${SITE_URL}/propiedad/${property.slug}`,
    image: images,
  };

  // Add address if available
  if (property.location_address || property.location_neighborhood) {
    structuredData.address = {
      '@type': 'PostalAddress',
      streetAddress: property.location_address || '',
      addressLocality: property.location_city || 'Manzanillo',
      addressRegion: property.location_state || 'Colima',
      addressCountry: 'MX'
    };
  }

  // Add geo coordinates if available
  if (property.coordinates) {
    const [lat, lng] = property.coordinates.split(',').map(s => parseFloat(s.trim()));
    if (!isNaN(lat) && !isNaN(lng)) {
      structuredData.geo = {
        '@type': 'GeoCoordinates',
        latitude: lat,
        longitude: lng
      };
    }
  }

  // Add property details
  if (property.is_for_sale) {
    structuredData.offers = {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'MXN',
      availability: property.is_published ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'RealEstateAgent',
        name: SITE_NAME
      }
    };
  }

  // Add additional property info
  structuredData.numberOfRooms = property.bedrooms;
  structuredData.numberOfBathroomsTotal = property.bathrooms;
  structuredData.floorSize = {
    '@type': 'QuantitativeValue',
    value: property.total_size_m2,
    unitCode: 'MTK' // Square meters
  };

  return {
    title,
    description,
    canonical: `${SITE_URL}/propiedad/${property.slug}`,
    ogImage: images,
    ogType: 'article',
    structuredData
  };
}

/**
 * Generates sitemap XML for all properties
 */
export async function generateSitemap(properties: Property[]): Promise<string> {
  const urls = [
    {
      loc: SITE_URL,
      changefreq: 'daily',
      priority: '1.0',
      lastmod: new Date().toISOString().split('T')[0]
    },
    {
      loc: `${SITE_URL}/propiedades`,
      changefreq: 'daily',
      priority: '0.9',
      lastmod: new Date().toISOString().split('T')[0]
    },
    ...properties.map(property => ({
      loc: `${SITE_URL}/propiedad/${property.slug}`,
      changefreq: 'weekly' as const,
      priority: '0.8',
      lastmod: property.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
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

  return xml;
}
