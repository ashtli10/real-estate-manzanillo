import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onChange, maxImages = 100 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return null;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede ser mayor a 5MB');
      return null;
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `properties/${fileName}`;

    const { error } = await supabase.storage
      .from('properties')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('properties')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      alert(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    setUploading(true);

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const uploadPromises = filesToUpload.map(uploadImage);
    const results = await Promise.all(uploadPromises);

    const newUrls = results.filter((url): url is string => url !== null);
    onChange([...images, ...newUrls]);

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

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
    setSelectedIndex(null);
  };

  // Move image left (towards position 0)
  const moveImageLeft = (index: number) => {
    if (index <= 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    onChange(newImages);
    setSelectedIndex(index - 1);
  };

  // Move image right (towards end)
  const moveImageRight = (index: number) => {
    if (index >= images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    onChange(newImages);
    setSelectedIndex(index + 1);
  };

  // Make this image the main (first) image
  const makeMain = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [movedImage] = newImages.splice(index, 1);
    newImages.unshift(movedImage);
    onChange(newImages);
    setSelectedIndex(0);
  };

  // Toggle selection on tap
  const handleImageClick = (index: number) => {
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  // Close selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.image-grid-item') && !target.closest('.image-actions-bar')) {
        setSelectedIndex(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

      {/* Selected Image Actions Bar - Shows when an image is selected */}
      {selectedIndex !== null && images.length > 0 && (
        <div className="image-actions-bar flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-sm text-foreground font-medium mr-2">
            Imagen {selectedIndex + 1}
          </span>
          
          {selectedIndex !== 0 && (
            <button
              type="button"
              onClick={() => makeMain(selectedIndex)}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Hacer principal
            </button>
          )}
          
          <button
            type="button"
            onClick={() => moveImageLeft(selectedIndex)}
            disabled={selectedIndex <= 0}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mover izquierda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={() => moveImageRight(selectedIndex)}
            disabled={selectedIndex >= images.length - 1}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mover derecha"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={() => removeImage(selectedIndex)}
            className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            title="Eliminar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
          {images.map((url, index) => (
            <div
              key={url}
              onClick={() => handleImageClick(index)}
              className={`image-grid-item relative rounded-lg overflow-hidden bg-muted aspect-square cursor-pointer transition-all duration-200 ${
                selectedIndex === index 
                  ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg' 
                  : 'hover:ring-1 hover:ring-primary/50'
              }`}
            >
              <img
                src={url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
              
              {/* Position number badge */}
              <div className={`absolute bottom-1 left-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                index === 0 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-black/60 text-white'
              }`}>
                {index + 1}
              </div>

              {/* Main image badge */}
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-medium">
                  Principal
                </div>
              )}
              
              {/* Selection indicator */}
              {selectedIndex === index && (
                <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
              )}
            </div>
          ))}
        </div>
      )}

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Toca una imagen para seleccionarla y usa los botones para reordenar.
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
