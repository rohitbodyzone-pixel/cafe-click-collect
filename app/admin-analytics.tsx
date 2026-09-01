import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Header, Screen } from '@/src/components/UI';
import { useOrders } from '@/src/context/OrderContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useServiceRequests } from '@/src/context/ServiceRequestContext';
import { money } from '@/src/data/products';
import { colors } from '@/src/theme';

type TimeRange = 'today' | '7days' | 'all';

export default function AdminAnalyticsScreen() {
  const { currentRestaurant } = useRestaurant();
  const { orders } = useOrders();
  const { requests: serviceRequests } = useServiceRequests();
  const [range, setRange] = useState<TimeRange>('today');

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return orders.filter((order) => {
      const orderTime = new Date(order.createdAt).getTime();
      if (range === 'today') return orderTime >= startOfToday;
      if (range === '7days') return orderTime >= sevenDaysAgo;
      return true;
    });
  }, [orders, range]);

  const metrics = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.status !== 'Cancelled');
    const totalSales = validOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.amountPaid : o.total), 0);
    const orderCount = validOrders.length;
    const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    const pickupOrders = validOrders.filter((o) => o.orderType === 'pickup').length;
    const tableOrders = validOrders.filter((o) => o.orderType === 'table').length;

    const unpaidOrders = validOrders.filter((o) => o.paymentStatus === 'unpaid');
    const unpaidCount = unpaidOrders.length;
    const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + o.total, 0);

    const pendingRequests = serviceRequests.filter((r) => r.status === 'pending').length;
    const activeKitchenLoad = orders.filter((o) => o.status === 'Accepted' || o.status === 'Preparing').length;
    const completedOrders = orders.filter((o) => o.status === 'Collected').length;
    const cancelledOrders = orders.filter((o) => o.status === 'Cancelled').length;

    // Top selling items
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    validOrders.forEach((order) => {
      order.items.forEach((item) => {
        const existing = productMap.get(item.product.name) || { name: item.product.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.unitPrice * item.quantity;
        productMap.set(item.product.name, existing);
      });
    });

    const topSelling = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Hourly distribution (07:00 - 20:00)
    const hourlyCounts = new Array(24).fill(0);
    validOrders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      hourlyCounts[hour]++;
    });

    return {
      totalSales,
      orderCount,
      avgOrderValue,
      pickupOrders,
      tableOrders,
      unpaidCount,
      unpaidAmount,
      pendingRequests,
      activeKitchenLoad,
      completedOrders,
      cancelledOrders,
      topSelling,
      hourlyCounts,
    };
  }, [filteredOrders, orders, serviceRequests]);

  const maxHourCount = Math.max(1, ...metrics.hourlyCounts);

  return (
    <Screen>
      <Header
        title="Sales & Analytics"
        right={
          <Pressable onPress={() => router.replace('/admin')}>
            <Text style={s.linkText}>Admin Home</Text>
          </Pressable>
        }
      />

      {/* Restaurant Header */}
      <View style={s.banner}>
        <Text style={s.bannerEyebrow}>RESTAURANT PERFORMANCE</Text>
        <Text style={s.bannerTitle}>{currentRestaurant.name}</Text>
        <Text style={s.bannerSub}>
          Live sales and operational analytics scoped for this location
        </Text>
      </View>

      {/* Time Range Selector */}
      <View style={s.rangeRow}>
        {(['today', '7days', 'all'] as TimeRange[]).map((r) => (
          <Pressable
            key={r}
            style={[s.rangeBtn, range === r && s.rangeBtnActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[s.rangeText, range === r && s.rangeTextActive]}>
              {r === 'today' ? 'Today' : r === '7days' ? 'Past 7 Days' : 'All Time'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Primary KPI Grid */}
      <View style={s.kpiGrid}>
        <Card style={s.kpiCard}>
          <Text style={s.kpiLabel}>Total Revenue</Text>
          <Text style={s.kpiValue}>{money(metrics.totalSales)}</Text>
          <Text style={s.kpiSub}>
            {range === 'today' ? 'Collected today' : 'Total sales in period'}
          </Text>
        </Card>

        <Card style={s.kpiCard}>
          <Text style={s.kpiLabel}>Total Orders</Text>
          <Text style={s.kpiValue}>{metrics.orderCount}</Text>
          <Text style={s.kpiSub}>
            Avg {money(metrics.avgOrderValue)} / order
          </Text>
        </Card>
      </View>

      {/* Operations & Channel Breakdown */}
      <View style={s.kpiGrid}>
        <Card style={s.kpiCard}>
          <View style={s.iconTitleRow}>
            <Ionicons name="bag-handle-outline" size={16} color={colors.espresso} />
            <Text style={s.kpiLabel}>Click & Collect</Text>
          </View>
          <Text style={s.kpiValue}>{metrics.pickupOrders}</Text>
          <Text style={s.kpiSub}>Pickup orders</Text>
        </Card>

        <Card style={s.kpiCard}>
          <View style={s.iconTitleRow}>
            <Ionicons name="restaurant-outline" size={16} color={colors.espresso} />
            <Text style={s.kpiLabel}>QR Table Orders</Text>
          </View>
          <Text style={s.kpiValue}>{metrics.tableOrders}</Text>
          <Text style={s.kpiSub}>Dine-in table orders</Text>
        </Card>
      </View>

      {/* Urgent Operational Alerts Bar */}
      <View style={s.kpiGrid}>
        <Card style={[s.kpiCard, metrics.unpaidCount > 0 && s.warningCard]}>
          <View style={s.iconTitleRow}>
            <Ionicons
              name="cash-outline"
              size={16}
              color={metrics.unpaidCount > 0 ? colors.danger : colors.espresso}
            />
            <Text
              style={[
                s.kpiLabel,
                metrics.unpaidCount > 0 && { color: colors.danger },
              ]}
            >
              Unpaid Counter
            </Text>
          </View>
          <Text style={[s.kpiValue, metrics.unpaidCount > 0 && { color: colors.danger }]}>
            {metrics.unpaidCount}
          </Text>
          <Text style={s.kpiSub}>{money(metrics.unpaidAmount)} awaiting payment</Text>
        </Card>

        <Card style={[s.kpiCard, metrics.pendingRequests > 0 && s.warningCard]}>
          <View style={s.iconTitleRow}>
            <Ionicons
              name="notifications-outline"
              size={16}
              color={metrics.pendingRequests > 0 ? colors.caramel : colors.espresso}
            />
            <Text style={s.kpiLabel}>Table Requests</Text>
          </View>
          <Text style={s.kpiValue}>{metrics.pendingRequests}</Text>
          <Text style={s.kpiSub}>Pending calls from tables</Text>
        </Card>
      </View>

      {/* Kitchen Real-Time Status */}
      <Card style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Kitchen & Fulfillment Load</Text>
          <Pressable
            style={s.kdsLink}
            onPress={() => router.push('/admin-kitchen')}
          >
            <Text style={s.kdsLinkText}>Open KDS →</Text>
          </Pressable>
        </View>

        <View style={s.kitchenRow}>
          <View style={s.kitchenStat}>
            <Text style={s.kitchenStatVal}>{metrics.activeKitchenLoad}</Text>
            <Text style={s.kitchenStatLabel}>Active in Prep</Text>
          </View>
          <View style={s.kitchenStat}>
            <Text style={[s.kitchenStatVal, { color: colors.green }]}>
              {metrics.completedOrders}
            </Text>
            <Text style={s.kitchenStatLabel}>Completed</Text>
          </View>
          <View style={s.kitchenStat}>
            <Text style={[s.kitchenStatVal, { color: colors.danger }]}>
              {metrics.cancelledOrders}
            </Text>
            <Text style={s.kitchenStatLabel}>Cancelled</Text>
          </View>
        </View>
      </Card>

      {/* Top-Selling Products */}
      <Card style={s.sectionCard}>
        <Text style={s.sectionTitle}>Top-Selling Items</Text>
        <Text style={s.sectionHelp}>Most popular menu items by volume</Text>

        {metrics.topSelling.map((item, index) => (
          <View key={item.name} style={s.topItemRow}>
            <View style={s.topItemRank}>
              <Text style={s.topItemRankText}>#{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.topItemName}>{item.name}</Text>
              <Text style={s.topItemMeta}>
                {item.quantity} sold · {money(item.revenue)} revenue
              </Text>
            </View>
          </View>
        ))}

        {metrics.topSelling.length === 0 && (
          <Text style={s.emptyText}>No sales recorded for this period yet.</Text>
        )}
      </Card>

      {/* Hourly Order Activity Graph */}
      <Card style={s.sectionCard}>
        <Text style={s.sectionTitle}>Orders by Hour (07:00 – 21:00)</Text>
        <Text style={s.sectionHelp}>Peak rush hour volume distribution</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chartScroll}>
          <View style={s.chartContainer}>
            {metrics.hourlyCounts.slice(7, 22).map((count, i) => {
              const hour = 7 + i;
              const heightPercent = Math.max(8, (count / maxHourCount) * 80);

              return (
                <View key={hour} style={s.barCol}>
                  <Text style={s.barCount}>{count > 0 ? count : ''}</Text>
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.barFill,
                        { height: heightPercent },
                        count > 0 && s.barFillActive,
                      ]}
                    />
                  </View>
                  <Text style={s.barHour}>{hour}:00</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  linkText: {
    color: colors.coffee,
    fontWeight: '800',
    fontSize: 13,
  },
  banner: {
    backgroundColor: colors.espresso,
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
  },
  bannerEyebrow: {
    color: '#DDBB9B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  bannerSub: {
    color: '#E8DCD5',
    fontSize: 12,
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rangeBtn: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  rangeBtnActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
  },
  rangeTextActive: {
    color: colors.white,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    padding: 14,
  },
  warningCard: {
    borderColor: '#E8C4BE',
    backgroundColor: '#FFF9F8',
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  kpiValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  kpiSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  sectionHelp: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  kdsLink: {
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  kdsLinkText: {
    color: colors.espresso,
    fontSize: 11,
    fontWeight: '800',
  },
  kitchenRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  kitchenStat: {
    alignItems: 'center',
  },
  kitchenStatVal: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.ink,
  },
  kitchenStatLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  topItemRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topItemRankText: {
    fontWeight: '800',
    fontSize: 11,
    color: colors.espresso,
  },
  topItemName: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.ink,
  },
  topItemMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  emptyText: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  chartScroll: {
    marginTop: 6,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 12,
    paddingBottom: 6,
  },
  barCol: {
    alignItems: 'center',
    width: 38,
  },
  barCount: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.espresso,
    marginBottom: 4,
    height: 12,
  },
  barTrack: {
    width: 18,
    height: 80,
    backgroundColor: colors.line,
    borderRadius: 9,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#DDBB9B',
    borderRadius: 9,
    width: '100%',
  },
  barFillActive: {
    backgroundColor: colors.espresso,
  },
  barHour: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 6,
  },
});
