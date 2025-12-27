import { Bed, Bath, Square, MapPin, Car } from 'lucide-react';
import type { Property } from '../types/property';
import { formatPrice } from '../types/property';

interface PropertyCardProps {
  property: Property;
  onNavigate: (path: string) => void;
}

export function PropertyCard({ property, onNavigate }: PropertyCardProps) {
  const mainImage = property.images[0] || 'https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&w=800';

  const getNumberCharacteristic = (key: string) => {
    const match = property.characteristics.find((c) => c.key === key && c.type === 'number');
    return match ? Number(match.value) : null;
  };

  const bedrooms = getNumberCharacteristic('bedrooms');
  const bathrooms = getNumberCharacteristic('bathrooms');
  const sizeTotal = getNumberCharacteristic('size_total');
  const parking = getNumberCharacteristic('parking_spaces');

  return (
    <div
      onClick={() => onNavigate(`/propiedad/${property.slug}`)}
      className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={mainImage}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        />

        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {property.is_for_sale && (
            <span className="bg-white/90 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full shadow">
              En venta
            </span>
          )}
          {property.is_for_rent && (
            <span className="bg-white/90 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full shadow">
              En renta
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 space-y-2">
          {property.is_for_sale && (
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <p className="text-xs uppercase tracking-wide">Venta</p>
              <p className="text-lg font-bold">{formatPrice(property.price, property.currency)}</p>
            </div>
          )}
          {property.is_for_rent && (
            <div className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <p className="text-xs uppercase tracking-wide">Renta</p>
              <p className="text-lg font-bold">{formatPrice(property.rent_price, property.rent_currency)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{property.title}</h3>

        <div className="flex items-center text-gray-600 mb-3">
          <MapPin className="h-4 w-4 mr-1 text-blue-500" />
          <span className="text-sm">
            {property.location_neighborhood && `${property.location_neighborhood}, `}
            {property.location_city}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {bedrooms && bedrooms > 0 && (
            <div className="flex items-center space-x-2 text-gray-700">
              <Bed className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">{bedrooms} recámaras</span>
            </div>
          )}
          {bathrooms && bathrooms > 0 && (
            <div className="flex items-center space-x-2 text-gray-700">
              <Bath className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">{bathrooms} baños</span>
            </div>
          )}
          {sizeTotal && sizeTotal > 0 && (
            <div className="flex items-center space-x-2 text-gray-700">
              <Square className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">{sizeTotal} m²</span>
            </div>
          )}
          {parking && parking > 0 && (
            <div className="flex items-center space-x-2 text-gray-700">
              <Car className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">{parking} estacionamientos</span>
            </div>
          )}
        </div>

        {property.custom_bonuses && property.custom_bonuses.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {property.custom_bonuses.slice(0, 2).map((bonus: string, index: number) => (
              <span
                key={index}
                className="bg-cyan-50 text-cyan-700 text-xs px-2 py-1 rounded-full border border-cyan-200"
              >
                {bonus}
              </span>
            ))}
            {property.custom_bonuses.length > 2 && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                +{property.custom_bonuses.length - 2} más
              </span>
            )}
          </div>
        )}

        <button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md">
          Ver detalles
        </button>
      </div>
    </div>
  );
}
