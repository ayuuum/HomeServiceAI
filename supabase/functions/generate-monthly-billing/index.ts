 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 import Stripe from "https://esm.sh/stripe@18.5.0";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
     );
 
     const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
       apiVersion: "2025-08-27.basil",
     });
 
     // Parse request body
     const bodyText = await req.text();
     const body = bodyText ? JSON.parse(bodyText) : {};
     const { organizationId, billingMonth } = body;
 
     // Default to previous month if not specified
     const targetMonth = billingMonth || (() => {
       const now = new Date();
       now.setMonth(now.getMonth() - 1);
       return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
     })();
 
     console.log(`Generating billing for month: ${targetMonth}, org: ${organizationId || "all"}`);
 
     // Get organizations to bill
     let orgsQuery = supabase.from("organizations").select("*");
     if (organizationId) {
       orgsQuery = orgsQuery.eq("id", organizationId);
     }
     const { data: organizations, error: orgError } = await orgsQuery;
 
     if (orgError) {
       console.error("Error fetching organizations:", orgError);
       throw new Error("Failed to fetch organizations");
     }
 
     const results = [];
 
     for (const org of organizations || []) {
       console.log(`Processing organization: ${org.name} (${org.id})`);
 
       // Calculate date range for the billing month
       const [year, month] = targetMonth.split("-").map(Number);
       const startDate = new Date(year, month - 1, 1);
       const endDate = new Date(year, month, 0); // Last day of month
 
       // Get completed bookings for this month
       const { data: bookings, error: bookingError } = await supabase
         .from("bookings")
         .select("*")
         .eq("organization_id", org.id)
         .eq("status", "completed")
         .not("gmv_included_at", "is", null)
         .gte("gmv_included_at", startDate.toISOString())
         .lte("gmv_included_at", endDate.toISOString());
 
       if (bookingError) {
         console.error(`Error fetching bookings for ${org.id}:`, bookingError);
         continue;
       }
 
       // Calculate GMV breakdown
       let gmvTotal = 0;
       let gmvCash = 0;
       let gmvBankTransfer = 0;
       let gmvOnline = 0;
 
       for (const booking of bookings || []) {
         const amount = booking.final_amount || booking.total_price || 0;
         gmvTotal += amount;
 
         switch (booking.payment_method) {
           case "cash":
             gmvCash += amount;
             break;
           case "bank_transfer":
             gmvBankTransfer += amount;
             break;
           case "online_card":
             gmvOnline += amount;
             break;
           default:
             gmvCash += amount; // Default to cash
         }
       }
 
       const feePercent = org.platform_fee_percent || 7;
       const feeTotal = Math.round(gmvTotal * (feePercent / 100));
       const bookingCount = bookings?.length || 0;
 
       console.log(`GMV for ${org.name}: ¥${gmvTotal}, Fee: ¥${feeTotal}, Bookings: ${bookingCount}`);
 
       // Skip if no GMV
       if (gmvTotal === 0) {
         console.log(`Skipping ${org.name} - no GMV`);
         results.push({ orgId: org.id, orgName: org.name, status: "skipped", reason: "no_gmv" });
         continue;
       }
 
       // Check for existing billing record
       const { data: existingBilling } = await supabase
         .from("monthly_billing")
         .select("*")
         .eq("organization_id", org.id)
         .eq("billing_month", targetMonth)
         .single();
 
       // Create or get Stripe customer for this organization
       let stripeCustomerId = org.billing_customer_id;
       if (!stripeCustomerId) {
         const customer = await stripe.customers.create({
           name: org.name,
           email: org.admin_email || undefined,
           metadata: {
             organization_id: org.id,
             organization_slug: org.slug,
           },
         });
         stripeCustomerId = customer.id;
 
         // Update organization with customer ID
         await supabase
           .from("organizations")
           .update({ billing_customer_id: stripeCustomerId })
           .eq("id", org.id);
 
         console.log(`Created Stripe customer ${stripeCustomerId} for ${org.name}`);
       }
 
       // Create Stripe Invoice
       let invoice;
       try {
         invoice = await stripe.invoices.create({
           customer: stripeCustomerId,
           collection_method: "send_invoice",
           days_until_due: 15,
           description: `Haukuri Pro プラットフォーム利用料 (${targetMonth})`,
           metadata: {
             organization_id: org.id,
             billing_month: targetMonth,
             gmv_total: gmvTotal.toString(),
             booking_count: bookingCount.toString(),
           },
         });
 
         // Add invoice item
         await stripe.invoiceItems.create({
           customer: stripeCustomerId,
           invoice: invoice.id,
           amount: feeTotal,
           currency: "jpy",
           description: `月間売上 ¥${gmvTotal.toLocaleString()} × ${feePercent}% (予約${bookingCount}件)`,
         });
 
         // Finalize and send
         invoice = await stripe.invoices.finalizeInvoice(invoice.id);
         await stripe.invoices.sendInvoice(invoice.id);
 
         console.log(`Created and sent invoice ${invoice.id} for ${org.name}`);
       } catch (stripeError: any) {
         console.error(`Stripe invoice error for ${org.name}:`, stripeError);
         results.push({ 
           orgId: org.id, 
           orgName: org.name, 
           status: "error", 
           error: stripeError.message 
         });
         continue;
       }
 
       // Upsert billing record
       const billingData = {
         organization_id: org.id,
         billing_month: targetMonth,
         gmv_total: gmvTotal,
         gmv_cash: gmvCash,
         gmv_bank_transfer: gmvBankTransfer,
         gmv_online: gmvOnline,
         booking_count: bookingCount,
         fee_percent: feePercent,
         fee_total: feeTotal,
         stripe_invoice_id: invoice.id,
         invoice_status: "issued",
         hosted_invoice_url: invoice.hosted_invoice_url,
         issued_at: new Date().toISOString(),
         due_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
         updated_at: new Date().toISOString(),
       };
 
       if (existingBilling) {
         await supabase
           .from("monthly_billing")
           .update(billingData)
           .eq("id", existingBilling.id);
       } else {
         await supabase.from("monthly_billing").insert(billingData);
       }
 
       results.push({
         orgId: org.id,
         orgName: org.name,
         status: "success",
         gmvTotal,
         feeTotal,
         bookingCount,
         invoiceId: invoice.id,
         invoiceUrl: invoice.hosted_invoice_url,
       });
     }
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         billingMonth: targetMonth,
         results 
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error: any) {
     console.error("Generate monthly billing error:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });