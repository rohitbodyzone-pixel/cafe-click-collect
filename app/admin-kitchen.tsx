import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header, Screen } from '@/src/components/UI';
import { Order, OrderStatus, useOrders } from '@/src/context/OrderContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { useServiceRequests } from '@/src/context/ServiceRequestContext';
import { money, paymentMethodLabel } from '@/src/data/products';
import { colors } from '@/src/theme';

type KitchenTab = 'ALL' | 'Incoming' | 'Accepted' | 'Preparing' | 'Ready' | 'Collected';

function playChime() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio autoplay policy catch
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
  const { orders, updateOrderStatus, markOrderPaid, backendError } = useOrders();
  const { requests: serviceRequests, updateStatus: updateServiceStatus } = useServiceRequests();

  const [tab, setTab] = useState<KitchenTab>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastCount, setLastCount] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Update elapsed seconds every 1 second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sound chime when new incoming order arrives
  useEffect(() => {
    const incomingCount = orders.filter((o) => o.status === 'Incoming').length;
    if (incomingCount > lastCount && lastCount > 0 && soundEnabled) {
      playChime();
    }
    setLastCount(incomingCount);
  }, [orders, lastCount, soundEnabled]);

  const activeOrders = orders.filter((o) => o.status !== 'Collected' && o.status !== 'Cancelled');
  const pendingRequests = serviceRequests.filter((r) => r.status === 'pending' || r.status === 'acknowledged');

  const displayedOrders = useMemo(() => {
    if (tab === 'ALL') return activeOrders;
    return orders.filter((o) => o.status === tab);
  }, [orders, activeOrders, tab]);

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

  const toggleSound = () => {
    setSoundEnabled((v) => {
      const next = !v;
      if (next) playChime();
      return next;
    });
  };

  return (
    <Screen>
      <Header
        title="Kitchen Display System (KDS)"
        right={
          <Pressable
            style={s.soundToggle}
            onPress={toggleSound}
            accessibilityLabel="Toggle sound alerts"
          >
            <Ionicons
              name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
              size={20}
              color={soundEnabled ? colors.espresso : colors.muted}
            />
          </Pressable>
        }
      />

      {/* Restaurant Header Bar */}
      <View style={s.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.roleText}>
            KITCHEN OPERATIONS · {auth.staff?.displayName || auth.staff?.email}
          </Text>
          <Text style={s.restaurantName}>{currentRestaurant.name}</Text>
        </View>
        <Pressable
          style={s.adminHomeBtn}
          onPress={() => router.replace('/admin')}
        >
          <Ionicons name="grid-outline" size={16} color={colors.espresso} />
          <Text style={s.adminHomeText}>Admin Home</Text>
        </Pressable>
      </View>

      {/* Live Table Service Alert Header */}
      {pendingRequests.length > 0 && (
        <View style={s.serviceAlertBar}>
          <View style={s.serviceAlertHeader}>
            <Ionicons name="notifications" size={18} color={colors.caramel} />
            <Text style={s.serviceAlertTitle}>
              Table Service Calls ({pendingRequests.length})
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.serviceScroll}>
            {pendingRequests.map((req) => {
              const elapsedMin = getElapsedMinutes(req.createdAt);
              return (
                <View key={req.id} style={s.serviceChip}>
                  <View>
                    <Text style={s.serviceChipTable}>
                      {req.tableName} · {req.requestType.replace('_', ' ').toUpperCase()}
                    </Text>
                    {!!req.notes && (
                      <Text style={s.serviceChipNotes}>"{req.notes}"</Text>
                    )}
                    <Text style={s.serviceChipTime}>{elapsedMin}m ago</Text>
                  </View>
                  <View style={s.serviceChipActions}>
                    {req.status === 'pending' && (
                      <Pressable
                        style={s.chipAck}
                        onPress={() => void updateServiceStatus(req.id, 'acknowledged')}
                      >
                        <Text style={s.chipAckText}>Ack</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={s.chipDone}
                      onPress={() => void updateServiceStatus(req.id, 'completed')}
                    >
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Tab Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
        <Pressable
          style={[s.tab, tab === 'ALL' && s.tabActive]}
          onPress={() => setTab('ALL')}
        >
          <Text style={[s.tabCount, tab === 'ALL' && s.tabCountActive]}>
            {activeOrders.length}
          </Text>
          <Text style={[s.tabLabel, tab === 'ALL' && s.tabLabelActive]}>
            Active Queue
          </Text>
        </Pressable>

        <Pressable
          style={[s.tab, tab === 'Incoming' && s.tabActive]}
          onPress={() => setTab('Incoming')}
        >
          <Text style={[s.tabCount, tab === 'Incoming' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Incoming').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Incoming' && s.tabLabelActive]}>
            New
          </Text>
        </Pressable>

        <Pressable
          style={[s.tab, tab === 'Accepted' && s.tabActive]}
          onPress={() => setTab('Accepted')}
        >
          <Text style={[s.tabCount, tab === 'Accepted' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Accepted').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Accepted' && s.tabLabelActive]}>
            Accepted
          </Text>
        </Pressable>

        <Pressable
          style={[s.tab, tab === 'Preparing' && s.tabActive]}
          onPress={() => setTab('Preparing')}
        >
          <Text style={[s.tabCount, tab === 'Preparing' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Preparing').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Preparing' && s.tabLabelActive]}>
            Preparing
          </Text>
        </Pressable>

        <Pressable
          style={[s.tab, tab === 'Ready' && s.tabActive]}
          onPress={() => setTab('Ready')}
        >
          <Text style={[s.tabCount, tab === 'Ready' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Ready').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Ready' && s.tabLabelActive]}>
            Ready
          </Text>
        </Pressable>

        <Pressable
          style={[s.tab, tab === 'Collected' && s.tabActive]}
          onPress={() => setTab('Collected')}
        >
          <Text style={[s.tabCount, tab === 'Collected' && s.tabCountActive]}>
            {orders.filter((o) => o.status === 'Collected').length}
          </Text>
          <Text style={[s.tabLabel, tab === 'Collected' && s.tabLabelActive]}>
            Completed
          </Text>
        </Pressable>
      </ScrollView>

      {!!backendError && <Text style={s.error}>{backendError}</Text>}

      {/* Orders Grid */}
      <ScrollView style={{ flex: 1 }}>
        {displayedOrders.map((order) => {
          const action = getNextAction(order.status);
          const elapsedMins = getElapsedMinutes(order.createdAt);
          const isOverdue =
            elapsedMins >= currentRestaurant.averagePrepMinutes &&
            order.status !== 'Ready' &&
            order.status !== 'Collected';

          return (
            <View
              key={order.id}
              style={[
                s.orderCard,
                isOverdue && s.orderCardOverdue,
                order.status === 'Incoming' && s.orderCardNew,
                order.status === 'Ready' && s.orderCardReady,
              ]}
            >
              {/* Top Header of Card */}
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={s.badgeRow}>
                    <View
                      style={[
                        s.typeBadge,
                        order.orderType === 'table' ? s.tableTypeBadge : s.pickupTypeBadge,
                      ]}
                    >
                      <Ionicons
                        name={order.orderType === 'table' ? 'restaurant' : 'bag-handle'}
                        size={12}
                        color={order.orderType === 'table' ? colors.white : colors.espresso}
                      />
                      <Text
                        style={[
                          s.typeBadgeText,
                          order.orderType === 'table' ? s.tableTypeBadgeText : s.pickupTypeBadgeText,
                        ]}
                      >
                        {order.orderType === 'table'
                          ? `TABLE · ${order.table?.name || 'Table'}`
                          : 'CLICK & COLLECT'}
                      </Text>
                    </View>

                    <View style={[s.statusBadge, s[`status_${order.status}`]]}>
                      <Text style={s.statusBadgeText}>
                        {order.status === 'Incoming' ? 'NEW' : order.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.orderId}>{order.id}</Text>
                </View>

                {/* Preparation Timer */}
                <View style={[s.timerBox, isOverdue && s.timerBoxOverdue]}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={isOverdue ? colors.danger : colors.espresso}
                  />
                  <Text style={[s.timerText, isOverdue && s.timerTextOverdue]}>
                    {formatElapsed(order.createdAt)}
                  </Text>
                  {isOverdue && <Text style={s.overdueTag}>OVERDUE</Text>}
                </View>
              </View>

              {/* Customer & Timing Metadata */}
              <View style={s.metaSection}>
                <Text style={s.customerName}>
                  {order.orderType === 'table'
                    ? `Guest at ${order.table?.name}`
                    : `${order.customerName} (${order.phone})`}
                </Text>
                <Text style={s.timingText}>
                  {order.orderType === 'table'
                    ? `Ordered at ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : `Pickup Slot: ${order.pickupTime}`}
                </Text>
              </View>

              {/* Items List */}
              <View style={s.itemsBox}>
                {order.items.map((item, idx) => (
                  <View key={`${item.cartKey}-${idx}`} style={s.itemRow}>
                    <View style={s.quantityPill}>
                      <Text style={s.quantityPillText}>{item.quantity}×</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.productName}>{item.product.name}</Text>
                      {item.customisations.map((c) => (
                        <Text key={c.optionId} style={s.modifierText}>
                          • {c.groupName}: {c.optionName}
                        </Text>
                      ))}
                      {!!item.notes && (
                        <Text style={s.itemNotes}>Note: {item.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {!!order.orderNotes && (
                <View style={s.orderNotesBox}>
                  <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.espresso} />
                  <Text style={s.orderNotesText}>
                    Special Request: {order.orderNotes}
                  </Text>
                </View>
              )}

              {/* Payment Status Bar */}
              <View style={s.paymentBar}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      s.paymentStatus,
                      order.paymentStatus === 'paid' ? s.paidText : s.unpaidText,
                    ]}
                  >
                    {order.paymentStatus.toUpperCase()} ·{' '}
                    {paymentMethodLabel(order.paymentMethod, order.orderType)} ({money(order.total)})
                  </Text>
                </View>

                {order.paymentStatus === 'unpaid' && (
                  <Pressable
                    style={s.markPaidBtn}
                    onPress={() => void markOrderPaid(order.id)}
                  >
                    <Ionicons name="cash-outline" size={14} color={colors.green} />
                    <Text style={s.markPaidText}>Mark Paid</Text>
                  </Pressable>
                )}
              </View>

              {/* Bump Action Button */}
              {action && (
                <Pressable
                  style={s.actionButton}
                  onPress={() => void updateOrderStatus(order.id, action.nextStatus)}
                >
                  <Ionicons name={action.icon} size={18} color={colors.white} />
                  <Text style={s.actionButtonText}>{action.label}</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {displayedOrders.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="cafe-outline" size={54} color={colors.muted} />
            <Text style={s.emptyTitle}>No orders in this section</Text>
            <Text style={s.emptySubtitle}>
              New orders for {currentRestaurant.name} will appear here in real time.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  soundToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  roleText: {
    color: colors.caramel,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  restaurantName: {
    color: colors.espresso,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  adminHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminHomeText: {
    color: colors.espresso,
    fontSize: 11,
    fontWeight: '800',
  },
  serviceAlertBar: {
    backgroundColor: '#FFF8EB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBD9B6',
    padding: 12,
    marginBottom: 12,
  },
  serviceAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  serviceAlertTitle: {
    color: colors.espresso,
    fontWeight: '900',
    fontSize: 13,
  },
  serviceScroll: {
    flexDirection: 'row',
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    minWidth: 200,
  },
  serviceChipTable: {
    fontWeight: '800',
    fontSize: 12,
    color: colors.ink,
  },
  serviceChipNotes: {
    fontSize: 10,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  serviceChipTime: {
    fontSize: 9,
    color: colors.caramel,
    fontWeight: '700',
    marginTop: 2,
  },
  serviceChipActions: {
    flexDirection: 'row',
    gap: 5,
    marginLeft: 10,
  },
  chipAck: {
    backgroundColor: colors.cream,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipAckText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.espresso,
  },
  chipDone: {
    backgroundColor: colors.green,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tab: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  tabCount: {
    fontWeight: '900',
    fontSize: 16,
    color: colors.espresso,
  },
  tabCountActive: {
    color: colors.white,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#DDBB9B',
  },
  error: {
    color: colors.danger,
    marginVertical: 6,
    fontSize: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 14,
  },
  orderCardNew: {
    borderColor: colors.caramel,
    backgroundColor: '#FFFDF9',
  },
  orderCardReady: {
    borderColor: colors.green,
    backgroundColor: '#F7FCF8',
  },
  orderCardOverdue: {
    borderColor: colors.danger,
    backgroundColor: '#FFF8F7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tableTypeBadge: {
    backgroundColor: colors.espresso,
  },
  pickupTypeBadge: {
    backgroundColor: colors.cream,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableTypeBadgeText: {
    color: colors.white,
  },
  pickupTypeBadgeText: {
    color: colors.espresso,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.cream,
  },
  status_Incoming: { backgroundColor: '#FDEED9' },
  status_Accepted: { backgroundColor: '#E3EDF7' },
  status_Preparing: { backgroundColor: '#FDF3D8' },
  status_Ready: { backgroundColor: '#E6F4EA' },
  status_Collected: { backgroundColor: colors.line },
  status_Cancelled: { backgroundColor: '#FBE8E5' },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.ink,
  },
  orderId: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.ink,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timerBoxOverdue: {
    backgroundColor: '#FBE8E5',
  },
  timerText: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.espresso,
  },
  timerTextOverdue: {
    color: colors.danger,
  },
  overdueTag: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.danger,
    marginLeft: 2,
  },
  metaSection: {
    marginTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  customerName: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
  },
  timingText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  itemsBox: {
    paddingVertical: 10,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  quantityPill: {
    backgroundColor: colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quantityPillText: {
    fontWeight: '900',
    fontSize: 12,
    color: colors.espresso,
  },
  productName: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
  },
  modifierText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  itemNotes: {
    fontSize: 11,
    color: colors.caramel,
    fontStyle: 'italic',
    marginTop: 2,
  },
  orderNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cream,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  orderNotesText: {
    fontSize: 12,
    color: colors.espresso,
    fontWeight: '700',
    flex: 1,
  },
  paymentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginBottom: 12,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '800',
  },
  paidText: {
    color: colors.green,
  },
  unpaidText: {
    color: colors.caramel,
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markPaidText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.green,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.espresso,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
