import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REST_A_ID = 'c0000000-0000-0000-0000-000000000001'; // Common Ground
const REST_B_ID = 'c0000000-0000-0000-0000-000000000002'; // Trattoria Bella

async function runCounterCustomizationTests() {
  console.log('=== COUNTER POS CUSTOMIZATIONS & KITCHEN INTEGRATION TEST SUITE ===\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`[FAIL] Test ${total}: ${name}`);
      console.error(`       Error: ${e.message || e}`);
    }
  }

  // 1. Fetch Modifiers for Restaurant A & B
  await test('1. Multi-Restaurant Modifier Setup & Isolation', async () => {
    const { data: groupsA, error: errA } = await supabase
      .from('customisation_groups')
      .select('id, name, kind, customisation_options(id, name, price_adjustment_cents, available)')
      .eq('restaurant_id', REST_A_ID);

    if (errA || !groupsA || groupsA.length === 0) {
      throw new Error('Failed to load modifiers for Restaurant A');
    }

    const { data: groupsB, error: errB } = await supabase
      .from('customisation_groups')
      .select('id, name, kind, customisation_options(id, name, price_adjustment_cents, available)')
      .eq('restaurant_id', REST_B_ID);

    if (errB) throw errB;

    // Verify isolation
    const idsA = groupsA.map((g) => g.id);
    const idsB = (groupsB || []).map((g) => g.id);
    const overlap = idsA.filter((id) => idsB.includes(id));
    if (overlap.length > 0) {
      throw new Error(`Modifier group ID overlap detected between restaurants: ${overlap.join(', ')}`);
    }
  });

  // 2. Coffee with Size + Milk + Sugar + Extra Shot via place_counter_order RPC
  await test('2. Counter Coffee Order with Size + Milk + Sugar + Extra Shot (RPC)', async () => {
    const orderId = `ORD-POS-COFFEE-${Date.now()}`;
    const basePrice = 5.5;
    const customisations = [
      { groupId: 'size-cg', groupName: 'Cup size', optionId: 'opt-large', optionName: 'Large', price: 1.0 },
      { groupId: 'milk-cg', groupName: 'Milk type', optionId: 'opt-oat', optionName: 'Oat Milk', price: 1.0 },
      { groupId: 'sugar-qty-cg', groupName: 'Sugar quantity', optionId: 'opt-1sug', optionName: '1 Sugar', price: 0 },
      { groupId: 'extras-cg', groupName: 'Extras', optionId: 'opt-shot', optionName: 'Extra Shot', price: 0.5 },
    ];
    const unitPrice = basePrice + customisations.reduce((s, c) => s + c.price, 0); // $8.00
    const totalCents = Math.round(unitPrice * 100);

    const modSummary = customisations.map((c) => `${c.groupName}: ${c.optionName}`).join(' · ');
    const items = [
      {
        product_id: 'prod-flat-white',
        product_name: 'Single Origin Flat White',
        quantity: 1,
        unit_price_cents: totalCents,
        notes: `Extra hot | ${modSummary}`,
        selected_customisations: customisations,
      },
    ];

    const { data, error: rpcErr } = await supabase.rpc('place_counter_order', {
      p_order_id: orderId,
      p_restaurant_id: REST_A_ID,
      p_customer_name: 'Counter John',
      p_payment_method: 'pay_at_counter',
      p_total_cents: totalCents,
      p_staff_id: null,
      p_staff_name: 'Marcus Barista',
      p_items: items,
    });

    if (rpcErr) throw rpcErr;
    if (data?.status !== 'success' || !data?.pickup_code) {
      throw new Error(`place_counter_order RPC failed: ${JSON.stringify(data)}`);
    }

    // Verify saved order item in Supabase
    const { data: savedItems, error: fetchErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (fetchErr || !savedItems || savedItems.length === 0) {
      throw new Error('Could not retrieve saved order items');
    }

    const saved = savedItems[0];
    if (!Array.isArray(saved.selected_customisations) || saved.selected_customisations.length !== 4) {
      throw new Error(`Expected 4 saved customisations, found: ${JSON.stringify(saved.selected_customisations)}`);
    }
  });

  // 3. Food item with required + optional modifiers & Notes
  await test('3. Food Item Customization with Cooking Preference + Add-on + Allergies', async () => {
    const orderId = `ORD-POS-FOOD-${Date.now()}`;
    const basePrice = 18.0;
    const foodCustomisations = [
      { groupId: 'cook-cg', groupName: 'Cooking Preference', optionId: 'opt-med', optionName: 'Medium Rare', price: 0 },
      { groupId: 'extras-food-cg', groupName: 'Add-ons', optionId: 'opt-cheese', optionName: 'Aged Cheddar', price: 2.5 },
      { groupId: 'extras-food-cg', groupName: 'Add-ons', optionId: 'opt-bacon', optionName: 'Crispy Bacon', price: 3.0 },
    ];
    const unitPrice = basePrice + foodCustomisations.reduce((s, c) => s + c.price, 0); // $23.50
    const totalCents = Math.round(unitPrice * 100);

    const items = [
      {
        product_id: 'prod-wagyu-burger',
        product_name: 'Artisan Wagyu Burger',
        quantity: 1,
        unit_price_cents: totalCents,
        notes: 'ALLERGY: Gluten Free Bun requested | Cooking Preference: Medium Rare · Add-ons: Aged Cheddar · Add-ons: Crispy Bacon',
        selected_customisations: foodCustomisations,
      },
    ];

    const { data, error: rpcErr } = await supabase.rpc('place_counter_order', {
      p_order_id: orderId,
      p_restaurant_id: REST_A_ID,
      p_customer_name: 'Table 4 Walk-in',
      p_payment_method: 'pay_at_counter',
      p_total_cents: totalCents,
      p_staff_id: null,
      p_staff_name: 'Sarah Cashier',
      p_items: items,
    });

    if (rpcErr) throw rpcErr;
    if (data?.status !== 'success') {
      throw new Error(`place_counter_order failed for food item: ${JSON.stringify(data)}`);
    }
  });

  // 4. Kitchen KDS Verification: Modifiers Display
  await test('4. Kitchen KDS Display: Customisations and Special Instructions', async () => {
    const { data: kitchenOrders, error } = await supabase
      .from('orders')
      .select('id, customer_name, order_items(product_name, quantity, notes, selected_customisations)')
      .eq('restaurant_id', REST_A_ID)
      .eq('status', 'Preparing')
      .order('created_at', { ascending: false })
      .limit(2);

    if (error || !kitchenOrders || kitchenOrders.length === 0) {
      throw new Error('No preparing orders returned for Kitchen KDS');
    }

    const firstOrder = kitchenOrders[0];
    const items = firstOrder.order_items as any[];
    if (!items || items.length === 0 || !items[0].selected_customisations) {
      throw new Error('Kitchen KDS order items missing selected_customisations');
    }
  });

  // 5. Receipt / Docket Output: Includes Modifiers and Staff Attribution
  await test('5. Receipt / Kitchen Docket Output with Modifiers & Staff Attribution', async () => {
    const escposContent = fs.readFileSync(path.resolve(process.cwd(), 'src/services/printer/escpos.ts'), 'utf-8');
    if (!escposContent.includes('generateKitchenDocket') || !escposContent.includes('generateCustomerGSTReceipt')) {
      throw new Error('src/services/printer/escpos.ts missing docket generation functions');
    }
    if (!escposContent.includes('GST / TAX INVOICE') || !escposContent.includes('Served by')) {
      throw new Error('src/services/printer/escpos.ts missing tax invoice or staff attribution lines');
    }
  });

  console.log('\n======================================================================');
  console.log(`COUNTER CUSTOMIZATION SUITE: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================================\n');

  if (passed !== total) process.exit(1);
}

runCounterCustomizationTests();
