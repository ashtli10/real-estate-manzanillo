import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TOUR_WEBHOOK_URL = 'https://n8n.atcraft.cloud/webhook/real-estate/generate-tour/generate-video';
const VIDEO_WEBHOOK_AUTH = process.env.VIDEO_GENERATION_WEBHOOK_AUTH || '';

// Cost in credits per image
const CREDITS_PER_IMAGE = 5;

// Timeout for external webhook call (in ms)
const WEBHOOK_TIMEOUT_MS = 30000;

// Log environment status on cold start
console.log('[generate-tour] Cold start - env check:', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  hasWebhookAuth: !!VIDEO_WEBHOOK_AUTH,
});

// Initialize Supabase with service role key (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface GenerateTourRequest {
  propertyId: string;
  selectedImages: string[]; // 1-30 image URLs
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
  user_id: string;
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
async function deductCredits(userId: string, amount: number, description: string): Promise<boolean> {
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
      type: 'used',
      description,
    });

  if (txError) {
    console.error('Error recording transaction:', txError);
    // Don't fail - credits were already deducted
  }

  return true;
}

// Refund credits to user (direct table operation - bypasses RPC auth check)
async function refundCredits(userId: string, amount: number, description: string): Promise<boolean> {
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
      type: 'refund',
      description,
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
    const body: GenerateTourRequest = req.body;
    
    // Validate request
    if (!body.propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }

    if (!body.selectedImages || !Array.isArray(body.selectedImages)) {
      return res.status(400).json({ error: 'Selected images must be an array' });
    }

    const imageCount = body.selectedImages.length;
    if (imageCount < 1 || imageCount > 30) {
      return res.status(400).json({ error: 'Must select between 1 and 30 images' });
    }

    // Fetch property data
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', body.propertyId)
      .eq('user_id', userId)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found or access denied' });
    }

    const propertyData = property as PropertyData;

    // Calculate credit cost (5 credits per image)
    const creditCost = imageCount * CREDITS_PER_IMAGE;

    // Deduct credits first
    const deducted = await deductCredits(
      userId,
      creditCost,
      `Video tour generation for property: ${propertyData.title} (${imageCount} images)`
    );

    if (!deducted) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    // Create job record
    const { data: job, error: jobError } = await supabaseAdmin
      .from('tour_generation_jobs')
      .insert({
        user_id: userId,
        property_id: body.propertyId,
        selected_images: body.selectedImages,
        status: 'processing',
        credits_charged: creditCost,
      })
      .select()
      .single();

    if (jobError || !job) {
      // Refund credits if job creation fails
      await refundCredits(userId, creditCost, 'Refund: Tour job creation failed');
      console.error('Error creating job:', jobError);
      return res.status(500).json({ error: 'Failed to create job' });
    }

    // Prepare webhook payload (matching the expected format)
    const webhookPayload = {
      taskId: job.id,
      userId: userId,
      title: propertyData.title,
      description: propertyData.description || '',
      sale_price: propertyData.is_for_sale ? formatPrice(propertyData.price, propertyData.currency) : '',
      rent_price: propertyData.is_for_rent ? formatPrice(propertyData.rent_price, propertyData.rent_currency) : '',
      location: formatLocation(propertyData.location_city, propertyData.location_state, propertyData.location_neighborhood),
      caracteristics: formatCharacteristics(propertyData.characteristics),
      custom_bonuses: formatCustomBonuses(propertyData.custom_bonuses),
      images: body.selectedImages,
    };

    // Call external webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const webhookResponse = await fetch(TOUR_WEBHOOK_URL, {
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
        // Mark job as failed and refund
        await supabaseAdmin
          .from('tour_generation_jobs')
          .update({
            status: 'failed',
            error_message: `Webhook failed with status ${webhookResponse.status}`,
            credits_refunded: true,
          })
          .eq('id', job.id);

        await refundCredits(userId, creditCost, 'Refund: Tour generation webhook failed');

        return res.status(500).json({ 
          error: 'Tour generation service unavailable',
          jobId: job.id,
        });
      }

      return res.status(200).json({
        success: true,
        jobId: job.id,
        creditsCharged: creditCost,
        message: 'Tour generation started',
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Mark job as failed and refund
      await supabaseAdmin
        .from('tour_generation_jobs')
        .update({
          status: 'failed',
          error_message: fetchError instanceof Error ? fetchError.message : 'Webhook request failed',
          credits_refunded: true,
        })
        .eq('id', job.id);

      await refundCredits(userId, creditCost, 'Refund: Tour generation request failed');

      console.error('Webhook fetch error:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to start tour generation',
        jobId: job.id,
      });
    }

  } catch (error) {
    console.error('Generate tour error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
