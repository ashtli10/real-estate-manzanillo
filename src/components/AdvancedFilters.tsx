import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LocationAutocomplete } from './LocationAutocomplete';

export interface PropertyFilters {
  propertyType: string;
  listingType: 'all' | 'sale' | 'rent';
  location: string;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  featured: boolean;
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'views';
}

interface AdvancedFiltersProps {
  filters: PropertyFilters;
  onChange: (filters: PropertyFilters) => void;
  onClose?: () => void;
  isOpen: boolean;
  propertyCount?: number;
}

const propertyTypes = [
  { value: 'all', labelKey: 'properties.filters.all' },
  { value: 'casa', labelKey: 'propertyTypes.casa' },
  { value: 'departamento', labelKey: 'propertyTypes.departamento' },
  { value: 'terreno', labelKey: 'propertyTypes.terreno' },
  { value: 'local', labelKey: 'propertyTypes.local' },
  { value: 'oficina', labelKey: 'propertyTypes.oficina' },
];

const priceRanges = {
  sale: [
    { min: null, max: null, label: 'Any' },
    { min: 0, max: 1000000, label: '< $1M' },
    { min: 1000000, max: 3000000, label: '$1M - $3M' },
    { min: 3000000, max: 5000000, label: '$3M - $5M' },
    { min: 5000000, max: 10000000, label: '$5M - $10M' },
    { min: 10000000, max: null, label: '> $10M' },
  ],
  rent: [
    { min: null, max: null, label: 'Any' },
    { min: 0, max: 10000, label: '< $10K' },
    { min: 10000, max: 20000, label: '$10K - $20K' },
    { min: 20000, max: 50000, label: '$20K - $50K' },
    { min: 50000, max: null, label: '> $50K' },
  ],
};

export function AdvancedFilters({ filters, onChange, onClose, isOpen, propertyCount }: AdvancedFiltersProps) {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState(filters);
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    rooms: true,
    location: true,
    extras: false,
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = useCallback((key: keyof PropertyFilters, value: PropertyFilters[keyof PropertyFilters]) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onChange(newFilters);
  }, [localFilters, onChange]);

  const clearFilters = () => {
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
    setLocalFilters(defaultFilters);
    onChange(defaultFilters);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">{t('common.filters')}</h3>
          {propertyCount !== undefined && (
            <p className="text-sm text-gray-500">{t('properties.found', { count: propertyCount })}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('common.clearFilters')}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Listing Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('properties.filters.listingType')}
          </label>
          <div className="flex gap-2">
            {[
              { value: 'all', label: t('properties.filters.all'), color: 'gray' },
              { value: 'sale', label: t('properties.filters.forSale'), color: 'blue' },
              { value: 'rent', label: t('properties.filters.forRent'), color: 'emerald' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleChange('listingType', option.value as 'all' | 'sale' | 'rent')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  localFilters.listingType === option.value
                    ? option.color === 'blue'
                      ? 'bg-blue-600 text-white'
                      : option.color === 'emerald'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('properties.filters.propertyType')}
          </label>
          <div className="flex flex-wrap gap-2">
            {propertyTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => handleChange('propertyType', type.value)}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  localFilters.propertyType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t(type.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range Section */}
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">{t('properties.filters.priceRange')}</span>
            {expandedSections.price ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {expandedSections.price && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('properties.filters.minPrice')}</label>
                  <input
                    type="number"
                    placeholder="$0"
                    value={localFilters.minPrice || ''}
                    onChange={(e) => handleChange('minPrice', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('properties.filters.maxPrice')}</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={localFilters.maxPrice || ''}
                    onChange={(e) => handleChange('maxPrice', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {/* Quick Price Presets */}
              <div className="flex flex-wrap gap-2">
                {(localFilters.listingType === 'rent' ? priceRanges.rent : priceRanges.sale).map((range, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleChange('minPrice', range.min);
                      handleChange('maxPrice', range.max);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      localFilters.minPrice === range.min && localFilters.maxPrice === range.max
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rooms Section */}
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => toggleSection('rooms')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">{t('properties.filters.bedrooms')} & {t('properties.filters.bathrooms')}</span>
            {expandedSections.rooms ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {expandedSections.rooms && (
            <div className="mt-3 space-y-4">
              {/* Bedrooms */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">{t('properties.filters.bedrooms')}</label>
                <div className="flex gap-2">
                  {[null, 1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num ?? 'any'}
                      onClick={() => handleChange('bedrooms', num)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        localFilters.bedrooms === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {num === null ? t('properties.filters.anyBedrooms') : num === 5 ? '5+' : num}
                    </button>
                  ))}
                </div>
              </div>
              {/* Bathrooms */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">{t('properties.filters.bathrooms')}</label>
                <div className="flex gap-2">
                  {[null, 1, 2, 3, 4].map((num) => (
                    <button
                      key={num ?? 'any'}
                      onClick={() => handleChange('bathrooms', num)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        localFilters.bathrooms === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {num === null ? t('properties.filters.anyBathrooms') : num === 4 ? '4+' : num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location Section */}
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => toggleSection('location')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">{t('properties.filters.location')}</span>
            {expandedSections.location ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {expandedSections.location && (
            <div className="mt-3">
              <LocationAutocomplete
                value={localFilters.location}
                onChange={(value) => handleChange('location', value)}
                variant="filter"
              />
            </div>
          )}
        </div>

        {/* Extras Section */}
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => toggleSection('extras')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">Extras</span>
            {expandedSections.extras ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {expandedSections.extras && (
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.featured}
                  onChange={(e) => handleChange('featured', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t('properties.filters.featured')}</span>
              </label>
            </div>
          )}
        </div>

        {/* Sort By */}
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('properties.filters.sortBy')}
          </label>
          <select
            value={localFilters.sortBy}
            onChange={(e) => handleChange('sortBy', e.target.value as PropertyFilters['sortBy'])}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">{t('properties.filters.sortNewest')}</option>
            <option value="price_asc">{t('properties.filters.sortPriceAsc')}</option>
            <option value="price_desc">{t('properties.filters.sortPriceDesc')}</option>
            <option value="views">{t('properties.filters.sortViews')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
