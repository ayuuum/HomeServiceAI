import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-signature',
};

// HMAC-SHA256 signature verification
async function verifySignature(body: string, signature: string, channelSecret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  
  return signature === expectedSignature;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("x-line-signature");
    const bodyText = await req.text();
    
    if (!signature) {
      console.error("Missing x-line-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);
    const destination = body.destination; // Bot User ID
    
    console.log("Webhook received for destination:", destination);

    // Find organization by line_bot_user_id
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, line_channel_secret, line_channel_token")
      .eq("line_bot_user_id", destination)
      .single();

    if (orgError || !org) {
      console.error("Organization not found for destination:", destination, orgError);
      // Return 200 to prevent LINE from retrying
      return new Response(JSON.stringify({ message: "Organization not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!org.line_channel_secret) {
      console.error("LINE channel secret not configured for organization:", org.id);
      return new Response(JSON.stringify({ message: "LINE not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature
    const isValid = await verifySignature(bodyText, signature, org.line_channel_secret);
    if (!isValid) {
      console.error("Invalid signature for organization:", org.id);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process events
    const events = body.events || [];
    console.log("Processing", events.length, "events");

    for (const event of events) {
      const lineUserId = event.source?.userId;
      
      if (!lineUserId) {
        console.log("Skipping event without userId:", event.type);
        continue;
      }

      // Find or create customer
      let customerId: string | null = null;
      
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("line_user_id", lineUserId)
        .eq("organization_id", org.id)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else if (event.type === "follow" || event.type === "message") {
        // Get user profile from LINE
        let displayName = "LINE User";
        
        if (org.line_channel_token) {
          try {
            const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
              headers: {
                "Authorization": `Bearer ${org.line_channel_token}`,
              },
            });
            
            if (profileRes.ok) {
              const profile = await profileRes.json();
              displayName = profile.displayName || displayName;
            }
          } catch (error) {
            console.error("Failed to fetch LINE profile:", error);
          }
        }

        // Create new customer using secure RPC function
        const { data: newCustomerId, error: createError } = await supabase
          .rpc('create_customer_secure', {
            p_organization_id: org.id,
            p_name: displayName,
            p_line_user_id: lineUserId
          });

        if (createError) {
          console.error("Failed to create customer:", createError);
        } else {
          customerId = newCustomerId;
        }
      }

      // Handle message events
      if (event.type === "message" && event.message) {
        const message = event.message;
        let content = "";
        let messageType = message.type || "text";

        switch (message.type) {
          case "text":
            content = message.text || "";
            break;
          case "image":
            content = "[画像]";
            break;
          case "video":
            content = "[動画]";
            break;
          case "audio":
            content = "[音声]";
            break;
          case "file":
            content = `[ファイル: ${message.fileName || "不明"}]`;
            break;
          case "sticker":
            content = "[スタンプ]";
            break;
          case "location":
            content = `[位置情報: ${message.address || ""}]`;
            break;
          default:
            content = `[${message.type}]`;
        }

        // Save message to database
        const { error: insertError } = await supabase
          .from("line_messages")
          .insert({
            organization_id: org.id,
            customer_id: customerId,
            line_user_id: lineUserId,
            direction: "inbound",
            message_type: messageType,
            content: content,
            line_message_id: message.id,
            sent_at: new Date(event.timestamp).toISOString(),
          });

        if (insertError) {
          console.error("Failed to save message:", insertError);
        } else {
          console.log("Message saved successfully");
        }
      }

      // Handle follow/unfollow events
      if (event.type === "follow") {
        console.log("User followed:", lineUserId);
      } else if (event.type === "unfollow") {
        console.log("User unfollowed:", lineUserId);
        // Optionally remove line_user_id from customer
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 to prevent LINE from retrying on errors
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
