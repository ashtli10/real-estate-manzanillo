import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VIDEO_WEBHOOK_URL = 'https://n8n.atcraft.cloud/webhook/real-estate/generate-video/approve-images';
const VIDEO_WEBHOOK_AUTH = process.env.VIDEO_GENERATION_WEBHOOK_AUTH || '';

// Cost in credits for generating script (after images approved)
const GENERATE_SCRIPT_CREDIT_COST = 1;

// Timeout for external webhook call (in ms)
const WEBHOOK_TIMEOUT_MS = 30000;

// Initialize Supabase with service role key (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface ApproveImagesRequest {
  jobId: string;
}

interface JobData {
  id: string;
  user_id: string;
  property_id: string;
  selected_images: string[];
  notes: string | null;
  image_urls: string[];
  status: string;
  credits_charged: number;
}

interface PropertyData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string | null;
  is_for_sale: boolean | null;
  is_for_rent: boolean | null;
  rent_price: number | null;
  rent_currency: string | null;
  location_city: string | null;
  location_state: string | null;
  location_neighborhood: string | null;
  characteristics: unknown;
  custom_bonuses: unknown;
}

// Verify JWT and get user ID
async function verifyAndGetUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    console.error('Auth error:', error);
    return null;
  }

  return user.id;
}

// Deduct credits from user (direct table operation - bypasses RPC auth check)
async function deductCredits(userId: string, amount: number): Promise<boolean> {
  // First get current credits
  const { data: credits, error: fetchError } = await supabaseAdmin
    .from('credits')
    .select('balance, free_credits_remaining')
    .eq('user_id', userId)
    .single();

  if (fetchError || !credits) {
    console.error('Error fetching credits:', fetchError);
    return false;
  }

  const freeCredits = credits.free_credits_remaining || 0;
  const paidCredits = credits.balance || 0;
  const totalCredits = freeCredits + paidCredits;

  if (totalCredits < amount) {
    console.error('Insufficient credits:', { totalCredits, required: amount });
    return false;
  }

  // Calculate deduction: free credits first, then paid
  const deductFromFree = Math.min(freeCredits, amount);
  const deductFromPaid = amount - deductFromFree;

  // Update credits
  const { error: updateError } = await supabaseAdmin
    .from('credits')
    .update({
      free_credits_remaining: freeCredits - deductFromFree,
      balance: paidCredits - deductFromPaid,
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating credits:', updateError);
    return false;
  }

  // Record transaction
  const { error: txError } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      product: 'Video IA - Guión',
    });

  if (txError) {
    console.error('Error recording transaction:', txError);
    // Don't fail - credits were already deducted
  }

  return true;
}

// Refund credits to user (direct table operation - bypasses RPC auth check)
async function refundCredits(userId: string, amount: number): Promise<boolean> {
  // Get current credits
  const { data: credits, error: fetchError } = await supabaseAdmin
    .from('credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (fetchError || !credits) {
    console.error('Error fetching credits for refund:', fetchError);
    return false;
  }

  // Add to paid balance (refunds go to paid credits)
  const { error: updateError } = await supabaseAdmin
    .from('credits')
    .update({
      balance: (credits.balance || 0) + amount,
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating credits for refund:', updateError);
    return false;
  }

  // Record transaction
  const { error: txError } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: amount,
      product: 'Reembolso - Video IA',
    });

  if (txError) {
    console.error('Error recording refund transaction:', txError);
    // Don't fail - credits were already added
  }

  return true;
}

// Format characteristics for webhook
function formatCharacteristics(characteristics: unknown): Array<{ label: string; value: number | boolean }> {
  if (!characteristics || !Array.isArray(characteristics)) {
    return [];
  }
  
  return characteristics.map((char: { label?: string; value?: number | boolean }) => ({
    label: char.label || '',
    value: char.value ?? false,
  }));
}

// Format custom bonuses for webhook
function formatCustomBonuses(bonuses: unknown): string[] {
  if (!bonuses || !Array.isArray(bonuses)) {
    return [];
  }
  return bonuses.filter((b): b is string => typeof b === 'string');
}

// Format price with currency
function formatPrice(price: number | null, currency: string | null): string {
  if (!price) return '';
  return `${price} ${currency || 'MXN'}`;
}

// Format location
function formatLocation(city: string | null, state: string | null, neighborhood: string | null): string {
  const parts = [neighborhood, city, state].filter(Boolean);
  return parts.join(', ');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const userId = await verifyAndGetUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse request body
    const body: ApproveImagesRequest = req.body;
    
    if (!body.jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Fetch job data
    const { data: job, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('*')
      .eq('id', body.jobId)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    const jobData = job as JobData;

    // Verify job is in correct state
    if (jobData.status !== 'images_ready') {
      return res.status(400).json({ error: 'Job is not in images_ready state' });
    }

    // Verify we have 3 generated images
    if (!jobData.image_urls || jobData.image_urls.length !== 3) {
      return res.status(400).json({ error: 'Job does not have 3 generated images' });
    }

    // Fetch property data
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', jobData.property_id)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const propertyData = property as PropertyData;

    // Deduct credits for script generation
    const deducted = await deductCredits(
      userId,
      GENERATE_SCRIPT_CREDIT_COST
    );

    if (!deducted) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    // Update job: reset fields and add script generation credits
    const newCreditsCharged = jobData.credits_charged + GENERATE_SCRIPT_CREDIT_COST;
    
    await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        status: 'processing',
        script: null,
        video_url: null,
        error_message: null,
        credits_charged: newCreditsCharged,
      })
      .eq('id', body.jobId);

    // Prepare webhook payload
    const webhookPayload = {
      taskId: jobData.id,
      userId: userId,
      title: propertyData.title,
      description: propertyData.description || '',
      sale_price: propertyData.is_for_sale ? formatPrice(propertyData.price, propertyData.currency) : '',
      rent_price: propertyData.is_for_rent ? formatPrice(propertyData.rent_price, propertyData.rent_currency) : '',
      location: formatLocation(propertyData.location_city, propertyData.location_state, propertyData.location_neighborhood),
      caracteristics: formatCharacteristics(propertyData.characteristics),
      custom_bonuses: formatCustomBonuses(propertyData.custom_bonuses),
      images: jobData.image_urls, // Use the generated images
      notes: jobData.notes || '',
    };

    // Call external webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const webhookResponse = await fetch(VIDEO_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': VIDEO_WEBHOOK_AUTH,
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        // Mark job as failed and refund video credits only
        await supabaseAdmin
          .from('video_generation_jobs')
          .update({
            status: 'failed',
            error_message: `Webhook failed with status ${webhookResponse.status}`,
          })
          .eq('id', body.jobId);

        await refundCredits(userId, GENERATE_SCRIPT_CREDIT_COST);

        return res.status(500).json({ 
          error: 'Video generation service unavailable',
          jobId: body.jobId,
        });
      }

      return res.status(200).json({
        success: true,
        jobId: body.jobId,
        message: 'Script generation started',
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Mark job as failed and refund video credits
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: fetchError instanceof Error ? fetchError.message : 'Webhook request failed',
        })
        .eq('id', body.jobId);

      await refundCredits(userId, GENERATE_SCRIPT_CREDIT_COST);

      console.error('Webhook fetch error:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to start script generation',
        jobId: body.jobId,
      });
    }

  } catch (error) {
    console.error('Approve images error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
