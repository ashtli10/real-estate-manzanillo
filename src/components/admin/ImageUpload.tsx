import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, GripVertical } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onChange, maxImages = 100 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

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
  }, [images]);

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
  };

  // Drag and drop reordering handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragNode.current = e.target as HTMLDivElement;
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to allow the drag image to be created
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.style.opacity = '1';
    }
    
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newImages = [...images];
      const [movedImage] = newImages.splice(draggedIndex, 1);
      newImages.splice(dragOverIndex, 0, movedImage);
      onChange(newImages);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-foreground font-medium">Subiendo imágenes...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-foreground font-medium mb-1">
                Arrastra imágenes aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-muted-foreground">
                PNG, JPG o WEBP. Máximo 5MB por imagen. ({images.length}/{maxImages})
              </p>
            </>
          )}
        </label>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div
              key={url}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleImageDragOver}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-lg overflow-hidden bg-muted aspect-square cursor-grab active:cursor-grabbing transition-all ${
                dragOverIndex === index ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''
              } ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              <img
                src={url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-cover pointer-events-none"
              />
              
              {/* Drag handle indicator */}
              <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute bottom-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                title="Eliminar"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Badge for main image */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded font-medium">
                  Principal
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Arrastra las imágenes para reordenarlas. La primera será la imagen principal.
        </p>
      )}

      {images.length === 0 && (
        <div className="flex items-center justify-center py-8 bg-muted rounded-lg">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No hay imágenes cargadas</p>
          </div>
        </div>
      )}
    </div>
  );
}
