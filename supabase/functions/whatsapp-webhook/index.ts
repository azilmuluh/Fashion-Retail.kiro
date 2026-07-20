/**
 * WhatsApp Webhook Endpoint
 * Receives and processes incoming WhatsApp messages
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  parseWhatsAppWebhook,
  verifyWebhookSignature,
  type ParsedWhatsAppMessage,
  type WhatsAppConfig,
} from '../_shared/whatsapp.ts';
import { handleCatalogMessage } from '../_shared/catalog-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Handle webhook verification (GET request)
  if (req.method === 'GET') {
    return handleWebhookVerification(url);
  }

  // Handle incoming messages (POST request)
  if (req.method === 'POST') {
    return await handleIncomingMessage(req);
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});

/**
 * Handle webhook verification from WhatsApp
 */
function handleWebhookVerification(url: URL): Response {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified successfully');
    return new Response(challenge, { status: 200, headers: corsHeaders });
  }

  console.error('Webhook verification failed');
  return new Response('Verification failed', { status: 403, headers: corsHeaders });
}

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(req: Request): Promise<Response> {
  try {
    // Verify signature
    const signature = req.headers.get('x-hub-signature-256');
    const webhookSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');
    
    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const body = await req.text();
    
    // TODO: Implement proper signature verification with crypto.subtle
    // For now, we'll accept if signature exists
    // if (!verifyWebhookSignature(signature, body, webhookSecret)) {
    //   console.error('Invalid signature');
    //   return new Response('Invalid signature', { status: 401, headers: corsHeaders });
    // }

    // Parse webhook body
    const webhookData = JSON.parse(body);
    console.log('Received webhook:', JSON.stringify(webhookData, null, 2));

    // Parse message
    const parsedMessage = parseWhatsAppWebhook(webhookData);
    
    if (!parsedMessage) {
      console.log('No message to process (status update or other event)');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    console.log('Parsed message:', parsedMessage);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process the message
    await processIncomingMessage(supabase, parsedMessage);

    // Return 200 to acknowledge receipt
    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error handling incoming message:', error);
    // Still return 200 to avoid retries
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
}

/**
 * Process the parsed message and store in database
 */
async function processIncomingMessage(
  supabase: any,
  message: ParsedWhatsAppMessage
): Promise<void> {
  try {
    // Find or create customer
    const customer = await findOrCreateCustomer(supabase, message.from);
    
    if (!customer) {
      console.error('Failed to find or create customer');
      return;
    }

    // Store message in database
    const content = message.text || 
                   message.buttonPayload || 
                   message.listReply || 
                   '[Image]';

    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        retailer_id: customer.retailer_id,
        customer_id: customer.id,
        direction: 'inbound',
        message_type: message.type,
        content,
        whatsapp_message_id: message.messageId,
        status: 'delivered',
        metadata: {
          timestamp: message.timestamp,
          from: message.from,
          imageId: message.imageId,
        },
      });

    if (messageError) {
      console.error('Error storing message:', messageError);
      return;
    }

    console.log('Message stored successfully');

    // Handle catalog browsing
    await handleProductCatalog(supabase, message, customer);
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

/**
 * Handle product catalog interactions
 */
async function handleProductCatalog(
  supabase: any,
  message: ParsedWhatsAppMessage,
  customer: any
): Promise<void> {
  try {
    // Get WhatsApp configuration
    const whatsappConfig: WhatsAppConfig = {
      phoneNumberId: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!,
      accessToken: Deno.env.get('WHATSAPP_ACCESS_TOKEN')!,
      webhookVerifyToken: Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')!,
      apiVersion: Deno.env.get('WHATSAPP_API_VERSION') || 'v18.0',
    };

    // Prepare catalog context
    const context = {
      supabase,
      whatsappConfig,
      retailerId: customer.retailer_id,
      customerId: customer.id,
      customerPhone: customer.phone_number,
    };

    // Determine message content and payload
    const messageText = message.text || '';
    const payload = message.buttonPayload || message.listReply || '';

    // Handle the catalog message
    await handleCatalogMessage(context, messageText, message.type, payload);
  } catch (error) {
    console.error('Error handling product catalog:', error);
  }
}

/**
 * Find existing customer or create new one
 */
async function findOrCreateCustomer(
  supabase: any,
  phoneNumber: string
): Promise<any> {
  try {
    // Normalize phone number
    const normalizedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;

    // Try to find existing customer
    const { data: existing, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding customer:', findError);
      return null;
    }

    if (existing) {
      console.log('Found existing customer:', existing.id);
      return existing;
    }

    // Get first active retailer (in production, determine based on WhatsApp number)
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (retailerError || !retailer) {
      console.error('Error finding retailer:', retailerError);
      return null;
    }

    // Create new customer
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        retailer_id: retailer.id,
        phone_number: normalizedPhone,
        preferred_language: 'en', // Default, can be detected later
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating customer:', createError);
      return null;
    }

    console.log('Created new customer:', newCustomer.id);
    return newCustomer;
  } catch (error) {
    console.error('Error in findOrCreateCustomer:', error);
    return null;
  }
}
