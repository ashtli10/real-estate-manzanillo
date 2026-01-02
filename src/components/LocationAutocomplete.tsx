import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'filter' | 'hero';
}

interface PlacePrediction {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

// Manzanillo center coordinates removed
// Radius in meters removed

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
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  useEffect(() => {
    if (value === 'all' || value === '') {
      setSearch('');
    } else if (value !== search) {
      setSearch(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Fetch predictions from Google Places API
  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim()) {
      setPredictions([]);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      setApiError(true);
      return;
    }

    setIsLoading(true);
    setApiError(false);

    try {
      // Use the Places API (New) Autocomplete endpoint
      const response = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
          },
          body: JSON.stringify({
            input: input,
            // Filter for regions/neighborhoods
            includedPrimaryTypes: ['(regions)'],
            // Restrict to Mexico
            includedRegionCodes: ['mx'],
            // Language preference
            languageCode: 'es',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Places API request failed');
      }

      const data = await response.json();
      
      // Parse predictions from response
      const parsedPredictions: PlacePrediction[] = (data.suggestions || [])
        .filter((suggestion: { placePrediction?: unknown }) => suggestion.placePrediction)
        .map((suggestion: { 
          placePrediction: { 
            placeId: string; 
            text: { text: string }; 
            structuredFormat?: { 
              mainText?: { text: string }; 
              secondaryText?: { text: string }; 
            }; 
          } 
        }) => {
          const pred = suggestion.placePrediction;
          return {
            placeId: pred.placeId,
            text: pred.text?.text || '',
            mainText: pred.structuredFormat?.mainText?.text || pred.text?.text || '',
            secondaryText: pred.structuredFormat?.secondaryText?.text || '',
          };
        })
        // Filter to only show results that include Manzanillo or Colima in the description
        .filter((pred: PlacePrediction) => {
          // Removed Manzanillo/Colima restriction
          return true;
        });

      setPredictions(parsedPredictions);
    } catch (error) {
      console.error('Error fetching place predictions:', error);
      setApiError(true);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearch(newValue);
      setShowDropdown(true);

      // If cleared, reset to 'all'
      if (!newValue.trim()) {
        onChange('all');
        setPredictions([]);
        return;
      }

      // Debounce API calls
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    },
    [onChange, fetchPredictions]
  );

  const handleSelectPrediction = useCallback(
    (prediction: PlacePrediction) => {
      // Extract just the neighborhood/colonia name (mainText)
      setSearch(prediction.mainText);
      onChange(prediction.mainText);
      setShowDropdown(false);
      setPredictions([]);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setSearch('');
    onChange('all');
    setShowDropdown(false);
    setPredictions([]);
    inputRef.current?.focus();
  }, [onChange]);

  const handleFocus = () => {
    setShowDropdown(true);
    if (search.trim() && predictions.length === 0) {
      fetchPredictions(search);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search.trim()) {
      if (predictions.length > 0) {
        handleSelectPrediction(predictions[0]);
      } else {
        onChange(search.trim());
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const baseInputClasses =
    variant === 'hero'
      ? 'w-full pl-12 pr-10 py-4 text-gray-800 placeholder-gray-400 border-0 focus:ring-0 focus:outline-none text-lg bg-transparent'
      : variant === 'filter'
        ? 'w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        : variant === 'compact'
          ? 'w-full pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          : 'w-full appearance-none pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  const iconClasses = variant === 'hero'
    ? 'absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10'
    : 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10';

  const clearButtonClasses = variant === 'hero'
    ? 'absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10'
    : 'absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10';

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <MapPin className={iconClasses} />
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('common.searchLocation')}
        className={baseInputClasses}
      />

      {/* Clear button */}
      {search && (
        <button
          onClick={handleClear}
          className={clearButtonClasses}
        >
          <X className={variant === 'hero' ? 'h-5 w-5' : 'h-4 w-4'} />
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* All locations option */}
          <button
            onClick={() => {
              setSearch('');
              onChange('all');
              setShowDropdown(false);
              setPredictions([]);
            }}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 ${
              value === 'all' ? 'bg-blue-50 text-blue-600' : ''
            }`}
          >
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">{t('common.allLocations')}</span>
          </button>

          {/* Loading state */}
          {isLoading && (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          )}

          {/* API Error state */}
          {apiError && !isLoading && (
            <div className="px-4 py-3 text-sm text-amber-600">
              {t('common.locationSearchError')}
            </div>
          )}

          {/* Predictions list */}
          {!isLoading && !apiError && predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              onClick={() => handleSelectPrediction(prediction)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-2 ${
                value === prediction.mainText ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{prediction.mainText}</span>
                {prediction.secondaryText && (
                  <span className="text-xs text-gray-500">{prediction.secondaryText}</span>
                )}
              </div>
            </button>
          ))}

          {/* No results message */}
          {!isLoading && !apiError && search.trim() && predictions.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              {t('properties.noResults')}
            </div>
          )}

          {/* Hint when no search */}
          {!isLoading && !apiError && !search.trim() && (
            <div className="px-4 py-3 text-sm text-gray-500">
              {t('common.typeToSearch')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
