/**
 * Loyalty Program Handler
 * Manages points earning, redemption, and customer rewards
 */

import {
  createTextMessage,
  createButtonMessage,
  sendWhatsAppMessage,
  type WhatsAppConfig,
} from './whatsapp.ts';

export interface LoyaltyContext {
  supabase: any;
  whatsappConfig: WhatsAppConfig;
  retailerId: string;
  customerId: string;
  customerPhone: string;
}

/**
 * Handle loyalty-related messages
 */
export async function handleLoyaltyMessage(
  context: LoyaltyContext,
  messageText: string,
  payload?: string
): Promise<void> {
  const lowerText = messageText.toLowerCase();

  // Check points balance
  if (
    lowerText.includes('points') ||
    lowerText.includes('balance') ||
    lowerText.includes('rewards') ||
    payload === 'check_points'
  ) {
    await showPointsBalance(context);
    return;
  }

  // View rewards catalog
  if (lowerText.includes('redeem') || payload === 'view_rewards') {
    await showRedemptionOptions(context);
    return;
  }
}

/**
 * Award points for a purchase
 */
export async function awardPointsForPurchase(
  context: LoyaltyContext,
  orderAmount: number,
  orderId: string
): Promise<void> {
  try {
    // Get active loyalty program
    const { data: program, error: programError } = await context.supabase
      .from('loyalty_programs')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('is_active', true)
      .single();

    if (programError || !program) {
      console.log('No active loyalty program');
      return;
    }

    // Calculate points earned
    const rules = program.rules || {};
    const earnRules = rules.earn_rules || {};
    const pointsPerPurchase = earnRules.points_per_purchase || 1;
    const minimumPurchase = earnRules.minimum_purchase_amount || 0;

    if (orderAmount < minimumPurchase) {
      return; // Order doesn't qualify
    }

    const pointsEarned = Math.floor(orderAmount * pointsPerPurchase);

    // Get or create customer loyalty points
    let { data: loyaltyPoints, error: pointsError } = await context.supabase
      .from('loyalty_points')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('customer_id', context.customerId)
      .maybeSingle();

    if (pointsError && pointsError.code !== 'PGRST116') {
      throw pointsError;
    }

    if (!loyaltyPoints) {
      // Create new loyalty points record
      const { data: newPoints, error: createError } = await context.supabase
        .from('loyalty_points')
        .insert({
          retailer_id: context.retailerId,
          customer_id: context.customerId,
          points_balance: pointsEarned,
          lifetime_points: pointsEarned,
          points_redeemed: 0,
        })
        .select()
        .single();

      if (createError) throw createError;
      loyaltyPoints = newPoints;
    } else {
      // Update existing points
      const { error: updateError } = await context.supabase
        .from('loyalty_points')
        .update({
          points_balance: loyaltyPoints.points_balance + pointsEarned,
          lifetime_points: loyaltyPoints.lifetime_points + pointsEarned,
        })
        .eq('id', loyaltyPoints.id);

      if (updateError) throw updateError;
    }

    // Record transaction
    await context.supabase.from('loyalty_transactions').insert({
      retailer_id: context.retailerId,
      customer_id: context.customerId,
      points_change: pointsEarned,
      transaction_type: 'earn',
      reference_id: orderId,
      reference_type: 'order',
      description: `Earned ${pointsEarned} points from purchase`,
    });

    // Notify customer
    const message = createTextMessage(
      context.customerPhone,
      `🎉 *POINTS EARNED!*\n\n+${pointsEarned} points from your purchase!\n\n💎 Total Balance: ${
        loyaltyPoints.points_balance + pointsEarned
      } points\n\nKeep shopping to earn more rewards! 🛍️`
    );

    await sendMessage(context, message);
  } catch (error) {
    console.error('Error awarding points:', error);
  }
}

/**
 * Show customer's points balance
 */
async function showPointsBalance(context: LoyaltyContext): Promise<void> {
  try {
    const { data: loyaltyPoints, error } = await context.supabase
      .from('loyalty_points')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('customer_id', context.customerId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (!loyaltyPoints) {
      const message = createButtonMessage(
        context.customerPhone,
        `💎 *YOUR REWARDS*\n\nYou don't have any points yet.\n\nStart shopping to earn rewards!`,
        [
          { id: 'browse_catalog', title: '🛍️ Shop Now' },
          { id: 'show_help', title: '❓ Help' },
        ]
      );
      await sendMessage(context, message);
      return;
    }

    // Get recent transactions
    const { data: transactions } = await context.supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', context.customerId)
      .order('created_at', { ascending: false })
      .limit(5);

    let balanceText = `💎 *YOUR REWARDS*\n\n`;
    balanceText += `Current Balance: *${loyaltyPoints.points_balance} points*\n`;
    balanceText += `Lifetime Earned: ${loyaltyPoints.lifetime_points} points\n`;
    balanceText += `Redeemed: ${loyaltyPoints.points_redeemed} points\n\n`;

    if (loyaltyPoints.tier) {
      balanceText += `🏆 Tier: ${loyaltyPoints.tier.toUpperCase()}\n\n`;
    }

    if (transactions && transactions.length > 0) {
      balanceText += `📊 *RECENT ACTIVITY*\n`;
      transactions.forEach((t: any) => {
        const sign = t.points_change > 0 ? '+' : '';
        const emoji = t.transaction_type === 'earn' ? '✅' : '🎁';
        balanceText += `${emoji} ${sign}${t.points_change} pts - ${t.description}\n`;
      });
    }

    const message = createButtonMessage(context.customerPhone, balanceText, [
      { id: 'view_rewards', title: '🎁 Redeem Points' },
      { id: 'browse_catalog', title: '🛍️ Shop More' },
    ]);

    await sendMessage(context, message);
  } catch (error) {
    console.error('Error showing points balance:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Show redemption options
 */
async function showRedemptionOptions(context: LoyaltyContext): Promise<void> {
  try {
    // Get customer points
    const { data: loyaltyPoints, error } = await context.supabase
      .from('loyalty_points')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('customer_id', context.customerId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    const pointsBalance = loyaltyPoints?.points_balance || 0;

    // Get loyalty program for redemption rules
    const { data: program } = await context.supabase
      .from('loyalty_programs')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('is_active', true)
      .single();

    if (!program) {
      await sendMessage(
        context,
        createTextMessage(
          context.customerPhone,
          '⚠️ Loyalty program is not currently active.'
        )
      );
      return;
    }

    const rules = program.rules || {};
    const redemptionRules = rules.redemption_rules || {};
    const minPoints = redemptionRules.minimum_points_to_redeem || 100;

    if (pointsBalance < minPoints) {
      await sendMessage(
        context,
        createTextMessage(
          context.customerPhone,
          `💎 You have ${pointsBalance} points.\n\nYou need at least ${minPoints} points to redeem rewards.\n\nKeep shopping to earn more! 🛍️`
        )
      );
      return;
    }

    // Show redemption tiers
    let redeemText = `🎁 *REDEEM YOUR POINTS*\n\n`;
    redeemText += `Your Balance: *${pointsBalance} points*\n\n`;
    redeemText += `*AVAILABLE REWARDS:*\n\n`;
    redeemText += `💵 100 points = 1,000 XAF discount\n`;
    redeemText += `💵 200 points = 2,500 XAF discount\n`;
    redeemText += `💵 500 points = 7,500 XAF discount\n`;
    redeemText += `💵 1000 points = 20,000 XAF discount\n\n`;
    redeemText += `To redeem, mention "redeem" when placing your next order!`;

    await sendMessage(context, createTextMessage(context.customerPhone, redeemText));
  } catch (error) {
    console.error('Error showing redemption options:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Send error message
 */
async function sendErrorMessage(context: LoyaltyContext): Promise<void> {
  const message = createTextMessage(
    context.customerPhone,
    '⚠️ Sorry, something went wrong. Please try again later.'
  );
  await sendMessage(context, message);
}

/**
 * Helper to send message and store in database
 */
async function sendMessage(context: LoyaltyContext, message: any): Promise<void> {
  // Send via WhatsApp
  const result = await sendWhatsAppMessage(context.whatsappConfig, message);

  if (!result.success) {
    console.error('Failed to send message:', result.error);
    return;
  }

  // Store in database
  let content = '';
  if (message.type === 'text') {
    content = message.text.body;
  } else if (message.type === 'interactive') {
    content = message.interactive.body.text;
  }

  await context.supabase.from('messages').insert({
    retailer_id: context.retailerId,
    customer_id: context.customerId,
    direction: 'outbound',
    message_type: message.type,
    content,
    whatsapp_message_id: result.messageId,
    status: 'sent',
    metadata: {
      timestamp: new Date().toISOString(),
      is_loyalty_related: true,
    },
  });
}
