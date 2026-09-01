import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header, Screen, Card } from '@/src/components/UI';
import { useOrders, OrderStatus } from '@/src/context/OrderContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import {
  ServiceRequestType,
  useServiceRequests,
} from '@/src/context/ServiceRequestContext';
import { colors } from '@/src/theme';
import { money, paymentMethodLabel } from '@/src/data/products';

const steps: Array<{ status: OrderStatus; label: string }> = [
  { status: 'Incoming', label: 'Order Received' },
  { status: 'Accepted', label: 'Accepted by Café' },
  { status: 'Preparing', label: 'Preparing' },
  { status: 'Ready', label: 'Ready' },
  { status: 'Collected', label: 'Completed' },
];

export default function OrderStatusScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currentRestaurant } = useRestaurant();
  const { orders, latestOrder } = useOrders();
  const { requestService, isCoolingDown } = useServiceRequests();

  const [serviceMessage, setServiceMessage] = useState('');
  const [busyService, setBusyService] = useState(false);

  const order = orders.find((o) => o.id === id) || latestOrder;
  const statusIndex = order
    ? steps.findIndex((s) => s.status === order.status)
    : 0;
  const active = statusIndex >= 0 ? statusIndex : 0;
  const table = order?.orderType === 'table';
  const restaurantName = order?.restaurant?.name || currentRestaurant.name;
  const isReady = order?.status === 'Ready';

  const handleTableService = async (type: ServiceRequestType) => {
    setBusyService(true);
    setServiceMessage('');
    try {
      await requestService(type);
      const label =
        type === 'call_staff'
          ? 'Staff has been notified'
          : type === 'water'
            ? 'Water requested for your table'
            : 'Bill requested';
      setServiceMessage(`✓ ${label}! A team member will be with you shortly.`);
    } catch (cause) {
      setServiceMessage(
        cause instanceof Error ? cause.message : 'Could not submit request.',
      );
    } finally {
      setBusyService(false);
    }
  };

  return (
    <Screen>
      <Header title="Live Order Tracking" />

      <View style={s.restaurantHeader}>
        <Text style={s.restaurantName}>{restaurantName}</Text>
        <Text style={s.orderId}>Order #{order?.id || '—'}</Text>
      </View>

      {/* Strong In-App Banner When Ready */}
      {isReady && (
        <View style={s.readyAlert}>
          <View style={s.readyAlertIcon}>
            <Ionicons name="sparkles" size={24} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.readyAlertTitle}>
              {table ? 'Ready at Your Table!' : 'Ready for Pickup!'}
            </Text>
            <Text style={s.readyAlertText}>
              {table
                ? `Our team is bringing your freshly prepared items over to ${order?.table?.name || 'your table'}.`
                : `Your order is fresh and waiting for you at the ${restaurantName} counter.`}
            </Text>
          </View>
        </View>
      )}

      <Text style={s.title}>
        {order?.status === 'Ready'
          ? table
            ? 'Order is ready!'
            : 'Ready for pickup!'
          : order?.status === 'Collected'
            ? 'Enjoy your order!'
            : order?.status === 'Preparing'
              ? 'Preparing your items'
              : order?.status === 'Accepted'
                ? 'Order accepted by café'
                : 'Order received'}
      </Text>
      <Text style={s.subtitle}>
        {table
          ? `Table Service · ${order?.table?.name || 'Table'}`
          : `Pickup Time: ${order?.pickupTime || 'Scheduled for today'}`}
      </Text>

      {/* Step Tracker Card */}
      <Card style={s.trackerCard}>
        {steps.map((step, index) => (
          <View key={step.status} style={s.step}>
            <View style={[s.dot, index <= active && s.done]}>
              <Text style={s.dotText}>
                {index < active ? '✓' : index + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.stepTitle, index === active && s.stepTitleActive]}>
                {step.label}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Table Service Call Buttons (Call Staff, Water, Bill) */}
      {table && (
        <Card style={s.tableServiceCard}>
          <Text style={s.tableServiceTitle}>Table Service</Text>
          <Text style={s.tableServiceHelp}>
            Need assistance from our team while seated at {order?.table?.name || 'your table'}?
          </Text>

          <View style={s.serviceButtonsRow}>
            <Pressable
              disabled={busyService || isCoolingDown('call_staff')}
              style={[
                s.serviceBtn,
                isCoolingDown('call_staff') && s.serviceBtnDisabled,
              ]}
              onPress={() => void handleTableService('call_staff')}
            >
              <Ionicons name="hand-right-outline" size={18} color={colors.espresso} />
              <Text style={s.serviceBtnText}>
                {isCoolingDown('call_staff') ? 'Sent' : 'Call Staff'}
              </Text>
            </Pressable>

            <Pressable
              disabled={busyService || isCoolingDown('water')}
              style={[
                s.serviceBtn,
                isCoolingDown('water') && s.serviceBtnDisabled,
              ]}
              onPress={() => void handleTableService('water')}
            >
              <Ionicons name="water-outline" size={18} color={colors.espresso} />
              <Text style={s.serviceBtnText}>
                {isCoolingDown('water') ? 'Sent' : 'Water'}
              </Text>
            </Pressable>

            <Pressable
              disabled={busyService || isCoolingDown('bill')}
              style={[
                s.serviceBtn,
                isCoolingDown('bill') && s.serviceBtnDisabled,
              ]}
              onPress={() => void handleTableService('bill')}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.espresso} />
              <Text style={s.serviceBtnText}>
                {isCoolingDown('bill') ? 'Sent' : 'Bill'}
              </Text>
            </Pressable>
          </View>

          {!!serviceMessage && (
            <Text
              style={[
                s.serviceMsg,
                serviceMessage.startsWith('✓') ? s.serviceMsgSuccess : s.serviceMsgError,
              ]}
            >
              {serviceMessage}
            </Text>
          )}
        </Card>
      )}

      {/* Order Item Summary */}
      {order && (
        <Card style={s.summary}>
          <Text style={s.payment}>
            {order.paymentStatus.toUpperCase()} ·{' '}
            {paymentMethodLabel(order.paymentMethod, order.orderType)} ·{' '}
            {order.paymentStatus === 'paid'
              ? money(order.amountPaid)
              : `${money(order.total)} due`}
          </Text>
          {order.items.map((item) => (
            <View key={item.cartKey} style={s.item}>
              <Text style={s.itemTitle}>
                {item.quantity} × {item.product.name}
              </Text>
              {item.customisations.map((option) => (
                <Text key={option.optionId} style={s.detail}>
                  {option.groupName}: {option.optionName}
                </Text>
              ))}
            </View>
          ))}
          {!!order.promoCode && (
            <Text style={s.reward}>
              Promo {order.promoCode}: −
              {money(Math.max(0, order.discount - order.freeCoffeeDiscount))}
            </Text>
          )}
          {!!order.freeCoffeeDiscount && (
            <Text style={s.reward}>
              Free coffee redeemed: −{money(order.freeCoffeeDiscount)}
            </Text>
          )}
          <Text style={s.points}>Points earned: {order.pointsEarned}</Text>
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  restaurantHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  restaurantName: {
    color: colors.caramel,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  orderId: {
    color: colors.espresso,
    fontWeight: '900',
    fontSize: 15,
    marginTop: 2,
  },
  readyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E4620',
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
  },
  readyAlertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyAlertTitle: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 16,
  },
  readyAlertText: {
    color: '#D4EBD6',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  title: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 25,
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    color: colors.muted,
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 13,
  },
  trackerCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 46,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  done: { backgroundColor: colors.green },
  stepTitle: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  stepTitleActive: { color: colors.ink, fontWeight: '900' },
  tableServiceCard: {
    marginTop: 14,
    backgroundColor: '#F8F5F0',
    borderWidth: 1,
    borderColor: '#E8DFD5',
  },
  tableServiceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.espresso,
  },
  tableServiceHelp: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  serviceButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  serviceBtnDisabled: {
    opacity: 0.5,
    backgroundColor: colors.line,
  },
  serviceBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 12,
  },
  serviceMsg: {
    fontSize: 12,
    marginTop: 10,
    lineHeight: 16,
  },
  serviceMsgSuccess: {
    color: colors.green,
    fontWeight: '700',
  },
  serviceMsgError: {
    color: colors.danger,
  },
  summary: { marginTop: 14 },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.line },
  itemTitle: { fontWeight: '800', color: colors.ink, fontSize: 13 },
  detail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  payment: { color: colors.green, fontWeight: '800', marginBottom: 8, fontSize: 12 },
  reward: { color: colors.green, fontWeight: '700', marginTop: 8, fontSize: 12 },
  points: { color: colors.espresso, fontWeight: '800', marginTop: 9, fontSize: 12 },
});
