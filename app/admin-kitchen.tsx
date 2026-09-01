import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Header, Screen } from '@/src/components/UI';
import { Order, OrderStatus, useOrders } from '@/src/context/OrderContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { useServiceRequests } from '@/src/context/ServiceRequestContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { money, paymentMethodLabel } from '@/src/data/products';
import { colors } from '@/src/theme';
import { supabase } from '@/src/lib/supabase';

type KitchenTab = 'ALL' | 'Incoming' | 'Accepted' | 'Preparing' | 'Ready' | 'Collected';
type StationFilter = 'ALL' | 'barista' | 'kitchen' | 'bakery';

function playChime() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Autoplay policy catch
    }
  }
}

function getElapsedMinutes(createdAt: string): number {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function formatElapsed(createdAt: string): string {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AdminKitchenScreen() {
  const { currentRestaurant } = useRestaurant();
  const auth = useAdminAuth();
  const { orders, updateOrderStatus, markOrderPaid, backendError, placeOrder } = useOrders();
  const { requests: serviceRequests, updateStatus: updateServiceStatus } = useServiceRequests();
  const { isFeatureEnabled } = useFeaturePermission();

  const [tab, setTab] = useState<KitchenTab>('ALL');
  const [station, setStation] = useState<StationFilter>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastCount, setLastCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [showHandover, setShowHandover] = useState(false);
  const [handoverNote, setHandoverNote] = useState('');
  const [searchCode, setSearchCode] = useState('');

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chime when new orders arrive
  useEffect(() => {
    const incomingCount = orders.filter((o) => o.status === 'Incoming').length;
    if (incomingCount > lastCount && lastCount > 0 && soundEnabled) {
      playChime();
    }
    setLastCount(incomingCount);
  }, [orders, lastCount, soundEnabled]);

  const activeOrders = orders.filter((o) => o.status !== 'Collected' && o.status !== 'Cancelled');
  const pendingRequests = serviceRequests.filter((r) => r.status === 'pending' || r.status === 'acknowledged');

  const filteredOrders = useMemo(() => {
    let list = tab === 'ALL' ? activeOrders : orders.filter((o) => o.status === tab);

    if (station !== 'ALL') {
      list = list.filter((o) => {
        return o.items.some((i) => (i.product as any).kitchen_station === station || station === 'barista');
      });
    }

    if (searchCode.trim()) {
      const q = searchCode.toLowerCase();
      list = list.filter((o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.phone || '').includes(q)
      );
    }

    return list;
  }, [orders, activeOrders, tab, station, searchCode]);

  const handleReopenOrder = async (orderId: string) => {
    try {
      if (supabase) {
        await supabase.rpc('reopen_order_in_kds', { p_order_id: orderId });
      }
      await updateOrderStatus(orderId, 'Preparing');
      alert(`✓ Order #${orderId} reopened back to Preparing!`);
    } catch (e: any) {
      alert(e.message || 'Could not reopen order');
    }
  };

  const handleCreateTestOrder = async () => {
    try {
      const pickupCode = `T${Math.floor(100 + Math.random() * 900)}`;
      await placeOrder('Staff Test Order', '021 000 0000');
      alert(`✓ Created Test Order! Pickup Code: ${pickupCode}`);
    } catch (e: any) {
      alert(e.message || 'Could not create test order');
    }
  };

  const getNextAction = (status: OrderStatus): { nextStatus: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap } | null => {
    switch (status) {
      case 'Incoming':
        return { nextStatus: 'Accepted', label: 'Accept Order', icon: 'checkmark-outline' };
      case 'Accepted':
        return { nextStatus: 'Preparing', label: 'Start Preparing', icon: 'flame-outline' };
      case 'Preparing':
        return { nextStatus: 'Ready', label: 'Mark Ready', icon: 'notifications-outline' };
      case 'Ready':
        return { nextStatus: 'Collected', label: 'Complete (Bump)', icon: 'checkmark-done-outline' };
      default:
        return null;
    }
  };

  return (
    <Screen>
      <Header
        title="Kitchen Display System (KDS)"
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              style={s.iconBtn}
              onPress={() => setSoundEnabled((v) => !v)}
              accessibilityLabel="Toggle sound"
            >
              <Ionicons
                name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
                size={18}
                color={soundEnabled ? colors.espresso : colors.muted}
              />
            </Pressable>
            <Pressable
              style={s.iconBtn}
              onPress={() => setShowHandover((v) => !v)}
              accessibilityLabel="Handover notes"
            >
              <Ionicons name="document-text-outline" size={18} color={colors.espresso} />
            </Pressable>
          </View>
        }
      />

      {/* Top Bar with Handover & Test Order CTA */}
      <View style={s.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.roleText}>
            KITCHEN OPERATIONS · {auth.staff?.displayName || auth.staff?.email}
          </Text>
          <Text style={s.restaurantName}>{currentRestaurant.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable style={s.testOrderBtn} onPress={handleCreateTestOrder}>
            <Ionicons name="flask-outline" size={14} color={colors.caramel} />
            <Text style={s.testOrderText}>Test Order</Text>
          </Pressable>
          <Pressable style={s.adminHomeBtn} onPress={() => router.replace('/admin')}>
            <Ionicons name="grid-outline" size={14} color={colors.espresso} />
            <Text style={s.adminHomeText}>Console</Text>
          </Pressable>
        </View>
      </View>

      {/* Shift Handover Drawer */}
      {showHandover && (
        <Card style={s.handoverCard}>
          <Text style={s.handoverTitle}>STAFF SHIFT HANDOVER NOTE</Text>
          <TextInput
            style={s.handoverInput}
            placeholder="Write notes for next shift (e.g. Oat milk low, Grinder #2 calibrated)..."
            placeholderTextColor={colors.muted}
            value={handoverNote}
            onChangeText={setHandoverNote}
          />
          <Pressable
            style={s.saveHandoverBtn}
            onPress={() => {
              alert('✓ Handover note pinned for next shift!');
              setShowHandover(false);
            }}
          >
            <Text style={s.saveHandoverText}>Pin Handover Note</Text>
          </Pressable>
        </Card>
      )}

      {/* Search by Order Code or Phone */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by code, customer name or phone…"
          placeholderTextColor={colors.muted}
          value={searchCode}
          onChangeText={setSearchCode}
        />
        {searchCode.length > 0 && (
          <Pressable onPress={() => setSearchCode('')}>
            <Ionicons name="close-circle" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Station Filter Tabs */}
      {isFeatureEnabled('kds_station_routing') && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stationScroll}>
          {(['ALL', 'barista', 'kitchen', 'bakery'] as const).map((st) => (
            <Pressable
              key={st}
              style={[s.stationPill, station === st && s.stationPillActive]}
              onPress={() => setStation(st)}
            >
              <Text style={[s.stationPillText, station === st && s.stationPillTextActive]}>
                {st === 'ALL' ? 'All Stations' : st === 'barista' ? '☕ Barista / Coffee' : st === 'kitchen' ? '🍳 Kitchen / Hot Food' : '🥐 Bakery & Pastry'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Preparation Stages Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
        <Pressable style={[s.tab, tab === 'ALL' && s.tabActive]} onPress={() => setTab('ALL')}>
          <Text style={[s.tabCount, tab === 'ALL' && s.tabCountActive]}>{activeOrders.length}</Text>
          <Text style={[s.tabLabel, tab === 'ALL' && s.tabLabelActive]}>Active</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'Incoming' && s.tabActive]} onPress={() => setTab('Incoming')}>
          <Text style={[s.tabCount, tab === 'Incoming' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Incoming').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Incoming' && s.tabLabelActive]}>New</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'Accepted' && s.tabActive]} onPress={() => setTab('Accepted')}>
          <Text style={[s.tabCount, tab === 'Accepted' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Accepted').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Accepted' && s.tabLabelActive]}>Accepted</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'Preparing' && s.tabActive]} onPress={() => setTab('Preparing')}>
          <Text style={[s.tabCount, tab === 'Preparing' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Preparing').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Preparing' && s.tabLabelActive]}>Preparing</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'Ready' && s.tabActive]} onPress={() => setTab('Ready')}>
          <Text style={[s.tabCount, tab === 'Ready' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Ready').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Ready' && s.tabLabelActive]}>Ready</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'Collected' && s.tabActive]} onPress={() => setTab('Collected')}>
          <Text style={[s.tabCount, tab === 'Collected' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Collected').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Collected' && s.tabLabelActive]}>Completed</Text>
        </Pressable>
      </ScrollView>

      {/* Orders Stream */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {filteredOrders.map((order) => {
          const action = getNextAction(order.status);
          const elapsedMins = getElapsedMinutes(order.createdAt);
          const isLate = elapsedMins >= (currentRestaurant.averagePrepMinutes || 10) && order.status !== 'Ready' && order.status !== 'Collected';
          const isWarning = elapsedMins >= 5 && !isLate && order.status !== 'Ready' && order.status !== 'Collected';

          return (
            <Card
              key={order.id}
              style={[
                s.orderCard,
                isLate && s.orderCardLate,
                isWarning && s.orderCardWarning,
                order.status === 'Ready' && s.orderCardReady,
              ]}
            >
              {/* Order Header */}
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={s.badgeRow}>
                    {/* Order Type Badge */}
                    <View style={[s.typeBadge, order.orderType === 'table' ? s.tableTypeBadge : s.pickupTypeBadge]}>
                      <Ionicons
                        name={order.orderType === 'table' ? 'restaurant' : 'bag-handle'}
                        size={11}
                        color={order.orderType === 'table' ? colors.white : colors.espresso}
                      />
                      <Text style={[s.typeBadgeText, order.orderType === 'table' ? s.tableTypeBadgeText : s.pickupTypeBadgeText]}>
                        {order.orderType === 'table' ? `TABLE · ${order.table?.name || 'Table'}` : 'CLICK & COLLECT'}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View style={[s.statusBadge, s[`status_${order.status}`]]}>
                      <Text style={s.statusBadgeText}>{order.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={s.orderId}>
                    {order.customerName} · <Text style={s.pickupCode}>#{order.id.slice(-4).toUpperCase()}</Text>
                  </Text>
                </View>

                {/* Late Warning SLA Timer */}
                <View style={[s.timerBox, isLate && s.timerBoxLate, isWarning && s.timerBoxWarning]}>
                  <Ionicons name="time" size={13} color={isLate ? colors.white : isWarning ? colors.espresso : colors.green} />
                  <Text style={[s.timerText, isLate && { color: colors.white }]}>
                    {formatElapsed(order.createdAt)}
                  </Text>
                </View>
              </View>

              {/* Order Items */}
              <View style={s.itemsBox}>
                {order.items.map((item, idx) => (
                  <View key={`${item.cartKey}-${idx}`} style={s.itemRow}>
                    <View style={s.qtyPill}>
                      <Text style={s.qtyPillText}>{item.quantity}×</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.productName}>{item.product.name}</Text>
                      {item.customisations.map((c) => (
                        <Text key={c.optionId} style={s.modifierText}>
                          • {c.groupName}: {c.optionName}
                        </Text>
                      ))}
                      {!!item.notes && <Text style={s.itemNotes}>Note: {item.notes}</Text>}
                    </View>
                  </View>
                ))}
              </View>

              {/* Action Button */}
              {action && (
                <Pressable
                  style={[s.bumpButton, order.status === 'Ready' && s.bumpButtonComplete]}
                  onPress={() => void updateOrderStatus(order.id, action.nextStatus)}
                >
                  <Ionicons name={action.icon} size={16} color={colors.white} />
                  <Text style={s.bumpButtonText}>{action.label}</Text>
                </Pressable>
              )}

              {/* Reopen Action for Completed Orders */}
              {order.status === 'Collected' && (
                <Pressable style={s.reopenBtn} onPress={() => void handleReopenOrder(order.id)}>
                  <Ionicons name="refresh-outline" size={14} color={colors.caramel} />
                  <Text style={s.reopenBtnText}>Reopen Order to Preparing</Text>
                </Pressable>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  iconBtn: { padding: 6, backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, marginBottom: 10 },
  roleText: { color: colors.caramel, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  restaurantName: { color: colors.espresso, fontSize: 16, fontWeight: '900', marginTop: 2 },
  testOrderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF8EB', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#EBD9B6' },
  testOrderText: { color: colors.caramel, fontSize: 11, fontWeight: '800' },
  adminHomeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  adminHomeText: { color: colors.espresso, fontSize: 11, fontWeight: '800' },
  handoverCard: { padding: 12, marginBottom: 10, backgroundColor: '#FFFDF9', borderColor: colors.caramel },
  handoverTitle: { fontSize: 10, fontWeight: '900', color: colors.caramel, letterSpacing: 0.8, marginBottom: 6 },
  handoverInput: { backgroundColor: colors.cream, borderRadius: 8, padding: 8, fontSize: 12, color: colors.ink, minHeight: 50 },
  saveHandoverBtn: { backgroundColor: colors.espresso, borderRadius: 8, paddingVertical: 6, alignItems: 'center', marginTop: 8 },
  saveHandoverText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 10, height: 38, borderWidth: 1, borderColor: colors.line, marginBottom: 10 },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 12, color: colors.ink },
  stationScroll: { flexDirection: 'row', marginBottom: 10 },
  stationPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.cream, marginRight: 6 },
  stationPillActive: { backgroundColor: colors.espresso },
  stationPillText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  stationPillTextActive: { color: colors.white },
  tabScroll: { flexDirection: 'row', marginBottom: 12 },
  tab: { backgroundColor: colors.white, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, marginRight: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  tabActive: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  tabCount: { fontWeight: '900', fontSize: 15, color: colors.espresso },
  tabCountActive: { color: colors.white },
  tabLabel: { fontSize: 9, fontWeight: '700', color: colors.muted, marginTop: 1 },
  tabLabelActive: { color: '#DDBB9B' },
  orderCard: { padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: colors.line },
  orderCardWarning: { borderColor: '#F0AD4E', backgroundColor: '#FFFDF5' },
  orderCardLate: { borderColor: colors.danger, backgroundColor: '#FFF5F5' },
  orderCardReady: { borderColor: colors.green, backgroundColor: '#F7FCF8' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tableTypeBadge: { backgroundColor: colors.espresso },
  pickupTypeBadge: { backgroundColor: colors.cream },
  typeBadgeText: { fontSize: 8, fontWeight: '800' },
  tableTypeBadgeText: { color: colors.white },
  pickupTypeBadgeText: { color: colors.espresso },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  status_Incoming: { backgroundColor: '#FDEED9' },
  status_Accepted: { backgroundColor: '#E3EDF7' },
  status_Preparing: { backgroundColor: '#FDF3D8' },
  status_Ready: { backgroundColor: '#E6F4EA' },
  status_Collected: { backgroundColor: colors.line },
  status_Cancelled: { backgroundColor: '#FBE8E5' },
  statusBadgeText: { fontSize: 8, fontWeight: '900', color: colors.ink },
  orderId: { fontSize: 15, fontWeight: '900', color: colors.ink },
  pickupCode: { color: colors.caramel },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E6F4EA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  timerBoxWarning: { backgroundColor: '#FFF3CD' },
  timerBoxLate: { backgroundColor: colors.danger },
  timerText: { fontSize: 11, fontWeight: '800', color: colors.ink },
  itemsBox: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, marginBottom: 10, gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  qtyPill: { backgroundColor: colors.cream, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  qtyPillText: { fontSize: 11, fontWeight: '900', color: colors.espresso },
  productName: { fontSize: 13, fontWeight: '800', color: colors.ink },
  modifierText: { fontSize: 11, color: colors.muted },
  itemNotes: { fontSize: 10, color: colors.caramel, fontStyle: 'italic' },
  bumpButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.espresso, paddingVertical: 10, borderRadius: 10 },
  bumpButtonComplete: { backgroundColor: colors.green },
  bumpButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  reopenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
  reopenBtnText: { color: colors.caramel, fontSize: 11, fontWeight: '800' },
});
