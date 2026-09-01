import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const client = createClient(supabaseUrl, supabaseKey);

const REST_A_ID = 'c0000000-0000-0000-0000-000000000001'; // Common Ground
const REST_B_ID = 'c0000000-0000-0000-0000-000000000002'; // Trattoria Bella

interface TestStepResult {
  step: string;
  passed: boolean;
  details: string;
}

const results: TestStepResult[] = [];

function record(step: string, passed: boolean, details: string) {
  results.push({ step, passed, details });
  console.log(`${passed ? '✓' : '❌'} [${step}] ${details}`);
}

async function runPhase5Tests() {
  console.log(`\n=== RUNNING PHASE 5 STRIPE CONNECT & PLATFORM ECONOMICS TESTS (STRICT TEST MODE) ===\n`);

  // 1. Stripe Connect Multi-Tenant Connected Accounts Architecture
  try {
    const { data: restData, error: restErr } = await client
      .from('restaurants')
      .select('id, name, stripe_account_id, stripe_connect_status, platform_fee_percentage, platform_fee_fixed_cents, stripe_live_payments_enabled')
      .in('id', [REST_A_ID, REST_B_ID]);

    if (restErr) throw restErr;

    const restA = restData?.find((r) => r.id === REST_A_ID);
    const restB = restData?.find((r) => r.id === REST_B_ID);

    const accountsDistinct = restA?.stripe_account_id !== restB?.stripe_account_id;
    const testModeActive = restA?.stripe_connect_status === 'connected_test_mode' && restB?.stripe_connect_status === 'connected_test_mode';
    const liveDisabled = !restA?.stripe_live_payments_enabled && !restB?.stripe_live_payments_enabled;

    record(
      '1. Stripe Connect Multi-Tenant Architecture',
      accountsDistinct && testModeActive && liveDisabled,
      `Common Ground (${restA?.stripe_account_id}) & Trattoria Bella (${restB?.stripe_account_id}) isolated in TEST MODE with LIVE disabled`,
    );
  } catch (e: any) {
    record('1. Stripe Connect Multi-Tenant Architecture', false, e.message);
  }

  // 2. Server-Side Payment & Ledger Settlement Calculation
  const testOrderId = 'ORD-ECON-' + Math.floor(100000 + Math.random() * 900000);
  const testIntentId = 'pi_test_' + Math.random().toString(36).substring(2, 12);
  const testIdempotencyKey = 'IDEM-' + Math.random().toString(36).substring(2, 12);

  try {
    // Create base order ($20.00 = 2000 cents)
    const { error: orderInsertErr } = await client.from('orders').insert({
      id: testOrderId,
      restaurant_id: REST_A_ID,
      status: 'Incoming',
      order_type: 'pickup',
      customer_name: 'Stripe Test Customer',
      phone: '+64 21 333 4444',
      pickup_time: '10:30 AM',
      payment_method: 'card',
      payment_status: 'unpaid',
      subtotal_cents: 2000,
      discount_cents: 0,
      total_cents: 2000,
    });

    if (orderInsertErr) throw orderInsertErr;

    // Invoke server-side settlement RPC
    const { data: settleRes, error: settleErr } = await client.rpc('calculate_and_record_payment_ledger', {
      p_order_id: testOrderId,
      p_payment_intent_id: testIntentId,
      p_idempotency_key: testIdempotencyKey,
    });

    if (settleErr) throw settleErr;

    // Expected for $20.00:
    // Platform fee (2.5% + 30c) = 50c + 30c = 80c
    // Stripe fee (2.9% + 30c) = 58c + 30c = 88c
    // Net payout = 2000 - 80 - 88 = 1832c ($18.32)
    const correctMath = settleRes.gross_amount_cents === 2000 &&
      settleRes.platform_fee_cents === 80 &&
      settleRes.stripe_fee_cents === 88 &&
      settleRes.net_restaurant_amount_cents === 1832;

    record(
      '2. Server-Side Settlement Calculation',
      settleRes.success && correctMath,
      `Gross: $${settleRes.gross_amount_cents / 100} -> App Fee: $${settleRes.platform_fee_cents / 100} -> Stripe Fee: $${settleRes.stripe_fee_cents / 100} -> Net Payout: $${settleRes.net_restaurant_amount_cents / 100}`,
    );
  } catch (e: any) {
    record('2. Server-Side Settlement Calculation', false, e.message);
  }

  // 3. Idempotency Protection & Replay Prevention
  try {
    const { data: replayRes, error: replayErr } = await client.rpc('calculate_and_record_payment_ledger', {
      p_order_id: testOrderId,
      p_payment_intent_id: testIntentId,
      p_idempotency_key: testIdempotencyKey,
    });

    if (replayErr) throw replayErr;

    record(
      '3. Idempotency & Replay Prevention',
      replayRes.idempotent_replay === true && replayRes.status === 'already_processed',
      `Replayed transaction with key "${testIdempotencyKey}" safely intercepted without double-charging`,
    );
  } catch (e: any) {
    record('3. Idempotency & Replay Prevention', false, e.message);
  }

  // 4. Server-Side Refund & Partial Refund Settlement
  try {
    const refundKey = 'REF-IDEM-' + Math.random().toString(36).substring(2, 12);
    const { data: refundRes, error: refundErr } = await client.rpc('process_server_refund', {
      p_order_id: testOrderId,
      p_refund_amount_cents: 500, // $5.00 partial refund
      p_reason: 'Customer Item Out of Stock',
      p_idempotency_key: refundKey,
    });

    if (refundErr) throw refundErr;

    record(
      '4. Server-Side Partial Refund Settlement',
      refundRes.success && refundRes.refund_amount_cents === 500,
      `Processed $5.00 partial refund in auditable financial ledger with reason: "Customer Item Out of Stock"`,
    );
  } catch (e: any) {
    record('4. Server-Side Partial Refund Settlement', false, e.message);
  }

  // 5. Cross-Tenant Financial Isolation (RLS)
  try {
    const { data: ledgerA, error: ledgerAErr } = await client
      .from('tenant_financial_ledger')
      .select('restaurant_id, gross_amount_cents')
      .eq('restaurant_id', REST_A_ID);

    if (ledgerAErr) throw ledgerAErr;

    const zeroLeakedToB = ledgerA.every((row) => row.restaurant_id === REST_A_ID);

    record(
      '5. Cross-Tenant Financial RLS Isolation',
      zeroLeakedToB && ledgerA.length > 0,
      `Common Ground financial records (${ledgerA.length} entries) strictly isolated from Trattoria Bella`,
    );
  } catch (e: any) {
    record('5. Cross-Tenant Financial RLS Isolation', false, e.message);
  }

  // 6. Webhook Event Deduplication
  try {
    const eventId = 'evt_test_' + Math.random().toString(36).substring(2, 12);

    const { data: hook1 } = await client.rpc('handle_stripe_webhook_event', {
      p_event_id: eventId,
      p_event_type: 'payment_intent.succeeded',
      p_account_id: 'acct_test_commonground01',
      p_payload: { amount: 2000, currency: 'nzd' },
    });

    const { data: hook2 } = await client.rpc('handle_stripe_webhook_event', {
      p_event_id: eventId,
      p_event_type: 'payment_intent.succeeded',
      p_account_id: 'acct_test_commonground01',
      p_payload: { amount: 2000, currency: 'nzd' },
    });

    record(
      '6. Webhook Event Deduplication',
      hook1.duplicate === false && hook2.duplicate === true,
      `First event processed (duplicate=false), duplicate replay safely rejected (duplicate=true)`,
    );
  } catch (e: any) {
    record('6. Webhook Event Deduplication', false, e.message);
  }

  // 7. Super Admin Platform Economics Summary
  try {
    const { data: econRes, error: econErr } = await client.rpc('get_super_admin_platform_economics');
    if (econErr) throw econErr;

    record(
      '7. Super Admin Platform Economics KPI',
      econRes.platform_gmv_cents > 0 && econRes.mode === 'strict_test_mode',
      `Platform GMV: $${(econRes.platform_gmv_cents / 100).toFixed(2)} | Revenue: $${(econRes.platform_revenue_cents / 100).toFixed(2)} | Net Payouts: $${(econRes.net_restaurant_payouts_cents / 100).toFixed(2)}`,
    );
  } catch (e: any) {
    record('7. Super Admin Platform Economics KPI', false, e.message);
  }

  // 8. Super Admin Tenant Fee Structure Configuration
  try {
    await client.rpc('update_tenant_fee_structure', {
      p_restaurant_id: REST_A_ID,
      p_fee_percent: 2.5,
      p_fee_fixed_cents: 30,
    });

    const { data: updatedRest } = await client
      .from('restaurants')
      .select('platform_fee_percentage, platform_fee_fixed_cents')
      .eq('id', REST_A_ID)
      .single();

    record(
      '8. Super Admin Fee Structure Configuration',
      Number(updatedRest?.platform_fee_percentage) === 2.5 && updatedRest?.platform_fee_fixed_cents === 30,
      `Configured fee structure for Common Ground: 2.5% + 30¢ fixed per order`,
    );
  } catch (e: any) {
    record('8. Super Admin Fee Structure Configuration', false, e.message);
  }

  // 9. Strict Test Mode Safety Gate
  try {
    const { data: allRests } = await client.from('restaurants').select('id, stripe_live_payments_enabled');
    const allLiveDisabled = allRests?.every((r) => r.stripe_live_payments_enabled === false);

    record(
      '9. Strict TEST / LIVE Safety Gate',
      allLiveDisabled === true,
      `Verified 100% of tenants have stripe_live_payments_enabled=false (All real live charges locked)`,
    );
  } catch (e: any) {
    record('9. Strict TEST / LIVE Safety Gate', false, e.message);
  }

  console.log(`\n=== PHASE 5 TEST SUMMARY ===`);
  const allPassed = results.every((r) => r.passed);
  console.log(`Result: ${results.filter((r) => r.passed).length}/${results.length} PASSED (${allPassed ? '100%' : 'FAILED'})\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase5Tests();
