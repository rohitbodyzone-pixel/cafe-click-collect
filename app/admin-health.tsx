import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, Card, Button, Tooltip, triggerHaptic } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useOrders } from '@/src/context/OrderContext';
import { useProducts } from '@/src/context/ProductContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { colors, radii, shadows } from '@/src/theme';
import {
  computeRestaurantHealth,
  RestaurantHealthReport,
  DiagnosticItem,
} from '@/src/services/healthMonitor';
import { RestaurantLogoImage } from '@/src/components/RestaurantImage';

type TabType = 'connection' | 'order_flow' | 'menu_setup' | 'staff_account' | 'features';

export default function AdminHealthScreen() {
  return (
    <RoleGate
      allowedRoles={['owner', 'manager', 'super_admin', 'admin']}
      roleTitle="Restaurant Health & Diagnostics"
    >
      <AdminHealthContent />
    </RoleGate>
  );
}

function AdminHealthContent() {
  const { currentRestaurant, restaurants, setCurrentRestaurant } = useRestaurant();
  const { orders } = useOrders();
  const { products } = useProducts();
  const auth = useAdminAuth();
  const params = useLocalSearchParams<{ restaurantId?: string }>();

  // If super admin passed a specific restaurantId param
  useEffect(() => {
    if (params.restaurantId && auth.isSuperAdmin) {
      const found = restaurants.find((r) => r.id === params.restaurantId);
      if (found && found.id !== currentRestaurant.id) {
        setCurrentRestaurant(found);
      }
    }
  }, [params.restaurantId, auth.isSuperAdmin, restaurants, currentRestaurant.id, setCurrentRestaurant]);

  const [activeTab, setActiveTab] = useState<TabType>('connection');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<RestaurantHealthReport | null>(null);

  const runDiagnostic = useCallback(async () => {
    setLoading(true);
    try {
      const res = await computeRestaurantHealth(currentRestaurant, orders, products);
      setReport(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentRestaurant, orders, products]);

  useEffect(() => {
    void runDiagnostic();
  }, [runDiagnostic]);

  const onRefresh = () => {
    triggerHaptic('medium');
    setRefreshing(true);
    void runDiagnostic();
  };

  const isGreen = report?.overallStatus === 'green';
  const isYellow = report?.overallStatus === 'yellow';
  const isRed = report?.overallStatus === 'red';

  const statusColor = isRed
    ? colors.danger
    : isYellow
      ? '#D9822B'
      : colors.green;
  const statusBg = isRed
    ? '#FDECEA'
    : isYellow
      ? '#FFF8E7'
      : '#E6F4EA';

  const tabDiagnostics: DiagnosticItem[] = useMemo(() => {
    if (!report) return [];
    return report.diagnostics.filter((d) => d.category === activeTab);
  }, [report, activeTab]);

  return (
    <Screen>
      <Header
        title="Restaurant Diagnostics"
        right={
          <Tooltip text="Refresh Diagnostics">
            <Pressable style={s.refreshHeaderBtn} onPress={onRefresh} accessibilityLabel="Refresh">
              <Ionicons name="refresh" size={18} color={colors.espresso} />
            </Pressable>
          </Tooltip>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Restaurant Header & Status Card */}
        <Card style={s.heroCard}>
          <View style={s.heroTop}>
            <RestaurantLogoImage
              uri={currentRestaurant.logoUrl}
              name={currentRestaurant.name}
              size={48}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.heroName}>{currentRestaurant.name}</Text>
                <View style={[s.planTag, currentRestaurant.plan === 'premium' && s.planTagPrem]}>
                  <Text style={s.planTagText}>{(currentRestaurant.plan || 'starter').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={s.heroSlug}>Slug: /{currentRestaurant.slug}</Text>
            </View>

            {/* Health Badge */}
            <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[s.statusBadgeText, { color: statusColor }]}>
                {isRed ? 'CRITICAL' : isYellow ? 'WARNINGS' : 'HEALTHY'}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={s.quickMetricsRow}>
            <View style={s.quickMetric}>
              <Text style={s.qmLabel}>CRITICAL</Text>
              <Text style={[s.qmValue, { color: colors.danger }]}>
                {report?.criticalCount || 0}
              </Text>
            </View>
            <View style={s.quickMetric}>
              <Text style={s.qmLabel}>WARNINGS</Text>
              <Text style={[s.qmValue, { color: '#D9822B' }]}>
                {report?.warningCount || 0}
              </Text>
            </View>
            <View style={s.quickMetric}>
              <Text style={s.qmLabel}>ACTIVE ORDERS</Text>
              <Text style={s.qmValue}>
                {report?.orderFlow.activeOrdersCount || 0}
              </Text>
            </View>
            <View style={s.quickMetric}>
              <Text style={s.qmLabel}>STAFF ON SHIFT</Text>
              <Text style={s.qmValue}>
                {report?.staffAccount.activeStaffCount || 0}
              </Text>
            </View>
          </View>
        </Card>

        {/* 5-Tab Diagnostic Selector */}
        <View style={s.tabBar}>
          <Pressable
            style={[s.tabItem, activeTab === 'connection' && s.tabItemActive]}
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('connection');
            }}
          >
            <Ionicons
              name="hardware-chip-outline"
              size={15}
              color={activeTab === 'connection' ? colors.white : colors.espresso}
            />
            <Text style={[s.tabText, activeTab === 'connection' && s.tabTextActive]}>
              1. Connection
            </Text>
          </Pressable>

          <Pressable
            style={[s.tabItem, activeTab === 'order_flow' && s.tabItemActive]}
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('order_flow');
            }}
          >
            <Ionicons
              name="speedometer-outline"
              size={15}
              color={activeTab === 'order_flow' ? colors.white : colors.espresso}
            />
            <Text style={[s.tabText, activeTab === 'order_flow' && s.tabTextActive]}>
              2. Orders
            </Text>
          </Pressable>

          <Pressable
            style={[s.tabItem, activeTab === 'menu_setup' && s.tabItemActive]}
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('menu_setup');
            }}
          >
            <Ionicons
              name="restaurant-outline"
              size={15}
              color={activeTab === 'menu_setup' ? colors.white : colors.espresso}
            />
            <Text style={[s.tabText, activeTab === 'menu_setup' && s.tabTextActive]}>
              3. Menu
            </Text>
          </Pressable>

          <Pressable
            style={[s.tabItem, activeTab === 'staff_account' && s.tabItemActive]}
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('staff_account');
            }}
          >
            <Ionicons
              name="people-outline"
              size={15}
              color={activeTab === 'staff_account' ? colors.white : colors.espresso}
            />
            <Text style={[s.tabText, activeTab === 'staff_account' && s.tabTextActive]}>
              4. Staff
            </Text>
          </Pressable>

          <Pressable
            style={[s.tabItem, activeTab === 'features' && s.tabItemActive]}
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('features');
            }}
          >
            <Ionicons
              name="options-outline"
              size={15}
              color={activeTab === 'features' ? colors.white : colors.espresso}
            />
            <Text style={[s.tabText, activeTab === 'features' && s.tabTextActive]}>
              5. Features
            </Text>
          </Pressable>
        </View>

        {/* Loading Spinner */}
        {loading && !refreshing && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={colors.espresso} />
            <Text style={s.loadingText}>Running diagnostic checks…</Text>
          </View>
        )}

        {/* Tab 1: Connection & Device Health */}
        {!loading && activeTab === 'connection' && (
          <View style={s.sectionWrap}>
            <Card style={s.diagCard}>
              <Text style={s.diagSectionTitle}>DEVICE & CONNECTION TELEMETRY</Text>
              
              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="cloud-done-outline" size={18} color={colors.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Supabase Realtime Cloud Sync</Text>
                  <Text style={s.diagSub}>
                    {report?.connection.dbRealtime === 'connected'
                      ? 'Live websocket connected. Orders and menu sync instant.'
                      : 'Websocket disconnected. Please check network.'}
                  </Text>
                </View>
                <Text style={s.diagStatusTagGreen}>Connected</Text>
              </View>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="tablet-landscape-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Kitchen KDS Station</Text>
                  <Text style={s.diagSub}>
                    Live preparation queue for kitchen & barista stations
                  </Text>
                </View>
                <Text style={report?.connection.kitchenStatus === 'online' ? s.diagStatusTagGreen : s.diagStatusTagMuted}>
                  {report?.connection.kitchenStatus === 'online' ? '🟢 Online' : '⚪ Standby'}
                </Text>
              </View>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="calculator-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Counter POS Terminal</Text>
                  <Text style={s.diagSub}>
                    In-person order taker & EFTPOS register terminal
                  </Text>
                </View>
                <Text style={report?.connection.counterStatus === 'online' ? s.diagStatusTagGreen : s.diagStatusTagMuted}>
                  {report?.connection.counterStatus === 'online' ? '🟢 Online' : '⚪ Standby'}
                </Text>
              </View>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="print-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Hardware Receipt Printer</Text>
                  <Text style={s.diagSub}>
                    ESC/POS or Star WebPRNT network docket printer
                  </Text>
                </View>
                <Text style={s.diagStatusTagYellow}>
                  {report?.connection.printerStatus}
                </Text>
              </View>
            </Card>

            <Button
              label="Configure Printers & Hardware"
              icon="construct-outline"
              secondary
              onPress={() => router.push('/admin-operations')}
            />
          </View>
        )}

        {/* Tab 2: Order Flow Health */}
        {!loading && activeTab === 'order_flow' && (
          <View style={s.sectionWrap}>
            <Card style={s.diagCard}>
              <Text style={s.diagSectionTitle}>ORDER FLOW & TICKET VELOCITY</Text>
              
              <View style={s.kpiBar}>
                <View style={s.kpiBox}>
                  <Text style={s.kpiBoxNum}>{report?.orderFlow.activeOrdersCount || 0}</Text>
                  <Text style={s.kpiBoxLbl}>Active Orders</Text>
                </View>
                <View style={s.kpiBox}>
                  <Text style={[s.kpiBoxNum, { color: colors.danger }]}>
                    {report?.orderFlow.stuckIncomingCount || 0}
                  </Text>
                  <Text style={s.kpiBoxLbl}>Unaccepted &gt;15m</Text>
                </View>
                <View style={s.kpiBox}>
                  <Text style={[s.kpiBoxNum, { color: '#D9822B' }]}>
                    {report?.orderFlow.stuckPreparingCount || 0}
                  </Text>
                  <Text style={s.kpiBoxLbl}>Preparing &gt;30m</Text>
                </View>
              </View>

              {report?.orderFlow.lastOrderAt ? (
                <View style={s.infoNotice}>
                  <Ionicons name="time-outline" size={16} color={colors.espresso} />
                  <Text style={s.infoNoticeText}>
                    Last order received at{' '}
                    {new Date(report.orderFlow.lastOrderAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ({new Date(report.orderFlow.lastOrderAt).toLocaleDateString()})
                  </Text>
                </View>
              ) : (
                <View style={s.infoNotice}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
                  <Text style={s.infoNoticeText}>No orders recorded yet today.</Text>
                </View>
              )}
            </Card>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Open Kitchen KDS"
                  icon="speedometer-outline"
                  onPress={() => router.push('/kitchen')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Counter Terminal"
                  icon="calculator-outline"
                  secondary
                  onPress={() => router.push('/counter')}
                />
              </View>
            </View>
          </View>
        )}

        {/* Tab 3: Menu & Setup Health */}
        {!loading && activeTab === 'menu_setup' && (
          <View style={s.sectionWrap}>
            <Card style={s.diagCard}>
              <Text style={s.diagSectionTitle}>MENU CATALOG & TIMING SETUP</Text>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="restaurant-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Total Menu Items</Text>
                  <Text style={s.diagSub}>
                    {report?.menuSetup.totalProducts} active products in catalog
                  </Text>
                </View>
                <Text style={report?.menuSetup.totalProducts ? s.diagStatusTagGreen : s.diagStatusTagRed}>
                  {report?.menuSetup.totalProducts ? '🟢 Ready' : '🔴 Empty'}
                </Text>
              </View>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Zero-Price Items ($0.00)</Text>
                  <Text style={s.diagSub}>
                    {report?.menuSetup.zeroPriceCount || 0} items without price
                  </Text>
                </View>
                <Text style={(report?.menuSetup.zeroPriceCount || 0) === 0 ? s.diagStatusTagGreen : s.diagStatusTagYellow}>
                  {(report?.menuSetup.zeroPriceCount || 0) === 0 ? '🟢 All Priced' : `🟡 ${report?.menuSetup.zeroPriceCount} Unpriced`}
                </Text>
              </View>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Sold-Out Availability Ratio</Text>
                  <Text style={s.diagSub}>
                    {report?.menuSetup.soldOutCount} items marked sold out ({report?.menuSetup.soldOutPercent}%)
                  </Text>
                </View>
                <Text style={(report?.menuSetup.soldOutPercent || 0) < 50 ? s.diagStatusTagGreen : s.diagStatusTagYellow}>
                  {(report?.menuSetup.soldOutPercent || 0) < 50 ? '🟢 Healthy' : '🟡 High Sold-out'}
                </Text>
              </View>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="time-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Operating Hours & Pickup Slots</Text>
                  <Text style={s.diagSub}>
                    {currentRestaurant.openingTime} – {currentRestaurant.closingTime} ({currentRestaurant.slotIntervalMinutes || 5}m slots)
                  </Text>
                </View>
                <Text style={report?.menuSetup.hoursConfigured ? s.diagStatusTagGreen : s.diagStatusTagYellow}>
                  {report?.menuSetup.hoursConfigured ? '🟢 Configured' : '🟡 Missing'}
                </Text>
              </View>
            </Card>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Edit Menu & Catalog"
                  icon="restaurant-outline"
                  onPress={() => router.push('/admin-menu')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Operating Hours"
                  icon="time-outline"
                  secondary
                  onPress={() => router.push('/admin-pickup-settings')}
                />
              </View>
            </View>
          </View>
        )}

        {/* Tab 4: Account & Staff Health */}
        {!loading && activeTab === 'staff_account' && (
          <View style={s.sectionWrap}>
            <Card style={s.diagCard}>
              <Text style={s.diagSectionTitle}>STAFF ATTENDANCE & ACCOUNT STATUS</Text>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="people-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Staff Members on Shift</Text>
                  <Text style={s.diagSub}>
                    {report?.staffAccount.activeStaffCount} staff currently clocked in
                  </Text>
                </View>
                <Text style={(report?.staffAccount.activeStaffCount || 0) > 0 ? s.diagStatusTagGreen : s.diagStatusTagYellow}>
                  {(report?.staffAccount.activeStaffCount || 0) > 0 ? '🟢 On Shift' : '🟡 0 Clocked In'}
                </Text>
              </View>

              <View style={s.diagRow}>
                <View style={s.diagIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.espresso} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.diagTitle}>Restaurant Active / Live Status</Text>
                  <Text style={s.diagSub}>
                    {currentRestaurant.isActive ? 'Active and visible in marketplace' : 'Disabled / Hidden'}
                  </Text>
                </View>
                <Text style={currentRestaurant.isActive ? s.diagStatusTagGreen : s.diagStatusTagRed}>
                  {currentRestaurant.isActive ? '🟢 Live' : '🔴 Disabled'}
                </Text>
              </View>
            </Card>

            <Button
              label="Manage Staff & Attendance"
              icon="people-outline"
              onPress={() => router.push('/admin-staff')}
            />
          </View>
        )}

        {/* Tab 5: Feature Matrix Health */}
        {!loading && activeTab === 'features' && (
          <View style={s.sectionWrap}>
            <Card style={s.diagCard}>
              <Text style={s.diagSectionTitle}>58 OPTIONAL FEATURE DIAGNOSTICS</Text>

              <View style={s.featureHero}>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureHeroNum}>
                    {report?.features.enabledCount || 58} / {report?.features.totalCount || 58}
                  </Text>
                  <Text style={s.featureHeroSub}>Active Features Enabled</Text>
                </View>
                <Ionicons name="sparkles" size={24} color={colors.caramel} />
              </View>

              <Text style={s.diagSub}>
                Click & Collect, Table QR Ordering, Rush Mode, Smart Inventory, KDS Station Routing, Digital Passes, and AI Copilot.
              </Text>
            </Card>

            <Button
              label="Open Feature Manager"
              icon="options-outline"
              onPress={() => router.push('/admin-features')}
            />
          </View>
        )}

        {/* Actionable Flagged Issues for Current Tab */}
        {!loading && tabDiagnostics.length > 0 && (
          <Card style={s.flaggedCard}>
            <Text style={s.flaggedHeader}>DIAGNOSTIC ALERTS ({tabDiagnostics.length})</Text>
            {tabDiagnostics.map((d) => (
              <View key={d.id} style={s.diagAlertItem}>
                <View style={s.diagAlertTop}>
                  <Text style={s.diagAlertIcon}>
                    {d.severity === 'red' ? '🔴' : '🟡'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.diagAlertTitle}>{d.title}</Text>
                    <Text style={s.diagAlertDesc}>{d.description}</Text>
                  </View>
                </View>
                {d.actionLabel && d.actionRoute && (
                  <Pressable
                    style={s.diagAlertBtn}
                    onPress={() => router.push(d.actionRoute as never)}
                  >
                    <Text style={s.diagAlertBtnText}>{d.actionLabel} →</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  refreshHeaderBtn: {
    padding: 7,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
    ...shadows.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.espresso,
  },
  heroSlug: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  planTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.cream,
  },
  planTagPrem: {
    backgroundColor: '#FBE8D6',
  },
  planTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.caramel,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  quickMetricsRow: {
    flexDirection: 'row',
    backgroundColor: colors.creamSoft,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
  },
  quickMetric: {
    alignItems: 'center',
    flex: 1,
  },
  qmLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 0.8,
  },
  qmValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabItemActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.espresso,
  },
  tabTextActive: {
    color: colors.white,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 8,
  },
  sectionWrap: {
    gap: 12,
  },
  diagCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  diagSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 1,
    marginBottom: 12,
  },
  diagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineLight,
    gap: 10,
  },
  diagIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  diagSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  diagStatusTagGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.green,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diagStatusTagYellow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D9822B',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diagStatusTagRed: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
    backgroundColor: '#FDECEA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diagStatusTagMuted: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  kpiBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: colors.creamSoft,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  kpiBoxNum: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
  },
  kpiBoxLbl: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    marginTop: 2,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8EB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EBD9B6',
  },
  infoNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.espresso,
  },
  featureHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.creamSoft,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  featureHeroNum: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.espresso,
  },
  featureHeroSub: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.caramel,
  },
  flaggedCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#EBD9B6',
    backgroundColor: '#FFFDF9',
    ...shadows.sm,
  },
  flaggedHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 1,
    marginBottom: 10,
  },
  diagAlertItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6CC',
  },
  diagAlertTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  diagAlertIcon: {
    fontSize: 12,
    marginTop: 2,
  },
  diagAlertTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.ink,
  },
  diagAlertDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  diagAlertBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.espresso,
  },
  diagAlertBtnText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
