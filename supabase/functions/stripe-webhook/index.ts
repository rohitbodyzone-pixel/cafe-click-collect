import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false },
});

const response = (message: string, status = 200) => new Response(message, { status });

Deno.serve(async request => {
  if (request.method !== 'POST') return response('Method not allowed', 405);
  if (!stripeKey.startsWith('sk_test_') || !webhookSecret.startsWith('whsec_'))
    return response('Stripe test webhook is not configured', 503);
  const signature = request.headers.get('stripe-signature');
  if (!signature) return response('Missing signature', 400);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error('Invalid Stripe signature', error);
    return response('Invalid signature', 400);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const { data: attempt, error } = await db.from('payment_attempts').select('*')
        .eq('stripe_payment_intent_id', intent.id).single();
      if (error || !attempt) throw new Error('Payment attempt was not found.');
      if (attempt.status === 'succeeded') return response('Already processed');
      if (intent.amount_received !== attempt.amount_cents || intent.currency !== attempt.currency)
        throw new Error('Stripe amount does not match the server quote.');

      const payload = attempt.order_payload;
      const rpc = attempt.order_type === 'table'
        ? db.rpc('place_table_order', { p_id: attempt.proposed_order_id, p_table_id: payload.table_id,
            p_order_notes: payload.order_notes, p_items: payload.items, p_customer_key: attempt.customer_key,
            p_promo_code: payload.promo_code, p_redeem_free_coffee: payload.redeem_free_coffee === true })
        : db.rpc('place_cafe_order', { p_id: attempt.proposed_order_id, p_customer_name: payload.customer_name,
            p_phone: payload.phone, p_pickup_time: payload.pickup_time, p_pickup_slot: payload.pickup_slot,
            p_items: payload.items, p_customer_key: attempt.customer_key, p_promo_code: payload.promo_code,
            p_redeem_free_coffee: payload.redeem_free_coffee === true });
      const { error: orderError } = await rpc;
      if (orderError && orderError.code !== '23505') throw orderError;

      const charge = intent.latest_charge && typeof intent.latest_charge !== 'string' ? intent.latest_charge : null;
      const wallet = charge?.payment_method_details?.card?.wallet?.type;
      const method = wallet === 'apple_pay' ? 'apple_pay' : wallet === 'google_pay' ? 'google_pay' : 'card';
      const { error: updateError } = await db.from('orders').update({
        payment_method: method, payment_status: 'paid', amount_paid_cents: intent.amount_received,
        stripe_payment_intent_id: intent.id, payment_reference: intent.id, paid_at: new Date().toISOString(),
      }).eq('id', attempt.proposed_order_id);
      if (updateError) throw updateError;
      await db.from('payment_attempts').update({ status: 'succeeded', stripe_event_id: event.id })
        .eq('id', attempt.id);
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await db.from('payment_attempts').update({
        status: event.type === 'payment_intent.canceled' ? 'cancelled' : 'failed', stripe_event_id: event.id,
        failure_message: intent.last_payment_error?.message ?? null,
      }).eq('stripe_payment_intent_id', intent.id);
    } else if (event.type === 'payment_intent.processing') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await db.from('payment_attempts').update({ status: 'pending', stripe_event_id: event.id })
        .eq('stripe_payment_intent_id', intent.id);
    }
    return response('ok');
  } catch (error) {
    console.error('Webhook processing failed', event.id, error);
    return response('Webhook processing failed', 500);
  }
});
