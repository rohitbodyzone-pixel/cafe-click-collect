import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const client = createClient(supabaseUrl, supabaseKey);

const REST_A_ID = 'c0000000-0000-0000-0000-000000000001'; // Common Ground
const REST_B_ID = 'c0000000-0000-0000-0000-000000000002'; // Trattoria Bella
const TEST_CUST_KEY = 'test_cust_phase1_' + Date.now();

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

async function runPhase1Tests() {
  console.log(`\n=== RUNNING PHASE 1 CUSTOMER & LOYALTY INTEGRATION TESTS ===\n`);

  // 1. Test "My Usual / One-Tap Reorder"
  try {
    const usualItems = [
      {
        cartKey: 'usual-1',
        product: { id: 'flat-white', name: 'Flat White', price: 5.5 },
        quantity: 1,
        unitPrice: 5.5,
        customisations: [{ groupId: 'milk', optionId: 'oat', groupName: 'Milk', optionName: 'Oat Milk', price: 0.8 }],
      },
    ];

    const { error: saveError } = await client.rpc('save_customer_usual', {
      p_restaurant_id: REST_A_ID,
      p_customer_key: TEST_CUST_KEY,
      p_name: 'Daily Morning Flat White',
      p_items: usualItems,
      p_order_type: 'pickup',
      p_notes: 'Extra hot please',
    });

    if (saveError) throw saveError;

    const { data: usualData, error: readError } = await client
      .from('customer_usuals')
      .select('*')
      .eq('restaurant_id', REST_A_ID)
      .eq('customer_key', TEST_CUST_KEY)
      .single();

    if (readError || !usualData) throw readError || new Error('No usual data returned');
    record('1. My Usual / One-Tap Reorder', true, `Saved & read usual "${usualData.name}" with 1 item`);
  } catch (e: any) {
    record('1. My Usual / One-Tap Reorder', false, e.message);
  }

  // 2. Test Smart Add-ons & Upsell Rules
  try {
    const { data: upsells, error } = await client
      .from('smart_upsell_rules')
      .select('*')
      .eq('restaurant_id', REST_A_ID)
      .eq('active', true);

    if (error) throw error;
    if (!upsells || upsells.length === 0) throw new Error('No upsell rules found for Restaurant A');
    record(
      '2. Smart Add-on & Combo Suggestions',
      true,
      `Found ${upsells.length} active rule: "${upsells[0].title}" (${upsells[0].discount_percent}% off)`,
    );
  } catch (e: any) {
    record('2. Smart Add-on & Combo Suggestions', false, e.message);
  }

  // 3. Test Review Shield Customer Recovery (Low Rating Intercept)
  try {
    const { data: lowReview, error: lowErr } = await client.rpc('submit_review_shield_feedback', {
      p_restaurant_id: REST_A_ID,
      p_order_id: null,
      p_customer_key: TEST_CUST_KEY,
      p_rating: 2,
      p_feedback: 'Coffee was lukewarm today',
    });

    if (lowErr) throw lowErr;
    if (!lowReview || lowReview.status !== 'recovered' || !lowReview.recovery_code) {
      throw new Error(`Expected recovery voucher but received: ${JSON.stringify(lowReview)}`);
    }

    // Verify recovery code was added to promo_codes
    const { data: promoData } = await client
      .from('promo_codes')
      .select('*')
      .eq('restaurant_id', REST_A_ID)
      .eq('code', lowReview.recovery_code)
      .single();

    record(
      '3. Review Shield & Customer Recovery (Low Rating)',
      !!promoData,
      `Intercepted 2-star feedback and issued recovery voucher "${lowReview.recovery_code}" (20% off)`,
    );
  } catch (e: any) {
    record('3. Review Shield & Customer Recovery (Low Rating)', false, e.message);
  }

  // 4. Test Review Shield (High Rating Prompt)
  try {
    const { data: highReview, error: highErr } = await client.rpc('submit_review_shield_feedback', {
      p_restaurant_id: REST_A_ID,
      p_order_id: null,
      p_customer_key: TEST_CUST_KEY,
      p_rating: 5,
      p_feedback: 'Best flat white in town!',
    });

    if (highErr) throw highErr;
    record(
      '4. Review Shield (5-Star Public Review Prompt)',
      highReview?.status === 'public_prompted' && highReview?.prompt_public_review === true,
      `Prompted public review for 5-star customer experience`,
    );
  } catch (e: any) {
    record('4. Review Shield (5-Star Public Review Prompt)', false, e.message);
  }

  // 5. Test Prepaid Coffee & Meal Passes
  try {
    const { data: templates, error: tempErr } = await client
      .from('prepaid_pass_templates')
      .select('*')
      .eq('restaurant_id', REST_A_ID)
      .eq('active', true);

    if (tempErr) throw tempErr;
    if (!templates || templates.length === 0) throw new Error('No pass templates found');

    const template = templates[0];
    const totalCredits = template.total_units + template.bonus_units;

    const { data: custPass, error: passErr } = await client
      .from('customer_prepaid_passes')
      .insert({
        restaurant_id: REST_A_ID,
        customer_key: TEST_CUST_KEY,
        template_id: template.id,
        pass_name: template.name,
        units_total: totalCredits,
        units_remaining: totalCredits,
        status: 'active',
      })
      .select()
      .single();

    if (passErr) throw passErr;
    record(
      '5. Prepaid Coffee Pass Activation',
      !!custPass && custPass.units_remaining === totalCredits,
      `Activated "${template.name}" with ${totalCredits} total credits`,
    );
  } catch (e: any) {
    record('5. Prepaid Coffee Pass Activation', false, e.message);
  }

  // 6. Test Customer VIP Tier & Streaks
  try {
    const { error: loyaltyErr } = await client.from('customer_loyalty').upsert({
      restaurant_id: REST_A_ID,
      customer_key: TEST_CUST_KEY,
      coffee_stamps: 8,
      points: 250,
      free_coffees: 1,
      vip_tier: 'gold',
      lifetime_spend_cents: 14500,
      total_orders: 18,
      current_streak_days: 5,
      longest_streak_days: 7,
      streak_bonus_unlocked: true,
    });

    if (loyaltyErr) throw loyaltyErr;

    const { data: vipData, error: readVipErr } = await client
      .from('customer_loyalty')
      .select('*')
      .eq('restaurant_id', REST_A_ID)
      .eq('customer_key', TEST_CUST_KEY)
      .single();

    if (readVipErr || !vipData) throw readVipErr || new Error('No VIP data returned');
    record(
      '6. VIP Regular Customer Mode & Streaks',
      vipData.vip_tier === 'gold' && vipData.current_streak_days === 5,
      `Tier: ${vipData.vip_tier.toUpperCase()} VIP, Lifetime: $${(vipData.lifetime_spend_cents / 100).toFixed(2)}, Streak: ${vipData.current_streak_days} days`,
    );
  } catch (e: any) {
    record('6. VIP Regular Customer Mode & Streaks', false, e.message);
  }

  // 7. Test Customer Arrival Alert Notification
  try {
    // Create temporary test order
    const orderId = 'ORD-PH1-' + Math.floor(1000 + Math.random() * 9000);
    const { error: ordErr } = await client.from('orders').insert({
      id: orderId,
      restaurant_id: REST_A_ID,
      customer_key: TEST_CUST_KEY,
      order_type: 'pickup',
      pickup_time: '14:30',
      customer_name: 'Phase 1 Tester',
      phone: '0211234567',
      subtotal_cents: 550,
      discount_cents: 0,
      free_coffee_discount_cents: 0,
      points_earned: 5,
      points_redeemed: 0,
      total_cents: 550,
      status: 'Preparing',
      payment_method: 'pay_at_counter',
      payment_status: 'unpaid',
      amount_paid_cents: 0,
    });

    if (ordErr) throw ordErr;

    // Trigger arrival notification
    const { error: arrErr } = await client.rpc('notify_customer_arrival', {
      p_order_id: orderId,
      p_arrival_note: 'Parked in Bay 3 outside',
    });

    if (arrErr) throw arrErr;

    const { data: updatedOrder } = await client
      .from('orders')
      .select('customer_arrived_at, arrival_note')
      .eq('id', orderId)
      .single();

    record(
      '7. Customer Arrival / Curbside Alert',
      !!updatedOrder?.customer_arrived_at && updatedOrder.arrival_note === 'Parked in Bay 3 outside',
      `Arrival recorded at ${updatedOrder?.customer_arrived_at}`,
    );

    // 8. Test Live Queue Position Calculation
    const { data: queueData, error: qErr } = await client.rpc('get_live_queue_position', {
      p_order_id: orderId,
    });

    if (qErr) throw qErr;
    record(
      '8. Live Queue Position & Smart Timing',
      queueData?.found === true && typeof queueData.queue_position === 'number',
      `Calculated Queue #${queueData?.queue_position}, Orders Ahead: ${queueData?.orders_ahead}, Estimated Prep: ${queueData?.estimated_prep_minutes} mins`,
    );
  } catch (e: any) {
    record('7 & 8. Customer Arrival & Live Queue', false, e.message);
  }

  // Cleanup test customer data
  await client.from('customer_usuals').delete().eq('customer_key', TEST_CUST_KEY);
  await client.from('customer_prepaid_passes').delete().eq('customer_key', TEST_CUST_KEY);
  await client.from('customer_loyalty').delete().eq('customer_key', TEST_CUST_KEY);

  console.log(`\n=== PHASE 1 TEST SUMMARY ===`);
  const allPassed = results.every((r) => r.passed);
  console.log(`Result: ${results.filter((r) => r.passed).length}/${results.length} PASSED (${allPassed ? '100%' : 'FAILED'})\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase1Tests();
