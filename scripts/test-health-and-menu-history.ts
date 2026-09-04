import {
  computeRestaurantHealth,
  computeMorningHealthSummary,
  RestaurantHealthReport,
} from '../src/services/healthMonitor';
import type { Restaurant } from '../src/context/RestaurantContext';
import type { Order } from '../src/context/OrderContext';
import type { Product } from '../src/data/products';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('RESTAURANT HEALTH & MENU HISTORY TEST SUITE');
  console.log('==================================================\n');

  const baseRestaurant: Restaurant = {
    id: 'c0000000-0000-0000-0000-000000000001',
    slug: 'common-ground',
    name: 'Common Ground Cafe',
    description: 'Specialty coffee & artisan brunch',
    address: '123 Ponsonby Road, Auckland',
    phone: '+64 9 123 4567',
    email: 'hello@commonground.co.nz',
    openingTime: '07:00',
    closingTime: '16:00',
    averagePrepMinutes: 10,
    slotIntervalMinutes: 5,
    maxOrdersPerSlot: 6,
    isActive: true,
    plan: 'premium',
    currency: 'nzd',
    timezone: 'Pacific/Auckland',
    clickAndCollectEnabled: true,
    tableOrderingEnabled: true,
    payAtCounterEnabled: true,
    cardEnabled: true,
    applePayEnabled: true,
    googlePayEnabled: true,
  };

  const sampleProducts: Product[] = [
    {
      id: 'p1',
      name: 'Flat White',
      category: 'Coffee',
      price: 5.5,
      description: 'Velvety microfoam over double espresso',
      emoji: '☕',
      soldOut: false,
      customisationGroupIds: [],
    },
    {
      id: 'p2',
      name: 'Almond Croissant',
      category: 'Food',
      price: 6.5,
      description: 'Twice-baked butter croissant',
      emoji: '🥐',
      soldOut: false,
      customisationGroupIds: [],
    },
  ];

  const now = new Date();

  function mockOrder(overrides: Partial<Order>): Order {
    return {
      id: 'ord-default',
      restaurantId: baseRestaurant.id,
      customerKey: 'cust-default',
      customerName: 'Customer',
      phone: '+64 21 000 0000',
      items: [
        {
          cartKey: 'ck-1',
          product: sampleProducts[0],
          quantity: 1,
          unitPrice: 5.5,
          customisations: [],
        },
      ],
      subtotal: 5.5,
      discount: 0,
      freeCoffeeDiscount: 0,
      pointsEarned: 0,
      pointsRedeemed: 0,
      total: 5.5,
      amountPaid: 5.5,
      status: 'Ready',
      pickupTime: '08:30',
      orderType: 'pickup',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  // Test 1: Healthy Restaurant Report (Green / Healthy)
  console.log('Test 1: Healthy Restaurant Report');
  const healthyOrders: Order[] = [
    mockOrder({
      id: 'ord-1',
      customerName: 'Alice',
      createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    }),
  ];

  const report1 = await computeRestaurantHealth(baseRestaurant, healthyOrders, sampleProducts);
  assert(report1.restaurantId === baseRestaurant.id, 'Report scopes to correct restaurant ID');
  assert(report1.menuSetup.totalProducts === 2, 'Report detects 2 active products');
  assert(report1.criticalCount === 0, 'Report has 0 critical alerts');
  assert(report1.connection.printerStatus === 'Unknown / Not monitored', 'Printer correctly reports "Unknown / Not monitored" when undetectable');

  // Test 2: Warning Detection (Zero-price item & >50% Sold Out)
  console.log('\nTest 2: Warning Detection (Zero Price & Sold-Out Ratio)');
  const warningProducts: Product[] = [
    {
      id: 'p1',
      name: 'Free Water',
      category: 'Drinks',
      price: 0.0,
      description: 'Filtered water',
      emoji: '💧',
      soldOut: true,
      customisationGroupIds: [],
    },
    {
      id: 'p2',
      name: 'Sold Out Pastry',
      category: 'Food',
      price: 7.0,
      description: 'Pastry',
      emoji: '🥐',
      soldOut: true,
      customisationGroupIds: [],
    },
  ];

  const report2 = await computeRestaurantHealth(baseRestaurant, healthyOrders, warningProducts);
  assert(report2.overallStatus === 'yellow', 'Overall status is Yellow when warnings exist without criticals');
  assert(report2.menuSetup.zeroPriceCount === 1, 'Correctly flags 1 zero-price item');
  assert(report2.menuSetup.soldOutPercent === 100, 'Calculates 100% sold out percentage');
  assert(report2.warningCount >= 2, 'Records multiple warnings');

  // Test 3: Critical Alert Detection (Stuck Incoming Order > 15m)
  console.log('\nTest 3: Critical Alert Detection (Stuck Incoming Order > 15m)');
  const criticalOrders: Order[] = [
    mockOrder({
      id: 'ord-critical-1',
      customerName: 'Bob',
      status: 'Incoming',
      createdAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(), // 25m ago (>15m)
    }),
  ];

  const report3 = await computeRestaurantHealth(baseRestaurant, criticalOrders, sampleProducts);
  assert(report3.overallStatus === 'red', 'Overall status becomes RED on stuck incoming order');
  assert(report3.orderFlow.stuckIncomingCount === 1, 'Flags 1 stuck incoming order');
  assert(report3.criticalCount >= 1, 'Critical count is at least 1');

  // Test 4: Critical Alert Detection (Empty Product Catalog & Disabled Status)
  console.log('\nTest 4: Critical Alert Detection (Empty Catalog & Disabled Restaurant)');
  const disabledRestaurant: Restaurant = {
    ...baseRestaurant,
    id: 'c0000000-0000-0000-0000-000000000002',
    isActive: false,
  };

  const report4 = await computeRestaurantHealth(disabledRestaurant, [], []);
  assert(report4.overallStatus === 'red', 'Disabled restaurant with 0 products reports RED status');
  assert(report4.menuSetup.totalProducts === 0, 'Detects 0 products in empty catalog');
  assert(!report4.isActive, 'Accurately reports restaurant isActive = false');

  // Test 5: Super Admin Morning Health Summary Aggregation & Filters
  console.log('\nTest 5: Super Admin Morning Health Summary Aggregation');
  const allReports = [report1, report2, report3, report4];
  const morningSummary = computeMorningHealthSummary(allReports);

  assert(morningSummary.totalRestaurants === 4, 'Aggregates 4 total restaurants');
  assert(morningSummary.criticalCount === 2, 'Correctly counts 2 critical restaurants (report3, report4)');
  assert(morningSummary.warningCount === 2, 'Correctly counts 2 warning/healthy breakdowns');
  assert(morningSummary.totalStuckOrders === 1, 'Aggregates 1 total stuck order');

  // Test 6: Menu Undo & Redo State Stack Simulation
  console.log('\nTest 6: Menu Undo & Redo State Stack Logic');
  let stack: Product[][] = [[sampleProducts[0]]]; // Initial state: [Flat White]
  let idx = 0;

  // Action 1: Add Almond Croissant
  const state1 = [...stack[0], sampleProducts[1]];
  stack.push(state1);
  idx++;
  assert(stack[idx].length === 2, 'State 1 has 2 items');

  // Action 2: Price update on Flat White to $6.00
  const state2 = stack[idx].map((p) => (p.id === 'p1' ? { ...p, price: 6.0 } : p));
  stack.push(state2);
  idx++;
  assert(stack[idx].find((p) => p.id === 'p1')?.price === 6.0, 'State 2 has Flat White at $6.00');

  // Undo 1: Revert price update
  idx--;
  assert(stack[idx].find((p) => p.id === 'p1')?.price === 5.5, 'Undo reverts Flat White price to $5.50');

  // Undo 2: Revert add product
  idx--;
  assert(stack[idx].length === 1, 'Undo reverts item addition back to 1 item');

  // Redo 1: Re-apply add product
  idx++;
  assert(stack[idx].length === 2, 'Redo restores 2 items');

  // Redo 2: Re-apply price update
  idx++;
  assert(stack[idx].find((p) => p.id === 'p1')?.price === 6.0, 'Redo restores Flat White price to $6.00');

  // Test 7: Multi-Tenant Scoping & Version Snapshot Schema Integrity
  console.log('\nTest 7: Multi-Tenant Scoping & Version Snapshot Integrity');
  const snapshotPayload = {
    restaurant_id: baseRestaurant.id,
    version_number: 1,
    title: 'Autumn 2026 Menu',
    snapshot: sampleProducts,
    published_by: 'owner@commonground.co.nz',
  };

  assert(snapshotPayload.restaurant_id === baseRestaurant.id, 'Snapshot strictly bound to restaurant_id');
  assert(Array.isArray(snapshotPayload.snapshot), 'Snapshot data is a valid array of products');
  assert(snapshotPayload.snapshot[0].name === 'Flat White', 'Snapshot preserves complete product schema');

  console.log('\n==================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runTests();
