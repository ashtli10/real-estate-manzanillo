import { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Image,
  Zap,
  CreditCard,
  Check,
  AlertCircle,
  Download,
  ArrowLeft,
  Loader2,
  Home,
  Play,
  ChevronRight,
  Sparkles,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useCredits } from '../hooks/useCredits';
import { 
  useVideoTourGeneration, 
  TOUR_CREDITS_PER_IMAGE, 
  type TourEligibleProperty, 
  type TourGenerationJob 
} from '../hooks/useVideoTourGeneration';

interface VideoTourTabProps {
  userId: string;
  onNavigateToBilling: () => void;
}

// Wizard steps
type WizardStep = 
  | 'select-property'
  | 'select-images'
  | 'generating'
  | 'completed';

// Min/Max images
const MIN_IMAGES = 1;
const MAX_IMAGES = 30;

export function VideoTourTab({ userId, onNavigateToBilling }: VideoTourTabProps) {
  const { totalCredits, hasEnoughCredits, refresh: refreshCredits } = useCredits(userId);
  const {
    currentJob,
    eligibleProperties,
    loading,
    error,
    timeoutError,
    fetchEligibleProperties,
    startTourGeneration,
    clearJob,
    fetchRecentJobs,
    checkForActiveJob,
    loadExistingJob,
  } = useVideoTourGeneration(userId);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('select-property');
  const [selectedProperty, setSelectedProperty] = useState<TourEligibleProperty | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [recentJobs, setRecentJobs] = useState<TourGenerationJob[]>([]);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Load eligible properties on mount
  useEffect(() => {
    fetchEligibleProperties();
  }, [fetchEligibleProperties]);

  // Check for active job on mount (auto-resume)
  useEffect(() => {
    if (initialCheckDone) return;
    
    const checkActive = async () => {
      const activeJob = await checkForActiveJob();
      if (activeJob) {
        // Find the property to restore context
        const property = eligibleProperties.find(p => p.id === activeJob.property_id);
        if (property) {
          setSelectedProperty(property);
          setSelectedImages(activeJob.selected_images);
        }
        setWizardStep('generating');
      }
      setInitialCheckDone(true);
    };
    
    if (eligibleProperties.length > 0 || initialCheckDone) {
      checkActive();
    }
  }, [checkForActiveJob, eligibleProperties, initialCheckDone]);

  // Load recent jobs
  useEffect(() => {
    const loadRecentJobs = async () => {
      const jobs = await fetchRecentJobs();
      setRecentJobs(jobs);
    };
    loadRecentJobs();
  }, [fetchRecentJobs, currentJob]);

  // Update wizard step based on job status
  useEffect(() => {
    if (!currentJob) return;

    switch (currentJob.status) {
      case 'processing':
        setWizardStep('generating');
        break;
      case 'completed':
        setWizardStep('completed');
        break;
      case 'failed':
        // Stay on current step but show error
        break;
    }
  }, [currentJob]);

  // Calculate credit cost
  const creditCost = selectedImages.length * TOUR_CREDITS_PER_IMAGE;

  // Handle property selection
  const handleSelectProperty = (property: TourEligibleProperty) => {
    setSelectedProperty(property);
    setSelectedImages([]);
    setWizardStep('select-images');
  };

  // Handle image toggle (for selection)
  const handleToggleImage = (imageUrl: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(imageUrl)) {
        return prev.filter((img) => img !== imageUrl);
      }
      if (prev.length >= MAX_IMAGES) {
        return prev;
      }
      return [...prev, imageUrl];
    });
  };

  // Handle select all images
  const handleSelectAll = () => {
    if (!selectedProperty) return;
    const maxToSelect = Math.min(selectedProperty.images.length, MAX_IMAGES);
    setSelectedImages(selectedProperty.images.slice(0, maxToSelect));
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedImages([]);
  };

  // Start generation directly from image selection
  const handleStartGeneration = async () => {
    if (!selectedProperty || selectedImages.length < MIN_IMAGES) return;
    
    if (!hasEnoughCredits(creditCost)) {
      onNavigateToBilling();
      return;
    }

    const success = await startTourGeneration(
      selectedProperty.id,
      selectedImages
    );

    if (success) {
      setWizardStep('generating');
      refreshCredits();
    }
  };

  // Reset wizard
  const handleReset = () => {
    clearJob();
    setWizardStep('select-property');
    setSelectedProperty(null);
    setSelectedImages([]);
  };

  // Go back one step
  const handleBack = () => {
    switch (wizardStep) {
      case 'select-images':
        setWizardStep('select-property');
        setSelectedProperty(null);
        setSelectedImages([]);
        break;
      default:
        break;
    }
  };

  // Resume a job
  const handleResumeJob = useCallback(async (job: TourGenerationJob) => {
    await loadExistingJob(job.id);
    
    const property = eligibleProperties.find(p => p.id === job.property_id);
    if (property) {
      setSelectedProperty(property);
      setSelectedImages(job.selected_images);
    }
  }, [eligibleProperties, loadExistingJob]);

  // Download video
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(url, '_blank');
    }
  };

  // Get status label in Spanish
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Falló',
    };
    return labels[status] || status;
  };

  // Format date for display
  const formatJobDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: 'select', label: 'Propiedad', icon: Home },
      { key: 'images', label: 'Imágenes', icon: Image },
      { key: 'video', label: 'Video', icon: Video },
    ];

    const getCurrentStepIndex = (): number => {
      switch (wizardStep) {
        case 'select-property':
          return 0;
        case 'select-images':
          return 1;
        case 'generating':
        case 'completed':
          return 2;
        default:
          return 0;
      }
    };

    const currentIndex = getCurrentStepIndex();
    const isProcessing = wizardStep === 'generating';

    return (
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`
                    flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${isCompleted ? 'bg-green-100 text-green-700' : ''}
                    ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mx-0.5 sm:mx-1" />
                )}
              </div>
            );
          })}
        </div>
        {wizardStep === 'completed' && (
          <div className="flex justify-center mt-3">
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Crear otro tour
            </button>
          </div>
        )}
        {isProcessing && (
          <div className="flex justify-center mt-3">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generando video... por favor espera
            </span>
          </div>
        )}
      </div>
    );
  };

  // Render property selection
  const renderPropertySelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Selecciona una propiedad</h3>

      {eligibleProperties.length === 0 ? (
        <div className="text-center py-8 bg-muted/50 rounded-lg">
          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No tienes propiedades con imágenes.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Agrega imágenes a tus propiedades para crear video tours.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {eligibleProperties.map((property) => (
            <button
              key={property.id}
              onClick={() => handleSelectProperty(property)}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors text-left"
            >
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm sm:text-base line-clamp-2">{property.title}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {property.images.length} {property.images.length === 1 ? 'imagen' : 'imágenes'}
                </p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                  property.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {property.status === 'active' ? 'Activa' : 'Borrador'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Render image selection
  const renderImageSelection = () => (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{selectedProperty?.title}</h3>
          <p className="text-sm text-muted-foreground">
            Selecciona {MIN_IMAGES}-{MAX_IMAGES} imágenes en el orden que quieres que aparezcan
          </p>
        </div>
      </div>

      {/* Selection controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSelectAll}
          className="text-sm px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground"
        >
          Seleccionar todas
        </button>
        <button
          onClick={handleClearSelection}
          className="text-sm px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground"
        >
          Limpiar
        </button>
        <span className="text-sm text-muted-foreground ml-auto">
          {selectedImages.length} / {MAX_IMAGES} seleccionadas
        </span>
      </div>

      {/* Credit preview */}
      <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg">
        <Zap className="h-4 w-4 text-amber-500" />
        <span>
          <strong>{creditCost} créditos</strong> ({TOUR_CREDITS_PER_IMAGE} por imagen)
        </span>
        {!hasEnoughCredits(creditCost) && (
          <span className="text-red-500 ml-2">
            (Tienes {totalCredits})
          </span>
        )}
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {selectedProperty?.images.map((imageUrl, index) => {
          const isSelected = selectedImages.includes(imageUrl);
          const selectionIndex = selectedImages.indexOf(imageUrl);

          return (
            <button
              key={imageUrl}
              onClick={() => handleToggleImage(imageUrl)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                isSelected 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-transparent hover:border-muted-foreground/30'
              }`}
            >
              <img
                src={imageUrl}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {isSelected && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {selectionIndex + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Generate button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleStartGeneration}
          disabled={selectedImages.length < MIN_IMAGES || loading || !hasEnoughCredits(creditCost)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Iniciando...
            </>
          ) : !hasEnoughCredits(creditCost) ? (
            <>
              <CreditCard className="h-4 w-4" />
              Comprar créditos
            </>
          ) : (
            <>
              <Video className="h-4 w-4" />
              Generar Video Tour
            </>
          )}
        </button>
      </div>

      {!hasEnoughCredits(creditCost) && selectedImages.length >= MIN_IMAGES && (
        <p className="text-sm text-center text-red-500">
          Necesitas {creditCost - totalCredits} créditos más
        </p>
      )}
    </div>
  );

  // Render generating state
  const renderGenerating = () => (
    <div className="text-center py-8 space-y-6">
      <div className="relative">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Generando tu video tour...</h3>
        <p className="text-muted-foreground mt-1">
          Esto puede tomar unos minutos. No cierres esta página.
        </p>
      </div>

      {selectedProperty && (
        <div className="text-sm text-muted-foreground">
          <p>{selectedImages.length} imágenes × {clipDuration}s = {selectedImages.length * clipDuration}s de video</p>
        </div>
      )}

      {timeoutError && (
        <div className="bg-amber-50 text-amber-700 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="font-medium">El proceso está tardando más de lo esperado</p>
            <p className="text-sm mt-1">
              El video se está generando en segundo plano. Puedes revisar el historial más tarde.
            </p>
          </div>
        </div>
      )}

      {error && currentJob?.status === 'failed' && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="font-medium">Error al generar el video</p>
            <p className="text-sm mt-1">{error}</p>
            {currentJob.credits_refunded && (
              <p className="text-sm mt-1 text-green-600">
                Tus créditos han sido reembolsados.
              </p>
            )}
          </div>
        </div>
      )}

      {currentJob?.status === 'failed' && (
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );

  // Render completed state
  const renderCompleted = () => (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold">¡Video tour listo!</h3>
        <p className="text-muted-foreground mt-1">
          Tu video tour ha sido generado exitosamente.
        </p>
      </div>

      {/* Video preview */}
      {currentJob?.video_url && (
        <div className="rounded-lg overflow-hidden bg-black">
          <video
            src={currentJob.video_url}
            controls
            className="w-full max-h-[400px] mx-auto"
            poster={selectedImages[0]}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {currentJob?.video_url && (
          <button
            onClick={() => handleDownload(currentJob.video_url!, `tour-${selectedProperty?.title || 'video'}.mp4`)}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar Video
          </button>
        )}
        <button
          onClick={handleReset}
          className="flex-1 py-3 bg-muted text-foreground rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Crear otro tour
        </button>
      </div>
    </div>
  );

  // Render current step content
  const renderCurrentStep = () => {
    switch (wizardStep) {
      case 'select-property':
        return renderPropertySelection();
      case 'select-images':
        return renderImageSelection();
      case 'generating':
        return renderGenerating();
      case 'completed':
        return renderCompleted();
      default:
        return renderPropertySelection();
    }
  };

  return (
    <div className="space-y-6">
      {/* Credits Overview - Compact */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Créditos:</span>
              <span className="font-bold text-foreground">{totalCredits}</span>
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              · {TOUR_CREDITS_PER_IMAGE} crédito por imagen
            </div>
          </div>
          <button
            onClick={onNavigateToBilling}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors text-xs"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Comprar
          </button>
        </div>
      </div>

      {/* Main wizard area */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        {/* Loading state */}
        {loading && !currentJob && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {error && !currentJob && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Wizard content */}
        {!loading && !error && (
          <>
            {renderStepIndicator()}
            {renderCurrentStep()}
          </>
        )}
      </div>

      {/* History Section - Always visible */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-base sm:text-lg flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            Historial de Video Tours
          </h3>
          <span className="text-xs sm:text-sm text-muted-foreground">{recentJobs.length} tours</span>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <Video className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tienes video tours generados aún.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tus video tours completados y en progreso aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => {
              const property = eligibleProperties.find(p => p.id === job.property_id);
              const propertyTitle = property?.title || 'Propiedad eliminada';
              const thumbnail = job.selected_images?.[0] || property?.images[0];
              const isCurrentJob = currentJob?.id === job.id;
              const isFailed = job.status === 'failed';
              const isCompleted = job.status === 'completed';
              const isInProgress = job.status === 'processing';

              return (
                <div
                  key={job.id}
                  className={`
                    flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-lg border transition-all
                    ${isCurrentJob ? 'bg-primary/5 border-primary' : 'bg-muted/30 border-transparent hover:bg-muted/50'}
                  `}
                >
                  {/* Thumbnail + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {thumbnail ? (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Image className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm sm:text-base">{propertyTitle}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {formatJobDate(job.created_at)} · {job.selected_images.length} imágenes
                        </p>
                        {/* Status badge */}
                        <div className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                          ${isCompleted ? 'bg-green-100 text-green-700' : ''}
                          ${isFailed ? 'bg-red-100 text-red-700' : ''}
                          ${isInProgress ? 'bg-amber-100 text-amber-700' : ''}
                        `}>
                          <div className={`
                            w-1.5 h-1.5 rounded-full
                            ${isCompleted ? 'bg-green-500' : ''}
                            ${isFailed ? 'bg-red-500' : ''}
                            ${isInProgress ? 'bg-amber-500 animate-pulse' : ''}
                          `} />
                          {getStatusLabel(job.status)}
                        </div>
                      </div>
                      
                      {/* Error message for failed jobs */}
                      {isFailed && job.error_message && (
                        <div className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{job.error_message}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end flex-shrink-0">
                    {/* Completed: Download and view */}
                    {isCompleted && job.video_url && (
                      <>
                        <button
                          onClick={() => handleDownload(job.video_url!, `tour-${propertyTitle}.mp4`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Descargar</span>
                        </button>
                        <button
                          onClick={() => handleResumeJob(job)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {/* In progress: Show processing */}
                    {isInProgress && !isCurrentJob && (
                      <button
                        onClick={() => handleResumeJob(job)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="hidden sm:inline">Ver progreso</span>
                      </button>
                    )}

                    {/* Failed: retry option */}
                    {isFailed && (
                      <button
                        onClick={() => {
                          const prop = eligibleProperties.find(p => p.id === job.property_id);
                          if (prop) {
                            setSelectedProperty(prop);
                            setSelectedImages(job.selected_images);
                            setWizardStep('select-images');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reintentar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
