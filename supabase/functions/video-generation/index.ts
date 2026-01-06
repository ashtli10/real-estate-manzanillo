/**
 * Video Generation Edge Function
 * 
 * Unified endpoint for all video generation operations:
 * - generate-images: Start AI image generation (5 credits)
 * - approve-images: Approve generated images and start script generation (1 credit)
 * - approve-script: Approve script and start video rendering (30 credits)
 * 
 * POST body:
 * {
 *   action: 'generate-images' | 'approve-images' | 'approve-script',
 *   ...action-specific params
 * }
 * 
 * Requires: Authorization header with valid Supabase JWT
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getUserFromAuth, createAdminClient } from '../_shared/supabase-client.ts';
import { deductCredits, refundCredits, getUserCredits } from '../_shared/credits.ts';

// Credit costs
const GENERATE_IMAGES_COST = 5;
const GENERATE_SCRIPT_COST = 1;
const GENERATE_VIDEO_COST = 30;

// Timeout for external webhook call (in ms)
const WEBHOOK_TIMEOUT_MS = 30000;

// Environment variables
const N8N_VIDEO_WEBHOOK_BASE = Deno.env.get('N8N_VIDEO_WEBHOOK')!;
const N8N_WEBHOOK_AUTH = Deno.env.get('N8N_WEBHOOK_AUTH')!;

// Types
interface ScriptScene {
  dialogue: string;
  action: string;
  emotion: string;
}

interface GenerateImagesRequest {
  action: 'generate-images';
  propertyId: string;
  selectedImages: string[]; // 3 image URLs
  notes?: string;
}

interface ApproveImagesRequest {
  action: 'approve-images';
  jobId: string;
}

interface ApproveScriptRequest {
  action: 'approve-script';
  jobId: string;
  script: ScriptScene[]; // 3 edited script scenes
}

interface CheckJobStatusRequest {
  action: 'check-job-status';
  jobId: string;
}

type VideoRequest = GenerateImagesRequest | ApproveImagesRequest | ApproveScriptRequest | CheckJobStatusRequest;

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

interface JobData {
  id: string;
  user_id: string;
  property_id: string;
  selected_images: string[];
  notes: string | null;
  image_urls: string[];
  script: ScriptScene[];
  status: string;
  credits_charged: number;
}

// Helper functions
function formatPrice(price: number | null, currency: string | null): string {
  if (!price) return '';
  return `${price} ${currency || 'MXN'}`;
}

function formatLocation(city: string | null, state: string | null, neighborhood: string | null): string {
  const parts = [neighborhood, city, state].filter(Boolean);
  return parts.join(', ');
}

function formatCharacteristics(characteristics: unknown): Array<{ label: string; value: number | boolean }> {
  if (!characteristics || !Array.isArray(characteristics)) {
    return [];
  }
  return characteristics.map((char: { label?: string; value?: number | boolean }) => ({
    label: char.label || '',
    value: char.value ?? false,
  }));
}

function formatCustomBonuses(bonuses: unknown): string[] {
  if (!bonuses || !Array.isArray(bonuses)) {
    return [];
  }
  return bonuses.filter((b): b is string => typeof b === 'string');
}

/**
 * Handle generate-images action
 */
async function handleGenerateImages(
  userId: string,
  body: GenerateImagesRequest
): Promise<Response> {
  const supabase = createAdminClient();

  // Validate request
  if (!body.propertyId || !body.selectedImages || body.selectedImages.length !== 3) {
    return new Response(
      JSON.stringify({ error: 'Property ID and exactly 3 images required.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check credits
  const credits = await getUserCredits(userId);
  if (!credits || credits.total < GENERATE_IMAGES_COST) {
    return new Response(
      JSON.stringify({
        error: `Créditos insuficientes. Necesitas ${GENERATE_IMAGES_COST} créditos.`,
        credits_required: GENERATE_IMAGES_COST,
        credits_available: credits?.total ?? 0,
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch property data
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', body.propertyId)
    .eq('user_id', userId)
    .single();

  if (propertyError || !property) {
    return new Response(
      JSON.stringify({ error: 'Property not found or access denied' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const propertyData = property as PropertyData;

  // Deduct credits first
  const deducted = await deductCredits(userId, GENERATE_IMAGES_COST, 'Video IA - Imágenes');
  if (!deducted) {
    return new Response(
      JSON.stringify({ error: 'Insufficient credits' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('video_generation_jobs')
    .insert({
      user_id: userId,
      property_id: body.propertyId,
      selected_images: body.selectedImages,
      notes: body.notes || null,
      status: 'pending',
      credits_charged: GENERATE_IMAGES_COST,
    })
    .select()
    .single();

  if (jobError || !job) {
    // Refund credits if job creation fails
    await refundCredits(userId, GENERATE_IMAGES_COST, 'Video IA - Imágenes');
    console.error('Error creating job:', jobError);
    return new Response(
      JSON.stringify({ error: 'Failed to create job' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Prepare webhook payload
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
    notes: body.notes || '',
  };

  // Call external webhook
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const webhookResponse = await fetch(`${N8N_VIDEO_WEBHOOK_BASE}/generate-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: N8N_WEBHOOK_AUTH,
      },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!webhookResponse.ok) {
      // Mark job as failed and refund
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: `Webhook failed with status ${webhookResponse.status}`,
          credits_refunded: true,
        })
        .eq('id', job.id);

      await refundCredits(userId, GENERATE_IMAGES_COST, 'Video IA - Imágenes');

      return new Response(
        JSON.stringify({ error: 'Video generation service unavailable', jobId: job.id }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job status to processing
    await supabase
      .from('video_generation_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id);

    return new Response(
      JSON.stringify({ success: true, jobId: job.id, message: 'Image generation started' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (fetchError) {
    clearTimeout(timeoutId);

    // Mark job as failed and refund
    await supabase
      .from('video_generation_jobs')
      .update({
        status: 'failed',
        error_message: fetchError instanceof Error ? fetchError.message : 'Webhook request failed',
        credits_refunded: true,
      })
      .eq('id', job.id);

    await refundCredits(userId, GENERATE_IMAGES_COST, 'Video IA - Imágenes');

    console.error('Webhook fetch error:', fetchError);
    return new Response(
      JSON.stringify({ error: 'Failed to start image generation', jobId: job.id }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle approve-images action
 */
async function handleApproveImages(
  userId: string,
  body: ApproveImagesRequest
): Promise<Response> {
  const supabase = createAdminClient();

  if (!body.jobId) {
    return new Response(
      JSON.stringify({ error: 'Job ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch job data
  const { data: job, error: jobError } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('id', body.jobId)
    .eq('user_id', userId)
    .single();

  if (jobError || !job) {
    return new Response(
      JSON.stringify({ error: 'Job not found or access denied' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const jobData = job as JobData;

  // Verify job is in correct state
  if (jobData.status !== 'images_ready') {
    return new Response(
      JSON.stringify({ error: 'Job is not in images_ready state' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify we have 3 generated images
  if (!jobData.image_urls || jobData.image_urls.length !== 3) {
    return new Response(
      JSON.stringify({ error: 'Job does not have 3 generated images' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check credits
  const credits = await getUserCredits(userId);
  if (!credits || credits.total < GENERATE_SCRIPT_COST) {
    return new Response(
      JSON.stringify({
        error: `Créditos insuficientes. Necesitas ${GENERATE_SCRIPT_COST} crédito.`,
        credits_required: GENERATE_SCRIPT_COST,
        credits_available: credits?.total ?? 0,
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch property data
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', jobData.property_id)
    .single();

  if (propertyError || !property) {
    return new Response(
      JSON.stringify({ error: 'Property not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const propertyData = property as PropertyData;

  // Deduct credits for script generation
  const deducted = await deductCredits(userId, GENERATE_SCRIPT_COST, 'Video IA - Guión');
  if (!deducted) {
    return new Response(
      JSON.stringify({ error: 'Insufficient credits' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update job: reset fields and add script generation credits
  const newCreditsCharged = jobData.credits_charged + GENERATE_SCRIPT_COST;

  await supabase
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
    images: jobData.image_urls,
    notes: jobData.notes || '',
  };

  // Call external webhook
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const webhookResponse = await fetch(`${N8N_VIDEO_WEBHOOK_BASE}/approve-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: N8N_WEBHOOK_AUTH,
      },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!webhookResponse.ok) {
      // Mark job as failed and refund
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: `Webhook failed with status ${webhookResponse.status}`,
        })
        .eq('id', body.jobId);

      await refundCredits(userId, GENERATE_SCRIPT_COST, 'Video IA - Guión');

      return new Response(
        JSON.stringify({ error: 'Video generation service unavailable', jobId: body.jobId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, jobId: body.jobId, message: 'Script generation started' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (fetchError) {
    clearTimeout(timeoutId);

    // Mark job as failed and refund
    await supabase
      .from('video_generation_jobs')
      .update({
        status: 'failed',
        error_message: fetchError instanceof Error ? fetchError.message : 'Webhook request failed',
      })
      .eq('id', body.jobId);

    await refundCredits(userId, GENERATE_SCRIPT_COST, 'Video IA - Guión');

    console.error('Webhook fetch error:', fetchError);
    return new Response(
      JSON.stringify({ error: 'Failed to start script generation', jobId: body.jobId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle approve-script action
 */
async function handleApproveScript(
  userId: string,
  body: ApproveScriptRequest
): Promise<Response> {
  const supabase = createAdminClient();

  if (!body.jobId) {
    return new Response(
      JSON.stringify({ error: 'Job ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!body.script || body.script.length !== 3) {
    return new Response(
      JSON.stringify({ error: 'Exactly 3 script scenes are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate each script scene
  for (let i = 0; i < body.script.length; i++) {
    const scene = body.script[i];
    if (!scene || typeof scene.dialogue !== 'string') {
      return new Response(
        JSON.stringify({ error: `Script scene ${i + 1} must have a dialogue field` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const dialogueText = scene.dialogue.trim();
    if (!dialogueText || dialogueText.split(/\s+/).length < 1) {
      return new Response(
        JSON.stringify({ error: `Script scene ${i + 1} dialogue must have at least 1 word` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Fetch job data
  const { data: job, error: jobError } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('id', body.jobId)
    .eq('user_id', userId)
    .single();

  if (jobError || !job) {
    return new Response(
      JSON.stringify({ error: 'Job not found or access denied' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const jobData = job as JobData;

  // Verify job is in correct state
  if (jobData.status !== 'script_ready') {
    return new Response(
      JSON.stringify({ error: 'Job is not in script_ready state' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify we have 3 generated images
  if (!jobData.image_urls || jobData.image_urls.length !== 3) {
    return new Response(
      JSON.stringify({ error: 'Job does not have 3 generated images' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check credits
  const credits = await getUserCredits(userId);
  if (!credits || credits.total < GENERATE_VIDEO_COST) {
    return new Response(
      JSON.stringify({
        error: `Créditos insuficientes. Necesitas ${GENERATE_VIDEO_COST} créditos.`,
        credits_required: GENERATE_VIDEO_COST,
        credits_available: credits?.total ?? 0,
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch property data
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', jobData.property_id)
    .single();

  if (propertyError || !property) {
    return new Response(
      JSON.stringify({ error: 'Property not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const propertyData = property as PropertyData;

  // Deduct credits for video generation
  const deducted = await deductCredits(userId, GENERATE_VIDEO_COST, 'Video IA - Renderizado');
  if (!deducted) {
    return new Response(
      JSON.stringify({ error: 'Insufficient credits' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update job: save edited script, reset error and video fields, set to processing
  const newCreditsCharged = jobData.credits_charged + GENERATE_VIDEO_COST;

  await supabase
    .from('video_generation_jobs')
    .update({
      status: 'processing',
      script: body.script,
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
    images: jobData.image_urls,
    script: body.script,
    notes: jobData.notes || '',
  };

  // Call external webhook
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const webhookResponse = await fetch(`${N8N_VIDEO_WEBHOOK_BASE}/approve-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: N8N_WEBHOOK_AUTH,
      },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!webhookResponse.ok) {
      // Mark job as failed and refund video credits
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: `Webhook failed with status ${webhookResponse.status}`,
        })
        .eq('id', body.jobId);

      await refundCredits(userId, GENERATE_VIDEO_COST, 'Video IA - Renderizado');

      return new Response(
        JSON.stringify({ error: 'Video generation service unavailable', jobId: body.jobId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, jobId: body.jobId, message: 'Video generation started' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (fetchError) {
    clearTimeout(timeoutId);

    // Mark job as failed and refund video credits
    await supabase
      .from('video_generation_jobs')
      .update({
        status: 'failed',
        error_message: fetchError instanceof Error ? fetchError.message : 'Webhook request failed',
      })
      .eq('id', body.jobId);

    await refundCredits(userId, GENERATE_VIDEO_COST, 'Video IA - Renderizado');

    console.error('Webhook fetch error:', fetchError);
    return new Response(
      JSON.stringify({ error: 'Failed to start video generation', jobId: body.jobId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle check-job-status action
 * Checks if a job has timed out and refunds credits if needed
 */
async function handleCheckJobStatus(
  userId: string,
  body: CheckJobStatusRequest
): Promise<Response> {
  const supabase = createAdminClient();
  const TIMEOUT_MINUTES = 20;

  // Validate request
  if (!body.jobId) {
    return new Response(
      JSON.stringify({ error: 'Job ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch the job - must belong to the user
  const { data: job, error: jobError } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('id', body.jobId)
    .eq('user_id', userId)
    .single();

  if (jobError || !job) {
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Only check jobs that are actively processing
  if (job.status !== 'pending' && job.status !== 'processing') {
    return new Response(
      JSON.stringify({
        message: 'Job is not in processing state',
        status: job.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if job has timed out
  const createdAt = new Date(job.created_at).getTime();
  const now = Date.now();
  const processingMinutes = (now - createdAt) / (1000 * 60);

  // If not timed out yet, return current status
  if (processingMinutes <= TIMEOUT_MINUTES) {
    return new Response(
      JSON.stringify({
        message: 'Job is still processing',
        minutesElapsed: Math.round(processingMinutes),
        status: job.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Job has timed out - mark as failed
  const { error: updateError } = await supabase
    .from('video_generation_jobs')
    .update({
      status: 'failed',
      error_message: `Job timed out after ${TIMEOUT_MINUTES} minutes`,
    })
    .eq('id', body.jobId);

  if (updateError) {
    console.error('Error updating job status:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to update job status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Refund credits
  const creditsToRefund = job.credits_charged || 0;
  if (creditsToRefund > 0) {
    await refundCredits(userId, creditsToRefund, 'Reembolso - Video IA (timeout)');
  }

  console.log(`Job ${body.jobId} timed out after ${Math.round(processingMinutes)} minutes, refunded ${creditsToRefund} credits`);

  return new Response(
    JSON.stringify({
      message: 'Job marked as failed and credits refunded',
      creditsRefunded: creditsToRefund,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check configuration
  if (!N8N_VIDEO_WEBHOOK_BASE || !N8N_WEBHOOK_AUTH) {
    console.error('Missing N8N webhook configuration');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: VideoRequest = await req.json();

    // Route to appropriate handler based on action
    switch (body.action) {
      case 'generate-images':
        return await handleGenerateImages(user.id, body);
      case 'approve-images':
        return await handleApproveImages(user.id, body);
      case 'approve-script':
        return await handleApproveScript(user.id, body);
      case 'check-job-status':
        return await handleCheckJobStatus(user.id, body);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Video generation handler error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
