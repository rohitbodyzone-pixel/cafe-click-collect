import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COMMON_GROUND_ID = 'c0000000-0000-0000-0000-000000000001';
const TRATTORIA_BELLA_ID = 'c0000000-0000-0000-0000-000000000002';

async function runTests() {
  console.log('=== MULTI-RESTAURANT MARKETPLACE & FEATURE MANAGER INTEGRATION TESTS ===\n');

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

  // 1. Test Feature Permission Matrix Seeding
  await test('Verify feature permissions exist for Common Ground & Trattoria Bella', async () => {
    const { data, error } = await supabase
      .from('restaurant_feature_permissions')
      .select('*')
      .in('restaurant_id', [COMMON_GROUND_ID, TRATTORIA_BELLA_ID]);

    if (error) throw error;
    if (!data || data.length < 20) throw new Error(`Expected at least 20 feature records, got ${data?.length}`);
  });

  // 2. Test Super Admin Toggles Single Feature (table_ordering OFF for A, ON for B)
  await test('Super Admin turns table_ordering OFF for Restaurant A while Restaurant B remains unaffected', async () => {
    // Set table_ordering OFF for Common Ground
    const { error: errA } = await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: COMMON_GROUND_ID,
      p_feature_key: 'table_ordering',
      p_enabled: false,
    });
    if (errA) throw errA;

    // Verify Common Ground has false
    const { data: dataA, error: fetchErrA } = await supabase
      .from('restaurant_feature_permissions')
      .select('is_enabled')
      .eq('restaurant_id', COMMON_GROUND_ID)
      .eq('feature_key', 'table_ordering')
      .single();

    if (fetchErrA) throw fetchErrA;
    if (dataA?.is_enabled !== false) throw new Error('Common Ground table_ordering should be false');

    // Verify Trattoria Bella still has true
    const { data: dataB, error: fetchErrB } = await supabase
      .from('restaurant_feature_permissions')
      .select('is_enabled')
      .eq('restaurant_id', TRATTORIA_BELLA_ID)
      .eq('feature_key', 'table_ordering')
      .single();

    if (fetchErrB) throw fetchErrB;
    if (dataB?.is_enabled !== true) throw new Error('Trattoria Bella table_ordering should remain true');

    // Restore table_ordering to true for Common Ground
    await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: COMMON_GROUND_ID,
      p_feature_key: 'table_ordering',
      p_enabled: true,
    });
  });

  // 3. Test Bulk Category Toggle
  await test('Super Admin bulk toggles marketing features for a tenant', async () => {
    const { error } = await supabase.rpc('bulk_toggle_restaurant_features', {
      p_restaurant_id: COMMON_GROUND_ID,
      p_category: 'marketing',
      p_enabled: false,
    });
    if (error) throw error;

    const { data } = await supabase
      .from('restaurant_feature_permissions')
      .select('is_enabled')
      .eq('restaurant_id', COMMON_GROUND_ID)
      .eq('category', 'marketing');

    if (!data || data.some((d) => d.is_enabled !== false)) {
      throw new Error('All marketing features should be disabled');
    }

    // Restore marketing category to true
    await supabase.rpc('bulk_toggle_restaurant_features', {
      p_restaurant_id: COMMON_GROUND_ID,
      p_category: 'marketing',
      p_enabled: true,
    });
  });

  // 4. Test RPC get_restaurant_effective_features
  await test('Verify get_restaurant_effective_features RPC returns json map', async () => {
    const { data, error } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: COMMON_GROUND_ID,
    });
    const isEffective = typeof data.click_and_collect === 'object' ? data.click_and_collect.effective : data.click_and_collect;
    if (isEffective !== true) throw new Error('Expected click_and_collect to be effective: true');
  });

  // 5. Test Rush / Busy Mode Controls (Order Pause + Wait Time Booster)
  await test('Test set_restaurant_rush_mode dual controls', async () => {
    const testMsg = 'High in-store volume, +15m prep time.';
    const { error } = await supabase.rpc('set_restaurant_rush_mode', {
      p_restaurant_id: COMMON_GROUND_ID,
      p_orders_paused: true,
      p_extra_minutes: 15,
      p_message: testMsg,
    });
    if (error) throw error;

    const { data, error: restErr } = await supabase
      .from('restaurants')
      .select('is_orders_paused, rush_wait_extra_minutes, rush_customer_message')
      .eq('id', COMMON_GROUND_ID)
      .single();

    if (restErr) throw restErr;
    if (data?.is_orders_paused !== true || data?.rush_wait_extra_minutes !== 15 || data?.rush_customer_message !== testMsg) {
      throw new Error('Rush mode values did not match expected state');
    }

    // Reset rush mode to normal
    await supabase.rpc('set_restaurant_rush_mode', {
      p_restaurant_id: COMMON_GROUND_ID,
      p_orders_paused: false,
      p_extra_minutes: 0,
      p_message: null,
    });
  });

  // 6. Test Station Routing on Products
  await test('Verify products have kitchen_station assigned', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('name, kitchen_station')
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No products found');
    const validStations = ['barista', 'kitchen', 'bakery', 'dessert'];
    for (const p of data) {
      if (!validStations.includes(p.kitchen_station)) {
        throw new Error(`Invalid station ${p.kitchen_station} for product ${p.name}`);
      }
    }
  });

  // 7. Test Menu Draft Snapshot RPC
  await test('Test publish_menu_draft snapshot creation & versioning', async () => {
    const mockSnapshot = [{ id: 'mock-1', name: 'Draft Mocha', price: 6.5 }];
    const { data, error } = await supabase.rpc('publish_menu_draft', {
      p_restaurant_id: COMMON_GROUND_ID,
      p_snapshot: mockSnapshot,
      p_published_by: 'Test Runner',
    });

    if (error) throw error;
    if (!data?.draft_id || !data?.version_number) {
      throw new Error('Draft snapshot RPC did not return draft_id or version_number');
    }
  });

  // 8. Test Reopen Order in KDS RPC
  await test('Test reopen_order_in_kds reverts order status to Preparing', async () => {
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (orders && orders.length > 0) {
      const orderId = orders[0].id;
      const { data, error } = await supabase.rpc('reopen_order_in_kds', {
        p_order_id: orderId,
      });
      if (error) throw error;
      if (data?.status !== 'Preparing') throw new Error('Status should be Preparing');
    }
  });

  console.log(`\n========================================`);
  console.log(`Marketplace Feature Suite: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed !== total) process.exit(1);
}

runTests();
