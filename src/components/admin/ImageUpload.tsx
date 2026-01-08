import { useState, useCallback, useMemo } from 'react';
import { Upload, Image as ImageIcon, Loader2, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../integrations/supabase/client';
import {
  uploadPropertyImage,
  deleteFile,
  isValidImageType,
  validateFileSize,
  STORAGE_LIMITS,
  type UploadProgress,
} from '../../lib/r2-storage';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  propertyId?: string;
  userId?: string;
}

export function ImageUpload({ images, onChange, maxImages = STORAGE_LIMITS.MAX_IMAGES_PER_PROPERTY, propertyId, userId }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Track sequence numbers from existing images (for R2 path structure)
  const existingSequenceSet = useMemo(() => {
    const sequences = images.map((url) => {
      // Extract sequence from URL like: .../images/001.jpg
      const match = url.match(/\/images\/(\d{3})\./);
      return match ? match[1] : null;
    }).filter((seq): seq is string => seq !== null);
    return new Set(sequences);
  }, [images]);

  const reserveNextSequence = (sequenceSet: Set<string>): number => {
    for (let seq = 1; seq <= STORAGE_LIMITS.MAX_IMAGES_PER_PROPERTY; seq++) {
      const padded = String(seq).padStart(3, '0');
      if (!sequenceSet.has(padded)) {
        sequenceSet.add(padded);
        return seq;
      }
    }
    throw new Error(`Maximum image limit (${STORAGE_LIMITS.MAX_IMAGES_PER_PROPERTY}) reached`);
  };

  const uploadImage = async (
    file: File,
    seq: number,
    token: string,
    progressKey: string,
    effectiveUserId: string,
    effectivePropertyId: string
  ): Promise<string | null> => {
    // Validate file type
    if (!isValidImageType(file)) {
      alert('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return null;
    }

    // Validate file size (max 5MB)
    if (!validateFileSize(file, STORAGE_LIMITS.MAX_IMAGE_SIZE_MB)) {
      alert(`La imagen no puede ser mayor a ${STORAGE_LIMITS.MAX_IMAGE_SIZE_MB}MB`);
      return null;
    }

    try {
      // Upload to R2 with reserved sequence
      const result = await uploadPropertyImage(
        effectiveUserId,
        effectivePropertyId,
        seq,
        file,
        token,
        (progress: UploadProgress) => {
          setUploadProgress(prev => ({
            ...prev,
            [progressKey]: progress.percentage
          }));
        }
      );

      return result.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
      return null;
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      alert(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    setUploading(true);

    // Get auth token once per batch
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert('Debes iniciar sesión para subir imágenes');
      setUploading(false);
      return;
    }

    // Determine user and property IDs
    const effectiveUserId = userId || session.user.id;
    const effectivePropertyId = propertyId || 'temp-' + Date.now();

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const sequencePool = new Set(existingSequenceSet);
    const uploadResults: string[] = [];

    for (const file of filesToUpload) {
      let seq: number;
      try {
        seq = reserveNextSequence(sequencePool);
      } catch (err) {
        console.error(err);
        alert(`Ya alcanzaste el límite de imágenes (${STORAGE_LIMITS.MAX_IMAGES_PER_PROPERTY})`);
        break;
      }

      const progressKey = `${file.name}-${seq}`;
      const url = await uploadImage(
        file,
        seq,
        session.access_token,
        progressKey,
        effectiveUserId,
        effectivePropertyId
      );
      if (url) {
        uploadResults.push(url);
      }
    }

    if (uploadResults.length > 0) {
      onChange([...images, ...uploadResults]);
    }

    setUploadProgress({});
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, maxImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeImage = async (index: number) => {
    const imageUrl = images[index];
    
    // Try to delete from R2 storage
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && imageUrl.includes('/users/')) {
        // Extract the path from the URL (everything after the domain)
        const url = new URL(imageUrl);
        const path = url.pathname.slice(1); // Remove leading /
        await deleteFile(path, session.access_token);
      }
    } catch (error) {
      console.error('Error deleting image from storage:', error);
      // Continue with removal from array even if storage delete fails
    }
    
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((img) => img === active.id);
    const newIndex = images.findIndex((img) => img === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(images, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="image-upload"
          disabled={uploading}
        />
        <label
          htmlFor="image-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary animate-spin mb-3" />
              <p className="text-foreground font-medium text-sm sm:text-base">Subiendo imágenes...</p>
              {Object.keys(uploadProgress).length > 0 && (
                <div className="w-full max-w-xs mt-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ 
                        width: `${Math.round(
                          Object.values(uploadProgress).reduce((a, b) => a + b, 0) / 
                          Object.values(uploadProgress).length
                        )}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3" />
              <p className="text-foreground font-medium mb-1 text-sm sm:text-base">
                Toca para seleccionar imágenes
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                PNG, JPG o WEBP. Máx 5MB. ({images.length}/{maxImages})
              </p>
            </>
          )}
        </label>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
              {images.map((url, index) => (
                <SortableImage
                  key={url}
                  id={url}
                  index={index}
                  onRemove={() => removeImage(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Arrastra y suelta para reordenar (funciona en móvil y desktop).
        </p>
      )}

      {images.length === 0 && (
        <div className="flex items-center justify-center py-6 sm:py-8 bg-muted rounded-lg">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2" />
            <p className="text-xs sm:text-sm">No hay imágenes cargadas</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableImage({ id, index, onRemove }: { id: string; index: number; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`image-grid-item group relative rounded-lg overflow-hidden bg-muted aspect-square cursor-grab touch-none transition-all duration-200 border border-transparent ${
        isDragging ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : 'hover:ring-1 hover:ring-primary/50'
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
        title="Eliminar imagen"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] sm:text-xs active:scale-95"
        aria-label={`Reordenar imagen ${index + 1}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
        <span>Arrastra</span>
      </button>

      <img
        src={id}
        alt={`Imagen ${index + 1}`}
        className="w-full h-full object-cover"
        draggable={false}
      />
      
      <div className={`absolute bottom-1 left-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
        index === 0 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-black/60 text-white'
      }`}>
        {index + 1}
      </div>

      {index === 0 && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-medium">
          Principal
        </div>
      )}

    </div>
  );
}
