import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Video,
  Image,
  Wand2,
  Zap,
  CreditCard,
  Info,
  ChevronRight,
  Check,
  RefreshCw,
  AlertCircle,
  Download,
  ArrowLeft,
  Loader2,
  FileText,
  Home,
} from 'lucide-react';
import { useCredits } from '../hooks/useCredits';
import { useVideoGeneration, VIDEO_GENERATION_COSTS, type EligibleProperty, type VideoGenerationJob } from '../hooks/useVideoGeneration';

interface AIToolsTabProps {
  userId: string;
  onNavigateToBilling: () => void;
}

// Wizard steps
type WizardStep = 
  | 'select-property'
  | 'select-images'
  | 'generating-images'
  | 'review-images'
  | 'generating-script'
  | 'edit-script'
  | 'generating-video'
  | 'completed';

// Maximum words per script (roughly 8 seconds of speech)
const MAX_WORDS_PER_SCRIPT = 25;
const MIN_WORDS_PER_SCRIPT = 1;

export function AIToolsTab({ userId, onNavigateToBilling }: AIToolsTabProps) {
  const { totalCredits, freeCredits, paidCredits, hasEnoughCredits } = useCredits(userId);
  const {
    currentJob,
    eligibleProperties,
    loading,
    error,
    isWaiting,
    timeoutError,
    fetchEligibleProperties,
    startImageGeneration,
    regenerateImages,
    approveImages,
    approveScript,
    retryFromImages,
    clearJob,
    fetchRecentJobs,
  } = useVideoGeneration(userId);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('select-property');
  const [selectedProperty, setSelectedProperty] = useState<EligibleProperty | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [editedScript, setEditedScript] = useState<string[]>(['', '', '']);
  const [recentJobs, setRecentJobs] = useState<VideoGenerationJob[]>([]);
  const [showRecentJobs, setShowRecentJobs] = useState(false);

  // Load eligible properties on mount
  useEffect(() => {
    fetchEligibleProperties();
  }, [fetchEligibleProperties]);

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
      case 'pending':
      case 'processing':
        // Determine which generation phase we're in
        if (currentJob.image_urls && currentJob.image_urls.length === 3) {
          if (currentJob.script && currentJob.script.length === 3) {
            setWizardStep('generating-video');
          } else {
            setWizardStep('generating-script');
          }
        } else {
          setWizardStep('generating-images');
        }
        break;
      case 'images_ready':
        setWizardStep('review-images');
        break;
      case 'script_ready':
        if (currentJob.script) {
          setEditedScript([...currentJob.script]);
        }
        setWizardStep('edit-script');
        break;
      case 'completed':
        setWizardStep('completed');
        break;
      case 'failed':
        // Stay on current step but show error
        break;
    }
  }, [currentJob]);

  // Handle property selection
  const handleSelectProperty = (property: EligibleProperty) => {
    setSelectedProperty(property);
    setSelectedImages([]);
    setWizardStep('select-images');
  };

  // Handle image selection (max 3, in order)
  const handleToggleImage = (imageUrl: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(imageUrl)) {
        return prev.filter((img) => img !== imageUrl);
      }
      if (prev.length >= 3) {
        return prev; // Already have 3
      }
      return [...prev, imageUrl];
    });
  };

  // Start generation
  const handleStartGeneration = async () => {
    if (!selectedProperty || selectedImages.length !== 3) return;
    
    if (!hasEnoughCredits(VIDEO_GENERATION_COSTS.generateImages)) {
      onNavigateToBilling();
      return;
    }

    const success = await startImageGeneration(
      selectedProperty.id,
      selectedImages,
      customNotes || undefined
    );

    if (success) {
      setWizardStep('generating-images');
    }
  };

  // Regenerate images
  const handleRegenerateImages = async () => {
    if (!selectedProperty || selectedImages.length !== 3) return;
    
    if (!hasEnoughCredits(VIDEO_GENERATION_COSTS.regenerateImages)) {
      onNavigateToBilling();
      return;
    }

    const success = await regenerateImages(
      selectedProperty.id,
      selectedImages,
      customNotes || undefined
    );

    if (success) {
      setWizardStep('generating-images');
    }
  };

  // Approve images and generate script
  const handleApproveImages = async () => {
    if (!currentJob) return;
    
    if (!hasEnoughCredits(VIDEO_GENERATION_COSTS.generateVideo)) {
      onNavigateToBilling();
      return;
    }

    const success = await approveImages(currentJob.id);
    if (success) {
      setWizardStep('generating-script');
    }
  };

  // Update script text
  const handleScriptChange = (index: number, value: string) => {
    setEditedScript((prev) => {
      const newScript = [...prev];
      newScript[index] = value;
      return newScript;
    });
  };

  // Get word count
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Validate script
  const isScriptValid = (): boolean => {
    return editedScript.every((s) => {
      const wordCount = getWordCount(s);
      return wordCount >= MIN_WORDS_PER_SCRIPT && wordCount <= MAX_WORDS_PER_SCRIPT;
    });
  };

  // Approve script and generate video
  const handleApproveScript = async () => {
    if (!currentJob || !isScriptValid()) return;

    const success = await approveScript(currentJob.id, editedScript);
    if (success) {
      setWizardStep('generating-video');
    }
  };

  // Retry from beginning
  const handleRetry = async () => {
    if (!selectedProperty || selectedImages.length !== 3) {
      handleReset();
      return;
    }

    await retryFromImages(selectedProperty.id, selectedImages, customNotes || undefined);
  };

  // Reset wizard
  const handleReset = () => {
    clearJob();
    setWizardStep('select-property');
    setSelectedProperty(null);
    setSelectedImages([]);
    setCustomNotes('');
    setEditedScript(['', '', '']);
  };

  // Go back one step
  const handleBack = () => {
    switch (wizardStep) {
      case 'select-images':
        setWizardStep('select-property');
        setSelectedProperty(null);
        break;
      case 'review-images':
        // Can't go back from here without losing progress
        break;
      case 'edit-script':
        // Can't go back without losing progress
        break;
      default:
        break;
    }
  };

  // Resume a job
  const handleResumeJob = useCallback((job: VideoGenerationJob) => {
    // Find the property
    const property = eligibleProperties.find(p => p.id === job.property_id);
    if (property) {
      setSelectedProperty(property);
      setSelectedImages(job.selected_images);
      setCustomNotes(job.notes || '');
    }
    
    // The useEffect will update the wizard step based on job status
  }, [eligibleProperties]);

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: 'select', label: 'Seleccionar', icon: Home },
      { key: 'images', label: 'Imágenes', icon: Image },
      { key: 'script', label: 'Guión', icon: FileText },
      { key: 'video', label: 'Video', icon: Video },
    ];

    const getCurrentStepIndex = (): number => {
      switch (wizardStep) {
        case 'select-property':
        case 'select-images':
          return 0;
        case 'generating-images':
        case 'review-images':
          return 1;
        case 'generating-script':
        case 'edit-script':
          return 2;
        case 'generating-video':
        case 'completed':
          return 3;
        default:
          return 0;
      }
    };

    const currentIndex = getCurrentStepIndex();

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                  ${isActive ? 'bg-primary text-primary-foreground' : ''}
                  ${isCompleted ? 'bg-green-100 text-green-700' : ''}
                  ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render property selection
  const renderPropertySelection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Selecciona una propiedad</h3>
        <button
          onClick={() => setShowRecentJobs(!showRecentJobs)}
          className="text-sm text-primary hover:underline"
        >
          {showRecentJobs ? 'Ocultar historial' : 'Ver historial'}
        </button>
      </div>

      {showRecentJobs && recentJobs.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Videos recientes</h4>
          {recentJobs.slice(0, 5).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between bg-card p-3 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-2 h-2 rounded-full
                  ${job.status === 'completed' ? 'bg-green-500' : ''}
                  ${job.status === 'failed' ? 'bg-red-500' : ''}
                  ${['pending', 'processing'].includes(job.status) ? 'bg-amber-500 animate-pulse' : ''}
                  ${['images_ready', 'script_ready'].includes(job.status) ? 'bg-blue-500' : ''}
                `} />
                <span className="text-sm">{job.status}</span>
              </div>
              {job.status === 'completed' && job.video_url && (
                <a
                  href={job.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline"
                >
                  Ver video
                </a>
              )}
              {['images_ready', 'script_ready'].includes(job.status) && (
                <button
                  onClick={() => handleResumeJob(job)}
                  className="text-primary text-sm hover:underline"
                >
                  Continuar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {eligibleProperties.length === 0 ? (
        <div className="text-center py-8 bg-muted/50 rounded-lg">
          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No tienes propiedades con al menos 3 imágenes.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Agrega más imágenes a tus propiedades para usar esta función.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {eligibleProperties.map((property) => (
            <button
              key={property.id}
              onClick={() => handleSelectProperty(property)}
              className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors text-left"
            >
              <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {property.images[0] && (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{property.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {property.images.length} imágenes disponibles
                </p>
                <span className={`
                  inline-block mt-2 px-2 py-0.5 text-xs rounded-full
                  ${property.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                `}>
                  {property.status}
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Render image selection
  const renderImageSelection = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h3 className="text-lg font-semibold">Selecciona 3 imágenes</h3>
          <p className="text-sm text-muted-foreground">
            Elige las mejores imágenes en el orden que deseas que aparezcan
          </p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm font-medium mb-2">Propiedad: {selectedProperty?.title}</p>
        <p className="text-sm text-muted-foreground">
          Seleccionadas: {selectedImages.length}/3
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {selectedProperty?.images.map((img, index) => {
          const selectedIndex = selectedImages.indexOf(img);
          const isSelected = selectedIndex !== -1;

          return (
            <button
              key={index}
              onClick={() => handleToggleImage(img)}
              className={`
                relative aspect-video rounded-lg overflow-hidden border-2 transition-all
                ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/30'}
              `}
            >
              <img
                src={img}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {isSelected && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {selectedIndex + 1}
                </div>
              )}
              {!isSelected && selectedImages.length >= 3 && (
                <div className="absolute inset-0 bg-black/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Notas adicionales (opcional)
        </label>
        <textarea
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Ej: Enfatizar la vista al mar, mencionar la piscina..."
          className="w-full px-4 py-3 bg-background border border-border rounded-lg resize-none h-24 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Credit cost info */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <Zap className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-amber-800">
            <strong>{VIDEO_GENERATION_COSTS.generateImages} créditos</strong> para generar las imágenes iniciales
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Tienes {totalCredits} créditos disponibles
          </p>
        </div>
      </div>

      <button
        onClick={handleStartGeneration}
        disabled={selectedImages.length !== 3 || loading || !hasEnoughCredits(VIDEO_GENERATION_COSTS.generateImages)}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Iniciando...
          </>
        ) : (
          <>
            <Wand2 className="h-5 w-5" />
            Generar imágenes ({VIDEO_GENERATION_COSTS.generateImages} créditos)
          </>
        )}
      </button>
    </div>
  );

  // Render generating state
  const renderGenerating = (type: 'images' | 'script' | 'video') => {
    const messages = {
      images: {
        title: 'Generando imágenes...',
        description: 'Estamos creando 3 frames únicos para tu video. Esto puede tomar unos minutos.',
      },
      script: {
        title: 'Generando guión...',
        description: 'Creando el texto que se dirá en cada escena del video.',
      },
      video: {
        title: 'Generando video...',
        description: 'Produciendo tu video final. Este proceso puede tomar varios minutos.',
      },
    };

    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          {type === 'images' && <Image className="absolute inset-0 m-auto h-8 w-8 text-primary" />}
          {type === 'script' && <FileText className="absolute inset-0 m-auto h-8 w-8 text-primary" />}
          {type === 'video' && <Video className="absolute inset-0 m-auto h-8 w-8 text-primary" />}
        </div>
        <h3 className="text-xl font-semibold mb-2">{messages[type].title}</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {messages[type].description}
        </p>
        {timeoutError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
            <p className="text-red-700 text-sm">
              La operación ha tardado demasiado. Por favor, intenta de nuevo.
            </p>
            <button
              onClick={handleRetry}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render image review
  const renderImageReview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Imágenes generadas</h3>
        <p className="text-muted-foreground">
          Revisa las imágenes. Puedes regenerarlas o continuar al siguiente paso.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {currentJob?.image_urls?.map((img, index) => (
          <div key={index} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
            <img
              src={img}
              alt={`Frame ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-sm rounded">
              Frame {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && currentJob?.status === 'failed' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleRegenerateImages}
          disabled={loading || !hasEnoughCredits(VIDEO_GENERATION_COSTS.regenerateImages)}
          className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          Regenerar ({VIDEO_GENERATION_COSTS.regenerateImages} créditos)
        </button>
        <button
          onClick={handleApproveImages}
          disabled={loading || !hasEnoughCredits(VIDEO_GENERATION_COSTS.generateVideo)}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Check className="h-5 w-5" />
              Aprobar y generar video ({VIDEO_GENERATION_COSTS.generateVideo} créditos)
            </>
          )}
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Créditos disponibles: {totalCredits}
      </p>
    </div>
  );

  // Render script editing
  const renderScriptEdit = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Edita el guión</h3>
        <p className="text-muted-foreground">
          Personaliza lo que se dirá en cada escena (máximo {MAX_WORDS_PER_SCRIPT} palabras por escena)
        </p>
      </div>

      <div className="space-y-4">
        {editedScript.map((script, index) => {
          const wordCount = getWordCount(script);
          const isOverLimit = wordCount > MAX_WORDS_PER_SCRIPT;
          const isEmpty = wordCount < MIN_WORDS_PER_SCRIPT;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Escena {index + 1}
                </label>
                <span className={`text-xs ${isOverLimit ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {wordCount}/{MAX_WORDS_PER_SCRIPT} palabras
                </span>
              </div>
              <div className="flex gap-3">
                {currentJob?.image_urls?.[index] && (
                  <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={currentJob.image_urls[index]}
                      alt={`Frame ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <textarea
                  value={script}
                  onChange={(e) => handleScriptChange(index, e.target.value)}
                  className={`
                    flex-1 px-4 py-3 bg-background border rounded-lg resize-none h-28
                    focus:ring-2 focus:ring-primary focus:border-transparent
                    ${isOverLimit || isEmpty ? 'border-red-300 bg-red-50' : 'border-border'}
                  `}
                  placeholder="Escribe el texto para esta escena..."
                />
              </div>
              {isOverLimit && (
                <p className="text-xs text-red-600">
                  El texto es demasiado largo. Reduce a {MAX_WORDS_PER_SCRIPT} palabras.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Error display */}
      {error && currentJob?.status === 'failed' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-red-700 text-sm underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleApproveScript}
        disabled={loading || !isScriptValid()}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Video className="h-5 w-5" />
            Generar video
          </>
        )}
      </button>
    </div>
  );

  // Render completed state
  const renderCompleted = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">¡Video completado!</h3>
        <p className="text-muted-foreground">
          Tu video está listo para descargar y compartir.
        </p>
      </div>

      {/* Video player */}
      {currentJob?.video_url && (
        <div className="aspect-[9/16] max-w-xs mx-auto rounded-xl overflow-hidden bg-black">
          <video
            src={currentJob.video_url}
            controls
            className="w-full h-full object-contain"
            poster={currentJob.image_urls?.[0]}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        {currentJob?.video_url && (
          <a
            href={currentJob.video_url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="h-5 w-5" />
            Descargar video
          </a>
        )}
        <button
          onClick={handleReset}
          className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="h-5 w-5" />
          Crear otro video
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
      case 'generating-images':
        return renderGenerating('images');
      case 'review-images':
        return renderImageReview();
      case 'generating-script':
        return renderGenerating('script');
      case 'edit-script':
        return renderScriptEdit();
      case 'generating-video':
        return renderGenerating('video');
      case 'completed':
        return renderCompleted();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Generador de Videos con IA
          </h2>
          <p className="text-white/80 max-w-xl">
            Crea videos profesionales de tus propiedades usando inteligencia artificial. 
            Perfectos para Instagram, TikTok, Facebook y más.
          </p>
        </div>
      </div>

      {/* Credits Overview */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-lg">Tus Créditos de IA</h3>
          <button
            onClick={onNavigateToBilling}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors text-sm"
          >
            <CreditCard className="h-4 w-4" />
            Comprar más
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{totalCredits}</p>
            <p className="text-sm text-muted-foreground">Total disponible</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{freeCredits}</p>
            <p className="text-sm text-green-700">Gratis (mensuales)</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{paidCredits}</p>
            <p className="text-sm text-blue-700">Comprados</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Costo por video:</strong> {VIDEO_GENERATION_COSTS.generateImages} créditos (imágenes) + {VIDEO_GENERATION_COSTS.generateVideo} créditos (video) = {VIDEO_GENERATION_COSTS.generateImages + VIDEO_GENERATION_COSTS.generateVideo} créditos total
          </p>
        </div>
      </div>

      {/* Wizard */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        {renderStepIndicator()}
        {renderCurrentStep()}
      </div>

      {/* FAQ */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Preguntas frecuentes</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-1">
              ¿Cuánto tiempo tarda en generarse un video?
            </h4>
            <p className="text-sm text-muted-foreground">
              El proceso completo puede tomar entre 5-15 minutos dependiendo de la complejidad.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-1">
              ¿Qué tipo de videos puedo crear?
            </h4>
            <p className="text-sm text-muted-foreground">
              Videos promocionales verticales (9:16) de 24 segundos, perfectos para 
              Instagram Reels, TikTok, y YouTube Shorts.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-1">
              ¿Qué pasa si falla la generación?
            </h4>
            <p className="text-sm text-muted-foreground">
              Si algo sale mal, tus créditos se reembolsan automáticamente y puedes 
              intentar de nuevo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
