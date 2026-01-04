import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize Supabase with service role key (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Timeout threshold in minutes
const TIMEOUT_MINUTES = 20;

// Verify JWT and get user ID
async function verifyAndGetUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is authenticated
    const userId = await verifyAndGetUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Fetch the job - must belong to the user
    const { data: job, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if job is stuck in processing state
    const createdAt = new Date(job.created_at).getTime();
    const now = Date.now();
    const processingMinutes = (now - createdAt) / (1000 * 60);

    // Only check jobs that are actively processing
    if (job.status !== 'pending' && job.status !== 'processing') {
      return res.status(200).json({ 
        message: 'Job is not in processing state',
        status: job.status 
      });
    }

    // If not timed out yet, return current status
    if (processingMinutes <= TIMEOUT_MINUTES) {
      return res.status(200).json({ 
        message: 'Job is still processing',
        minutesElapsed: Math.round(processingMinutes),
        status: job.status
      });
    }

    // Job has timed out - mark as failed
    const { error: updateError } = await supabaseAdmin
      .from('video_generation_jobs')
      .update({ 
        status: 'failed',
        error_message: `Job timed out after ${TIMEOUT_MINUTES} minutes`
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      return res.status(500).json({ error: 'Failed to update job status' });
    }

    // Refund credits using add_credits with 'refund' type
    const creditsToRefund = job.credits_used || 0;
    if (creditsToRefund > 0) {
      const { error: refundError } = await supabaseAdmin.rpc('add_credits', { 
        p_user_id: userId, 
        p_amount: creditsToRefund,
        p_product: 'Reembolso - Video IA',
      });

      if (refundError) {
        console.error('Error refunding credits:', refundError);
        // Don't fail the request, job is already marked failed
      }
    }

    return res.status(200).json({ 
      message: 'Job marked as failed and credits refunded',
      creditsRefunded: creditsToRefund
    });
  } catch (error) {
    console.error('Error checking job status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}