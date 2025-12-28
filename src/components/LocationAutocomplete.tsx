import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'filter';
}

type ApiStatus = 'idle' | 'loading' | 'ready' | 'error';

// Google Maps types - using interface to avoid eslint any warnings
interface PlacePrediction {
  place_id: string;
  description: string;
}

interface AutocompleteService {
  getPlacePredictions: (
    request: { input: string; componentRestrictions?: { country: string }; types?: string[] },
    callback: (results: PlacePrediction[] | null, status: string) => void
  ) => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  className = '',
  variant = 'default',
}: LocationAutocompleteProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(value === 'all' ? '' : value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('idle');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<AutocompleteService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (value === 'all' || value === '') {
      setSearch('');
    } else if (value !== search) {
      setSearch(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Google Maps Places API
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setApiStatus('error');
      return;
    }

    if (window.google?.maps?.places) {
      setApiStatus('ready');
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps="true"]');
    const handleLoad = () => setApiStatus('ready');
    const handleError = () => setApiStatus('error');

    if (existingScript) {
      if (window.google?.maps?.places) {
        setApiStatus('ready');
      } else {
        existingScript.addEventListener('load', handleLoad);
        existingScript.addEventListener('error', handleError);
      }

      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
      };
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.onload = handleLoad;
    script.onerror = handleError;
    document.head.appendChild(script);
    setApiStatus('loading');

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  // Instantiate autocomplete service once API is ready
  useEffect(() => {
    if (apiStatus !== 'ready' || !window.google?.maps?.places) return;
    setAutocompleteService(new window.google.maps.places.AutocompleteService());
  }, [apiStatus]);

  // Fetch predictions when user types
  useEffect(() => {
    if (!autocompleteService || !search.trim()) {
      setPredictions([]);
      return;
    }

    const handle = window.setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: search,
          componentRestrictions: { country: 'mx' },
          types: ['(regions)'], // Focus on areas/regions rather than specific addresses
        },
        (results: PlacePrediction[] | null, status: string) => {
          if (status === 'OK' && results) {
            // Filter to prioritize Manzanillo area results
            const filtered = results.filter(
              (r) =>
                r.description.toLowerCase().includes('manzanillo') ||
                r.description.toLowerCase().includes('colima')
            );
            setPredictions(filtered.length > 0 ? filtered : results.slice(0, 5));
          } else {
            setPredictions([]);
          }
        }
      );
    }, 200);

    return () => window.clearTimeout(handle);
  }, [search, autocompleteService]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setShowDropdown(true);
    
    // If cleared, reset to 'all'
    if (!newValue.trim()) {
      onChange('all');
    }
  }, [onChange]);

  const handleSelectPrediction = useCallback((prediction: PlacePrediction) => {
    // Extract a simpler location name from the full description
    const parts = prediction.description.split(',');
    const locationName = parts[0].trim();
    
    setSearch(locationName);
    onChange(locationName);
    setShowDropdown(false);
    setPredictions([]);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setSearch('');
    onChange('all');
    setShowDropdown(false);
    inputRef.current?.focus();
  }, [onChange]);

  const handleFocus = () => {
    setShowDropdown(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search.trim()) {
      onChange(search.trim());
      setShowDropdown(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const baseInputClasses = variant === 'filter'
    ? 'w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    : variant === 'compact'
    ? 'w-full pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    : 'w-full appearance-none pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('common.searchLocation')}
        className={`${baseInputClasses} ${className}`}
      />
      
      {/* Clear button or loading indicator */}
      {apiStatus === 'loading' ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
      ) : search ? (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {/* Dropdown */}
      {showDropdown && (predictions.length > 0 || !search) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* All locations option */}
          <button
            onClick={() => {
              setSearch('');
              onChange('all');
              setShowDropdown(false);
            }}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 ${
              value === 'all' ? 'bg-blue-50 text-blue-600' : ''
            }`}
          >
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">{t('common.allLocations')}</span>
          </button>

          {/* Predictions */}
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id || index}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2"
            >
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm truncate">{prediction.description}</span>
            </button>
          ))}

          {/* No results message */}
          {search && predictions.length === 0 && apiStatus === 'ready' && (
            <div className="px-4 py-3 text-sm text-gray-500">
              {t('properties.noResults')}
            </div>
          )}

          {/* API error fallback */}
          {apiStatus === 'error' && (
            <div className="px-4 py-3 text-sm text-amber-600">
              Enter location manually
            </div>
          )}
        </div>
      )}
    </div>
  );
}
