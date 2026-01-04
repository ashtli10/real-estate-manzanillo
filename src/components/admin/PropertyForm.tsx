import { useState, useEffect } from 'react';
import { X, Save, Loader2, Sparkles, ChevronLeft, ChevronRight, Check, AlertCircle, Cloud } from 'lucide-react';
import type { Property, PropertyInsert, PropertyType, PropertyStatus } from '../../types/property';
import { generateSlug, propertyTypeLabels, propertyStatusLabels } from '../../types/property';
import { ImageUpload } from './ImageUpload';
import { VideoUpload } from './VideoUpload';
import { TagInput } from './TagInput';
import { GoogleMapsInput } from './GoogleMapsInput';
import { CharacteristicInput, type Characteristic } from './CharacteristicInput';
import { usePropertyDraft } from '../../hooks/usePropertyDraft';

interface PropertyFormProps {
  property?: Property | null;
  onSave: (data: PropertyInsert) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  username?: string;
  userId?: string;
}

type FormStep = 'ai' | 'basic' | 'price' | 'location' | 'characteristics' | 'media' | 'extras';

const STEPS: { id: FormStep; label: string; shortLabel: string }[] = [
  { id: 'ai', label: 'IA Prefill', shortLabel: 'IA' },
  { id: 'basic', label: 'Info Básica', shortLabel: 'Info' },
  { id: 'price', label: 'Precio', shortLabel: 'Precio' },
  { id: 'location', label: 'Ubicación', shortLabel: 'Lugar' },
  { id: 'characteristics', label: 'Características', shortLabel: 'Caract.' },
  { id: 'media', label: 'Imágenes', shortLabel: 'Fotos' },
  { id: 'extras', label: 'Extras', shortLabel: 'Extras' },
];

// Expanded bonus tags - strategic highlights
const BONUS_SUGGESTIONS = [
  'Vista al mar', 'Vista a la montaña', 'Vista panorámica', 'Frente al mar',
  'A pasos de la playa', 'Zona turística', 'Zona exclusiva', 'Zona residencial',
  'Barrio tranquilo', 'Privacidad garantizada', 'Calle cerrada',
  'Acceso a plazas comerciales', 'Cerca de escuelas', 'Cerca de hospitales',
  'Cerca de supermercados', 'Cerca de restaurantes', 'Cerca de bancos',
  'Cerca del centro', 'Transporte público cercano', 'Fácil acceso carretero',
  'Oportunidad de inversión', 'Alta plusvalía', 'Precio de remate',
  'Por debajo de avalúo', 'Ideal para Airbnb', 'Ideal para renta',
  'Ideal para negocio', 'Escrituras en orden', 'Libre de gravamen',
  'Recién remodelada', 'Como nueva', 'Construcción de lujo',
  'Materiales premium', 'Arquitectura moderna', 'Estilo colonial',
  'Estilo minimalista', 'Entrega inmediata', 'Pre-venta', 'En desarrollo',
  'Club de playa incluido', 'Acceso a campo de golf', 'Marina cercana',
  'Palapa incluida', 'Muelle privado', 'Lifestyle de playa',
  'Ideal para familias', 'Pet friendly', 'Comunidad cerrada',
];

const formatPriceValue = (value: number | null | undefined) =>
  value && value > 0
    ? new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
    : '';

export function PropertyForm({ property, onSave, onCancel, loading = false, username, userId }: PropertyFormProps) {
  // Use draft hook for persistent state
  const {
    formData,
    currentStep: savedStep,
    aiText,
    loading: draftLoading,
    saving: draftSaving,
    hasDraft,
    draftId,
    setFormData,
    setAiText,
    updateField,
    deleteDraft,
    saveDraft: forceSaveDraft,
    loadDraft,
  } = usePropertyDraft({
    userId,
    propertyId: property?.id || null,
  });

  const [currentStep, setCurrentStep] = useState<FormStep>(() => {
    // If editing, start at basic (skip AI). Otherwise start at AI.
    return property ? 'basic' : 'ai';
  });
  const [initialStepSet, setInitialStepSet] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [rentPriceDisplay, setRentPriceDisplay] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  // When resuming a draft (new property only), restore the saved step
  useEffect(() => {
    if (!property && !draftLoading && !initialStepSet && savedStep) {
      const validStep = STEPS.find(s => s.id === savedStep);
      if (validStep) {
        setCurrentStep(validStep.id);
      }
      setInitialStepSet(true);
    } else if (!draftLoading && !initialStepSet) {
      // Mark as initialized even if no savedStep
      setInitialStepSet(true);
    }
  }, [property, draftLoading, initialStepSet, savedStep]);

  // Initialize form with property data when editing
  useEffect(() => {
    if (property && !draftLoading) {
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
        status: property.status,
        display_order: property.display_order,
        show_map: property.show_map ?? true,
        characteristics: property.characteristics || [],
      });
      setAutoSlug(false);
    }
  }, [property, draftLoading, setFormData]);

  // Update price displays
  useEffect(() => {
    setPriceDisplay(formatPriceValue(formData.price));
  }, [formData.price]);

  useEffect(() => {
    setRentPriceDisplay(formatPriceValue(formData.rent_price));
  }, [formData.rent_price]);

  // Auto-generate slug from title with username prefix
  useEffect(() => {
    if (autoSlug && formData.title && !property) {
      const baseSlug = generateSlug(formData.title);
      const prefixedSlug = username ? `${username}/${baseSlug}` : baseSlug;
      updateField('slug', prefixedSlug);
    }
  }, [formData.title, autoSlug, username, property, updateField]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('El título es requerido');
      setCurrentStep('basic');
      return;
    }
    if (!formData.slug.trim()) {
      alert('El slug es requerido');
      setCurrentStep('basic');
      return;
    }

    if (!formData.is_for_sale && !formData.is_for_rent) {
      alert('Selecciona si la propiedad es para venta, renta o ambas');
      setCurrentStep('price');
      return;
    }

    if (formData.is_for_sale && (!formData.price || formData.price <= 0)) {
      alert('El precio de venta debe ser mayor a 0');
      setCurrentStep('price');
      return;
    }

    if (formData.is_for_rent && (!formData.rent_price || formData.rent_price <= 0)) {
      alert('La renta debe ser mayor a 0');
      setCurrentStep('price');
      return;
    }

    if (!formData.images || formData.images.length === 0) {
      alert('Debes subir al menos una imagen de la propiedad');
      setCurrentStep('media');
      return;
    }

    try {
      await onSave(formData);
      // Delete draft after successful save
      await deleteDraft();
    } catch (err) {
      console.error('Error saving property:', err);
    }
  };

  const handleCancel = async () => {
    // Silently delete the draft and close
    await deleteDraft();
    onCancel();
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

  // AI prefill - waits for completion before advancing
  const applyPrefill = async () => {
    if (!aiText.trim() || !userId) return;
    
    setAiError(null);
    setAiLoading(true);
    
    try {
      // First, save the AI text to the draft immediately
      setAiText(aiText);
      await forceSaveDraft();
      
      // Wait for draft to be created/saved
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!draftId) {
        throw new Error('No se pudo crear el borrador');
      }

      // Call the API and wait for completion
      const response = await fetch('/api/process-draft-prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, user_id: userId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al procesar con IA');
      }
      
      // Reload draft to get the filled data
      await loadDraft();
      
      setAiLoading(false);
      
      // Move to basic step after successful prefill
      setCurrentStep('basic');
      
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'No se pudo procesar el texto');
      setAiLoading(false);
    }
  };

  // Loading state while draft loads
  if (draftLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-strong p-8 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-foreground font-medium">Cargando borrador...</p>
        </div>
      </div>
    );
  }

  // Step content components
  const renderStepContent = () => {
    switch (currentStep) {
      case 'ai':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Prellenar con IA</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                Pega el texto de un anuncio y la IA extraerá automáticamente toda la información.
              </p>
            </div>
            
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Pega aquí el texto del anuncio de la propiedad...

Ejemplo: Casa de 3 recámaras en Nuevo Salagua, 150m² de construcción, 2 baños completos, cochera para 2 autos, precio $2,500,000 MXN..."
              className="w-full min-h-[180px] p-4 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={aiLoading}
            />
            
            {aiError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{aiError}</span>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={applyPrefill}
                disabled={aiLoading || !aiText.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Procesando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Prellenar formulario
                  </>
                )}
              </button>
              
              <p className="text-center text-xs text-muted-foreground">
                Costo: 2 créditos · O puedes{' '}
                <button
                  type="button"
                  onClick={() => setCurrentStep('basic')}
                  className="text-primary hover:underline"
                >
                  llenar manualmente
                </button>
              </p>
            </div>
          </div>
        );

      case 'basic':
        return (
          <div className="space-y-5">
            
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-foreground">Información Básica</h3>
              <p className="text-muted-foreground text-sm">Título y descripción de la propiedad</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="input-field text-base"
                placeholder="Ej: Casa en venta en Nuevo Salagua"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Slug (URL)
                <button
                  type="button"
                  onClick={() => setAutoSlug(!autoSlug)}
                  className="ml-2 text-xs text-primary"
                >
                  {autoSlug ? 'Editar' : 'Auto'}
                </button>
              </label>
              <div className="flex items-center">
                {username && (
                  <span className="px-3 py-2.5 bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground text-sm">
                    {username}/
                  </span>
                )}
                <input
                  type="text"
                  value={username && formData.slug.startsWith(`${username}/`) 
                    ? formData.slug.slice(username.length + 1) 
                    : formData.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    const baseSlug = e.target.value;
                    const fullSlug = username ? `${username}/${baseSlug}` : baseSlug;
                    updateField('slug', fullSlug);
                  }}
                  className={`input-field flex-1 ${username ? 'rounded-l-none' : ''}`}
                  placeholder="casa-nuevo-salagua"
                  disabled={autoSlug}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Descripción</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                className="input-field min-h-[120px] resize-none text-base"
                placeholder="Descripción detallada..."
              />
            </div>
          </div>
        );

      case 'price':
        return (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-foreground">Precio y Tipo</h3>
              <p className="text-muted-foreground text-sm">Define el precio y tipo de propiedad</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 p-4 bg-muted/50 rounded-lg">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_for_sale}
                  onChange={(e) => {
                    updateField('is_for_sale', e.target.checked);
                    if (!e.target.checked) {
                      updateField('price', null);
                      setPriceDisplay('');
                    }
                  }}
                  className="w-5 h-5"
                />
                En venta
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_for_rent}
                  onChange={(e) => {
                    updateField('is_for_rent', e.target.checked);
                    if (!e.target.checked) {
                      updateField('rent_price', null);
                      setRentPriceDisplay('');
                    }
                  }}
                  className="w-5 h-5"
                />
                En renta
              </label>
            </div>

            {formData.is_for_sale && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Precio de venta</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={priceDisplay}
                    onChange={(e) => handlePriceInput(e.target.value)}
                    className="input-field flex-1 text-base"
                    placeholder="1,000,000"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className="input-field w-24"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            )}

            {formData.is_for_rent && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Renta mensual</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rentPriceDisplay}
                    onChange={(e) => handleRentPriceInput(e.target.value)}
                    className="input-field flex-1 text-base"
                    placeholder="25,000"
                  />
                  <select
                    value={formData.rent_currency}
                    onChange={(e) => updateField('rent_currency', e.target.value)}
                    className="input-field w-24"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tipo de propiedad</label>
              <select
                value={formData.property_type}
                onChange={(e) => updateField('property_type', e.target.value as PropertyType)}
                className="input-field text-base"
              >
                {Object.entries(propertyTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-foreground">Ubicación</h3>
              <p className="text-muted-foreground text-sm">Busca la dirección en el mapa</p>
            </div>
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
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="p-2 rounded-lg border border-border bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Ciudad</p>
                <p className="text-xs font-medium truncate">{formData.location_city || '—'}</p>
              </div>
              <div className="p-2 rounded-lg border border-border bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Estado</p>
                <p className="text-xs font-medium truncate">{formData.location_state || '—'}</p>
              </div>
              <div className="p-2 rounded-lg border border-border bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Colonia</p>
                <p className="text-xs font-medium truncate">{formData.location_neighborhood || '—'}</p>
              </div>
            </div>
          </div>
        );

      case 'characteristics':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-foreground">Características</h3>
              <p className="text-muted-foreground text-sm">Recámaras, baños, estacionamientos, etc.</p>
            </div>
            <CharacteristicInput
              characteristics={formData.characteristics as Characteristic[]}
              onChange={(chars) => updateField('characteristics', chars)}
            />
          </div>
        );

      case 'media':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-foreground">Imágenes y Videos</h3>
              <p className="text-muted-foreground text-sm">Sube las fotos de la propiedad</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Imágenes * <span className="text-muted-foreground font-normal">(mínimo 1)</span>
              </h4>
              <ImageUpload
                images={formData.images}
                onChange={(images) => updateField('images', images)}
              />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Videos (opcional)</h4>
              <VideoUpload
                videos={formData.videos}
                onChange={(videos) => updateField('videos', videos)}
              />
            </div>
          </div>
        );

      case 'extras':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-foreground">Extras</h3>
              <p className="text-muted-foreground text-sm">Bonos, estado y opciones adicionales</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Bonos destacados</h4>
              <TagInput
                tags={formData.custom_bonuses}
                onChange={(bonuses) => updateField('custom_bonuses', bonuses)}
                placeholder="Agregar bono..."
                suggestions={BONUS_SUGGESTIONS}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value as PropertyStatus)}
                  className="input-field"
                >
                  {Object.entries(propertyStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-border rounded-lg w-full justify-center hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => updateField('is_featured', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-medium">Propiedad Destacada</span>
                </label>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-card rounded-xl shadow-strong w-full max-w-2xl h-[calc(100vh-1rem)] sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {property ? 'Editar' : 'Nueva'} Propiedad
              </h2>
              {/* Save status indicator - Next to title */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {draftSaving ? (
                  <>
                    <Cloud className="h-3.5 w-3.5 animate-pulse" />
                    <span className="hidden sm:inline">Guardando...</span>
                  </>
                ) : hasDraft ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    <span className="hidden sm:inline text-green-600">Guardado</span>
                  </>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 hover:bg-muted rounded-lg transition-colors -mr-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Step Indicators - Centered with connecting lines */}
          <div className="px-3 sm:px-6 pb-3 overflow-x-auto">
            <div className="flex items-center justify-center">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = step.id === currentStep;
                const isLast = index === STEPS.length - 1;
                const nextCompleted = index < currentStepIndex;
                return (
                  <div key={step.id} className="flex items-center">
                    {/* Step button */}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className="flex flex-col items-center gap-1 py-1.5 px-1 sm:px-2 transition-all hover:opacity-80"
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </div>
                      <span className={`text-[9px] sm:text-[10px] leading-tight whitespace-nowrap ${
                        isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'
                      }`}>
                        {step.shortLabel}
                      </span>
                    </button>
                    {/* Connecting line */}
                    {!isLast && (
                      <div 
                        className={`w-4 sm:w-6 h-0.5 -mt-4 ${
                          nextCompleted ? 'bg-green-500' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {renderStepContent()}
        </div>

        {/* Navigation - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-border bg-muted/30 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentStepIndex === 0) {
                  handleCancel();
                } else {
                  setCurrentStep(STEPS[currentStepIndex - 1].id);
                }
              }}
              className="flex items-center gap-1 px-3 sm:px-4 py-2 text-foreground bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">{currentStepIndex === 0 ? 'Cancelar' : 'Anterior'}</span>
            </button>

            <span className="text-xs sm:text-sm text-muted-foreground">
              {currentStepIndex + 1} de {STEPS.length}
            </span>

            {currentStepIndex === STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold shadow hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="text-sm">{property ? 'Actualizar' : 'Crear'}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep(STEPS[currentStepIndex + 1].id)}
                className="flex items-center gap-1 px-4 sm:px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold shadow hover:opacity-90 transition-all"
              >
                <span className="text-sm">Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
