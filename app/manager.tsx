import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, Card, Button, triggerHaptic } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { useOrders } from '@/src/context/OrderContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { supabase } from '@/src/lib/supabase';
import { colors, radii, shadows } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { money } from '@/src/data/products';
import { TableServiceAlerts } from '@/src/components/TableServiceAlerts';

export default function ManagerScreen() {
  return (
    <RoleGate
      allowedRoles={['manager', 'owner', 'super_admin', 'staff']}
      roleTitle="Restaurant Manager"
    >
      <ManagerContent />
    </RoleGate>
  );
}

function ManagerContent() {
  const auth = useAdminAuth();
  const { currentRestaurant } = useRestaurant();
  const { orders } = useOrders();
  const { isFeatureEnabled } = useFeaturePermission();

  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  const [rushExtraMins, setRushExtraMins] = useState(currentRestaurant.rush_wait_extra_minutes || 0);
  const [ordersPaused, setOrdersPaused] = useState(currentRestaurant.is_orders_paused || false);
  const [busyRush, setBusyRush] = useState(false);

  useEffect(() => {
    loadActiveStaff();
  }, [currentRestaurant.id]);

  const loadActiveStaff = async () => {
    if (!supabase || !currentRestaurant?.id) return;
    try {
      const { data } = await supabase.rpc('get_active_staff_attendance', {
        p_restaurant_id: currentRestaurant.id,
      });
      if (Array.isArray(data)) setActiveStaff(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRush = async (extra: number, pause: boolean) => {
    triggerHaptic('medium');
    setBusyRush(true);
    try {
      if (supabase) {
        await supabase.rpc('set_restaurant_rush_mode', {
          p_restaurant_id: currentRestaurant.id,
          p_orders_paused: pause,
          p_extra_minutes: extra,
          p_message: 'Manager updated prep capacity',
        });
      }
      setRushExtraMins(extra);
      setOrdersPaused(pause);
    } catch (e: any) {
      alert(e.message || 'Could not update rush mode');
    } finally {
      setBusyRush(false);
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status === 'Incoming' || o.status === 'Accepted' || o.status === 'Preparing',
  ).length;

  const todayPaidRevenue = orders
    .filter((o) => o.paymentStatus === 'paid' || o.status === 'Collected')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <Screen>
      <Header
        title="Manager Console"
        right={
          <Pressable onPress={() => void auth.signOut()}>
            <Text style={s.signOutText}>Sign out</Text>
          </Pressable>
        }
      />

      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {/* Live Table Requests & Bell Alerts */}
        <TableServiceAlerts title="Active Table Calls" />

        {/* Banner with Restaurant & Manager info */}
        <View style={s.topBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.staffRole}>
              MANAGER SESSION · {auth.staff?.displayName || auth.staff?.email}
            </Text>
            <Text style={s.restaurantName}>{currentRestaurant.name}</Text>
          </View>
        </View>

        {/* Daily Operational KPIs */}
        <View style={s.kpiRow}>
          <Card style={s.kpiCard}>
            <Text style={s.kpiLabel}>Active Orders</Text>
            <Text style={s.kpiValue}>{activeOrdersCount}</Text>
            <Text style={s.kpiSub}>In preparation</Text>
          </Card>
          <Card style={[s.kpiCard, { backgroundColor: colors.espresso }]}>
            <Text style={[s.kpiLabel, { color: colors.caramel }]}>Today's Sales</Text>
            <Text style={[s.kpiValue, { color: colors.white }]}>{money(todayPaidRevenue)}</Text>
            <Text style={[s.kpiSub, { color: 'rgba(255,255,255,0.7)' }]}>Paid tickets</Text>
          </Card>
          <Card style={s.kpiCard}>
            <Text style={s.kpiLabel}>On Shift</Text>
            <Text style={s.kpiValue}>{activeStaff.length}</Text>
            <Text style={s.kpiSub}>Clocked in</Text>
          </Card>
        </View>

        {/* Staff Attendance / Who is Clocked In Right Now */}
        <Card style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Ionicons name="time-outline" size={18} color={colors.espresso} />
            <Text style={s.sectionTitle}>ACTIVE TEAM ON SHIFT ({activeStaff.length})</Text>
          </View>
          {activeStaff.length === 0 ? (
            <Text style={s.emptyStaffText}>No staff members currently clocked in.</Text>
          ) : (
            <View style={s.staffList}>
              {activeStaff.map((st) => (
                <View key={st.id} style={s.staffRow}>
                  <View style={s.statusDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.staffItemName}>{st.staff_name}</Text>
                    <Text style={s.staffItemTime}>
                      Clocked in at {new Date(st.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({st.minutes_elapsed}m elapsed)
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Rush Mode Dual Controls */}
        {isFeatureEnabled('rush_mode') && (
          <Card style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <Ionicons name="flame" size={18} color={colors.caramel} />
              <Text style={s.sectionTitle}>RUSH & CAPACITY BALANCING</Text>
            </View>
            <Text style={s.knobLabel}>1. ADD EXTRA PREP TIME TO PICKUP SLOTS:</Text>
            <View style={s.rushButtonsRow}>
              {[0, 5, 10, 15, 20].map((mins) => (
                <Pressable
                  key={mins}
                  style={[s.rushBtn, rushExtraMins === mins && s.rushBtnActive]}
                  onPress={() => handleUpdateRush(mins, ordersPaused)}
                >
                  <Text style={[s.rushBtnText, rushExtraMins === mins && s.rushBtnTextActive]}>
                    {mins === 0 ? 'Normal (+0)' : `+${mins}m`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.pauseRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.pauseTitle}>Pause Incoming Orders</Text>
                <Text style={s.pauseDesc}>Temporarily disables new pre-orders during kitchen overload</Text>
              </View>
              <Switch
                value={ordersPaused}
                onValueChange={(val) => handleUpdateRush(rushExtraMins, val)}
                trackColor={{ false: colors.line, true: colors.danger }}
              />
            </View>
          </Card>
        )}

        {/* Primary Operational Action Links */}
        <Text style={s.gridTitle}>MANAGER OPERATIONS & STATIONS</Text>
        <View style={s.linkGrid}>
          <ManagerActionLink
            icon="restaurant-outline"
            title="Manage Menu"
            subtitle="Add, edit, duplicate, pricing & sold-out controls"
            route="/admin-menu"
          />
          <ManagerActionLink
            icon="document-text-outline"
            title="Upload Menu PDF"
            subtitle="Quick Menu Builder from PDF or photo"
            route="/admin-menu-pdf"
          />
          <ManagerActionLink
            icon="notifications-outline"
            title="Table Requests"
            subtitle="View & resolve active table calls"
            route="/admin-tables"
          />
          <ManagerActionLink
            icon="speedometer-outline"
            title="Kitchen KDS"
            subtitle="Live preparation queue & station routing"
            route="/kitchen"
          />
          <ManagerActionLink
            icon="calculator-outline"
            title="Counter Terminal"
            subtitle="Take counter orders & staff clock in/out"
            route="/counter"
          />
          <ManagerActionLink
            icon="construct-outline"
            title="Operations & Hardware"
            subtitle="Checklists, SOPs, inventory & printers"
            route="/admin-operations"
          />
          <ManagerActionLink
            icon="sparkles-outline"
            title="AI Copilot & Insights"
            subtitle="Daily briefing & expected busy times"
            route="/admin-ai"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function ManagerActionLink({
  icon,
  title,
  subtitle,
  route,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
}) {
  return (
    <Pressable style={s.actionCard} onPress={() => router.push(route as any)}>
      <View style={s.actionIconWrap}>
        <Ionicons name={icon} size={22} color={colors.espresso} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.actionTitle}>{title}</Text>
        <Text style={s.actionSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  signOutText: { color: colors.caramel, fontWeight: '800', fontSize: 13 },
  topBanner: { marginBottom: 14 },
  staffRole: { fontSize: 11, fontWeight: '800', color: colors.caramel, letterSpacing: 0.8 },
  restaurantName: { fontSize: 22, fontWeight: '900', color: colors.espresso, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: colors.white, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  kpiLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.3 },
  kpiValue: { fontSize: 20, fontWeight: '900', color: colors.espresso, marginVertical: 3 },
  kpiSub: { fontSize: 11, color: colors.muted },
  sectionCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: colors.espresso, letterSpacing: 0.5 },
  emptyStaffText: { fontSize: 12, color: colors.muted },
  staffList: { gap: 10 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  staffItemName: { fontSize: 14, fontWeight: '800', color: colors.espresso },
  staffItemTime: { fontSize: 11, color: colors.muted },
  knobLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 8 },
  rushButtonsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  rushBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.creamSoft, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line },
  rushBtnActive: { backgroundColor: colors.espresso, borderColor: colors.espresso, ...shadows.sm },
  rushBtnText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  rushBtnTextActive: { color: colors.white },
  pauseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  pauseTitle: { fontSize: 14, fontWeight: '900', color: colors.danger },
  pauseDesc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  gridTitle: { fontSize: 12, fontWeight: '800', color: colors.caramel, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8, marginBottom: 12 },
  linkGrid: { gap: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  actionIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionTitle: { fontSize: 15, fontWeight: '900', color: colors.espresso },
  actionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
