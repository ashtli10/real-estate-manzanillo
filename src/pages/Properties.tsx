import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, Home as HomeIcon } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import type { Property } from '../types/property';
import { PropertyCard } from '../components/PropertyCard';
import { Breadcrumb } from '../components/Breadcrumb';
import { transformProperty } from '../lib/propertyTransform';
import { updateMetaTags, getPropertiesListSEO } from '../lib/seo';

interface PropertiesProps {
  onNavigate: (path: string) => void;
  onUpdateWhatsappMessage: (message: string) => void;
}

export function Properties({ onNavigate, onUpdateWhatsappMessage }: PropertiesProps) {
  const { t, i18n } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    propertyType: 'all',
    priceRange: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProperties();
    // Update SEO meta tags for properties list page
    updateMetaTags(getPropertiesListSEO());
  }, []);

  useEffect(() => {
    onUpdateWhatsappMessage(t('propertiesPage.whatsappMessage'));
  }, [onUpdateWhatsappMessage, t]);

  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, filters]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProperties((data || []).map(transformProperty));
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...properties];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower)) ||
          (p.location_neighborhood && p.location_neighborhood.toLowerCase().includes(searchLower))
      );
    }

    if (filters.propertyType !== 'all') {
      filtered = filtered.filter((p) => p.property_type === filters.propertyType);
    }

    if (filters.priceRange !== 'all') {
      const ranges: Record<string, [number, number]> = {
        '0-1000000': [0, 1000000],
        '1000000-3000000': [1000000, 3000000],
        '3000000-5000000': [3000000, 5000000],
        '5000000+': [5000000, Infinity],
      };
      const [min, max] = ranges[filters.priceRange] || [0, Infinity];
      filtered = filtered.filter((p) => {
        const salePrice = p.is_for_sale ? p.price : null;
        if (salePrice === null) return false;
        return salePrice >= min && salePrice < max;
      });
    }

    setFilteredProperties(filtered);
  };

  // Get translated property types
  const getPropertyTypeLabel = (type: string) => {
    return t(`property.types.${type}`, type);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-10">
        <Breadcrumb 
          items={[{ label: t('nav.properties') }]} 
          onNavigate={onNavigate}
        />
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="w-full md:max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('propertiesPage.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span>{t('common.filters')}</span>
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('propertiesPage.propertyType')}
                </label>
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">{t('common.all')}</option>
                  <option value="casa">{getPropertyTypeLabel('casa')}</option>
                  <option value="departamento">{getPropertyTypeLabel('departamento')}</option>
                  <option value="terreno">{getPropertyTypeLabel('terreno')}</option>
                  <option value="comercial">{getPropertyTypeLabel('comercial')}</option>
                  <option value="bodega">{getPropertyTypeLabel('bodega')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('propertiesPage.priceRange')}
                </label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">{t('common.all')}</option>
                  <option value="0-1000000">{t('propertiesPage.upTo')} $1,000,000</option>
                  <option value="1000000-3000000">$1,000,000 - $3,000,000</option>
                  <option value="3000000-5000000">$3,000,000 - $5,000,000</option>
                  <option value="5000000+">{t('propertiesPage.moreThan')} $5,000,000</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">{t('propertiesPage.loadingProperties')}</p>
          </div>
        ) : filteredProperties.length > 0 ? (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                {t('common.showing')} <span className="font-semibold">{filteredProperties.length}</span>{' '}
                {filteredProperties.length === 1 ? t('common.property') : t('common.properties')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <HomeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">{t('propertiesPage.noPropertiesFound')}</p>
            <p className="text-gray-500">{t('propertiesPage.adjustFilters')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
