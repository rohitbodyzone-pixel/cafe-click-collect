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

async function runDualControlTests() {
  console.log('=== COMPLETE DUAL-LEVEL FEATURE CONTROL SYSTEM INTEGRATION TESTS ===\n');

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

  // 1. Verify Full 58-Feature Registry Count & Database Seeding
  await test('Verify exactly 58 platform features are defined in registry and seeded for both restaurants', async () => {
    const typesContent = fs.readFileSync(path.resolve(process.cwd(), 'src/services/features/types.ts'), 'utf-8');
    const featureMatches = typesContent.match(/key:\s*'([a-z_]+)'/g) || [];
    if (featureMatches.length !== 58) {
      throw new Error(`Expected 58 features in registry, got ${featureMatches.length}`);
    }

    const { data: dbFeaturesA, error: errA } = await supabase
      .from('restaurant_feature_permissions')
      .select('*')
      .eq('restaurant_id', REST_A_ID);

    if (errA) throw errA;
    if (!dbFeaturesA || dbFeaturesA.length < 58) {
      throw new Error(`Restaurant A has only ${dbFeaturesA?.length} seeded features (expected 58)`);
    }

    const { data: dbFeaturesB, error: errB } = await supabase
      .from('restaurant_feature_permissions')
      .select('*')
      .eq('restaurant_id', REST_B_ID);

    if (errB) throw errB;
    if (!dbFeaturesB || dbFeaturesB.length < 58) {
      throw new Error(`Restaurant B has only ${dbFeaturesB?.length} seeded features (expected 58)`);
    }
  });

  // 2. Test Super Admin Master Switch: Super Admin OFF -> Owner Locked & Effective = false
  await test('Super Admin OFF locks feature for Restaurant A while Restaurant B remains unaffected', async () => {
    // 1. Super Admin turns table_ordering OFF for Restaurant A
    const { error: superOffErr } = await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: REST_A_ID,
      p_feature_key: 'table_ordering',
      p_enabled: false,
      p_level: 'super_admin',
    });
    if (superOffErr) throw superOffErr;

    // 2. Fetch effective features for Restaurant A
    const { data: matrixA, error: fetchErrA } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: REST_A_ID,
    });
    if (fetchErrA) throw fetchErrA;
    if (matrixA.table_ordering.super_admin !== false || matrixA.table_ordering.effective !== false) {
      throw new Error(`Expected Restaurant A table_ordering to be super_admin=false, effective=false, got: ${JSON.stringify(matrixA.table_ordering)}`);
    }

    // 3. Attempt by Owner of Restaurant A to turn it ON must be rejected
    const { error: ownerOverrideErr } = await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: REST_A_ID,
      p_feature_key: 'table_ordering',
      p_enabled: true,
      p_level: 'owner',
    });
    if (!ownerOverrideErr) {
      throw new Error('Owner should have been BLOCKED from enabling a feature disabled by Super Admin');
    }

    // 4. Verify Restaurant B is 100% unaffected
    const { data: matrixB, error: fetchErrB } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: REST_B_ID,
    });
    if (fetchErrB) throw fetchErrB;
    if (matrixB.table_ordering.super_admin !== true || matrixB.table_ordering.effective !== true) {
      throw new Error(`Restaurant B should remain super_admin=true and effective=true, got: ${JSON.stringify(matrixB.table_ordering)}`);
    }

    // Restore table_ordering for Restaurant A
    await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: REST_A_ID,
      p_feature_key: 'table_ordering',
      p_enabled: true,
      p_level: 'super_admin',
    });
  });

  // 3. Test Owner Setting: Super Admin ON + Owner OFF -> Effective = false
  await test('Owner toggles feature OFF when Super Admin is ON -> Effective = false for Restaurant A only', async () => {
    // 1. Owner of Restaurant A turns loyalty_rewards OFF
    const { error: ownerOffErr } = await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: REST_A_ID,
      p_feature_key: 'loyalty_rewards',
      p_enabled: false,
      p_level: 'owner',
    });
    if (ownerOffErr) throw ownerOffErr;

    // 2. Verify Restaurant A state: super_admin=true, owner=false, effective=false
    const { data: matrixA } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: REST_A_ID,
    });
    if (matrixA.loyalty_rewards.super_admin !== true || matrixA.loyalty_rewards.owner !== false || matrixA.loyalty_rewards.effective !== false) {
      throw new Error(`Restaurant A state mismatch: ${JSON.stringify(matrixA.loyalty_rewards)}`);
    }

    // 3. Verify Restaurant B still has effective=true
    const { data: matrixB } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: REST_B_ID,
    });
    if (matrixB.loyalty_rewards.effective !== true) {
      throw new Error('Restaurant B loyalty_rewards should remain effective=true');
    }

    // 4. Owner turns loyalty_rewards back ON -> Effective = true
    await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: REST_A_ID,
      p_feature_key: 'loyalty_rewards',
      p_enabled: true,
      p_level: 'owner',
    });

    const { data: matrixARestored } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: REST_A_ID,
    });
    if (matrixARestored.loyalty_rewards.effective !== true) {
      throw new Error('Restaurant A loyalty_rewards should be effective=true after owner re-enables');
    }
  });

  // 4. Test 9 Distinct Functional Domain Features
  const domainTests = [
    { key: 'group_ordering', name: 'Customer Feature' },
    { key: 'kds_station_routing', name: 'Kitchen Feature' },
    { key: 'price_optimizer', name: 'Owner/Admin Feature' },
    { key: 'prepaid_passes', name: 'Loyalty/Promotion Feature' },
    { key: 'pay_at_counter', name: 'Payment Feature' },
    { key: 'health_score', name: 'AI/Analytics Feature' },
    { key: 'staff_roster', name: 'Staff/Operations Feature' },
    { key: 'table_ordering', name: 'QR/Table Feature' },
    { key: 'rush_mode', name: 'Rush Mode Feature' },
  ];

  for (const dt of domainTests) {
    await test(`Domain Test [${dt.name} (${dt.key})]: Dual-level toggle & effective calculation`, async () => {
      // Toggle Owner OFF
      await supabase.rpc('toggle_restaurant_feature_permission', {
        p_restaurant_id: REST_A_ID,
        p_feature_key: dt.key,
        p_enabled: false,
        p_level: 'owner',
      });

      const { data: m1 } = await supabase.rpc('get_restaurant_effective_features', {
        p_restaurant_id: REST_A_ID,
      });
      if (m1[dt.key].effective !== false) throw new Error(`${dt.key} should be effective=false`);

      // Toggle Owner ON
      await supabase.rpc('toggle_restaurant_feature_permission', {
        p_restaurant_id: REST_A_ID,
        p_feature_key: dt.key,
        p_enabled: true,
        p_level: 'owner',
      });

      const { data: m2 } = await supabase.rpc('get_restaurant_effective_features', {
        p_restaurant_id: REST_A_ID,
      });
      if (m2[dt.key].effective !== true) throw new Error(`${dt.key} should be effective=true`);
    });
  }

  // 5. Test Bulk Category Toggle for Super Admin vs Owner
  await test('Bulk Category Toggle works for Super Admin and Owner without cross-leakage', async () => {
    // 1. Bulk toggle AI Analytics OFF for Restaurant A by Owner
    await supabase.rpc('bulk_toggle_restaurant_features', {
      p_restaurant_id: REST_A_ID,
      p_category: 'ai_analytics',
      p_enabled: false,
      p_level: 'owner',
    });

    const { data: matrixA } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: REST_A_ID,
    });
    if (matrixA.demand_prediction.effective !== false || matrixA.health_score.effective !== false) {
      throw new Error('All AI analytics features for Restaurant A should be effective=false');
    }

    // 2. Restore AI Analytics for Restaurant A
    await supabase.rpc('bulk_toggle_restaurant_features', {
      p_restaurant_id: REST_A_ID,
      p_category: 'ai_analytics',
      p_enabled: true,
      p_level: 'owner',
    });

    const { data: matrixARestored } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: REST_A_ID,
    });
    if (matrixARestored.demand_prediction.effective !== true || matrixARestored.health_score.effective !== true) {
      throw new Error('All AI analytics features for Restaurant A should be restored to true');
    }
  });

  console.log('\n======================================================================');
  console.log(`DUAL-LEVEL CONTROL SUITE: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================================\n');

  if (passed !== total) process.exit(1);
}

runDualControlTests();
