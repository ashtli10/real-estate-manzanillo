/**
 * Stripe Webhook Handler
 * Processes Stripe events for subscriptions and credit purchases
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_MODE = process.env.STRIPE_MODE || 'test';
const STRIPE_SECRET_KEY = STRIPE_MODE === 'live' 
  ? process.env.STRIPE_LIVE_SECRET_KEY 
  : process.env.STRIPE_TEST_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = STRIPE_MODE === 'live'
  ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
  : process.env.STRIPE_TEST_WEBHOOK_SECRET;

// Note: In Vercel, use SUPABASE_URL (not VITE_ prefixed)
// Falls back to VITE_ version for backward compatibility
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface RequestHandler {
  (req: any, res: any): Promise<void>;
}

// Helper to read raw body
async function getRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const handler: RequestHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe not configured');
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    console.log('Processing Stripe event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const type = session.metadata?.type;

        if (!userId) {
          console.error('No user ID in session metadata');
          break;
        }

        if (type === 'subscription') {
          // Handle new subscription
          const subscriptionId = session.subscription as string;
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
          
          // Extract subscription data - handle both old and new SDK versions
          const subscriptionData = subscriptionResponse as unknown as {
            status: string;
            current_period_start: number;
            current_period_end: number;
            cancel_at_period_end: boolean;
          };

          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            status: subscriptionData.status,
            current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscriptionData.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

          // Log audit event
          await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'subscription_created',
            resource_type: 'subscription',
            resource_id: subscriptionId,
            details: { status: subscriptionData.status },
          });

          console.log('Subscription created for user:', userId);
        } else if (type === 'credits') {
          // Handle credit purchase
          const credits = parseInt(session.metadata?.credits || '0', 10);
          
          if (credits > 0) {
            // Add credits to user's balance
            await supabase.rpc('add_credits', {
              p_user_id: userId,
              p_amount: credits,
              p_type: 'purchased',
              p_description: `Compra de ${credits} créditos`,
            });

            console.log('Credits added for user:', userId, 'Amount:', credits);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscriptionEvent = event.data.object as unknown as {
          metadata?: { supabase_user_id?: string };
          customer: string;
          status: string;
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
        };
        const userId = subscriptionEvent.metadata?.supabase_user_id;

        if (!userId) {
          // Try to find user by customer ID
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', subscriptionEvent.customer)
            .single();

          if (profile) {
            await supabase.from('subscriptions').update({
              status: subscriptionEvent.status,
              current_period_start: new Date(subscriptionEvent.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscriptionEvent.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscriptionEvent.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            }).eq('user_id', profile.id);

            console.log('Subscription updated for user:', profile.id);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscriptionDeleted = event.data.object as unknown as {
          id: string;
          customer: string;
        };
        
        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscriptionDeleted.customer)
          .single();

        if (profile) {
          await supabase.from('subscriptions').update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('user_id', profile.id);

          // Log audit event
          await supabase.from('audit_logs').insert({
            user_id: profile.id,
            action: 'subscription_canceled',
            resource_type: 'subscription',
            resource_id: subscriptionDeleted.id,
            details: {},
          });

          console.log('Subscription canceled for user:', profile.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as {
          customer: string;
        };
        
        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (profile) {
          await supabase.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('user_id', profile.id);

          console.log('Payment failed for user:', profile.id);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to acknowledge receipt - Stripe will retry on 5xx errors
    // We log the error for debugging but don't expose details
    res.status(200).json({ 
      received: true,
      processed: false,
      // Only log internally, don't expose error details
    });
  }
};

export default handler;

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
