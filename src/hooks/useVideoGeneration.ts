import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';

// Job status types
export type VideoJobStatus = 
  | 'pending' 
  | 'processing' 
  | 'images_ready' 
  | 'script_ready' 
  | 'completed' 
  | 'failed';

// Video generation job interface
export interface VideoGenerationJob {
  id: string;
  user_id: string;
  property_id: string;
  status: VideoJobStatus;
  selected_images: string[];
  notes: string | null;
  image_urls: string[] | null;
  script: string[] | null;
  video_url: string | null;
  error_message: string | null;
  credits_charged: number;
  credits_refunded: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Property with minimum required images
export interface EligibleProperty {
  id: string;
  title: string;
  images: string[];
  status: string;
}

// Credit costs
export const VIDEO_GENERATION_COSTS = {
  generateImages: 5,
  regenerateImages: 5,
  generateVideo: 30,
} as const;

// Timeout for waiting (20 minutes)
const JOB_TIMEOUT_MS = 20 * 60 * 1000;

interface UseVideoGenerationReturn {
  // State
  currentJob: VideoGenerationJob | null;
  eligibleProperties: EligibleProperty[];
  loading: boolean;
  error: string | null;
  isWaiting: boolean;
  timeoutError: boolean;
  
  // Actions
  fetchEligibleProperties: () => Promise<void>;
  startImageGeneration: (propertyId: string, selectedImages: string[], notes?: string) => Promise<boolean>;
  regenerateImages: (propertyId: string, selectedImages: string[], notes?: string) => Promise<boolean>;
  approveImages: (jobId: string) => Promise<boolean>;
  approveScript: (jobId: string, editedScript: string[]) => Promise<boolean>;
  retryFromImages: (propertyId: string, selectedImages: string[], notes?: string) => Promise<boolean>;
  clearJob: () => void;
  loadExistingJob: (jobId: string) => Promise<void>;
  fetchRecentJobs: () => Promise<VideoGenerationJob[]>;
}

export function useVideoGeneration(userId: string | undefined): UseVideoGenerationReturn {
  const [currentJob, setCurrentJob] = useState<VideoGenerationJob | null>(null);
  const [eligibleProperties, setEligibleProperties] = useState<EligibleProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  // Get auth token
  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Fetch properties with at least 3 images
  const fetchEligibleProperties = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('id, title, images, status')
        .eq('user_id', userId)
        .not('images', 'is', null);

      if (fetchError) throw fetchError;

      // Filter properties with at least 3 images
      const eligible = (data || [])
        .filter((p) => p.images && Array.isArray(p.images) && p.images.length >= 3)
        .map((p) => ({
          id: p.id,
          title: p.title,
          images: p.images as string[],
          status: p.status || 'draft',
        }));

      setEligibleProperties(eligible);
    } catch (err) {
      console.error('Error fetching eligible properties:', err);
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to job updates
  const subscribeToJob = useCallback((jobId: string) => {
    // Unsubscribe from previous
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    setIsWaiting(true);
    setTimeoutError(false);

    // Set timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setTimeoutError(true);
      setIsWaiting(false);
      setError('Operation timed out. Please try again.');
    }, JOB_TIMEOUT_MS);

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`video_job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generation_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updatedJob = payload.new as VideoGenerationJob;
          setCurrentJob(updatedJob);

          // Check if we should stop waiting
          if (
            updatedJob.status === 'images_ready' ||
            updatedJob.status === 'script_ready' ||
            updatedJob.status === 'completed' ||
            updatedJob.status === 'failed'
          ) {
            setIsWaiting(false);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }

          // Handle failure
          if (updatedJob.status === 'failed') {
            setError(updatedJob.error_message || 'An error occurred');
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, []);

  // Start image generation
  const startImageGeneration = useCallback(async (
    propertyId: string, 
    selectedImages: string[], 
    notes?: string
  ): Promise<boolean> => {
    if (!userId) return false;
    
    setLoading(true);
    setError(null);
    setTimeoutError(false);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Not authenticated');
        return false;
      }

      const response = await fetch('/api/video/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId,
          selectedImages,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to start image generation');
        return false;
      }

      // Fetch the created job
      const { data: job, error: jobError } = await supabase
        .from('video_generation_jobs')
        .select('*')
        .eq('id', data.jobId)
        .single();

      if (jobError || !job) {
        setError('Failed to load job');
        return false;
      }

      setCurrentJob(job as VideoGenerationJob);
      subscribeToJob(data.jobId);
      
      return true;
    } catch (err) {
      console.error('Error starting image generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, subscribeToJob]);

  // Regenerate images (same as start but creates new job)
  const regenerateImages = useCallback(async (
    propertyId: string,
    selectedImages: string[],
    notes?: string
  ): Promise<boolean> => {
    // Clear current job first
    setCurrentJob(null);
    return startImageGeneration(propertyId, selectedImages, notes);
  }, [startImageGeneration]);

  // Approve images and start script generation
  const approveImages = useCallback(async (jobId: string): Promise<boolean> => {
    if (!userId) return false;
    
    setLoading(true);
    setError(null);
    setTimeoutError(false);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Not authenticated');
        return false;
      }

      const response = await fetch('/api/video/approve-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to approve images');
        return false;
      }

      // Subscribe to updates
      subscribeToJob(jobId);
      
      return true;
    } catch (err) {
      console.error('Error approving images:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, subscribeToJob]);

  // Approve script and start video generation
  const approveScript = useCallback(async (
    jobId: string, 
    editedScript: string[]
  ): Promise<boolean> => {
    if (!userId) return false;
    
    setLoading(true);
    setError(null);
    setTimeoutError(false);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Not authenticated');
        return false;
      }

      const response = await fetch('/api/video/approve-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          jobId,
          script: editedScript,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to approve script');
        return false;
      }

      // Subscribe to updates
      subscribeToJob(jobId);
      
      return true;
    } catch (err) {
      console.error('Error approving script:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, subscribeToJob]);

  // Retry from beginning
  const retryFromImages = useCallback(async (
    propertyId: string,
    selectedImages: string[],
    notes?: string
  ): Promise<boolean> => {
    setCurrentJob(null);
    setError(null);
    setTimeoutError(false);
    return startImageGeneration(propertyId, selectedImages, notes);
  }, [startImageGeneration]);

  // Clear current job
  const clearJob = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCurrentJob(null);
    setError(null);
    setIsWaiting(false);
    setTimeoutError(false);
  }, []);

  // Load an existing job
  const loadExistingJob = useCallback(async (jobId: string) => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: job, error: jobError } = await supabase
        .from('video_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (jobError || !job) {
        setError('Job not found');
        return;
      }

      setCurrentJob(job as VideoGenerationJob);

      // If job is in a waiting state, subscribe
      if (job.status === 'pending' || job.status === 'processing') {
        subscribeToJob(jobId);
      }
    } catch (err) {
      console.error('Error loading job:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [userId, subscribeToJob]);

  // Fetch recent jobs
  const fetchRecentJobs = useCallback(async (): Promise<VideoGenerationJob[]> => {
    if (!userId) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('video_generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      return (data || []) as VideoGenerationJob[];
    } catch (err) {
      console.error('Error fetching recent jobs:', err);
      return [];
    }
  }, [userId]);

  return {
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
    loadExistingJob,
    fetchRecentJobs,
  };
}
