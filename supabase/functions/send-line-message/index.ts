import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  storeId: string;
  customerId?: string;
  recipientLineUserId: string;
  messageContent: string;
  messageType?: string;
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('認証が必要です');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('認証に失敗しました');
    }

    // Parse request body
    const { storeId, customerId, recipientLineUserId, messageContent, messageType = 'text' }: SendMessageRequest = await req.json();

    if (!storeId || !recipientLineUserId || !messageContent) {
      throw new Error('必須パラメータが不足しています');
    }

    console.log(`Sending LINE message to ${recipientLineUserId} from store ${storeId}`);

    // Get store LINE credentials
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('line_channel_token')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error('店舗が見つかりません');
    }

    if (!store.line_channel_token) {
      throw new Error('店舗のLINE設定が完了していません');
    }

    // Create message record (pending)
    const { data: messageRecord, error: insertError } = await supabase
      .from('line_messages')
      .insert({
        store_id: storeId,
        customer_id: customerId || null,
        recipient_line_user_id: recipientLineUserId,
        message_type: messageType,
        message_content: messageContent,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create message record:', insertError);
      throw new Error('メッセージ記録の作成に失敗しました');
    }

    // Also save to chat_logs for the chat UI
    const { error: chatLogError } = await supabase
      .from('chat_logs')
      .insert({
        store_id: storeId,
        customer_id: customerId || null,
        sender: 'staff',
        message_type: messageType,
        message: messageContent,
      });

    if (chatLogError) {
      console.error('Failed to create chat log:', chatLogError);
      // We don't throw here to allow the message to be sent even if chat log fails
      // but in production you might want to handle this better
    }

    // Send LINE message using Push Message API
    const lineApiUrl = 'https://api.line.me/v2/bot/message/push';
    const linePayload = {
      to: recipientLineUserId,
      messages: [
        {
          type: messageType,
          text: messageContent,
        },
      ],
    };

    console.log('Calling LINE API:', lineApiUrl);
    const lineResponse = await fetch(lineApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${store.line_channel_token}`,
      },
      body: JSON.stringify(linePayload),
    });

    const lineResponseText = await lineResponse.text();
    console.log('LINE API response status:', lineResponse.status);
    console.log('LINE API response body:', lineResponseText);

    // Update message record with result
    if (lineResponse.ok) {
      await supabase
        .from('line_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', messageRecord.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'メッセージを送信しました',
          messageId: messageRecord.id,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      const errorMessage = lineResponseText || `LINE API エラー: ${lineResponse.status}`;
      
      await supabase
        .from('line_messages')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', messageRecord.id);

      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error in send-line-message function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});