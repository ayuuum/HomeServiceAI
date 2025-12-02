import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-signature',
};

interface LineWebhookEvent {
  type: string;
  message?: {
    type: string;
    id: string;
    text?: string;
  };
  timestamp: number;
  source: {
    type: string;
    userId: string;
  };
  replyToken: string;
}

interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

function verifySignature(body: string, signature: string, channelSecret: string): boolean {
  const hash = createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body and signature
    const bodyText = await req.text();
    const signature = req.headers.get('x-line-signature');

    if (!signature) {
      console.error('No signature provided');
      return new Response('Forbidden', { status: 403 });
    }

    const webhookBody: LineWebhookBody = JSON.parse(bodyText);
    console.log('Received webhook:', JSON.stringify(webhookBody, null, 2));

    // Get store by destination (LINE Bot User ID)
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .not('line_channel_secret', 'is', null);

    if (storeError || !stores || stores.length === 0) {
      console.error('No stores with LINE configuration found');
      return new Response('OK', { status: 200 }); // Return 200 to prevent retries
    }

    // Find the store that matches the signature
    let matchedStore = null;
    for (const store of stores) {
      if (store.line_channel_secret && verifySignature(bodyText, signature, store.line_channel_secret)) {
        matchedStore = store;
        break;
      }
    }

    if (!matchedStore) {
      console.error('Signature verification failed for all stores');
      return new Response('Forbidden', { status: 403 });
    }

    console.log('Matched store:', matchedStore.name);

    // Process each event
    for (const event of webhookBody.events) {
      console.log('Processing event:', event.type);

      if (event.type !== 'message' || !event.message) {
        console.log('Skipping non-message event');
        continue;
      }

      if (event.message.type !== 'text' || !event.message.text) {
        console.log('Skipping non-text message');
        continue;
      }

      const lineUserId = event.source.userId;
      const messageText = event.message.text;

      // Find or create customer
      let customer;
      const { data: existingCustomers, error: customerSearchError } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', matchedStore.id)
        .eq('line_user_id', lineUserId);

      if (customerSearchError) {
        console.error('Error searching for customer:', customerSearchError);
        continue;
      }

      if (existingCustomers && existingCustomers.length > 0) {
        customer = existingCustomers[0];
        console.log('Found existing customer:', customer.id);
      } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            store_id: matchedStore.id,
            line_user_id: lineUserId,
            name: `LINE User ${lineUserId.substring(0, 8)}`,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating customer:', createError);
          continue;
        }

        customer = newCustomer;
        console.log('Created new customer:', customer.id);
      }

      // Save message to chat_logs
      const { error: logError } = await supabase
        .from('chat_logs')
        .insert({
          store_id: matchedStore.id,
          customer_id: customer.id,
          sender: 'user',
          message_type: 'text',
          message: messageText,
        });

      if (logError) {
        console.error('Error saving chat log:', logError);
        continue;
      }

      console.log('Saved chat log for customer:', customer.id);
    }

    return new Response('OK', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in line-webhook function:', error);
    return new Response('Internal Server Error', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
});