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
  ogType?: 'website' | 'article' | 'profile';
  structuredData?: object;
  keywords?: string;
}

export interface AgentProfile {
  id: string;
  username: string;
  full_name: string;
  bio?: string | null;
  company_name?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  cover_image?: string | null;
  whatsapp_number?: string | null;
  phone_number?: string | null;
  created_at: string;
  properties_count?: number;
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
  updateMetaTag('property', 'og:locale', 'es_MX');

  // Twitter Card tags
  updateMetaTag('name', 'twitter:card', 'summary_large_image');
  updateMetaTag('name', 'twitter:title', config.title);
  updateMetaTag('name', 'twitter:description', config.description);
  updateMetaTag('name', 'twitter:image', config.ogImage || DEFAULT_IMAGE);

  // Keywords
  if (config.keywords) {
    updateMetaTag('name', 'keywords', config.keywords);
  }

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

  // Helper to get characteristic value
  const getCharValue = (key: string): number | boolean | null => {
    const char = property.characteristics?.find(c => c.key === key);
    return char ? char.value : null;
  };

  const bedrooms = getCharValue('bedrooms') as number | null;
  const bathrooms = getCharValue('bathrooms') as number | null;
  const sizeTotal = getCharValue('size_total') as number | null;

  const title = `${property.title} - ${price} - ${SITE_NAME}`;
  const description = property.description
    ? property.description.substring(0, 155) + '...'
    : `${property.title} en ${location}.${bedrooms ? ` ${bedrooms} recámaras,` : ''}${bathrooms ? ` ${bathrooms} baños,` : ''}${sizeTotal ? ` ${sizeTotal}m².` : ''}`;

  const images = property.images && property.images.length > 0 
    ? property.images[0] 
    : DEFAULT_IMAGE;

  // Build structured data for property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': property.property_type === 'local' ? 'Store' : 'House',
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
  if (property.location_lat && property.location_lng) {
    structuredData.geo = {
      '@type': 'GeoCoordinates',
      latitude: property.location_lat,
      longitude: property.location_lng
    };
  }

  // Add property details
  if (property.is_for_sale) {
    structuredData.offers = {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'MXN',
      availability: property.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'RealEstateAgent',
        name: SITE_NAME
      }
    };
  }

  // Add additional property info from characteristics
  if (bedrooms) structuredData.numberOfRooms = bedrooms;
  if (bathrooms) structuredData.numberOfBathroomsTotal = bathrooms;
  if (sizeTotal) {
    structuredData.floorSize = {
      '@type': 'QuantitativeValue',
      value: sizeTotal,
      unitCode: 'MTK' // Square meters
    };
  }

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

/**
 * Generates SEO config for agent profile page
 * Implements Person/RealEstateAgent Schema.org structured data
 */
export function getAgentProfileSEO(agent: AgentProfile): SEOConfig {
  const fullName = agent.full_name || agent.username;
  const description = agent.bio 
    ? agent.bio.substring(0, 155) + (agent.bio.length > 155 ? '...' : '')
    : `${fullName} - Agente inmobiliario en Manzanillo. ${agent.properties_count || 0} propiedades disponibles. Encuentra casas, departamentos y terrenos.`;

  const keywords = [
    fullName,
    'agente inmobiliario',
    'bienes raíces',
    'Manzanillo',
    'Colima',
    agent.company_name,
    agent.location,
    'casas en venta',
    'departamentos',
  ].filter(Boolean).join(', ');

  const image = agent.avatar_url || agent.cover_image || DEFAULT_IMAGE;

  // Build RealEstateAgent structured data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: fullName,
    url: `${SITE_URL}/${agent.username}`,
    image: image,
    description: agent.bio || `Agente inmobiliario en Manzanillo`,
  };

  // Add company affiliation
  if (agent.company_name) {
    structuredData.worksFor = {
      '@type': 'Organization',
      name: agent.company_name,
    };
  }

  // Add location
  if (agent.location) {
    structuredData.areaServed = {
      '@type': 'City',
      name: agent.location,
    };
  }

  structuredData.address = {
    '@type': 'PostalAddress',
    addressLocality: agent.location || 'Manzanillo',
    addressRegion: 'Colima',
    addressCountry: 'MX',
  };

  // Add contact information (if public)
  if (agent.whatsapp_number || agent.phone_number) {
    structuredData.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Spanish', 'English'],
    };
    if (agent.phone_number) {
      structuredData.contactPoint.telephone = agent.phone_number;
    }
  }

  // Add member since
  if (agent.created_at) {
    structuredData.foundingDate = agent.created_at.split('T')[0];
  }

  // Add number of properties as offers
  if (agent.properties_count && agent.properties_count > 0) {
    structuredData.makesOffer = {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Product',
        name: 'Real Estate Listings',
        description: `${agent.properties_count} propiedades disponibles`,
      },
    };
  }

  return {
    title: `${fullName} - Agente Inmobiliario en Manzanillo | ${SITE_NAME}`,
    description,
    canonical: `${SITE_URL}/${agent.username}`,
    ogImage: image,
    ogType: 'profile',
    keywords,
    structuredData,
  };
}

/**
 * Generates social share meta tags for a property
 */
export function getPropertyShareMeta(property: Property): {
  title: string;
  description: string;
  image: string;
  url: string;
} {
  const PRICE_CONSULT_TEXT = 'Consultar precio';
  const price = property.is_for_sale ? formatPrice(property.price) : PRICE_CONSULT_TEXT;
  const location = [property.location_neighborhood, property.location_city]
    .filter(Boolean)
    .join(', ');

  const getCharValue = (key: string): number | boolean | null => {
    const char = property.characteristics?.find(c => c.key === key);
    return char ? char.value : null;
  };

  const bedrooms = getCharValue('bedrooms') as number | null;
  const bathrooms = getCharValue('bathrooms') as number | null;

  let details = '';
  if (bedrooms) details += `${bedrooms} rec. `;
  if (bathrooms) details += `${bathrooms} baños `;

  return {
    title: `${property.title} - ${price}`,
    description: `${property.title} en ${location || 'Manzanillo'}. ${details}${property.is_for_sale ? 'En venta' : ''}${property.is_for_rent ? ' En renta' : ''}`,
    image: property.images?.[0] || DEFAULT_IMAGE,
    url: `${SITE_URL}/propiedad/${property.slug}`,
  };
}

