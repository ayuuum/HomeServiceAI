import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('test-line-connection: Starting connection test');

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('test-line-connection: Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('test-line-connection: Failed to verify JWT:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('test-line-connection: Authenticated user:', userId);

    // Get user's organization ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('test-line-connection: Failed to get organization:', profileError);
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;
    console.log('test-line-connection: Organization ID:', organizationId);

    // Get LINE settings from organization (need service role for this)
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
      console.error('test-line-connection: LINE token not configured:', orgError);
      return new Response(
        JSON.stringify({ error: 'Channel Access Token が設定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('test-line-connection: Calling LINE API...');

    // Call LINE API to get bot info (server-to-server, no CORS issues)
    const lineResponse = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        'Authorization': `Bearer ${org.line_channel_token}`,
      },
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error('test-line-connection: LINE API error:', lineResponse.status, errorText);
      
      let errorMessage = 'LINE APIへの接続に失敗しました';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore parse error
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: lineResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botInfo = await lineResponse.json();
    console.log('test-line-connection: Bot info received:', botInfo.displayName, botInfo.userId);

    // Update bot user ID in organization
    if (botInfo.userId) {
      const { error: updateError } = await supabaseServiceRole
        .from('organizations')
        .update({ line_bot_user_id: botInfo.userId })
        .eq('id', organizationId);

      if (updateError) {
        console.error('test-line-connection: Failed to update bot user ID:', updateError);
        // Don't fail the request, just log the error
      } else {
        console.log('test-line-connection: Bot user ID saved successfully');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        botInfo: {
          userId: botInfo.userId,
          displayName: botInfo.displayName,
          pictureUrl: botInfo.pictureUrl,
          chatMode: botInfo.chatMode,
          markAsReadMode: botInfo.markAsReadMode,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('test-line-connection: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
