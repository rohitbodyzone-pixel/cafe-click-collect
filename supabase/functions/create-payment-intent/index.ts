import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { corsHeaders, isOriginAllowed, json } from '../_shared/cors.ts';
import { createSecureQuote } from '../_shared/quote.ts';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false },
});

Deno.serve(async request => {
  if (!isOriginAllowed(request)) return json({ error: 'Origin is not allowed.' }, 403);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    if (!stripeKey.startsWith('sk_test_')) throw new Error('Stripe TEST MODE is not configured.');
    const body = await request.json();
    const idempotencyKey = String(body.idempotencyKey ?? '');
    const restaurantId = String(body.restaurantId || 'c0000000-0000-0000-0000-000000000001');
    const customerKey = String(body.customerKey ?? '');
    const proposedOrderId = String(body.orderId ?? '');
    const orderType = body.orderType === 'table' ? 'table' : 'pickup';
    const paymentMethod = ['card', 'apple_pay', 'google_pay'].includes(body.paymentMethod) ? body.paymentMethod : 'card';
    if (idempotencyKey.length < 16 || !/^LOY-[0-9a-f-]{36}$/i.test(customerKey) || !/^(CC|TB)-\d{5}$/.test(proposedOrderId))
      return json({ error: 'Invalid checkout request.' }, 400);

    const { data: restaurant } = await db.from('restaurants').select('*').eq('id', restaurantId).maybeSingle();
    const cardEnabled = restaurant?.card_enabled ?? true;
    const applePayEnabled = restaurant?.apple_pay_enabled ?? true;
    const googlePayEnabled = restaurant?.google_pay_enabled ?? true;

    const enabled = paymentMethod === 'card' ? cardEnabled
      : paymentMethod === 'apple_pay' ? applePayEnabled : googlePayEnabled;
    if (!enabled) return json({ error: 'This online payment method is currently unavailable.' }, 400);

    const { data: existing } = await db.from('payment_attempts').select('*')
      .eq('idempotency_key', idempotencyKey).maybeSingle();
    if (existing?.stripe_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id);
      return json({ checkoutToken: existing.checkout_token, orderId: existing.proposed_order_id, clientSecret: intent.client_secret,
        amountCents: existing.amount_cents, status: existing.status });
    }

    const quote = await createSecureQuote(db, body.items, customerKey, body.promoCode, body.redeemFreeCoffee === true, restaurantId);
    if (quote.totalCents < 50) return json({ error: 'This order total is too low for online payment. Please choose Pay at Counter.' }, 400);
    const payload = {
      customer_name: String(body.customerName ?? '').trim().slice(0, 100),
      phone: String(body.phone ?? '').trim().slice(0, 40),
      pickup_time: String(body.pickupTime ?? ''), pickup_slot: body.pickupSlot || null,
      table_id: body.tableId || null, order_notes: String(body.orderNotes ?? '').trim().slice(0, 1000),
      promo_code: quote.promoCode, redeem_free_coffee: body.redeemFreeCoffee === true, items: quote.items,
    };
    if (orderType === 'pickup' && (!payload.customer_name || !payload.phone || !payload.pickup_slot))
      return json({ error: 'Pickup details are incomplete.' }, 400);
    if (orderType === 'table' && !payload.table_id) return json({ error: 'Table details are missing.' }, 400);

    const checkoutToken = crypto.randomUUID();
    const { data: attempt, error: insertError } = await db.from('payment_attempts').insert({
      checkout_token: checkoutToken, idempotency_key: idempotencyKey, proposed_order_id: proposedOrderId,
      customer_key: customerKey, order_type: orderType, order_payload: payload,
      amount_cents: quote.totalCents, currency: 'nzd', payment_method: paymentMethod, status: 'created',
    }).select().single();
    if (insertError) {
      if (insertError.code === '23505') return json({ error: 'This checkout is already being processed. Please try again.' }, 409);
      throw insertError;
    }

    const intent = await stripe.paymentIntents.create({
      amount: quote.totalCents, currency: 'nzd',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { checkout_token: attempt.checkout_token, proposed_order_id: proposedOrderId, order_type: orderType },
      description: `Cafe order ${proposedOrderId}`,
    }, { idempotencyKey });
    await db.from('payment_attempts').update({ stripe_payment_intent_id: intent.id, status: 'pending' }).eq('id', attempt.id);
    return json({ checkoutToken: attempt.checkout_token, orderId: proposedOrderId, clientSecret: intent.client_secret,
      amountCents: quote.totalCents, status: 'pending' });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Unable to start payment.' }, 400);
  }
});
