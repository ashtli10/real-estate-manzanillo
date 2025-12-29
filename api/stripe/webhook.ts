import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const STRIPE_MODE = process.env.STRIPE_MODE || 'test';
const STRIPE_SECRET_KEY = STRIPE_MODE === 'live' 
  ? process.env.STRIPE_LIVE_SECRET_KEY 
  : process.env.STRIPE_TEST_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = STRIPE_MODE === 'live'
  ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
  : process.env.STRIPE_TEST_WEBHOOK_SECRET;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

// Initialize Supabase with service role key (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Credit amounts for each product
const CREDIT_AMOUNTS: Record<string, number> = {
  'prod_TgPXEmRb61waI0': 20,   // 20 Créditos IA
  'prod_TgPUETBrQfgpx3': 50,   // 50 Créditos IA
  'prod_TgPXp2cS7JVrHE': 100,  // 100 Créditos IA
  'prod_TgPUmah2qf1ZcK': 500,  // 500 Créditos IA
  'prod_TgPXzbeOjUjZPh': 1000, // 1000 Créditos IA
};

interface WebhookHandlerResult {
  success: boolean;
  message: string;
}

// Helper to get raw body for webhook signature verification
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Handle subscription events
async function handleSubscriptionEvent(
  event: Stripe.Event,
  subscription: Stripe.Subscription
): Promise<WebhookHandlerResult> {
  const customerId = subscription.customer as string;
  
  // Get user_id from stripe_customer_id in profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (profileError || !profile) {
    // Try to find by subscription ID in subscriptions table
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (!existingSub) {
      console.error('No user found for customer:', customerId);
      return { success: false, message: 'User not found' };
    }
  }

  const userId = profile?.id;
  if (!userId) {
    console.error('User ID not found for customer:', customerId);
    return { success: false, message: 'User ID not found' };
  }

  // Map Stripe status to our status
  const status = mapStripeStatus(subscription.status);
  const planType = 'standard'; // We only have one plan for now
  
  // Calculate trial end and current period dates
  // Access raw subscription data with type assertion for period timestamps
  const rawSub = subscription as unknown as {
    trial_end: number | null;
    current_period_start: number;
    current_period_end: number;
    canceled_at: number | null;
  };
  const trialEndsAt = rawSub.trial_end 
    ? new Date(rawSub.trial_end * 1000).toISOString() 
    : null;
  const currentPeriodStart = new Date(rawSub.current_period_start * 1000).toISOString();
  const currentPeriodEnd = new Date(rawSub.current_period_end * 1000).toISOString();
  const canceledAt = subscription.canceled_at 
    ? new Date(subscription.canceled_at * 1000).toISOString() 
    : null;

  // Upsert subscription
  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status,
      plan_type: planType,
      trial_ends_at: trialEndsAt,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: canceledAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (subError) {
    console.error('Error upserting subscription:', subError);
    return { success: false, message: 'Failed to update subscription' };
  }

  // Log to audit
  await supabaseAdmin.from('audit_logs').insert({
    user_id: userId,
    action: `subscription.${event.type.split('.').pop()}`,
    resource_type: 'subscription',
    resource_id: subscription.id,
    details: { status, event_type: event.type },
  });

  return { success: true, message: `Subscription ${event.type} processed` };
}

// Handle successful payment (for credit purchases)
async function handlePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<WebhookHandlerResult> {
  const customerId = invoice.customer as string;
  
  // Get user_id from stripe_customer_id
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (profileError || !profile) {
    console.error('No user found for customer:', customerId);
    return { success: false, message: 'User not found' };
  }

  const userId = profile.id;

  // Check if this is a subscription invoice (give free credits)
  const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
  if (subscriptionId) {
    // This is a subscription payment - reset free credits
    const { error: creditsError } = await supabaseAdmin
      .from('credits')
      .upsert({
        user_id: userId,
        free_credits_remaining: 50, // Monthly free credits
        last_free_credit_reset: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (creditsError) {
      console.error('Error resetting free credits:', creditsError);
    } else {
      // Log credit transaction
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: userId,
        amount: 50,
        type: 'free_monthly',
        description: 'Créditos mensuales gratis - renovación de suscripción',
      });
    }

    return { success: true, message: 'Subscription payment processed, credits reset' };
  }

  // Check for credit purchases in line items
  for (const lineItem of invoice.lines.data) {
    const rawLineItem = lineItem as unknown as { price?: { product?: string } };
    const productId = rawLineItem.price?.product as string;
    const creditAmount = CREDIT_AMOUNTS[productId];

    if (creditAmount) {
      // Add purchased credits using the function
      const { error: addError } = await supabaseAdmin.rpc('add_credits', {
        p_user_id: userId,
        p_amount: creditAmount,
        p_type: 'purchased',
        p_description: `Compra de ${creditAmount} créditos`,
      });

      if (addError) {
        console.error('Error adding credits:', addError);
        return { success: false, message: 'Failed to add credits' };
      }

      // Log to audit
      await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action: 'credits.purchased',
        resource_type: 'credits',
        resource_id: lineItem.id,
        details: { amount: creditAmount, invoice_id: invoice.id },
      });
    }
  }

  return { success: true, message: 'Payment processed' };
}

// Handle payment failed
async function handlePaymentFailed(
  invoice: Stripe.Invoice
): Promise<WebhookHandlerResult> {
  const customerId = invoice.customer as string;
  
  // Get user_id from stripe_customer_id
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    return { success: false, message: 'User not found' };
  }

  // Log the failed payment
  await supabaseAdmin.from('audit_logs').insert({
    user_id: profile.id,
    action: 'invoice.payment_failed',
    resource_type: 'invoice',
    resource_id: invoice.id,
    details: { 
      amount: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
  });

  return { success: true, message: 'Payment failure logged' };
}

// Handle checkout session completed (for one-time purchases and new subscriptions)
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
  const customerId = session.customer as string;
  const userId = session.metadata?.user_id;

  if (!userId) {
    console.error('No user_id in session metadata');
    return { success: false, message: 'No user_id in metadata' };
  }

  // Update profile with stripe_customer_id if not already set
  await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customerId })
    .eq('id', userId)
    .is('stripe_customer_id', null);

  // If this was a subscription checkout
  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    return handleSubscriptionEvent({ type: 'customer.subscription.created' } as Stripe.Event, subscription);
  }

  // For one-time payments (credit purchases), the invoice.payment_succeeded will handle it
  return { success: true, message: 'Checkout completed' };
}

// Map Stripe subscription status to our status
function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'trialing': 'trialing',
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'past_due',
    'incomplete': 'incomplete',
    'incomplete_expired': 'incomplete_expired',
    'paused': 'paused',
  };
  return statusMap[stripeStatus] || 'none';
}

// Main webhook handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('Webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errMessage);
    return res.status(400).json({ error: `Webhook Error: ${errMessage}` });
  }

  console.log(`Processing webhook: ${event.type}`);

  let result: WebhookHandlerResult = { success: true, message: 'Event received' };

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        result = await handleSubscriptionEvent(event, event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        result = await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        result = await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        result = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.status(200).json(result);
}

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
