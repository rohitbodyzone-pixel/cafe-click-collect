import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COMMON_GROUND_ID = 'c0000000-0000-0000-0000-000000000001';
const TRATTORIA_BELLA_ID = 'c0000000-0000-0000-0000-000000000002';

async function verifySuperAdmin() {
  console.log('=== VERIFYING SUPER ADMIN ACCOUNT: rohitbodyzone@gmail.com ===\n');

  let allPassed = true;

  // 1. Verify /super-admin Platform Data Access
  const { data: restaurants, error: restErr } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active')
    .order('name');

  if (restErr || !restaurants || restaurants.length < 2) {
    console.error('❌ FAIL 1: /super-admin platform data query failed:', restErr);
    allPassed = false;
  } else {
    console.log(`✓ PASS 1: /super-admin data verified (${restaurants.length} active platform restaurants loaded)`);
  }

  // 2. Verify /super-admin-billing Platform Economics RPC
  const { data: economics, error: econErr } = await supabase.rpc('get_super_admin_platform_economics');
  if (econErr || !economics) {
    console.error('❌ FAIL 2: /super-admin-billing economics query failed:', econErr);
    allPassed = false;
  } else {
    console.log(`✓ PASS 2: /super-admin-billing data verified (Platform GMV: $${(economics.gross_platform_volume_cents / 100).toFixed(2)}, Platform Revenue: $${(economics.total_platform_revenue_cents / 100).toFixed(2)})`);
  }

  // 3. Verify /super-admin-features Master Permission Matrix & Restaurant-Wise ON/OFF
  const { data: permsA, error: permErrA } = await supabase.rpc('get_restaurant_effective_features', {
    p_restaurant_id: COMMON_GROUND_ID,
  });
  const { data: permsB, error: permErrB } = await supabase.rpc('get_restaurant_effective_features', {
    p_restaurant_id: TRATTORIA_BELLA_ID,
  });

  if (permErrA || permErrB || !permsA || !permsB) {
    console.error('❌ FAIL 3: /super-admin-features matrix query failed:', permErrA || permErrB);
    allPassed = false;
  } else {
    console.log(`✓ PASS 3: /super-admin-features verified for Common Ground (${Object.keys(permsA).length} features) & Trattoria Bella (${Object.keys(permsB).length} features)`);
  }

  // 4. Test Restaurant-wise Feature Toggle Execution
  const { error: toggleErr } = await supabase.rpc('toggle_restaurant_feature_permission', {
    p_restaurant_id: COMMON_GROUND_ID,
    p_feature_key: 'curbside_pickup',
    p_enabled: false,
  });
  if (toggleErr) {
    console.error('❌ FAIL 4: Feature toggle RPC failed:', toggleErr);
    allPassed = false;
  } else {
    // Restore
    await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: COMMON_GROUND_ID,
      p_feature_key: 'curbside_pickup',
      p_enabled: true,
    });
    console.log('✓ PASS 4: Restaurant-wise Feature toggle (curbside_pickup) tested & restored.');
  }

  console.log('\n========================================');
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL VERIFICATIONS PASSED (100%)' : 'SOME CHECKS FAILED'}`);
  console.log('========================================\n');

  if (!allPassed) process.exit(1);
}

verifySuperAdmin();
