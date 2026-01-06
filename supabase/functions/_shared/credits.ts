/**
 * Shared credit utilities for Edge Functions
 * Handles credit deduction, refunds, and balance checks
 */
import { createAdminClient } from './supabase-client.ts';

interface CreditBalance {
  total: number;
  free: number;
  paid: number;
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<CreditBalance | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('credits')
    .select('balance, free_credits_remaining')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching credits:', error);
    return null;
  }

  if (!data) {
    return { total: 0, free: 0, paid: 0 };
  }

  const free = data.free_credits_remaining ?? 0;
  const paid = data.balance ?? 0;
  return { total: free + paid, free, paid };
}

/**
 * Deduct credits from user account
 * Deducts from free credits first, then from paid balance
 * Creates a transaction record for audit trail
 * 
 * @param userId - The user's ID
 * @param amount - Number of credits to deduct
 * @param product - Product name for transaction record (e.g., 'IA Autocompletado')
 * @param metadata - Optional metadata for the transaction
 * @returns true if successful, false if insufficient credits or error
 */
export async function deductCredits(
  userId: string,
  amount: number,
  product: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const supabase = createAdminClient();
  
  try {
    // 1. Get current credits
    const { data: credits, error: fetchError } = await supabase
      .from('credits')
      .select('id, balance, free_credits_remaining')
      .eq('user_id', userId)
      .single();

    if (fetchError || !credits) {
      console.error('Error fetching credits:', fetchError);
      return false;
    }

    const freeRemaining = credits.free_credits_remaining ?? 0;
    const paidBalance = credits.balance ?? 0;
    const totalAvailable = freeRemaining + paidBalance;

    // 2. Check if user has enough credits
    if (totalAvailable < amount) {
      console.error(`Insufficient credits: need ${amount}, have ${totalAvailable}`);
      return false;
    }

    // 3. Calculate deduction split (free first, then paid)
    let freeDeduction = 0;
    let paidDeduction = 0;

    if (freeRemaining >= amount) {
      freeDeduction = amount;
    } else {
      freeDeduction = freeRemaining;
      paidDeduction = amount - freeRemaining;
    }

    // 4. Update credits table
    const { error: updateError } = await supabase
      .from('credits')
      .update({
        free_credits_remaining: freeRemaining - freeDeduction,
        balance: paidBalance - paidDeduction,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return false;
    }

    // 5. Create transaction record
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -amount,
        product,
        metadata: {
          free_deducted: freeDeduction,
          paid_deducted: paidDeduction,
          source: 'edge-function',
          ...metadata,
        },
      });

    if (txError) {
      console.error('Error creating transaction record:', txError);
      // Don't fail - credits were already deducted
    }

    return true;
  } catch (err) {
    console.error('Unexpected error in deductCredits:', err);
    return false;
  }
}

/**
 * Refund credits to user account
 * Refunds go to paid balance
 * 
 * @param userId - The user's ID
 * @param amount - Number of credits to refund
 * @param product - Product name for transaction record
 * @returns true if successful, false on error
 */
export async function refundCredits(
  userId: string,
  amount: number,
  product: string
): Promise<boolean> {
  const supabase = createAdminClient();
  
  try {
    // Get current credits
    const { data: credits, error: fetchError } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (fetchError || !credits) {
      console.error('Error fetching credits for refund:', fetchError);
      return false;
    }

    // Add to paid balance
    const { error: updateError } = await supabase
      .from('credits')
      .update({
        balance: (credits.balance || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating credits for refund:', updateError);
      return false;
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        product: `Reembolso - ${product}`,
        metadata: { source: 'edge-function' },
      });

    if (txError) {
      console.error('Error recording refund transaction:', txError);
      // Don't fail - credits were already added
    }

    return true;
  } catch (err) {
    console.error('Unexpected error in refundCredits:', err);
    return false;
  }
}
