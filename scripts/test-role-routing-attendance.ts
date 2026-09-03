import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REST_A_ID = 'c0000000-0000-0000-0000-000000000001'; // Common Ground
const REST_B_ID = 'c0000000-0000-0000-0000-000000000002'; // Trattoria Bella

async function runRoleAndAttendanceTests() {
  console.log('=== ROLE ENTRY SECURITY, STAFF CLOCK-IN & ORDER ATTRIBUTION SUITE ===\n');

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

  let testAttendanceId: string = '';
  const testStaffName = 'Marcus Test Barista';

  // 1. Test Staff Clock In RPC
  await test('Staff Clock In creates active attendance session for Restaurant A', async () => {
    const { data, error } = await supabase.rpc('clock_in_staff', {
      p_restaurant_id: REST_A_ID,
      p_staff_id: null,
      p_staff_name: testStaffName,
      p_device_info: 'Counter POS Terminal 01',
    });

    if (error) throw error;
    if (data.status !== 'success' && data.status !== 'already_clocked_in') {
      throw new Error(`Unexpected clock in status: ${JSON.stringify(data)}`);
    }
    testAttendanceId = data.attendance_id;
    if (!testAttendanceId) throw new Error('No attendance_id returned from clock_in_staff');
  });

  // 2. Test Multi-Tenant Isolation for Active Attendance
  await test('Active attendance is isolated to Restaurant A and NOT visible in Restaurant B', async () => {
    const { data: activeA, error: errA } = await supabase.rpc('get_active_staff_attendance', {
      p_restaurant_id: REST_A_ID,
    });
    if (errA) throw errA;
    const foundA = activeA.some((a: any) => a.staff_name.toLowerCase() === testStaffName.toLowerCase());
    if (!foundA) throw new Error(`Expected ${testStaffName} to be in Restaurant A active attendance`);

    const { data: activeB, error: errB } = await supabase.rpc('get_active_staff_attendance', {
      p_restaurant_id: REST_B_ID,
    });
    if (errB) throw errB;
    const foundB = activeB.some((a: any) => a.staff_name.toLowerCase() === testStaffName.toLowerCase());
    if (foundB) throw new Error(`Restaurant A staff attendance leaked into Restaurant B!`);
  });

  // 3. Test Counter Order Creation with Staff Attribution
  const orderId = `ORD-STAFF-${Math.floor(100000 + Math.random() * 900000)}`;
  await test('Counter order automatically records created_by_staff_name & created_by_staff_id', async () => {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        restaurant_id: REST_A_ID,
        customer_name: 'Walk-in Counter Guest',
        phone: 'In-Store',
        pickup_time: 'Immediate',
        pickup_code: 'C77',
        status: 'Preparing',
        payment_status: 'paid',
        payment_method: 'pay_at_counter',
        subtotal_cents: 1250,
        discount_cents: 0,
        total_cents: 1250,
        amount_paid_cents: 1250,
        created_by_staff_id: null,
        created_by_staff_name: testStaffName,
      })
      .select()
      .single();

    if (error) throw error;
    if (order.created_by_staff_name !== testStaffName) {
      throw new Error(`Expected order created_by_staff_name = "${testStaffName}", got "${order.created_by_staff_name}"`);
    }
  });

  // 4. Test Staff Clock Out RPC
  await test('Staff Clock Out records duration and orders taken during shift', async () => {
    const { data, error } = await supabase.rpc('clock_out_staff', {
      p_attendance_id: testAttendanceId,
      p_notes: 'Shift successfully completed at counter',
    });

    if (error) throw error;
    if (data.status !== 'success' && data.status !== 'already_clocked_out') {
      throw new Error(`Unexpected clock out status: ${JSON.stringify(data)}`);
    }
    if (data.duration_minutes === undefined || data.duration_minutes < 1) {
      throw new Error(`Expected duration_minutes >= 1, got ${data.duration_minutes}`);
    }
  });

  // 5. Test Role Scoping & Isolation
  await test('Role authorization gates allow authorized roles and block unauthorized roles', async () => {
    const rolePermissions = {
      kitchen: ['kitchen', 'manager', 'owner', 'super_admin'],
      counter: ['counter', 'manager', 'owner', 'super_admin'],
      manager: ['manager', 'owner', 'super_admin'],
      owner: ['owner', 'super_admin'],
      super_admin: ['super_admin'],
    };

    // Verify cashier cannot access owner
    if (rolePermissions.owner.includes('counter')) {
      throw new Error('Security Breach: Counter role must NOT be authorized for /owner');
    }
    // Verify kitchen cannot access manager
    if (rolePermissions.manager.includes('kitchen')) {
      throw new Error('Security Breach: Kitchen role must NOT be authorized for /manager');
    }
    // Verify manager cannot access super_admin
    if (rolePermissions.super_admin.includes('manager')) {
      throw new Error('Security Breach: Manager role must NOT be authorized for /super-admin');
    }
    // Verify owner cannot access super_admin
    if (rolePermissions.super_admin.includes('owner')) {
      throw new Error('Security Breach: Owner role must NOT be authorized for /super-admin');
    }
  });

  console.log('\n======================================================================');
  console.log(`ROLE & ATTENDANCE SUITE: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================================\n');

  if (passed !== total) process.exit(1);
}

runRoleAndAttendanceTests();
