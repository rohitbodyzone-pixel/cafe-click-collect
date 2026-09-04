import type { Restaurant } from '@/src/context/RestaurantContext';
import type { Order } from '@/src/context/OrderContext';
import type { Product } from '@/src/data/products';

export type HealthSeverity = 'green' | 'yellow' | 'red';

export type DiagnosticItem = {
  id: string;
  category: 'connection' | 'order_flow' | 'menu_setup' | 'staff_account' | 'features';
  title: string;
  description: string;
  severity: HealthSeverity;
  metric?: string;
  actionLabel?: string;
  actionRoute?: string;
  lastCheckedAt: string;
};

export type RestaurantHealthReport = {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  plan: string;
  isActive: boolean;
  overallStatus: HealthSeverity;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  lastCheckedAt: string;
  
  // High-level diagnostic summary metrics
  connection: {
    dbRealtime: 'connected' | 'disconnected';
    kitchenStatus: 'online' | 'idle' | 'offline';
    counterStatus: 'online' | 'idle' | 'offline';
    managerStatus: 'online' | 'idle' | 'offline';
    printerStatus: string; // e.g. "Unknown / Not monitored" or "Configured (192.168.1.200)"
    posStatus: 'connected' | 'disconnected' | 'error' | 'not_configured';
  };
  orderFlow: {
    lastOrderAt: string | null;
    activeOrdersCount: number;
    stuckIncomingCount: number; // >15m unaccepted
    stuckPreparingCount: number; // >30m preparing
    failedPaymentCount: number;
    todayGrossVolume: number;
  };
  menuSetup: {
    totalProducts: number;
    zeroPriceCount: number;
    soldOutCount: number;
    soldOutPercent: number;
    emptyCategoriesCount: number;
    hoursConfigured: boolean;
    pickupSlotsConfigured: boolean;
  };
  staffAccount: {
    activeStaffCount: number;
    hasOwnerAssigned: boolean;
    subscriptionStatus: 'active' | 'trial' | 'past_due' | 'inactive';
  };
  features: {
    enabledCount: number;
    totalCount: number;
  };
  
  diagnostics: DiagnosticItem[];
};

export type MorningHealthSummary = {
  totalRestaurants: number;
  healthyCount: number; // green
  warningCount: number; // yellow
  criticalCount: number; // red
  totalActiveOrders: number;
  totalStuckOrders: number;
  totalFailedPayments: number;
  unresolvedIssuesCount: number;
  lastCheckedAt: string;
};

let defaultSupabase: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/src/lib/supabase');
  defaultSupabase = mod?.supabase || null;
} catch {
  // Node test runner environment
}

/**
 * Calculates a detailed diagnostic health report for a specific restaurant.
 */
export async function computeRestaurantHealth(
  restaurant: Restaurant,
  orders: Order[] = [],
  products: Product[] = [],
  supabaseClient?: any
): Promise<RestaurantHealthReport> {
  const client = supabaseClient !== undefined ? supabaseClient : defaultSupabase;
  const now = new Date();
  const nowMs = now.getTime();
  const diagnostics: DiagnosticItem[] = [];

  const restaurantOrders = orders.filter((o) => o.restaurantId === restaurant.id);
  const restaurantProducts = products;

  // 1. Connection & Device Health
  const dbRealtime: 'connected' | 'disconnected' = 'connected';

  // Active Staff Attendance
  let activeStaffList: any[] = [];
  try {
    if (client) {
      const { data } = await client.rpc('get_active_staff_attendance', {
        p_restaurant_id: restaurant.id,
      });
      if (Array.isArray(data)) activeStaffList = data;
    }
  } catch {
    // Non-blocking fallback
  }

  const kitchenStaff = activeStaffList.filter((s) => s.role === 'kitchen' || s.role === 'staff');
  const counterStaff = activeStaffList.filter((s) => s.role === 'counter' || s.role === 'staff');
  const managerStaff = activeStaffList.filter((s) => s.role === 'manager' || s.role === 'owner');

  const kitchenStatus: 'online' | 'idle' | 'offline' =
    kitchenStaff.length > 0 ? 'online' : activeStaffList.length > 0 ? 'idle' : 'offline';
  const counterStatus: 'online' | 'idle' | 'offline' =
    counterStaff.length > 0 ? 'online' : activeStaffList.length > 0 ? 'idle' : 'offline';
  const managerStatus: 'online' | 'idle' | 'offline' =
    managerStaff.length > 0 ? 'online' : activeStaffList.length > 0 ? 'idle' : 'offline';

  // Printer status - Hardware detection via web/browser
  // If no hardware driver / socket is connected, explicitly show "Unknown / Not monitored"
  const printerStatus = 'Unknown / Not monitored';
  diagnostics.push({
    id: 'printer_unmonitored',
    category: 'connection',
    title: 'Receipt Printer Connectivity',
    description: 'Hardware receipt printer status is unmonitored or managed locally by browser print dialog.',
    severity: 'yellow',
    metric: printerStatus,
    actionLabel: 'Configure Printers',
    actionRoute: '/admin-operations',
    lastCheckedAt: now.toISOString(),
  });

  // POS connection status
  let posStatus: 'connected' | 'disconnected' | 'error' | 'not_configured' = 'not_configured';
  try {
    if (client) {
      const { data: posData } = await client
        .from('restaurant_pos_connections')
        .select('*')
        .eq('restaurant_id', restaurant.id);
      if (posData && posData.length > 0) {
        const connected = posData.find((p: any) => p.status === 'connected');
        const err = posData.find((p: any) => p.status === 'error');
        if (connected) posStatus = 'connected';
        else if (err) posStatus = 'error';
        else posStatus = 'disconnected';
      }
    }
  } catch {
    // Non-blocking
  }

  // 2. Order Flow Health
  const activeOrders = restaurantOrders.filter(
    (o) => o.status === 'Incoming' || o.status === 'Accepted' || o.status === 'Preparing'
  );

  let stuckIncomingCount = 0;
  let stuckPreparingCount = 0;
  let failedPaymentCount = 0;

  for (const o of restaurantOrders) {
    const orderCreatedMs = new Date(o.createdAt).getTime();
    const ageMinutes = (nowMs - orderCreatedMs) / (1000 * 60);

    if (o.status === 'Incoming' && ageMinutes > 15) {
      stuckIncomingCount++;
    } else if (o.status === 'Preparing' && ageMinutes > 30) {
      stuckPreparingCount++;
    }

    if (o.paymentStatus === 'failed') {
      failedPaymentCount++;
    }
  }

  if (stuckIncomingCount > 0) {
    diagnostics.push({
      id: 'stuck_incoming_orders',
      category: 'order_flow',
      title: `${stuckIncomingCount} Stuck Unaccepted Orders`,
      description: `Orders have been waiting in "Incoming" state for over 15 minutes without kitchen acceptance.`,
      severity: 'red',
      metric: `${stuckIncomingCount} critical orders`,
      actionLabel: 'Open Kitchen KDS',
      actionRoute: '/kitchen',
      lastCheckedAt: now.toISOString(),
    });
  }

  if (stuckPreparingCount > 0) {
    diagnostics.push({
      id: 'stuck_preparing_orders',
      category: 'order_flow',
      title: `${stuckPreparingCount} Orders Preparing > 30 mins`,
      description: `Orders have been stuck in "Preparing" state longer than standard ticket completion time.`,
      severity: 'yellow',
      metric: `${stuckPreparingCount} delayed orders`,
      actionLabel: 'Open Kitchen Queue',
      actionRoute: '/kitchen',
      lastCheckedAt: now.toISOString(),
    });
  }

  if (failedPaymentCount > 0) {
    diagnostics.push({
      id: 'failed_payments',
      category: 'order_flow',
      title: `${failedPaymentCount} Failed Stripe / Card Payments`,
      description: `Orders recorded with payment failures or incomplete Stripe transactions.`,
      severity: 'red',
      metric: `${failedPaymentCount} failed`,
      actionLabel: 'View Payouts & Ledger',
      actionRoute: '/admin-payouts',
      lastCheckedAt: now.toISOString(),
    });
  }

  const sortedOrders = [...restaurantOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const lastOrderAt = sortedOrders.length > 0 ? sortedOrders[0].createdAt : null;

  const todayGrossVolume = restaurantOrders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.amountPaid || o.total : o.total), 0);

  // 3. Menu / Setup Health
  const totalProducts = restaurantProducts.length;
  const zeroPriceProducts = restaurantProducts.filter((p) => p.price <= 0);
  const soldOutProducts = restaurantProducts.filter((p) => p.soldOut);
  const soldOutPercent = totalProducts > 0 ? Math.round((soldOutProducts.length / totalProducts) * 100) : 0;

  const categories = Array.from(new Set(restaurantProducts.map((p) => p.category)));
  let emptyCategoriesCount = 0;
  for (const cat of categories) {
    const inCat = restaurantProducts.filter((p) => p.category === cat);
    if (inCat.length === 0) emptyCategoriesCount++;
  }

  if (totalProducts === 0) {
    diagnostics.push({
      id: 'empty_menu',
      category: 'menu_setup',
      title: 'Empty Product Catalog',
      description: 'Restaurant has 0 active items. Customers cannot browse or place orders.',
      severity: 'red',
      metric: '0 products',
      actionLabel: 'Add Products to Menu',
      actionRoute: '/admin-menu',
      lastCheckedAt: now.toISOString(),
    });
  }

  if (zeroPriceProducts.length > 0) {
    diagnostics.push({
      id: 'zero_price_items',
      category: 'menu_setup',
      title: `${zeroPriceProducts.length} Items with Zero Price`,
      description: `Items configured with $0.00 price: ${zeroPriceProducts.slice(0, 3).map((p) => p.name).join(', ')}.`,
      severity: 'yellow',
      metric: `${zeroPriceProducts.length} items`,
      actionLabel: 'Edit Menu Pricing',
      actionRoute: '/admin-menu',
      lastCheckedAt: now.toISOString(),
    });
  }

  if (soldOutPercent >= 50 && totalProducts > 0) {
    diagnostics.push({
      id: 'high_sold_out_ratio',
      category: 'menu_setup',
      title: `High Sold-Out Ratio (${soldOutPercent}%)`,
      description: `Over 50% of the menu is currently marked sold out. Customers may experience limited choices.`,
      severity: 'yellow',
      metric: `${soldOutPercent}% sold out`,
      actionLabel: 'Manage Availability',
      actionRoute: '/admin-menu',
      lastCheckedAt: now.toISOString(),
    });
  }

  const hoursConfigured = Boolean(restaurant.openingTime && restaurant.closingTime);
  if (!hoursConfigured) {
    diagnostics.push({
      id: 'missing_hours',
      category: 'menu_setup',
      title: 'Operating Hours Incomplete',
      description: 'Opening or closing hours are not configured for pickup scheduling.',
      severity: 'yellow',
      metric: 'Missing hours',
      actionLabel: 'Set Operating Hours',
      actionRoute: '/admin-pickup-settings',
      lastCheckedAt: now.toISOString(),
    });
  }

  const pickupSlotsConfigured = Boolean(restaurant.slotIntervalMinutes && restaurant.maxOrdersPerSlot);

  // 4. Account & Staff Health
  const hasOwnerAssigned = Boolean(restaurant.email || restaurant.phone);
  const subscriptionStatus: 'active' | 'trial' | 'past_due' | 'inactive' =
    restaurant.isActive ? 'active' : 'inactive';

  if (!restaurant.isActive) {
    diagnostics.push({
      id: 'restaurant_inactive',
      category: 'staff_account',
      title: 'Restaurant Disabled',
      description: 'Restaurant is marked inactive and hidden from customer marketplace ordering.',
      severity: 'red',
      metric: 'Disabled',
      actionLabel: 'Enable Restaurant',
      actionRoute: '/super-admin',
      lastCheckedAt: now.toISOString(),
    });
  }

  if (activeStaffList.length === 0 && restaurant.isActive) {
    diagnostics.push({
      id: 'no_staff_clocked_in',
      category: 'staff_account',
      title: 'No Active Staff On Shift',
      description: 'No team members are currently clocked in via Counter or Manager console.',
      severity: 'yellow',
      metric: '0 clocked in',
      actionLabel: 'Staff Management',
      actionRoute: '/admin-staff',
      lastCheckedAt: now.toISOString(),
    });
  }

  // 5. Feature Status Health
  let enabledCount = 58;
  let totalCount = 58;
  try {
    if (client) {
      const { data: perms } = await client
        .from('restaurant_feature_permissions')
        .select('*')
        .eq('restaurant_id', restaurant.id);
      if (perms && perms.length > 0) {
        totalCount = perms.length;
        enabledCount = perms.filter((p: any) => p.is_enabled).length;
      }
    }
  } catch {
    // Non-blocking
  }

  // Compute overall status & counts
  const criticalCount = diagnostics.filter((d) => d.severity === 'red').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'yellow').length;
  const healthyCount = diagnostics.filter((d) => d.severity === 'green').length;

  let overallStatus: HealthSeverity = 'green';
  if (criticalCount > 0) {
    overallStatus = 'red';
  } else if (warningCount > 0) {
    overallStatus = 'yellow';
  }

  return {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
    plan: restaurant.plan || 'starter',
    isActive: restaurant.isActive,
    overallStatus,
    criticalCount,
    warningCount,
    healthyCount,
    lastCheckedAt: now.toISOString(),
    connection: {
      dbRealtime,
      kitchenStatus,
      counterStatus,
      managerStatus,
      printerStatus,
      posStatus,
    },
    orderFlow: {
      lastOrderAt,
      activeOrdersCount: activeOrders.length,
      stuckIncomingCount,
      stuckPreparingCount,
      failedPaymentCount,
      todayGrossVolume,
    },
    menuSetup: {
      totalProducts,
      zeroPriceCount: zeroPriceProducts.length,
      soldOutCount: soldOutProducts.length,
      soldOutPercent,
      emptyCategoriesCount,
      hoursConfigured,
      pickupSlotsConfigured,
    },
    staffAccount: {
      activeStaffCount: activeStaffList.length,
      hasOwnerAssigned,
      subscriptionStatus,
    },
    features: {
      enabledCount,
      totalCount,
    },
    diagnostics,
  };
}

/**
 * Computes Morning Health Summary across all restaurants.
 */
export function computeMorningHealthSummary(
  reports: RestaurantHealthReport[]
): MorningHealthSummary {
  const totalRestaurants = reports.length;
  const healthyCount = reports.filter((r) => r.overallStatus === 'green').length;
  const warningCount = reports.filter((r) => r.overallStatus === 'yellow').length;
  const criticalCount = reports.filter((r) => r.overallStatus === 'red').length;

  const totalActiveOrders = reports.reduce((sum, r) => sum + r.orderFlow.activeOrdersCount, 0);
  const totalStuckOrders = reports.reduce(
    (sum, r) => sum + r.orderFlow.stuckIncomingCount + r.orderFlow.stuckPreparingCount,
    0
  );
  const totalFailedPayments = reports.reduce((sum, r) => sum + r.orderFlow.failedPaymentCount, 0);
  const unresolvedIssuesCount = reports.reduce(
    (sum, r) => sum + r.criticalCount + r.warningCount,
    0
  );

  return {
    totalRestaurants,
    healthyCount,
    warningCount,
    criticalCount,
    totalActiveOrders,
    totalStuckOrders,
    totalFailedPayments,
    unresolvedIssuesCount,
    lastCheckedAt: new Date().toISOString(),
  };
}
