import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, MapPin, X } from 'lucide-react';

interface GoogleMapsInputProps {
  address: string;
  lat: number | null;
  lng: number | null;
  showMap: boolean;
  onAddressChange: (address: string) => void;
  onLocationChange: (lat: number | null, lng: number | null) => void;
  onShowMapChange: (show: boolean) => void;
  onLocationDetailsChange?: (details: {
    city: string;
    state: string;
    neighborhood: string;
  }) => void;
}

type ApiStatus = 'idle' | 'loading' | 'ready' | 'error';

// Google Maps API types
interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      importLibrary?: (name: 'places') => Promise<{ Place: new (options: { id: string }) => GooglePlace }>;
      places?: {
        AutocompleteService: new () => GoogleAutocompleteService;
        Place?: new (options: { id: string }) => GooglePlace;
        PlacesServiceStatus?: { OK: string };
      };
    };
  };
}

interface GoogleAutocompleteService {
  getPlacePredictions: (
    request: {
      input: string;
      componentRestrictions?: { country: string };
      locationBias?: { center: { lat: number; lng: number }; radius: number };
    },
    callback: (results: GooglePlacePrediction[] | null, status: string) => void
  ) => void;
}

interface GooglePlacePrediction {
  place_id: string;
  description: string;
}

interface GooglePlace {
  fetchFields: (options: { fields: string[] }) => Promise<void>;
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { lat: () => number; lng: () => number };
  addressComponents?: Array<GoogleAddressComponent | GoogleAddressComponentV2>;
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleAddressComponentV2 {
  longText: string;
  shortText: string;
  types: string[];
}

declare const window: GoogleMapsWindow;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function GoogleMapsInput({
  address,
  lat,
  lng,
  showMap,
  onAddressChange,
  onLocationChange,
  onShowMapChange,
  onLocationDetailsChange,
}: GoogleMapsInputProps) {
  const [search, setSearch] = useState(address);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('idle');
  const [predictions, setPredictions] = useState<GooglePlacePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<GoogleAutocompleteService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(address);
  }, [address]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Google Maps Places API once using the env key
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

  // Instantiate services once API is ready
  useEffect(() => {
    if (apiStatus !== 'ready' || !window.google?.maps?.places) return;

    setAutocompleteService(new window.google.maps.places.AutocompleteService());
  }, [apiStatus]);

  // Fetch predictions when user types
  useEffect(() => {
    if (!autocompleteService) {
      setPredictions([]);
      return;
    }

    if (!search.trim()) {
      setPredictions([]);
      return;
    }

    const handle = window.setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: search,
          componentRestrictions: { country: 'mx' },
        },
        (results: GooglePlacePrediction[] | null, status: string) => {
          if (status === 'OK' && results) {
            setPredictions(results);
          } else {
            setPredictions([]);
          }
        }
      );
    }, 200);

    return () => window.clearTimeout(handle);
  }, [search, autocompleteService]);

  const parseAddressComponents = (components: Array<GoogleAddressComponent | GoogleAddressComponentV2>) => {
    const findComponent = (types: string[]) => {
      const match = components.find((component) =>
        types.some((type) => component.types.includes(type))
      );

      if (!match) return '';

      // Support both legacy and new Places API component shapes
      const maybeV2 = match as GoogleAddressComponentV2;
      if ('longText' in maybeV2) return maybeV2.longText;

      const maybeLegacy = match as GoogleAddressComponent;
      return maybeLegacy.long_name;
    };

    const city =
      findComponent(['locality']) ||
      findComponent(['postal_town']) ||
      findComponent(['administrative_area_level_3']) ||
      findComponent(['sublocality']) ||
      findComponent(['sublocality_level_1']) ||
      findComponent(['sublocality_level_2']);

    const state = findComponent(['administrative_area_level_1']);
    const neighborhood =
      findComponent(['neighborhood']) ||
      findComponent(['sublocality_level_2']) ||
      findComponent(['sublocality']) ||
      findComponent(['administrative_area_level_2']);

    return { city, state, neighborhood };
  };

  const fetchPlaceDetails = async (placeId: string): Promise<GooglePlace | null> => {
    if (!window.google?.maps) return null;

    try {
      // Prefer importLibrary (new API), fallback to direct Place constructor if present
      const placesLib = window.google.maps.importLibrary
        ? await window.google.maps.importLibrary('places')
        : null;

      const PlaceCtor = placesLib?.Place || window.google.maps.places?.Place;
      if (!PlaceCtor) return null;

      const place = new PlaceCtor({ id: placeId }) as GooglePlace;
      await place.fetchFields({
        fields: ['formattedAddress', 'location', 'addressComponents', 'displayName'],
      });

      return place;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  };

  const selectPrediction = async (prediction: GooglePlacePrediction) => {
    const place = await fetchPlaceDetails(prediction.place_id);
    if (!place) return;

    const formattedAddress =
      place.formattedAddress || place.displayName?.text || prediction.description;
    const geometry = place.location;
    const latValue = geometry ? geometry.lat() : null;
    const lngValue = geometry ? geometry.lng() : null;
    const details = parseAddressComponents(place.addressComponents || []);

    setSearch(formattedAddress);
    onAddressChange(formattedAddress);
    onLocationChange(latValue, lngValue);
    onLocationDetailsChange?.(details);
    setShowSuggestions(false);
  };

  const handleInputChange = (value: string) => {
    setSearch(value);
    onAddressChange(value);
    setShowSuggestions(true);
  };

  const clearLocation = () => {
    setSearch('');
    onAddressChange('');
    onLocationChange(null, null);
    onLocationDetailsChange?.({ city: '', state: '', neighborhood: '' });
  };

  return (
    <div className="space-y-4">
      <div className="relative" ref={dropdownRef}>
        <label className="block text-sm font-medium text-foreground mb-1">
          Ubicación en Google Maps
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Escribe y selecciona la dirección exacta. Se guardarán la dirección, latitud y longitud.
        </p>

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Ej. Polanco, Ciudad de México"
            className="input-field pl-10 pr-10"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              onClick={clearLocation}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {showSuggestions && predictions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-card rounded-lg shadow-strong border border-border">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => selectPrediction(prediction)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-foreground">{prediction.description}</span>
              </button>
            ))}
          </div>
        )}

        {apiStatus === 'loading' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando Google Maps...
          </div>
        )}

        {apiStatus === 'error' && (
          <div className="flex items-center gap-2 text-xs text-destructive mt-2">
            <AlertCircle className="h-4 w-4" />
            Agrega VITE_GOOGLE_MAPS_API_KEY para habilitar las sugerencias en vivo.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-sm text-primary hover:underline"
        >
          {manualMode ? 'Ocultar coordenadas' : 'Ingresar coordenadas manualmente'}
        </button>
      </div>

      {manualMode && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Latitud</label>
            <input
              type="number"
              value={lat || ''}
              onChange={(e) => onLocationChange(e.target.value ? parseFloat(e.target.value) : null, lng)}
              className="input-field"
              step="any"
              placeholder="19.0514"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Longitud</label>
            <input
              type="number"
              value={lng || ''}
              onChange={(e) => onLocationChange(lat, e.target.value ? parseFloat(e.target.value) : null)}
              className="input-field"
              step="any"
              placeholder="-104.3131"
            />
          </div>
        </div>
      )}

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={showMap}
          onChange={(e) => onShowMapChange(e.target.checked)}
          className="w-5 h-5 text-primary rounded border-input focus:ring-ring"
        />
        <span className="text-foreground text-sm">Mostrar mapa en la página de la propiedad</span>
      </label>

      {showMap && lat && lng && (
        <div className="rounded-lg overflow-hidden border border-border">
          <iframe
            src={`https://www.google.com/maps?q=${lat},${lng}&output=embed`}
            width="100%"
            height="200"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            className="bg-muted"
          ></iframe>
        </div>
      )}
    </div>
  );
}
