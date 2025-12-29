import { useEffect, useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Building2, Grid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../integrations/supabase/client';
import type { Property } from '../types/property';
import { PropertyCard } from '../components/PropertyCard';
import { Breadcrumb } from '../components/Breadcrumb';
import { AdvancedFilters, PropertyFilters } from '../components/AdvancedFilters';
import { transformProperty } from '../lib/propertyTransform';
import { updateMetaTags, getPropertiesListSEO } from '../lib/seo';

interface PropertiesProps {
  onNavigate: (path: string) => void;
  onUpdateWhatsappMessage: (message: string) => void;
}

const defaultFilters: PropertyFilters = {
  propertyType: 'all',
  listingType: 'all',
  location: 'all',
  minPrice: null,
  maxPrice: null,
  bedrooms: null,
  bathrooms: null,
  featured: false,
  sortBy: 'newest',
};

export function Properties({ onNavigate, onUpdateWhatsappMessage }: PropertiesProps) {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadProperties();
    updateMetaTags(getPropertiesListSEO());
    
    // Parse URL params on load
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const type = params.get('type');
    const listing = params.get('listing');
    const location = params.get('location');
    
    if (q) setSearchQuery(q);
    if (type || listing || location) {
      setFilters(prev => ({
        ...prev,
        propertyType: type || 'all',
        listingType: (listing as 'all' | 'sale' | 'rent') || 'all',
        location: location || 'all',
      }));
    }
  }, []);

  useEffect(() => {
    onUpdateWhatsappMessage(t('whatsapp.defaultMessage'));
  }, [onUpdateWhatsappMessage, t]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties((data || []).map(transformProperty));
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNumberCharacteristic = (property: Property, key: string) => {
    const match = property.characteristics.find((c) => c.key === key && c.type === 'number');
    return match ? Number(match.value) : null;
  };

  const filteredProperties = useMemo(() => {
    let result = [...properties];

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.location_neighborhood?.toLowerCase().includes(query) ||
        p.location_city?.toLowerCase().includes(query)
      );
    }

    // Property type filter
    if (filters.propertyType !== 'all') {
      result = result.filter(p => p.property_type === filters.propertyType);
    }

    // Listing type filter
    if (filters.listingType === 'sale') {
      result = result.filter(p => p.is_for_sale);
    } else if (filters.listingType === 'rent') {
      result = result.filter(p => p.is_for_rent);
    }

    // Location filter
    if (filters.location !== 'all') {
      result = result.filter(p => 
        p.location_neighborhood?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Price filter
    if (filters.minPrice !== null || filters.maxPrice !== null) {
      result = result.filter(p => {
        const price = filters.listingType === 'rent' ? p.rent_price : p.price;
        if (!price) return false;
        if (filters.minPrice !== null && price < filters.minPrice) return false;
        if (filters.maxPrice !== null && price > filters.maxPrice) return false;
        return true;
      });
    }

    // Bedrooms filter
    if (filters.bedrooms !== null) {
      result = result.filter(p => {
        const bedrooms = getNumberCharacteristic(p, 'bedrooms');
        if (bedrooms === null) return false;
        return filters.bedrooms === 5 ? bedrooms >= 5 : bedrooms === filters.bedrooms;
      });
    }

    // Bathrooms filter
    if (filters.bathrooms !== null) {
      result = result.filter(p => {
        const bathrooms = getNumberCharacteristic(p, 'bathrooms');
        if (bathrooms === null) return false;
        return filters.bathrooms === 4 ? bathrooms >= 4 : bathrooms === filters.bathrooms;
      });
    }

    // Featured filter
    if (filters.featured) {
      result = result.filter(p => p.is_featured);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price_asc':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'views':
        result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case 'newest':
      default:
        // Already sorted by created_at desc
        break;
    }

    return result;
  }, [properties, searchQuery, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.propertyType !== 'all') count++;
    if (filters.listingType !== 'all') count++;
    if (filters.location !== 'all') count++;
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    if (filters.bedrooms !== null) count++;
    if (filters.bathrooms !== null) count++;
    if (filters.featured) count++;
    return count;
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <Breadcrumb 
          items={[{ label: t('properties.title') }]} 
          onNavigate={onNavigate}
        />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t('properties.title')}</h1>
          <p className="text-gray-600">{t('properties.subtitle')}</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('landing.hero.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap lg:flex-nowrap">
              {/* Listing Type Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['all', 'sale', 'rent'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilters({ ...filters, listingType: type })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.listingType === type
                        ? type === 'sale'
                          ? 'bg-blue-600 text-white'
                          : type === 'rent'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {type === 'all' ? t('properties.filters.all') : 
                     type === 'sale' ? t('properties.filters.forSale') : 
                     t('properties.filters.forRent')}
                  </button>
                ))}
              </div>

              {/* Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                <span>{t('common.filters')}</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* View Mode Toggle (Desktop) */}
              <div className="hidden md:flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:hidden'}`}>
            <div className="sticky top-24">
              <AdvancedFilters
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilters(false)}
                isOpen={showFilters}
                propertyCount={filteredProperties.length}
              />
            </div>
          </div>

          {/* Properties Grid */}
          <div className="flex-1">
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                {t('properties.found', { count: filteredProperties.length })}
              </p>
              {/* Sort dropdown for mobile */}
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as PropertyFilters['sortBy'] })}
                className="md:hidden px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="newest">{t('properties.filters.sortNewest')}</option>
                <option value="price_asc">{t('properties.filters.sortPriceAsc')}</option>
                <option value="price_desc">{t('properties.filters.sortPriceDesc')}</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">{t('properties.noResults')}</p>
                <p className="text-gray-500">{t('properties.adjustFilters')}</p>
                <button
                  onClick={() => {
                    setFilters(defaultFilters);
                    setSearchQuery('');
                  }}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('common.clearFilters')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
