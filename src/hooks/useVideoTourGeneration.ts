import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';

// Job status types
export type TourJobStatus = 'processing' | 'completed' | 'failed';

// Tour generation job interface
export interface TourGenerationJob {
  id: string;
  user_id: string;
  property_id: string;
  status: TourJobStatus;
  selected_images: string[];
  clip_duration: number;
  video_url: string | null;
  error_message: string | null;
  credits_charged: number;
  credits_refunded: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Property with images
export interface TourEligibleProperty {
  id: string;
  title: string;
  images: string[];
  status: string;
}

// Credit cost per image
export const TOUR_CREDITS_PER_IMAGE = 5;

// Timeout for waiting (20 minutes)
const JOB_TIMEOUT_MS = 20 * 60 * 1000;

interface UseVideoTourGenerationReturn {
  // State
  currentJob: TourGenerationJob | null;
  eligibleProperties: TourEligibleProperty[];
  loading: boolean;
  error: string | null;
  isWaiting: boolean;
  timeoutError: boolean;
  
  // Actions
  fetchEligibleProperties: () => Promise<void>;
  startTourGeneration: (propertyId: string, selectedImages: string[], clipDuration: 3 | 6) => Promise<boolean>;
  clearJob: () => void;
  loadExistingJob: (jobId: string) => Promise<void>;
  fetchRecentJobs: () => Promise<TourGenerationJob[]>;
  checkForActiveJob: () => Promise<TourGenerationJob | null>;
}

export function useVideoTourGeneration(userId: string | undefined): UseVideoTourGenerationReturn {
  const [currentJob, setCurrentJob] = useState<TourGenerationJob | null>(null);
  const [eligibleProperties, setEligibleProperties] = useState<TourEligibleProperty[]>([]);
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

  // Fetch properties with at least 1 image
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

      // Filter properties with at least 1 image
      const eligible = (data || [])
        .filter((p) => p.images && Array.isArray(p.images) && p.images.length >= 1)
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

  // Fetch full job data
  const fetchJobData = useCallback(async (jobId: string): Promise<TourGenerationJob | null> => {
    const { data, error: fetchError } = await supabase
      .from('tour_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !data) {
      console.error('Error fetching job data:', fetchError);
      return null;
    }

    return data as unknown as TourGenerationJob;
  }, []);

  // Subscribe to job status updates
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
      .channel(`tour_job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tour_generation_jobs',
          filter: `id=eq.${jobId}`,
        },
        async (payload) => {
          const newStatus = (payload.new as { status: TourJobStatus }).status;
          const oldStatus = (payload.old as { status?: TourJobStatus })?.status;

          // Only react if status actually changed
          if (newStatus === oldStatus) return;

          // Fetch full job data when status changes
          if (newStatus === 'completed' || newStatus === 'failed') {
            const fullJob = await fetchJobData(jobId);
            if (fullJob) {
              setCurrentJob(fullJob);
            }

            setIsWaiting(false);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }

            // Handle failure
            if (newStatus === 'failed' && fullJob) {
              setError(fullJob.error_message || 'An error occurred');
            }
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, [fetchJobData]);

  // Start tour generation
  const startTourGeneration = useCallback(async (
    propertyId: string, 
    selectedImages: string[], 
    clipDuration: 3 | 6
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

      const response = await fetch('/api/video/generate-tour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId,
          selectedImages,
          clipDuration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to start tour generation');
        return false;
      }

      // Fetch the created job
      const { data: job, error: jobError } = await supabase
        .from('tour_generation_jobs')
        .select('*')
        .eq('id', data.jobId)
        .single();

      if (jobError || !job) {
        setError('Failed to load job');
        return false;
      }

      setCurrentJob(job as unknown as TourGenerationJob);
      subscribeToJob(data.jobId);
      
      return true;
    } catch (err) {
      console.error('Error starting tour generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, subscribeToJob]);

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
        .from('tour_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (jobError || !job) {
        setError('Job not found');
        return;
      }

      const typedJob = job as unknown as TourGenerationJob;
      setCurrentJob(typedJob);

      // If job is in a waiting state, subscribe
      if (typedJob.status === 'processing') {
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
  const fetchRecentJobs = useCallback(async (): Promise<TourGenerationJob[]> => {
    if (!userId) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('tour_generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      return (data || []) as unknown as TourGenerationJob[];
    } catch (err) {
      console.error('Error fetching recent jobs:', err);
      return [];
    }
  }, [userId]);

  // Check for any active job (processing)
  const checkForActiveJob = useCallback(async (): Promise<TourGenerationJob | null> => {
    if (!userId) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('tour_generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'processing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const job = data as unknown as TourGenerationJob;
        setCurrentJob(job);
        
        // Subscribe to updates
        subscribeToJob(job.id);
        
        return job;
      }

      return null;
    } catch (err) {
      console.error('Error checking for active job:', err);
      return null;
    }
  }, [userId, subscribeToJob]);

  return {
    currentJob,
    eligibleProperties,
    loading,
    error,
    isWaiting,
    timeoutError,
    fetchEligibleProperties,
    startTourGeneration,
    clearJob,
    loadExistingJob,
    fetchRecentJobs,
    checkForActiveJob,
  };
}
