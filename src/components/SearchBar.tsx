import { Search, X, Building2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocationAutocomplete } from './LocationAutocomplete';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  variant?: 'hero' | 'compact';
  initialFilters?: Partial<SearchFilters>;
}

export interface SearchFilters {
  query: string;
  propertyType: string;
  listingType: 'all' | 'sale' | 'rent';
  location: string;
}

const propertyTypes = [
  { value: 'all', labelKey: 'properties.filters.all' },
  { value: 'casa', labelKey: 'propertyTypes.casa' },
  { value: 'departamento', labelKey: 'propertyTypes.departamento' },
  { value: 'terreno', labelKey: 'propertyTypes.terreno' },
  { value: 'local', labelKey: 'propertyTypes.local' },
  { value: 'oficina', labelKey: 'propertyTypes.oficina' },
];

export function SearchBar({ onSearch, variant = 'hero', initialFilters }: SearchBarProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<SearchFilters>({
    query: initialFilters?.query || '',
    propertyType: initialFilters?.propertyType || 'all',
    listingType: initialFilters?.listingType || 'all',
    location: initialFilters?.location || 'all',
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch(filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (variant === 'hero') {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-2 md:p-3">
          {/* Main Search Row */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-0">
            {/* Location Autocomplete */}
            <div className="flex-1 relative">
              <LocationAutocomplete
                value={filters.location}
                onChange={(location) => setFilters({ ...filters, location })}
                placeholder={t('landing.hero.searchPlaceholder')}
                className="w-full pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 border-0 focus:ring-0 focus:outline-none text-lg rounded-xl"
                variant="default"
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-gray-200 my-2" />

            {/* Property Type Dropdown */}
            <div className="relative md:w-48">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                value={filters.propertyType}
                onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                className="w-full appearance-none pl-12 pr-10 py-4 text-gray-800 border-0 focus:ring-0 focus:outline-none bg-transparent cursor-pointer rounded-xl"
              >
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(type.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-gray-200 my-2" />

            {/* Sale/Rent Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl md:mx-2">
              <button
                type="button"
                onClick={() => setFilters({ ...filters, listingType: 'all' })}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  filters.listingType === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('properties.filters.all')}
              </button>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, listingType: 'sale' })}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  filters.listingType === 'sale'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('properties.filters.forSale')}
              </button>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, listingType: 'rent' })}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  filters.listingType === 'rent'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('properties.filters.forRent')}
              </button>
            </div>

            {/* Search Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Search className="h-5 w-5" />
              <span className="md:hidden lg:inline">{t('common.search')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant for properties page header
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('landing.hero.searchPlaceholder')}
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {filters.query && (
          <button
            onClick={() => setFilters({ ...filters, query: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <button
        onClick={() => handleSubmit()}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
      >
        <Search className="h-5 w-5" />
        <span className="hidden sm:inline">{t('common.search')}</span>
      </button>
    </div>
  );
}
