import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-signature',
};

// HMAC-SHA256 signature verification
async function sendLineReply(
  replyToken: string,
  message: string,
  channelToken: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text: message }],
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to send LINE reply:", error);
    return false;
  }
}

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
      .select("id, line_channel_secret, line_channel_token, line_ai_enabled, line_ai_system_prompt, line_ai_escalation_keywords, admin_line_user_id")
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
        .select("id, avatar_url")
        .eq("line_user_id", lineUserId)
        .eq("organization_id", org.id)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;

        // Update profile if missing or periodically
        if (org.line_channel_token) {
          try {
            console.log("Fetching LINE profile for user:", lineUserId);
            const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
              headers: { "Authorization": `Bearer ${org.line_channel_token}` },
            });

            if (profileRes.ok) {
              const profile = await profileRes.json();
              console.log("LINE profile fetched:", { displayName: profile.displayName, hasPicture: !!profile.pictureUrl });

              const { error: updateError } = await supabase
                .from("customers")
                .update({
                  name: profile.displayName,
                  avatar_url: profile.pictureUrl,
                  updated_at: new Date().toISOString()
                })
                .eq("id", customerId);

              if (updateError) {
                console.error("Failed to update customer profile:", updateError);
              } else {
                console.log("Customer profile updated successfully with avatar_url:", profile.pictureUrl);
              }
            } else {
              const errorText = await profileRes.text();
              console.error("LINE profile API error:", profileRes.status, errorText);
            }
          } catch (error) {
            console.error("Failed to update LINE profile:", error);
          }
        } else {
          console.log("No LINE channel token configured, skipping profile update");
        }
      } else if (event.type === "follow" || event.type === "message") {
        // Get user profile from LINE
        let displayName = "LINE User";
        let pictureUrl = null;

        if (org.line_channel_token) {
          try {
            console.log("Fetching LINE profile for new user:", lineUserId);
            const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
              headers: {
                "Authorization": `Bearer ${org.line_channel_token}`,
              },
            });

            if (profileRes.ok) {
              const profile = await profileRes.json();
              displayName = profile.displayName || displayName;
              pictureUrl = profile.pictureUrl || null;
              console.log("New user profile fetched:", { displayName, hasPicture: !!pictureUrl });
            } else {
              const errorText = await profileRes.text();
              console.error("LINE profile API error for new user:", profileRes.status, errorText);
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
            p_line_user_id: lineUserId,
            p_avatar_url: pictureUrl
          });

        if (createError) {
          console.error("Failed to create customer:", createError);
        } else {
          customerId = newCustomerId;
          console.log("New customer created with id:", customerId);
        }
      }

      // Handle message events
      if (event.type === "message" && event.message) {
        const message = event.message;
        const replyToken = event.replyToken;
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

        // Check for admin registration keyword
        if (message.type === "text" && (content === "管理者登録" || content.toLowerCase() === "admin")) {
          console.log("Admin registration keyword detected from:", lineUserId);
          
          // Check if already registered
          if (org.admin_line_user_id === lineUserId) {
            if (replyToken && org.line_channel_token) {
              await sendLineReply(
                replyToken,
                "ℹ️ このアカウントは既に管理者として登録されています。",
                org.line_channel_token
              );
            }
            console.log("User already registered as admin, skipping");
            continue;
          }
          
          // Update admin_line_user_id
          const { error: updateError } = await supabase
            .from("organizations")
            .update({ admin_line_user_id: lineUserId })
            .eq("id", org.id);
          
          if (!updateError) {
            console.log("Admin LINE User ID registered successfully:", lineUserId);
            if (replyToken && org.line_channel_token) {
              await sendLineReply(
                replyToken,
                "✅ 管理者として登録しました！新規予約・キャンセル通知がこのLINEに届きます。",
                org.line_channel_token
              );
            }
          } else {
            console.error("Failed to update admin_line_user_id:", updateError);
            if (replyToken && org.line_channel_token) {
              await sendLineReply(
                replyToken,
                "❌ 登録に失敗しました。しばらくしてから再度お試しください。",
                org.line_channel_token
              );
            }
          }
          
          // Skip normal message processing for admin registration
          continue;
        }

        // Handle Image/Video content
        if (message.type === 'image' || message.type === 'video') {
          if (org.line_channel_token) {
            try {
              console.log(`Downloading ${message.type} content for message ${message.id}`);

              // Get content from LINE
              const contentRes = await fetch(`https://api-data.line.me/v2/bot/message/${message.id}/content`, {
                headers: {
                  "Authorization": `Bearer ${org.line_channel_token}`,
                },
              });

              if (contentRes.ok) {
                const blob = await contentRes.blob();
                const buffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);

                // Upload to Supabase Storage
                // Path: {orgId}/{lineUserId}/{messageId}.{ext}
                const ext = message.type === 'image' ? 'jpg' : 'mp4'; // LINE sends jpeg/mp4 usually
                const filePath = `${org.id}/${lineUserId}/${message.id}.${ext}`;

                const { error: uploadError } = await supabase.storage
                  .from('chat-attachments')
                  .upload(filePath, uint8Array, {
                    contentType: message.type === 'image' ? 'image/jpeg' : 'video/mp4',
                    upsert: true
                  });

                if (uploadError) {
                  console.error("Failed to upload to storage:", uploadError);
                  content = `[${message.type}: 保存失敗]`;
                } else {
                  // Get Public URL
                  const { data: { publicUrl } } = supabase.storage
                    .from('chat-attachments')
                    .getPublicUrl(filePath);

                  content = publicUrl;
                  console.log(`Media saved to storage: ${publicUrl}`);
                }
              } else {
                console.error("Failed to download from LINE:", contentRes.status);
                content = `[${message.type}: 取得失敗]`;
              }
            } catch (err) {
              console.error("Error processing media:", err);
              content = `[${message.type}: エラー]`;
            }
          } else {
            content = `[${message.type}: トークン未設定]`;
          }
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

          // Create in-app notification for new LINE message
          try {
            // Get customer name for notification
            let customerName = "LINE User";
            if (customerId) {
              const { data: customer } = await supabase
                .from("customers")
                .select("name")
                .eq("id", customerId)
                .single();
              if (customer?.name) {
                customerName = customer.name;
              }
            }

            const { error: notifError } = await supabase
              .from("notifications")
              .insert({
                organization_id: org.id,
                type: "line_message",
                title: `${customerName}からメッセージ`,
                message: content.substring(0, 100),
                resource_type: "line_message",
                resource_id: customerId
              });

            if (notifError) {
              console.error("Failed to create notification:", notifError);
            } else {
              console.log("In-app notification created for LINE message");
            }
          } catch (notifErr) {
            console.error("Notification creation error:", notifErr);
          }

          // Trigger AI agent if enabled
          if (org.line_ai_enabled && org.line_channel_token && message.type === "text") {
            console.log("AI auto-response enabled, triggering line-ai-agent");

            try {
              const aiResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/line-ai-agent`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  organizationId: org.id,
                  lineUserId: lineUserId,
                  customerId: customerId,
                  userMessage: content,
                  channelToken: org.line_channel_token,
                  systemPrompt: org.line_ai_system_prompt,
                  escalationKeywords: org.line_ai_escalation_keywords,
                }),
              });

              if (!aiResponse.ok) {
                const errorText = await aiResponse.text();
                console.error("AI agent error:", aiResponse.status, errorText);
              } else {
                const aiResult = await aiResponse.json();
                console.log("AI agent response:", aiResult.success ? "success" : "failed", aiResult.escalated ? "(escalated)" : "");
              }
            } catch (aiError) {
              console.error("Failed to trigger AI agent:", aiError);
            }
          }
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
