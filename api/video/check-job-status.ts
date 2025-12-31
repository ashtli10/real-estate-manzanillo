import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const { data: job, error: jobError } = await supabase
      .from('video_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const processingTime = (new Date().getTime() - new Date(job.created_at).getTime()) / 60000;

    if (job.status === 'processing' && processingTime > 20) {
      const { error: updateError } = await supabase
        .from('video_generation_jobs')
        .update({ status: 'failed' })
        .eq('id', jobId);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update job status' });
      }

      const { error: refundError } = await supabase.rpc('refund_credits', { user_id: job.user_id, amount: job.credits_used });

      if (refundError) {
        return res.status(500).json({ error: 'Failed to refund credits' });
      }

      return res.status(200).json({ message: 'Job marked as failed and credits refunded' });
    }

    return res.status(200).json({ message: 'Job is still processing or already completed' });
  } catch (error) {
    console.error('Error checking job status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}