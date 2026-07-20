/**
 * Send WhatsApp Message Function
 * API endpoint to send WhatsApp messages from the dashboard
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  sendWhatsAppMessage,
  createTextMessage,
  createButtonMessage,
  createListMessage,
  createImageMessage,
  type WhatsAppConfig,
  type WhatsAppOutboundMessage,
} from '../_shared/whatsapp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  to: string;
  message: {
    type: 'text' | 'button' | 'list' | 'image';
    text?: string;
    buttons?: Array<{ id: string; title: string }>;
    sections?: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
    buttonText?: string;
    imageUrl?: string;
    caption?: string;
  };
  retailerId: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const requestData: SendMessageRequest = await req.json();
    const { to, message, retailerId } = requestData;

    // Verify retailer exists
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('id, whatsapp_number')
      .eq('id', retailerId)
      .single();

    if (retailerError || !retailer) {
      return new Response(
        JSON.stringify({ error: 'Retailer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create customer
    const customer = await findOrCreateCustomer(supabase, to, retailerId);
    if (!customer) {
      return new Response(
        JSON.stringify({ error: 'Failed to find or create customer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build WhatsApp message
    let whatsappMessage: WhatsAppOutboundMessage;

    switch (message.type) {
      case 'text':
        if (!message.text) {
          throw new Error('Text message requires text field');
        }
        whatsappMessage = createTextMessage(to, message.text);
        break;

      case 'button':
        if (!message.text || !message.buttons) {
          throw new Error('Button message requires text and buttons fields');
        }
        whatsappMessage = createButtonMessage(to, message.text, message.buttons);
        break;

      case 'list':
        if (!message.text || !message.buttonText || !message.sections) {
          throw new Error('List message requires text, buttonText, and sections fields');
        }
        whatsappMessage = createListMessage(
          to,
          message.text,
          message.buttonText,
          message.sections
        );
        break;

      case 'image':
        if (!message.imageUrl) {
          throw new Error('Image message requires imageUrl field');
        }
        whatsappMessage = createImageMessage(to, message.imageUrl, message.caption);
        break;

      default:
        throw new Error('Invalid message type');
    }

    // Send via WhatsApp API
    const config: WhatsAppConfig = {
      phoneNumberId: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!,
      accessToken: Deno.env.get('WHATSAPP_ACCESS_TOKEN')!,
      webhookVerifyToken: Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')!,
      apiVersion: 'v18.0',
    };

    const result = await sendWhatsAppMessage(config, whatsappMessage);

    if (!result.success) {
      console.error('Failed to send WhatsApp message:', result.error);
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store message in database
    const messageContent = message.text || 
                          JSON.stringify(message.buttons) ||
                          JSON.stringify(message.sections) ||
                          message.imageUrl ||
                          '';

    const { error: dbError } = await supabase
      .from('messages')
      .insert({
        retailer_id: retailerId,
        customer_id: customer.id,
        direction: 'outbound',
        message_type: message.type,
        content: messageContent,
        whatsapp_message_id: result.messageId,
        status: 'sent',
        metadata: {
          sentAt: new Date().toISOString(),
        },
      });

    if (dbError) {
      console.error('Error storing message in database:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
        customerId: customer.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-whatsapp-message:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Find existing customer or create new one
 */
async function findOrCreateCustomer(
  supabase: any,
  phoneNumber: string,
  retailerId: string
): Promise<any> {
  try {
    // Normalize phone number
    const normalizedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;

    // Try to find existing customer
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('retailer_id', retailerId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        retailer_id: retailerId,
        phone_number: normalizedPhone,
        preferred_language: 'en',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return null;
    }

    return newCustomer;
  } catch (error) {
    console.error('Error in findOrCreateCustomer:', error);
    return null;
  }
}
