import { Bed, Bath, Square, MapPin, Car } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Property } from '../types/property';
import { formatPrice } from '../types/property';

interface PropertyCardProps {
  property: Property;
  onNavigate: (path: string) => void;
}

export function PropertyCard({ property, onNavigate }: PropertyCardProps) {
  const { t } = useTranslation();
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
      <div className="relative h-72 overflow-hidden">
        <img
          src={mainImage}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        />

        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {property.is_for_sale && (
            <span className="bg-white/90 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full shadow">
              {t('propertyCard.forSale')}
            </span>
          )}
          {property.is_for_rent && (
            <span className="bg-white/90 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full shadow">
              {t('propertyCard.forRent')}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-2 flex-1">{property.title}</h3>
          <div className="flex flex-col items-end shrink-0">
            {property.is_for_sale && (
              <span className="text-blue-600 font-bold text-base">{formatPrice(property.price, property.currency)}</span>
            )}
            {property.is_for_rent && (
              <span className="text-emerald-600 font-semibold text-sm">{formatPrice(property.rent_price, property.rent_currency)}/mo</span>
            )}
          </div>
        </div>

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
              <span className="text-sm font-medium">{bedrooms} {t('characteristics.bedrooms')}</span>
            </div>
          )}
          {bathrooms && bathrooms > 0 && (
            <div className="flex items-center space-x-2 text-gray-700">
              <Bath className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">{bathrooms} {t('characteristics.bathrooms')}</span>
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
              <span className="text-sm font-medium">{parking} {t('characteristics.parking_spaces')}</span>
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
                +{property.custom_bonuses.length - 2} {t('propertyCard.more')}
              </span>
            )}
          </div>
        )}

        <button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md">
          {t('propertyCard.viewDetails')}
        </button>
      </div>
    </div>
  );
}
