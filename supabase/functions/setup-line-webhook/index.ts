import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('setup-line-webhook: Starting webhook setup');

    // Verify authentication (same pattern as test-line-connection)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('setup-line-webhook: Authenticated user:', userId);

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Get LINE channel token (service role needed)
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: org, error: orgError } = await supabaseServiceRole
      .from('organizations')
      .select('line_channel_token')
      .eq('id', organizationId)
      .single();

    if (orgError || !org?.line_channel_token) {
      return new Response(
        JSON.stringify({ error: 'Channel Access Token が設定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelToken = org.line_channel_token;
    const webhookUrl = `${supabaseUrl}/functions/v1/line-webhook`;

    // Step 1: Set webhook endpoint URL
    console.log('setup-line-webhook: Setting webhook URL:', webhookUrl);
    const setResponse = await fetch('https://api.line.me/v2/bot/channel/webhook/endpoint', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${channelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint: webhookUrl }),
    });

    if (!setResponse.ok) {
      const errorText = await setResponse.text();
      console.error('setup-line-webhook: Failed to set webhook URL:', setResponse.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Webhook URLの自動設定に失敗しました',
          details: errorText,
          webhookUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('setup-line-webhook: Webhook URL set successfully');

    // Step 2: Test the webhook endpoint
    let testSuccess = false;
    try {
      console.log('setup-line-webhook: Testing webhook endpoint...');
      const testResponse = await fetch('https://api.line.me/v2/bot/channel/webhook/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${channelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: webhookUrl }),
      });

      if (testResponse.ok) {
        const testResult = await testResponse.json();
        testSuccess = testResult.success === true;
        console.log('setup-line-webhook: Webhook test result:', testResult);
      } else {
        console.warn('setup-line-webhook: Webhook test returned non-OK:', testResponse.status);
      }
    } catch (testError) {
      console.warn('setup-line-webhook: Webhook test failed (non-critical):', testError);
    }

    // Step 3: Get webhook endpoint info to check "active" status
    let webhookActive = false;
    try {
      const getResponse = await fetch('https://api.line.me/v2/bot/channel/webhook/endpoint', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${channelToken}`,
        },
      });

      if (getResponse.ok) {
        const endpointInfo = await getResponse.json();
        webhookActive = endpointInfo.active === true;
        console.log('setup-line-webhook: Webhook active status:', webhookActive, 'endpoint:', endpointInfo.endpoint);
      }
    } catch (getError) {
      console.warn('setup-line-webhook: Failed to get webhook info (non-critical):', getError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        webhookUrl,
        webhookActive,
        testSuccess,
        needsManualActivation: !webhookActive,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('setup-line-webhook: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
