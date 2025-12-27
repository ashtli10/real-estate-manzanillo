import { useState, useEffect } from 'react';
import { X, Save, Loader2, Sparkles } from 'lucide-react';
import type { Property, PropertyInsert, PropertyType } from '../../types/property';
import { generateSlug, propertyTypeLabels, CHARACTERISTIC_DEFINITIONS } from '../../types/property';
import { ImageUpload } from './ImageUpload';
import { VideoUpload } from './VideoUpload';
import { TagInput } from './TagInput';
import { GoogleMapsInput } from './GoogleMapsInput';
import { CharacteristicInput, type Characteristic } from './CharacteristicInput';
import { requestPropertyPrefill } from '../../lib/prefillProperty';

interface PropertyFormProps {
  property?: Property | null;
  onSave: (data: PropertyInsert) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}


// Expanded bonus tags - strategic highlights
const BONUS_SUGGESTIONS = [
  // Location Benefits
  'Vista al mar',
  'Vista a la montaña',
  'Vista panorámica',
  'Frente al mar',
  'A pasos de la playa',
  'Zona turística',
  'Zona exclusiva',
  'Zona residencial',
  'Barrio tranquilo',
  'Privacidad garantizada',
  'Calle cerrada',
  'Acceso a plazas comerciales',
  'Cerca de escuelas',
  'Cerca de hospitales',
  'Cerca de supermercados',
  'Cerca de restaurantes',
  'Cerca de bancos',
  'Cerca del centro',
  'Transporte público cercano',
  'Fácil acceso carretero',
  // Investment
  'Oportunidad de inversión',
  'Alta plusvalía',
  'Precio de remate',
  'Por debajo de avalúo',
  'Ideal para Airbnb',
  'Ideal para renta',
  'Ideal para negocio',
  'Escrituras en orden',
  'Libre de gravamen',
  // Condition
  'Recién remodelada',
  'Como nueva',
  'Construcción de lujo',
  'Materiales premium',
  'Arquitectura moderna',
  'Estilo colonial',
  'Estilo minimalista',
  'Entrega inmediata',
  'Pre-venta',
  'En desarrollo',
  // Lifestyle
  'Club de playa incluido',
  'Acceso a campo de golf',
  'Marina cercana',
  'Palapa incluida',
  'Muelle privado',
  'Lifestyle de playa',
  'Ideal para familias',
  'Pet friendly',
  'Comunidad cerrada',
];


const formatPriceValue = (value: number | null | undefined) =>
  value && value > 0
    ? new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
    : '';

export function PropertyForm({ property, onSave, onCancel, loading = false }: PropertyFormProps) {
  const [formData, setFormData] = useState<PropertyInsert>({
    title: '',
    slug: '',
    description: '',
    price: null,
    currency: 'MXN',
    is_for_sale: true,
    is_for_rent: false,
    rent_price: null,
    rent_currency: 'MXN',
    location_city: 'Manzanillo',
    location_state: 'Colima',
    location_neighborhood: '',
    location_address: '',
    location_lat: null,
    location_lng: null,
    property_type: 'casa',
    custom_bonuses: [],
    images: [],
    videos: [],
    is_featured: false,
    is_published: false,
    display_order: 0,
    show_map: true,
    characteristics: [],
  });
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [priceDisplay, setPriceDisplay] = useState(() => formatPriceValue(formData.price));
  const [rentPriceDisplay, setRentPriceDisplay] = useState(() => formatPriceValue(formData.rent_price));

  useEffect(() => {
    setPriceDisplay(formatPriceValue(formData.price));
  }, [formData.price]);

  useEffect(() => {
    setRentPriceDisplay(formatPriceValue(formData.rent_price));
  }, [formData.rent_price]);

  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title,
        slug: property.slug,
        description: property.description || '',
        price: property.price,
        currency: property.currency,
        is_for_sale: property.is_for_sale,
        is_for_rent: property.is_for_rent,
        rent_price: property.rent_price,
        rent_currency: property.rent_currency,
        location_city: property.location_city,
        location_state: property.location_state,
        location_neighborhood: property.location_neighborhood || '',
        location_address: property.location_address || '',
        location_lat: property.location_lat,
        location_lng: property.location_lng,
        property_type: property.property_type,
        custom_bonuses: property.custom_bonuses,
        images: property.images,
        videos: property.videos || [],
        is_featured: property.is_featured,
        is_published: property.is_published,
        display_order: property.display_order,
        show_map: property.show_map ?? true,
        characteristics: property.characteristics || [],
      });
      setAutoSlug(false);
    }
  }, [property]);

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && formData.title) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(formData.title),
      }));
    }
  }, [formData.title, autoSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('El título es requerido');
      return;
    }
    if (!formData.slug.trim()) {
      alert('El slug es requerido');
      return;
    }

    if (!formData.is_for_sale && !formData.is_for_rent) {
      alert('Selecciona si la propiedad es para venta, renta o ambas');
      return;
    }

    if (formData.is_for_sale && (!formData.price || formData.price <= 0)) {
      alert('El precio de venta debe ser mayor a 0');
      return;
    }

    if (formData.is_for_rent && (!formData.rent_price || formData.rent_price <= 0)) {
      alert('La renta debe ser mayor a 0');
      return;
    }

    await onSave(formData);
  };

  const updateField = <K extends keyof PropertyInsert>(key: K, value: PropertyInsert[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePriceInput = (value: string) => {
    const numericString = value.replace(/\D/g, '');
    const numeric = numericString ? parseFloat(numericString) : 0;
    updateField('price', numeric || null);
    setPriceDisplay(numericString ? formatPriceValue(numeric) : '');
  };

  const handleRentPriceInput = (value: string) => {
    const numericString = value.replace(/\D/g, '');
    const numeric = numericString ? parseFloat(numericString) : 0;
    updateField('rent_price', numeric || null);
    setRentPriceDisplay(numericString ? formatPriceValue(numeric) : '');
  };

  const applyPrefill = async () => {
    setAiError(null);
    setAiLoading(true);
    try {
      const result = await requestPropertyPrefill(
        aiText,
        CHARACTERISTIC_DEFINITIONS,
        Object.keys(propertyTypeLabels) as PropertyType[],
        ['MXN', 'USD'],
        { defaultCurrency: formData.currency as string }
      );

      setFormData((prev) => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
        is_for_sale: result.is_for_sale,
        is_for_rent: result.is_for_rent,
        price: result.is_for_sale ? result.price : null,
        currency: result.currency || prev.currency,
        rent_price: result.is_for_rent ? result.rent_price : null,
        rent_currency: result.rent_currency || prev.rent_currency,
        property_type: result.property_type || prev.property_type,
        custom_bonuses: result.custom_bonuses?.length ? result.custom_bonuses : prev.custom_bonuses,
        characteristics: result.characteristics?.length ? (result.characteristics as Characteristic[]) : prev.characteristics,
      }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'No se pudo prellenar');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto bg-card rounded-xl shadow-strong">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">
              {property ? 'Editar Propiedad' : 'Nueva Propiedad'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* AI Prefill */}
            <section className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Llenar con IA</h3>
                  <p className="text-sm text-muted-foreground">Pega el texto del anuncio y prellena los campos .</p>
                </div>
              </div>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Pega el anuncio aquí..."
                className="input-field min-h-[120px] resize-y"
              />
              {aiError && <p className="text-sm text-red-600">{aiError}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={applyPrefill}
                  disabled={aiLoading || !aiText.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold shadow hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Llenar con IA                </button>
                <p className="text-xs text-muted-foreground">Solo rellena campos soportados. </p>
              </div>
            </section>

            {/* Basic Info */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">Información básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="input-field"
                    placeholder="Ej: Casa en venta en Nuevo Salagua"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Slug (URL) *
                    <button
                      type="button"
                      onClick={() => setAutoSlug(!autoSlug)}
                      className="ml-2 text-xs text-primary"
                    >
                      {autoSlug ? 'Editar manualmente' : 'Auto-generar'}
                    </button>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => {
                      setAutoSlug(false);
                      updateField('slug', e.target.value);
                    }}
                    className="input-field"
                    placeholder="casa-nuevo-salagua"
                    required
                    disabled={autoSlug}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="input-field min-h-[120px] resize-y"
                    placeholder="Descripción detallada de la propiedad..."
                  />
                </div>
              </div>
            </section>

            {/* Price & Type */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">Precio y tipo</h3>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={formData.is_for_sale}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateField('is_for_sale', checked);
                        if (!checked) {
                          updateField('price', null);
                          setPriceDisplay('');
                        }
                      }}
                    />
                    En venta
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={formData.is_for_rent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateField('is_for_rent', checked);
                        if (!checked) {
                          updateField('rent_price', null);
                          setRentPriceDisplay('');
                        }
                      }}
                    />
                    En renta
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecciona al menos una opción. Puedes publicar venta y renta simultáneamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Precio de venta</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={priceDisplay}
                      onChange={(e) => handlePriceInput(e.target.value)}
                      className="input-field"
                      placeholder="1,000,000"
                      disabled={!formData.is_for_sale}
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) => updateField('currency', e.target.value)}
                      className="input-field w-28"
                      disabled={!formData.is_for_sale}
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Renta mensual</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rentPriceDisplay}
                      onChange={(e) => handleRentPriceInput(e.target.value)}
                      className="input-field"
                      placeholder="25,000"
                      disabled={!formData.is_for_rent}
                    />
                    <select
                      value={formData.rent_currency}
                      onChange={(e) => updateField('rent_currency', e.target.value)}
                      className="input-field w-28"
                      disabled={!formData.is_for_rent}
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo de propiedad *
                  </label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => updateField('property_type', e.target.value as PropertyType)}
                    className="input-field"
                  >
                    {Object.entries(propertyTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Location with Google Maps */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">Ubicación</h3>
              <GoogleMapsInput
                address={formData.location_address || ''}
                lat={formData.location_lat}
                lng={formData.location_lng}
                showMap={formData.show_map}
                onAddressChange={(address) => updateField('location_address', address)}
                onLocationChange={(lat, lng) => {
                  updateField('location_lat', lat);
                  updateField('location_lng', lng);
                }}
                onShowMapChange={(show) => updateField('show_map', show)}
                onLocationDetailsChange={({ city, state, neighborhood }) =>
                  setFormData((prev) => ({
                    ...prev,
                    location_city: city || '',
                    location_state: state || '',
                    location_neighborhood: neighborhood || '',
                  }))
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground">Ciudad detectada</p>
                  <p className="text-sm font-medium text-foreground">{formData.location_city || '—'}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground">Estado detectado</p>
                  <p className="text-sm font-medium text-foreground">{formData.location_state || '—'}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground">Colonia / Fraccionamiento</p>
                  <p className="text-sm font-medium text-foreground">{formData.location_neighborhood || '—'}</p>
                </div>
              </div>
            </section>

            {/* Dynamic Characteristics */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Características
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (Agregar y configurar características de la propiedad)
                </span>
              </h3>
              <CharacteristicInput
                characteristics={formData.characteristics as Characteristic[]}
                onChange={(chars) => updateField('characteristics', chars)}
              />
            </section>

            {/* Images */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">Imágenes</h3>
              <ImageUpload
                images={formData.images}
                onChange={(images) => updateField('images', images)}
              />
            </section>

              {/* Videos */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-4">Videos</h3>
                <VideoUpload
                  videos={formData.videos}
                  onChange={(videos) => updateField('videos', videos)}
                />
              </section>

            {/* Custom Bonuses */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Bonos personalizados
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (Etiquetas destacadas para promocionar la propiedad)
                </span>
              </h3>
              <TagInput
                tags={formData.custom_bonuses}
                onChange={(bonuses) => updateField('custom_bonuses', bonuses)}
                placeholder="Agregar bono..."
                suggestions={BONUS_SUGGESTIONS}
              />
            </section>

            {/* Flags - Removed "Cerca de la playa" */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">Opciones</h3>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => updateField('is_published', e.target.checked)}
                    className="w-5 h-5 text-primary rounded border-input focus:ring-ring"
                  />
                  <span className="text-foreground">Publicado</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => updateField('is_featured', e.target.checked)}
                    className="w-5 h-5 text-primary rounded border-input focus:ring-ring"
                  />
                  <span className="text-foreground">Destacado</span>
                </label>
              </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 text-foreground bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold shadow-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {property ? 'Actualizar' : 'Crear'} propiedad
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
