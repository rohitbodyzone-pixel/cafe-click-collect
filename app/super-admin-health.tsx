import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, Card, Button, Tooltip, triggerHaptic } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useOrders } from '@/src/context/OrderContext';
import { useProducts } from '@/src/context/ProductContext';
import { colors, radii, shadows } from '@/src/theme';
import {
  computeRestaurantHealth,
  computeMorningHealthSummary,
  RestaurantHealthReport,
  MorningHealthSummary,
  HealthSeverity,
} from '@/src/services/healthMonitor';
import { supabase } from '@/src/lib/supabase';

export default function SuperAdminHealthScreen() {
  return (
    <RoleGate allowedRoles={['super_admin']} roleTitle="Super Admin Health Console">
      <SuperAdminHealthContent />
    </RoleGate>
  );
}

function SuperAdminHealthContent() {
  const { restaurants, setCurrentRestaurant } = useRestaurant();
  const { orders } = useOrders();
  const { products } = useProducts();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<RestaurantHealthReport[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<'all' | HealthSeverity>('all');
  const [search, setSearch] = useState('');
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString());

  const runHealthDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all products across restaurants if needed, or pass current products
      let allProducts = products;
      if (supabase) {
        const { data: prodsData } = await supabase.from('products').select('*');
        if (Array.isArray(prodsData)) {
          allProducts = prodsData.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price_cents / 100,
            description: p.description,
            emoji: p.emoji,
            soldOut: p.sold_out,
            customisationGroupIds: [],
            restaurantId: p.restaurant_id,
          }));
        }
      }

      const generatedReports: RestaurantHealthReport[] = [];
      for (const rest of restaurants) {
        const restProducts = allProducts.filter(
          (p: any) => p.restaurantId === rest.id || !p.restaurantId
        );
        const report = await computeRestaurantHealth(rest, orders, restProducts);
        generatedReports.push(report);
      }

      setReports(generatedReports);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to run diagnostics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurants, orders, products]);

  useEffect(() => {
    void runHealthDiagnostics();
  }, [runHealthDiagnostics]);

  const onRefresh = () => {
    triggerHaptic('medium');
    setRefreshing(true);
    void runHealthDiagnostics();
  };

  const summary: MorningHealthSummary = useMemo(() => {
    return computeMorningHealthSummary(reports);
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchFilter = filterSeverity === 'all' || r.overallStatus === filterSeverity;
      const matchSearch =
        !search.trim() ||
        r.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
        r.restaurantSlug.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [reports, filterSeverity, search]);

  const handleInspectRestaurant = (report: RestaurantHealthReport) => {
    triggerHaptic('light');
    const target = restaurants.find((r) => r.id === report.restaurantId);
    if (target) {
      setCurrentRestaurant(target);
      router.push({
        pathname: '/admin-health',
        params: { restaurantId: target.id },
      });
    }
  };

  return (
    <Screen>
      <Header
        title="Restaurant Health & Alert Center"
        right={
          <Tooltip text="Refresh Diagnostics">
            <Pressable
              style={s.refreshHeaderBtn}
              onPress={onRefresh}
              accessibilityLabel="Refresh Diagnostics"
            >
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
        {/* Morning Health Summary Banner */}
        <View style={s.summaryBanner}>
          <View style={s.summaryHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={s.livePulseDot} />
                <Text style={s.summaryEyebrow}>SUPER ADMIN · MORNING HEALTH CHECK</Text>
              </View>
              <Text style={s.summaryTitle}>Global Fleet Telemetry</Text>
              <Text style={s.summarySubtitle}>
                Live diagnostic monitoring across {summary.totalRestaurants} active restaurant nodes. Last scan at {lastCheckTime}.
              </Text>
            </View>
            <Tooltip text="Run Diagnostic Scan">
              <Pressable style={s.scanBtn} onPress={onRefresh}>
                <Ionicons name="pulse-outline" size={14} color={colors.white} />
                <Text style={s.scanBtnText}>Run Scan</Text>
              </Pressable>
            </Tooltip>
          </View>

          {/* KPI Mini-Cards */}
          <View style={s.kpiGrid}>
            <Pressable
              style={[s.kpiCard, filterSeverity === 'all' && s.kpiCardActive]}
              onPress={() => {
                triggerHaptic('light');
                setFilterSeverity('all');
              }}
            >
              <Text style={s.kpiNum}>{summary.totalRestaurants}</Text>
              <Text style={s.kpiLabel}>Total Cafes</Text>
            </Pressable>

            <Pressable
              style={[
                s.kpiCard,
                s.kpiCardGreen,
                filterSeverity === 'green' && s.kpiCardActiveGreen,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setFilterSeverity('green');
              }}
            >
              <Text style={[s.kpiNum, { color: colors.green }]}>
                🟢 {summary.healthyCount}
              </Text>
              <Text style={s.kpiLabel}>Healthy</Text>
            </Pressable>

            <Pressable
              style={[
                s.kpiCard,
                s.kpiCardYellow,
                filterSeverity === 'yellow' && s.kpiCardActiveYellow,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setFilterSeverity('yellow');
              }}
            >
              <Text style={[s.kpiNum, { color: '#B27400' }]}>
                🟡 {summary.warningCount}
              </Text>
              <Text style={s.kpiLabel}>Warnings</Text>
            </Pressable>

            <Pressable
              style={[
                s.kpiCard,
                s.kpiCardRed,
                filterSeverity === 'red' && s.kpiCardActiveRed,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setFilterSeverity('red');
              }}
            >
              <Text style={[s.kpiNum, { color: colors.danger }]}>
                🔴 {summary.criticalCount}
              </Text>
              <Text style={s.kpiLabel}>Critical</Text>
            </Pressable>
          </View>

          {/* Quick Issue Highlights */}
          {(summary.totalStuckOrders > 0 || summary.totalFailedPayments > 0) && (
            <View style={s.alertRibbon}>
              <Ionicons name="warning" size={16} color={colors.white} />
              <Text style={s.alertRibbonText}>
                Action Required: {summary.totalStuckOrders} delayed/stuck orders and{' '}
                {summary.totalFailedPayments} payment exceptions detected.
              </Text>
            </View>
          )}
        </View>

        {/* Filter Pills & Search */}
        <View style={s.filterRow}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={16} color={colors.muted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by restaurant or slug…"
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
            />
            {!!search && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Status Filter Chips */}
        <View style={s.pillsScroll}>
          <Pressable
            style={[s.filterPill, filterSeverity === 'all' && s.filterPillActive]}
            onPress={() => setFilterSeverity('all')}
          >
            <Text style={[s.filterPillText, filterSeverity === 'all' && s.filterPillTextActive]}>
              All ({reports.length})
            </Text>
          </Pressable>
          <Pressable
            style={[s.filterPill, filterSeverity === 'green' && s.filterPillActiveGreen]}
            onPress={() => setFilterSeverity('green')}
          >
            <Text
              style={[
                s.filterPillText,
                filterSeverity === 'green' && s.filterPillTextActiveGreen,
              ]}
            >
              🟢 Healthy ({summary.healthyCount})
            </Text>
          </Pressable>
          <Pressable
            style={[s.filterPill, filterSeverity === 'yellow' && s.filterPillActiveYellow]}
            onPress={() => setFilterSeverity('yellow')}
          >
            <Text
              style={[
                s.filterPillText,
                filterSeverity === 'yellow' && s.filterPillTextActiveYellow,
              ]}
            >
              🟡 Warnings ({summary.warningCount})
            </Text>
          </Pressable>
          <Pressable
            style={[s.filterPill, filterSeverity === 'red' && s.filterPillActiveRed]}
            onPress={() => setFilterSeverity('red')}
          >
            <Text
              style={[
                s.filterPillText,
                filterSeverity === 'red' && s.filterPillTextActiveRed,
              ]}
            >
              🔴 Critical ({summary.criticalCount})
            </Text>
          </Pressable>
        </View>

        {/* Loading Indicator */}
        {loading && !refreshing && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={colors.espresso} />
            <Text style={s.loadingText}>Running fleet health diagnostics…</Text>
          </View>
        )}

        {/* Fleet Restaurant Health Cards */}
        {!loading && (
          <View style={s.listWrap}>
            {filteredReports.map((report) => {
              const isGreen = report.overallStatus === 'green';
              const isYellow = report.overallStatus === 'yellow';
              const isRed = report.overallStatus === 'red';

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

              return (
                <Card
                  key={report.restaurantId}
                  style={[
                    s.restCard,
                    isRed && s.restCardRed,
                    isYellow && s.restCardYellow,
                  ]}
                >
                  {/* Top Bar with Name & Status Badge */}
                  <View style={s.cardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.restName}>{report.restaurantName}</Text>
                        <View style={[s.planTag, report.plan === 'premium' && s.planTagPrem]}>
                          <Text style={s.planTagText}>{report.plan.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={s.restSlug}>/{report.restaurantSlug}</Text>
                    </View>

                    {/* Overall Severity Badge */}
                    <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
                      <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[s.statusBadgeText, { color: statusColor }]}>
                        {isRed ? 'CRITICAL' : isYellow ? 'WARNINGS' : 'HEALTHY'}
                      </Text>
                    </View>
                  </View>

                  {/* Operational Telemetry Grid */}
                  <View style={s.telemetryGrid}>
                    <View style={s.telemetryItem}>
                      <Text style={s.telemetryLabel}>REALTIME DB</Text>
                      <Text style={s.telemetryVal}>
                        {report.connection.dbRealtime === 'connected' ? '🟢 Online' : '🔴 Disconnected'}
                      </Text>
                    </View>

                    <View style={s.telemetryItem}>
                      <Text style={s.telemetryLabel}>KITCHEN KDS</Text>
                      <Text style={s.telemetryVal}>
                        {report.connection.kitchenStatus === 'online'
                          ? '🟢 Active'
                          : report.connection.kitchenStatus === 'idle'
                            ? '🟡 Standby'
                            : '⚪ Offline'}
                      </Text>
                    </View>

                    <View style={s.telemetryItem}>
                      <Text style={s.telemetryLabel}>COUNTER POS</Text>
                      <Text style={s.telemetryVal}>
                        {report.connection.counterStatus === 'online'
                          ? '🟢 Active'
                          : report.connection.counterStatus === 'idle'
                            ? '🟡 Standby'
                            : '⚪ Offline'}
                      </Text>
                    </View>

                    <View style={s.telemetryItem}>
                      <Text style={s.telemetryLabel}>HARDWARE PRINTER</Text>
                      <Text style={s.telemetryValSub} numberOfLines={1}>
                        {report.connection.printerStatus}
                      </Text>
                    </View>
                  </View>

                  {/* Order & Menu Counters */}
                  <View style={s.metricChipsRow}>
                    <View style={s.metricChip}>
                      <Ionicons name="receipt-outline" size={13} color={colors.espresso} />
                      <Text style={s.metricChipText}>
                        {report.orderFlow.activeOrdersCount} Active Orders
                      </Text>
                    </View>

                    <View style={s.metricChip}>
                      <Ionicons name="fast-food-outline" size={13} color={colors.espresso} />
                      <Text style={s.metricChipText}>
                        {report.menuSetup.totalProducts} Items ({report.menuSetup.soldOutPercent}% sold out)
                      </Text>
                    </View>

                    <View style={s.metricChip}>
                      <Ionicons name="people-outline" size={13} color={colors.espresso} />
                      <Text style={s.metricChipText}>
                        {report.staffAccount.activeStaffCount} Staff on Shift
                      </Text>
                    </View>
                  </View>

                  {/* Flagged Issues if any */}
                  {report.diagnostics.length > 0 && (
                    <View style={s.issuesBox}>
                      <Text style={s.issuesHeader}>
                        DIAGNOSTIC ISSUES ({report.criticalCount} Critical · {report.warningCount} Warnings)
                      </Text>
                      {report.diagnostics.slice(0, 2).map((diag) => (
                        <View key={diag.id} style={s.issueRow}>
                          <Text style={s.issueBullet}>
                            {diag.severity === 'red' ? '🔴' : '🟡'}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={s.issueTitle}>{diag.title}</Text>
                            <Text style={s.issueDesc} numberOfLines={1}>
                              {diag.description}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions Footer */}
                  <View style={s.cardFooter}>
                    <Pressable
                      style={s.inspectBtn}
                      onPress={() => handleInspectRestaurant(report)}
                    >
                      <Text style={s.inspectBtnText}>View Diagnostic Details →</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.espresso} />
                    </Pressable>
                  </View>
                </Card>
              );
            })}

            {filteredReports.length === 0 && (
              <View style={s.emptyBox}>
                <Ionicons name="checkmark-circle-outline" size={42} color={colors.green} />
                <Text style={s.emptyTitle}>No matching restaurants found</Text>
                <Text style={s.emptySub}>
                  No cafe records match the selected severity filter or search query.
                </Text>
              </View>
            )}
          </View>
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
  summaryBanner: {
    backgroundColor: colors.espresso,
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
    ...shadows.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34A853',
  },
  summaryEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DDBB9B',
    letterSpacing: 1.1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.white,
    marginTop: 2,
  },
  summarySubtitle: {
    fontSize: 11,
    color: '#E7DCD5',
    marginTop: 2,
    lineHeight: 15,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.sm,
  },
  scanBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  kpiCardActive: {
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  kpiCardGreen: {
    backgroundColor: 'rgba(52, 168, 83, 0.15)',
    borderColor: 'rgba(52, 168, 83, 0.3)',
  },
  kpiCardActiveGreen: {
    borderColor: '#34A853',
    backgroundColor: 'rgba(52, 168, 83, 0.28)',
  },
  kpiCardYellow: {
    backgroundColor: 'rgba(251, 188, 4, 0.15)',
    borderColor: 'rgba(251, 188, 4, 0.3)',
  },
  kpiCardActiveYellow: {
    borderColor: '#FBBC04',
    backgroundColor: 'rgba(251, 188, 4, 0.28)',
  },
  kpiCardRed: {
    backgroundColor: 'rgba(234, 67, 53, 0.15)',
    borderColor: 'rgba(234, 67, 53, 0.3)',
  },
  kpiCardActiveRed: {
    borderColor: '#EA4335',
    backgroundColor: 'rgba(234, 67, 53, 0.28)',
  },
  kpiNum: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.white,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DDBB9B',
    marginTop: 2,
  },
  alertRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  alertRibbonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  filterRow: {
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
  },
  pillsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterPillActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  filterPillActiveGreen: {
    backgroundColor: '#E6F4EA',
    borderColor: colors.green,
  },
  filterPillActiveYellow: {
    backgroundColor: '#FFF8E7',
    borderColor: '#D9822B',
  },
  filterPillActiveRed: {
    backgroundColor: '#FDECEA',
    borderColor: colors.danger,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.espresso,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  filterPillTextActiveGreen: {
    color: colors.green,
  },
  filterPillTextActiveYellow: {
    color: '#D9822B',
  },
  filterPillTextActiveRed: {
    color: colors.danger,
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
  listWrap: {
    gap: 12,
  },
  restCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    ...shadows.sm,
  },
  restCardRed: {
    borderColor: '#F5C6CB',
    backgroundColor: '#FFFDFD',
  },
  restCardYellow: {
    borderColor: '#FCE8B2',
    backgroundColor: '#FFFFFD',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.espresso,
  },
  restSlug: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 1,
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
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.creamSoft,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  telemetryItem: {
    width: '47%',
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.8,
  },
  telemetryVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 1,
  },
  telemetryValSub: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 1,
  },
  metricChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineLight,
  },
  metricChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.espresso,
  },
  issuesBox: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EBD9B6',
    marginBottom: 10,
  },
  issuesHeader: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  issueBullet: {
    fontSize: 10,
    marginTop: 1,
  },
  issueTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
  },
  issueDesc: {
    fontSize: 10,
    color: colors.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.lineLight,
    paddingTop: 10,
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  inspectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.espresso,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 280,
  },
});
