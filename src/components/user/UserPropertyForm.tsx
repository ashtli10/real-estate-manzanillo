/**
 * User Property Form
 * Form for creating and editing user properties
 * Enhanced with AI prefill, image/video uploads, and Google Maps integration
 */

import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Loader2, 
  MapPin, 
  DollarSign,
  Home,
  Bed,
  Bath,
  Car,
  Square,
  Layers,
  Calendar,
  Tag,
  Image as ImageIcon,
  Sparkles,
  Video as VideoIcon
} from 'lucide-react';
import type { 
  UserProperty, 
  CreatePropertyInput, 
  PropertyTypeSimple, 
  PropertyListingType,
  PropertyStatus
} from '../../types/userProperty';
import { 
  PROPERTY_TYPE_LABELS, 
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_CONFIG
} from '../../types/userProperty';
import { ImageUpload } from '../admin/ImageUpload';
import { VideoUpload } from '../admin/VideoUpload';
import { GoogleMapsInput } from '../admin/GoogleMapsInput';

interface UserPropertyFormProps {
  property?: UserProperty;
  onSave: (data: CreatePropertyInput) => Promise<boolean>;
  onCancel: () => void;
  onUseAI?: () => void;
  loading?: boolean;
}

const INITIAL_FORM: CreatePropertyInput = {
  title: '',
  description: '',
  propertyType: 'casa',
  listingType: 'venta',
  price: 0,
  currency: 'MXN',
  city: 'Manzanillo',
  state: 'Colima',
  bedrooms: 0,
  bathrooms: 0,
  squareMetersBuilt: 0,
  squareMetersLand: 0,
  parkingSpaces: 0,
  features: [],
  amenities: [],
  images: [],
  status: 'draft',
};

export function UserPropertyForm({ 
  property, 
  onSave, 
  onCancel, 
  onUseAI,
  loading = false 
}: UserPropertyFormProps) {
  const [formData, setFormData] = useState<CreatePropertyInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'location' | 'media'>('basic');

  // Initialize form with property data if editing
  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title,
        description: property.description || '',
        propertyType: property.propertyType,
        listingType: property.listingType,
        price: property.price,
        currency: property.currency,
        address: property.address || '',
        neighborhood: property.neighborhood || '',
        city: property.city,
        state: property.state,
        postalCode: property.postalCode || '',
        latitude: property.latitude || undefined,
        longitude: property.longitude || undefined,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        halfBathrooms: property.halfBathrooms || 0,
        squareMetersBuilt: property.squareMetersBuilt || 0,
        squareMetersLand: property.squareMetersLand || 0,
        parkingSpaces: property.parkingSpaces || 0,
        floors: property.floors || 1,
        yearBuilt: property.yearBuilt || undefined,
        features: property.features,
        amenities: property.amenities,
        tags: property.tags,
        images: property.images,
        videos: property.videos,
        virtualTourUrl: property.virtualTourUrl || '',
        status: property.status,
      });
    }
  }, [property]);

  const handleChange = <K extends keyof CreatePropertyInput>(
    field: K, 
    value: CreatePropertyInput[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    }
    if (formData.price <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }
    if (!formData.propertyType) {
      newErrors.propertyType = 'Selecciona un tipo de propiedad';
    }
    if (!formData.listingType) {
      newErrors.listingType = 'Selecciona tipo de listado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const success = await onSave(formData);
    if (success) {
      onCancel();
    }
  };

  const tabs = [
    { id: 'basic' as const, label: 'Información básica', icon: Home },
    { id: 'details' as const, label: 'Detalles', icon: Bed },
    { id: 'location' as const, label: 'Ubicación', icon: MapPin },
    { id: 'media' as const, label: 'Multimedia', icon: ImageIcon },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {property ? 'Editar propiedad' : 'Nueva propiedad'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título de la propiedad *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ej: Casa moderna con vista al mar"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Property Type & Listing Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de propiedad *
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value as PropertyTypeSimple)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de listado *
                </label>
                <select
                  value={formData.listingType}
                  onChange={(e) => handleChange('listingType', e.target.value as PropertyListingType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {Object.entries(LISTING_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => handleChange('price', Number(e.target.value))}
                  placeholder="0"
                  className={`w-full pl-10 pr-16 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  MXN
                </span>
              </div>
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                {onUseAI && (
                  <button
                    type="button"
                    onClick={onUseAI}
                    className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generar con IA
                  </button>
                )}
              </div>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                placeholder="Describe tu propiedad..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as PropertyStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                {Object.entries(PROPERTY_STATUS_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Bed className="h-4 w-4" /> Recámaras
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.bedrooms || ''}
                  onChange={(e) => handleChange('bedrooms', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Bath className="h-4 w-4" /> Baños
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.bathrooms || ''}
                  onChange={(e) => handleChange('bathrooms', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Bath className="h-4 w-4" /> Medios baños
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.halfBathrooms || ''}
                  onChange={(e) => handleChange('halfBathrooms', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Car className="h-4 w-4" /> Estacionamientos
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.parkingSpaces || ''}
                  onChange={(e) => handleChange('parkingSpaces', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Square className="h-4 w-4" /> m² construcción
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.squareMetersBuilt || ''}
                  onChange={(e) => handleChange('squareMetersBuilt', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Square className="h-4 w-4" /> m² terreno
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.squareMetersLand || ''}
                  onChange={(e) => handleChange('squareMetersLand', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Layers className="h-4 w-4" /> Niveles
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.floors || 1}
                  onChange={(e) => handleChange('floors', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4" /> Año construcción
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.yearBuilt || ''}
                  onChange={(e) => handleChange('yearBuilt', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Tag className="h-4 w-4" /> Características (separadas por coma)
              </label>
              <input
                type="text"
                value={(formData.features || []).join(', ')}
                onChange={(e) => handleChange('features', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Vista al mar, Alberca, Jardín..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Amenities */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Tag className="h-4 w-4" /> Amenidades (separadas por coma)
              </label>
              <input
                type="text"
                value={(formData.amenities || []).join(', ')}
                onChange={(e) => handleChange('amenities', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Gimnasio, Área de BBQ, Seguridad 24/7..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-6">
            <GoogleMapsInput
              address={formData.address || ''}
              lat={formData.latitude || null}
              lng={formData.longitude || null}
              showMap={true}
              onAddressChange={(value) => handleChange('address', value)}
              onLocationChange={(lat, lng) => {
                handleChange('latitude', lat || undefined);
                handleChange('longitude', lng || undefined);
              }}
              onShowMapChange={() => {}}
              onLocationDetailsChange={(details) => {
                if (details.city) handleChange('city', details.city);
                if (details.state) handleChange('state', details.state);
                if (details.neighborhood) handleChange('neighborhood', details.neighborhood);
              }}
            />

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colonia / Fraccionamiento
                </label>
                <input
                  type="text"
                  value={formData.neighborhood || ''}
                  onChange={(e) => handleChange('neighborhood', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código postal
                </label>
                <input
                  type="text"
                  value={formData.postalCode || ''}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={formData.city || 'Manzanillo'}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.state || 'Colima'}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              💡 Tip: Usa el mapa para seleccionar la ubicación exacta de tu propiedad
            </p>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="space-y-8">
            {/* Image Upload */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Imágenes de la propiedad
              </h4>
              <ImageUpload
                images={formData.images || []}
                onChange={(images) => handleChange('images', images)}
                maxImages={20}
              />
            </div>

            {/* Video Upload */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <VideoIcon className="h-4 w-4" />
                Videos de la propiedad
              </h4>
              <VideoUpload
                videos={formData.videos || []}
                onChange={(videos) => handleChange('videos', videos)}
                maxVideos={5}
              />
            </div>

            {/* Virtual Tour URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL de tour virtual (opcional)
              </label>
              <input
                type="url"
                value={formData.virtualTourUrl || ''}
                onChange={(e) => handleChange('virtualTourUrl', e.target.value)}
                placeholder="https://mi360.io/tour/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Puedes agregar un enlace a un tour virtual 360° de tu propiedad
              </p>
            </div>
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {property ? 'Actualizar' : 'Crear'} propiedad
            </>
          )}
        </button>
      </div>
    </div>
  );
}
