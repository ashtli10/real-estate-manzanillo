import { useState, useCallback } from 'react';
import { Upload, X, Video as VideoIcon, Loader2, Play } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import {
  uploadPropertyVideo,
  deleteFile,
  getNextVideoSequence,
  getPropertyVideoUrl,
  getThumbnailUrl,
  getPreviewUrl,
  isValidVideoType,
  validateFileSize,
  STORAGE_LIMITS,
  type UploadProgress,
} from '../../lib/r2-storage';

interface VideoUploadProps {
  videos: string[];
  onChange: (videos: string[]) => void;
  maxVideos?: number;
  propertyId?: string;
  userId?: string;
}

export function VideoUpload({ videos, onChange, maxVideos = 3, propertyId, userId }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Track sequence numbers from existing videos (for R2 path structure)
  const existingSequences = videos.map((url) => {
    // Extract sequence from URL like: .../videos/001.mp4
    const match = url.match(/\/videos\/(\d{3})\./);
    return match ? match[1] : null;
  }).filter((seq): seq is string => seq !== null);

  const uploadVideo = async (file: File): Promise<string | null> => {
    // Validate file type
    if (!isValidVideoType(file)) {
      alert('Solo se permiten videos (MP4, MOV, WEBM)');
      return null;
    }

    // Validate file size (max 50MB)
    if (!validateFileSize(file, STORAGE_LIMITS.MAX_VIDEO_SIZE_MB)) {
      alert(`El video no puede ser mayor a ${STORAGE_LIMITS.MAX_VIDEO_SIZE_MB}MB`);
      return null;
    }

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert('Debes iniciar sesión para subir videos');
      return null;
    }

    // Determine user and property IDs
    const effectiveUserId = userId || session.user.id;
    const effectivePropertyId = propertyId || 'temp-' + Date.now();

    try {
      // Get next available sequence number
      const nextSeq = await getNextVideoSequence(effectiveUserId, effectivePropertyId, existingSequences);
      
      // Upload to R2
      const result = await uploadPropertyVideo(
        effectiveUserId,
        effectivePropertyId,
        nextSeq,
        file,
        session.access_token,
        (progress: UploadProgress) => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress.percentage
          }));
        }
      );

      // Add the new sequence to our tracking
      existingSequences.push(String(nextSeq).padStart(3, '0'));
      
      return result.url;
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Error al subir el video');
      return null;
    }
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

  const removeVideo = async (index: number) => {
    const videoUrl = videos[index];
    
    // Try to delete from R2 storage (including thumbnail and preview)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && videoUrl.includes('/users/')) {
        // Extract the path from the URL (everything after the domain)
        const url = new URL(videoUrl);
        const path = url.pathname.slice(1); // Remove leading /
        
        // Delete the video file
        await deleteFile(path, session.access_token);
        
        // Also try to delete associated thumbnail and preview
        const basePath = path.replace(/\.[^.]+$/, '');
        await deleteFile(`${basePath}.thumb.jpg`, session.access_token).catch(() => {});
        await deleteFile(`${basePath}.preview.gif`, session.access_token).catch(() => {});
      }
    } catch (error) {
      console.error('Error deleting video from storage:', error);
      // Continue with removal from array even if storage delete fails
    }
    
    const nextVideos = [...videos];
    nextVideos.splice(index, 1);
    onChange(nextVideos);
  };

  // Get thumbnail URL for a video (auto-generated by media processor)
  const getVideoThumbnail = (videoUrl: string): string => {
    // For R2 URLs, use the auto-generated thumbnail
    if (videoUrl.includes('/users/')) {
      try {
        const url = new URL(videoUrl);
        const path = url.pathname.slice(1).replace(/\.[^.]+$/, '');
        return getThumbnailUrl(path);
      } catch {
        return '';
      }
    }
    // Fallback for old Supabase URLs - use video element poster
    return '';
  };

  // Get preview GIF URL for a video (auto-generated by media processor)
  const getVideoPreview = (videoUrl: string): string => {
    // For R2 URLs, use the auto-generated preview
    if (videoUrl.includes('/users/')) {
      try {
        const url = new URL(videoUrl);
        const path = url.pathname.slice(1).replace(/\.[^.]+$/, '');
        return getPreviewUrl(path);
      } catch {
        return '';
      }
    }
    return '';
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
          {videos.map((url, index) => {
            const thumbnailUrl = getVideoThumbnail(url);
            const previewUrl = getVideoPreview(url);
            const isHovered = hoveredIndex === index;
            
            return (
              <div 
                key={url} 
                className="relative group rounded-lg overflow-hidden bg-muted aspect-video"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Show thumbnail/preview or video */}
                {thumbnailUrl ? (
                  <>
                    {/* Show animated preview on hover, thumbnail otherwise */}
                    {isHovered && previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt={`Video ${index + 1} preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={thumbnailUrl} 
                        alt={`Video ${index + 1} thumbnail`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white fill-white ml-1" />
                      </div>
                    </div>
                    {/* Click to play video in modal/lightbox could go here */}
                  </>
                ) : (
                  <video 
                    src={url} 
                    className="w-full h-full object-cover" 
                    controls 
                    preload="metadata" 
                  />
                )}

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
            );
          })}
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
