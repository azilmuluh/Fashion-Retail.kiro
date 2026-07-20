import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processPayment, verifyPaymentStatus } from '../_shared/payment-providers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, provider, amount, currency, customerPhone, orderId, transactionId } = await req.json();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Handle different actions
    if (action === 'initiate') {
      // Initiate a new payment
      const paymentResult = await processPayment(provider, {
        amount,
        currency: currency || 'XAF',
        customerPhone,
        orderId,
        description: `Order payment for ${orderId}`,
      });

      // Update order with payment information
      if (paymentResult.success) {
        await supabaseClient
          .from('orders')
          .update({
            payment_method: paymentResult.provider,
            payment_status: paymentResult.status === 'success' ? 'paid' : 'pending',
            metadata: {
              payment_transaction_id: paymentResult.transactionId,
              payment_provider: paymentResult.provider,
              payment_initiated_at: new Date().toISOString(),
            },
          })
          .eq('order_number', orderId);
      }

      return new Response(JSON.stringify(paymentResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (action === 'verify') {
      // Verify payment status
      const verificationResult = await verifyPaymentStatus(provider, transactionId);

      // Update order if payment is confirmed
      if (verificationResult.status === 'success') {
        await supabaseClient
          .from('orders')
          .update({
            payment_status: 'paid',
          })
          .eq('metadata->payment_transaction_id', transactionId);
      }

      return new Response(JSON.stringify(verificationResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
