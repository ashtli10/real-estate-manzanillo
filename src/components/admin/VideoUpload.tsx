import { useState, useCallback } from 'react';
import { Upload, X, Video as VideoIcon, Loader2, Play } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface VideoUploadProps {
  videos: string[];
  onChange: (videos: string[]) => void;
  maxVideos?: number;
}

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB safety cap for uploads

export function VideoUpload({ videos, onChange, maxVideos = 5 }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadVideo = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('video/')) {
      alert('Solo se permiten videos');
      return null;
    }

    if (file.size > MAX_SIZE_BYTES) {
      alert('El video no puede ser mayor a 50MB');
      return null;
    }

    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `properties/videos/${fileName}`;

    const { error } = await supabase.storage
      .from('properties')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading video:', error);
      alert('Error al subir el video');
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('properties')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxVideos - videos.length;
    if (remainingSlots <= 0) {
      alert(`Máximo ${maxVideos} videos permitidos`);
      return;
    }

    setUploading(true);

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const uploadPromises = filesToUpload.map(uploadVideo);
    const results = await Promise.all(uploadPromises);

    const newUrls = results.filter((url): url is string => url !== null);
    onChange([...videos, ...newUrls]);

    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [videos]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeVideo = (index: number) => {
    const nextVideos = [...videos];
    nextVideos.splice(index, 1);
    onChange(nextVideos);
  };

  const moveVideo = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= videos.length) return;
    const nextVideos = [...videos];
    const [moved] = nextVideos.splice(fromIndex, 1);
    nextVideos.splice(toIndex, 0, moved);
    onChange(nextVideos);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="video-upload"
          disabled={uploading}
        />
        <label
          htmlFor="video-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          {uploading ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-foreground font-medium">Subiendo videos...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-foreground font-medium mb-1">
                Arrastra videos aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-muted-foreground">
                MP4, MOV o WEBM. Máximo 50MB por video. ({videos.length}/{maxVideos})
              </p>
            </>
          )}
        </label>
      </div>

      {videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((url, index) => (
            <div key={url} className="relative group rounded-lg overflow-hidden bg-muted aspect-video">
              <video src={url} className="w-full h-full object-cover" controls preload="metadata" />

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveVideo(index, index - 1)}
                    className="p-2 bg-white rounded-full text-foreground hover:bg-gray-100"
                    title="Mover arriba"
                  >
                    Prev
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeVideo(index)}
                  className="p-2 bg-destructive text-destructive-foreground rounded-full hover:opacity-90"
                  title="Eliminar"
                >
                  <X className="h-4 w-4" />
                </button>
                {index < videos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveVideo(index, index + 1)}
                    className="p-2 bg-white rounded-full text-foreground hover:bg-gray-100"
                    title="Mover abajo"
                  >
                    Next
                  </button>
                )}
              </div>

              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  Principal
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {videos.length === 0 && (
        <div className="flex items-center justify-center py-8 bg-muted rounded-lg">
          <div className="text-center text-muted-foreground">
            <VideoIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No hay videos cargados</p>
          </div>
        </div>
      )}
    </div>
  );
}
