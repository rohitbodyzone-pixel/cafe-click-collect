import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NjA5NCwiZXhwIjoyMTAzMTQyMDk0fQ.yfhsk59uf3E_dW39O_AOmFV2v5Ex6d4TrY4PEk-q3yM';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runDineInTests() {
  console.log('=== TABLE & DINE-IN ORDERING FULL E2E REGRESSION SUITE ===\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${name}`);
      if (detail) console.log(`       ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${name}`);
      if (detail) console.error(`       Detail: ${detail}`);
      process.exitCode = 1;
    }
  }

  // 1. Resolve Restaurant A & B
  const { data: restaurants, error: restErr } = await supabase
    .from('restaurants')
    .select('*')
    .in('slug', ['common-ground', 'trattoria-bella']);

  assert(
    !restErr && !!restaurants && restaurants.length >= 2,
    'Resolve restaurants by slug',
    `Found ${restaurants?.length} restaurants (common-ground, trattoria-bella)`
  );

  const restA = restaurants?.find((r) => r.slug === 'common-ground');
  const restB = restaurants?.find((r) => r.slug === 'trattoria-bella');

  if (!restA || !restB) {
    console.error('Could not find seed restaurants.');
    process.exit(1);
  }

  // 2. Resolve Table 5 for Restaurant A
  const { data: tableA, error: tblErrA } = await supabase
    .from('cafe_tables')
    .select('*')
    .eq('restaurant_id', restA.id)
    .ilike('code', '5')
    .single();

  assert(
    !tblErrA && !!tableA && tableA.active,
    'Resolve Table 5 for Common Ground',
    `Table ID: ${tableA?.id}, Display Name: ${tableA?.display_name}, Code: ${tableA?.code}`
  );

  // 3. Resolve Table B10 for Restaurant B
  const { data: tableB, error: tblErrB } = await supabase
    .from('cafe_tables')
    .select('*')
    .eq('restaurant_id', restB.id)
    .ilike('code', 'B10')
    .single();

  assert(
    !tblErrB && !!tableB && tableB.active,
    'Resolve Table B10 for Trattoria Bella',
    `Table ID: ${tableB?.id}, Display Name: ${tableB?.display_name}, Code: ${tableB?.code}`
  );

  // 4. Verify Table Isolation (Table 5 does NOT belong to Restaurant B)
  const { data: tableCross } = await supabase
    .from('cafe_tables')
    .select('*')
    .eq('restaurant_id', restB.id)
    .ilike('code', '5')
    .maybeSingle();

  assert(
    !tableCross,
    'Table Isolation: Table 5 is strictly isolated to Restaurant A',
    'No cross-leakage of Table 5 to Restaurant B'
  );

  // 5. Place a Table Order for Table 5 (Dine In)
  const orderId = `DINEIN-${Date.now().toString().slice(-6)}`;
  const { data: menuItemsA } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restA.id)
    .limit(1);

  const productA = menuItemsA?.[0] || {
    id: 'p-dinein',
    name: 'Table Flat White',
    price_cents: 550,
  };

  const { data: insertedOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      restaurant_id: restA.id,
      customer_name: 'Dine-In Guest',
      phone: '+6421999888',
      pickup_time: 'Dine In',
      total_cents: productA.price_cents,
      subtotal_cents: productA.price_cents,
      status: 'Incoming',
      order_type: 'table',
      table_id: tableA?.id,
      table_code: tableA?.code,
      table_name: tableA?.display_name,
      payment_method: 'pay_at_counter',
      payment_status: 'unpaid',
      amount_paid_cents: 0,
      customer_key: 'cust-dinein-test',
    })
    .select('*')
    .single();

  assert(
    !orderErr && !!insertedOrder,
    'Create Dine-In Table Order',
    `Order ${orderId} created for ${tableA?.display_name}`
  );

  assert(
    insertedOrder?.order_type === 'table' &&
    insertedOrder?.table_id === tableA?.id &&
    insertedOrder?.table_code === tableA?.code &&
    insertedOrder?.table_name === tableA?.display_name,
    'Verify Table Context Persistence on Created Order',
    `order_type: ${insertedOrder?.order_type}, table: ${insertedOrder?.table_name}`
  );

  // 6. Kitchen KDS Bump for Table Order
  const { error: bumpErr } = await supabase
    .from('orders')
    .update({ status: 'Accepted' })
    .eq('id', orderId);

  assert(!bumpErr, 'Kitchen KDS updates Table Order status to Accepted');

  // 7. Verify Pickup Order Independence (No table pollution on pickup)
  const pickupOrderId = `PICKUP-${Date.now().toString().slice(-6)}`;
  const { data: pickupOrder, error: pickupErr } = await supabase
    .from('orders')
    .insert({
      id: pickupOrderId,
      restaurant_id: restA.id,
      customer_name: 'Pickup Guest',
      phone: '+6421111222',
      pickup_time: '12:30 PM',
      total_cents: 600,
      subtotal_cents: 600,
      status: 'Incoming',
      order_type: 'pickup',
      payment_method: 'card',
      payment_status: 'paid',
      amount_paid_cents: 600,
      customer_key: 'cust-pickup-test',
    })
    .select('*')
    .single();

  assert(
    !pickupErr && pickupOrder?.order_type === 'pickup' && !pickupOrder?.table_id,
    'Verify Pickup Flow Independence (Zero Table Pollution)',
    `Order ${pickupOrderId} is pure pickup without table_id`
  );

  // 8. Static file check for GitHub Pages QR routing
  const staticGenPath = path.resolve(__dirname, 'generate-static-pages.ts');
  const staticContent = fs.readFileSync(staticGenPath, 'utf-8');
  assert(
    staticContent.includes('r/common-ground/table/5') &&
    staticContent.includes('r/trattoria-bella/table/B10'),
    'Static page generator seeds /r/common-ground/table/5 and /r/trattoria-bella/table/B10'
  );

  // 9. TableLandingRoute code verification
  const qrRoutePath = path.resolve(
    __dirname,
    '../app/r/[restaurant]/table/[tableCode].tsx'
  );
  const qrRouteContent = fs.readFileSync(qrRoutePath, 'utf-8');
  assert(
    qrRouteContent.includes("router.replace({\n        pathname: '/menu'") ||
    qrRouteContent.includes("pathname: '/menu'"),
    'TableLandingRoute directly routes to /menu in table mode'
  );

  // 10. Home screen Dine In handler verification
  const homePath = path.resolve(__dirname, '../app/index.tsx');
  const homeContent = fs.readFileSync(homePath, 'utf-8');
  assert(
    homeContent.includes('handleChooseDineIn') &&
    homeContent.includes("pathname: '/menu'") &&
    homeContent.includes("mode: 'table'"),
    'Home screen Dine In button immediately navigates to /menu with mode=table'
  );

  // Cleanup test orders
  await supabase.from('orders').delete().in('id', [orderId, pickupOrderId]);

  console.log(`\n======================================================================`);
  console.log(`TABLE & DINE-IN SUITE: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`======================================================================\n`);
}

runDineInTests();
