import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'filter';
}

// Manzanillo colonias/neighborhoods - comprehensive list
const MANZANILLO_COLONIAS = [
  'Santiago',
  'Salagua',
  'Salahua',
  'Las Brisas',
  'Playa Azul',
  'La Punta',
  'Centro',
  'Miramar',
  'Península de Santiago',
  'Club Santiago',
  'Las Hadas',
  'La Audiencia',
  'Valle de las Garzas',
  'Vida del Mar',
  'El Naranjo',
  'Tapeixtles',
  'Nuevo Salagua',
  'Mar de Plata',
  'Olas Altas',
  'La Joya',
  'Bahía de Manzanillo',
  'Campos',
  'El Colomo',
  'La Central',
  'Las Joyas',
  'Lomas del Mar',
  'Playa de Oro',
  'San Pedrito',
  'Sector Deportivo',
  'Sector Naval',
];

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

  // Filter colonias based on search input
  const filteredColonias = useMemo(() => {
    if (!search.trim()) return MANZANILLO_COLONIAS;
    const query = search.toLowerCase();
    return MANZANILLO_COLONIAS.filter((colonia) =>
      colonia.toLowerCase().includes(query)
    );
  }, [search]);

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
      }
    },
    [onChange]
  );

  const handleSelectColonia = useCallback(
    (colonia: string) => {
      setSearch(colonia);
      onChange(colonia);
      setShowDropdown(false);
    },
    [onChange]
  );

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
      // If there's an exact match or only one filtered result, select it
      const exactMatch = MANZANILLO_COLONIAS.find(
        (c) => c.toLowerCase() === search.toLowerCase()
      );
      if (exactMatch) {
        handleSelectColonia(exactMatch);
      } else if (filteredColonias.length === 1) {
        handleSelectColonia(filteredColonias[0]);
      } else {
        onChange(search.trim());
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const baseInputClasses =
    variant === 'filter'
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

      {/* Clear button */}
      {search && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
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
            }}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 ${
              value === 'all' ? 'bg-blue-50 text-blue-600' : ''
            }`}
          >
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">{t('common.allLocations')}</span>
          </button>

          {/* Colonias list */}
          {filteredColonias.map((colonia) => (
            <button
              key={colonia}
              onClick={() => handleSelectColonia(colonia)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 ${
                value === colonia ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm">{colonia}</span>
            </button>
          ))}

          {/* No results message */}
          {filteredColonias.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              {t('properties.noResults')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
