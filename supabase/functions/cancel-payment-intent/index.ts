import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders, isOriginAllowed, json } from "../_shared/cors.ts";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);
Deno.serve(async (request) => {
  if (!isOriginAllowed(request))
    return json({ error: "Origin is not allowed." }, 403);
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);
  try {
    if (!stripeKey.startsWith("sk_test_"))
      throw new Error("Stripe TEST MODE is not configured.");
    const body = await request.json();
    const checkoutToken = String(body.checkoutToken ?? "");
    const customerKey = String(body.customerKey ?? "");
    const { data: attempt, error } = await db
      .from("payment_attempts")
      .select("*")
      .eq("checkout_token", checkoutToken)
      .eq("customer_key", customerKey)
      .single();
    if (error || !attempt)
      return json({ error: "Payment session was not found." }, 404);
    if (attempt.status === "succeeded" || attempt.status === "refunded")
      return json({ error: "A completed payment cannot be cancelled." }, 409);
    if (attempt.status === "cancelled") return json({ status: "cancelled" });
    if (attempt.stripe_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(
        attempt.stripe_payment_intent_id,
      );
      if (intent.status !== "succeeded" && intent.status !== "canceled")
        await stripe.paymentIntents.cancel(intent.id);
    }
    await db
      .from("payment_attempts")
      .update({ status: "cancelled" })
      .eq("id", attempt.id);
    return json({ status: "cancelled" });
  } catch (error) {
    console.error(error);
    return json(
      {
        error:
          error instanceof Error ? error.message : "Unable to cancel payment.",
      },
      400,
    );
  }
});
