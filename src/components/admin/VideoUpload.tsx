import { useState, useCallback, useMemo } from 'react';
import { Upload, X, Video as VideoIcon, Loader2, Play, GripVertical } from 'lucide-react';
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
  uploadPropertyVideo,
  deleteFile,
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
  const [assetStatus, setAssetStatus] = useState<Record<string, { thumb?: 'idle' | 'ready' | 'missing'; preview?: 'idle' | 'ready' | 'missing' }>>({});
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateAssetStatus = useCallback((url: string, key: 'thumb' | 'preview', status: 'idle' | 'ready' | 'missing') => {
    setAssetStatus((prev) => ({
      ...prev,
      [url]: {
        ...prev[url],
        [key]: status,
      },
    }));
  }, []);

  // Track sequence numbers from existing videos (for R2 path structure)
  const existingSequenceSet = useMemo(() => {
    const sequences = videos.map((url) => {
      const match = url.match(/\/videos\/(\d{3})\./);
      return match ? match[1] : null;
    }).filter((seq): seq is string => seq !== null);
    return new Set(sequences);
  }, [videos]);

  const reserveNextSequence = (sequenceSet: Set<string>): number => {
    const limit = Math.min(maxVideos, STORAGE_LIMITS.MAX_VIDEOS_PER_PROPERTY);
    for (let seq = 1; seq <= limit; seq++) {
      const padded = String(seq).padStart(3, '0');
      if (!sequenceSet.has(padded)) {
        sequenceSet.add(padded);
        return seq;
      }
    }
    throw new Error(`Maximum video limit (${limit}) reached`);
  };

  const uploadVideo = async (
    file: File,
    seq: number,
    token: string,
    progressKey: string,
    effectiveUserId: string,
    effectivePropertyId: string
  ): Promise<string | null> => {
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

    try {
      const result = await uploadPropertyVideo(
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

    // Get auth token once per batch
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert('Debes iniciar sesión para subir videos');
      setUploading(false);
      return;
    }

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
        alert(`Ya alcanzaste el límite de videos (${Math.min(maxVideos, STORAGE_LIMITS.MAX_VIDEOS_PER_PROPERTY)})`);
        break;
      }

      const progressKey = `${file.name}-${seq}`;
      const url = await uploadVideo(
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
      onChange([...videos, ...uploadResults]);
    }

    setUploadProgress({});
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = videos.findIndex((v) => v === active.id);
    const newIndex = videos.findIndex((v) => v === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(videos, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors bg-muted/40 ${
          dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60'
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
              {Object.keys(uploadProgress).length > 0 && (
                <div className="w-full max-w-xs mt-3">
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={videos} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {videos.map((url, index) => (
                <SortableVideo
                  key={url}
                  id={url}
                  index={index}
                  thumbnailUrl={getVideoThumbnail(url)}
                  previewUrl={getVideoPreview(url)}
                  thumbState={assetStatus[url]?.thumb || 'idle'}
                  previewState={assetStatus[url]?.preview || 'idle'}
                  aspectRatio={aspectRatios[url]}
                  setAspectRatio={(ratio: number) => setAspectRatios((prev) => ({ ...prev, [url]: ratio }))}
                  updateAssetStatus={updateAssetStatus}
                  setActiveVideoUrl={setActiveVideoUrl}
                  onRemove={() => removeVideo(index)}
                  onHover={(state) => setHoveredIndex(state ? index : null)}
                  isHovered={hoveredIndex === index}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {videos.length === 0 && (
        <div className="flex items-center justify-center py-8 bg-muted rounded-lg border border-border">
          <div className="text-center text-muted-foreground">
            <VideoIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No hay videos cargados</p>
          </div>
        </div>
      )}

      {videos.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Arrastra los videos para reordenarlos en móvil o desktop.
        </p>
      )}

      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-strong w-full max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-foreground">
                <Play className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Vista previa del video</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoUrl(null)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-black">
              <video
                src={activeVideoUrl}
                className="w-full h-full max-h-[70vh] object-contain"
                controls
                autoPlay
                playsInline
                poster={getVideoThumbnail(activeVideoUrl) || undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableVideo({
  id,
  index,
  thumbnailUrl,
  previewUrl,
  thumbState,
  previewState,
  aspectRatio,
  setAspectRatio,
  updateAssetStatus,
  setActiveVideoUrl,
  onRemove,
  onHover,
  isHovered,
}: {
  id: string;
  index: number;
  thumbnailUrl: string;
  previewUrl: string;
  thumbState: 'idle' | 'ready' | 'missing';
  previewState: 'idle' | 'ready' | 'missing';
  aspectRatio?: number;
  setAspectRatio: (ratio: number) => void;
  updateAssetStatus: (url: string, key: 'thumb' | 'preview', status: 'idle' | 'ready' | 'missing') => void;
  setActiveVideoUrl: (url: string | null) => void;
  onRemove: () => void;
  onHover: (hovering: boolean) => void;
  isHovered: boolean;
}) {
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
      style={{ ...style, aspectRatio: aspectRatio || '16 / 9', minHeight: '14rem' }}
      className={`relative group rounded-lg overflow-hidden bg-card border border-border shadow-sm flex items-center justify-center cursor-grab touch-none ${
        isDragging ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : ''
      }`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {thumbnailUrl && thumbState !== 'missing' ? (
        <>
          {isHovered && previewUrl && previewState !== 'missing' ? (
            <img
              src={previewUrl}
              alt={`Video ${index + 1} preview`}
              className="w-full h-full object-contain bg-black"
              onLoad={(e) => {
                updateAssetStatus(id, 'preview', 'ready');
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth && naturalHeight) {
                  const ratio = Number((naturalWidth / naturalHeight).toFixed(3));
                  setAspectRatio(ratio);
                }
              }}
              onError={() => updateAssetStatus(id, 'preview', 'missing')}
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt={`Video ${index + 1} thumbnail`}
              className="w-full h-full object-contain bg-black"
              onLoad={(e) => {
                updateAssetStatus(id, 'thumb', 'ready');
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth && naturalHeight) {
                  const ratio = Number((naturalWidth / naturalHeight).toFixed(3));
                  setAspectRatio(ratio);
                }
              }}
              onError={() => updateAssetStatus(id, 'thumb', 'missing')}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center border border-white/30">
              <Play className="h-7 w-7 text-white fill-white ml-1" />
            </div>
          </div>
        </>
      ) : (
        <video
          src={id}
          className="w-full h-full object-contain"
          controls
          preload="metadata"
          onLoadedMetadata={(e) => {
            const { videoWidth, videoHeight } = e.currentTarget;
            if (videoWidth && videoHeight) {
              const ratio = Number((videoWidth / videoHeight).toFixed(3));
              setAspectRatio(ratio);
            }
          }}
        />
      )}

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 sm:gap-3 flex-wrap px-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveVideoUrl(id);
          }}
          className="px-3 py-1.5 bg-white rounded-full text-foreground hover:bg-gray-100 shadow flex items-center gap-1"
          title="Reproducir video"
        >
          <Play className="h-4 w-4" />
          <span className="text-xs font-semibold">Ver</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 bg-destructive text-destructive-foreground rounded-full hover:opacity-90 shadow"
          title="Eliminar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/70 text-white text-[10px] sm:text-xs active:scale-95"
        aria-label={`Reordenar video ${index + 1}`}
      >
        <GripVertical className="h-4 w-4" />
        <span>Arrastra</span>
      </button>

      {index === 0 && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1 shadow">
          <Play className="h-3 w-3" />
          Principal
        </div>
      )}
    </div>
  );
}
