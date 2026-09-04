import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Header, Screen, Card, Tooltip, triggerHaptic } from '@/src/components/UI';
import { useOrders, OrderStatus } from '@/src/context/OrderContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useCustomerExperience, QueuePositionInfo, ReviewShieldResult } from '@/src/context/CustomerExperienceContext';
import {
  ServiceRequestType,
  useServiceRequests,
} from '@/src/context/ServiceRequestContext';
import { colors, radii, shadows } from '@/src/theme';
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
  const { getLiveQueue, notifyArrival, submitReviewFeedback } = useCustomerExperience();

  const [serviceMessage, setServiceMessage] = useState('');
  const [busyService, setBusyService] = useState(false);
  const [arrivedNotified, setArrivedNotified] = useState(false);
  const [queueInfo, setQueueInfo] = useState<QueuePositionInfo | null>(null);

  // Review Shield State
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [reviewResult, setReviewResult] = useState<ReviewShieldResult | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const order = orders.find((o) => o.id === id) || latestOrder;
  const statusIndex = order
    ? steps.findIndex((s) => s.status === order.status)
    : 0;
  const active = statusIndex >= 0 ? statusIndex : 0;
  const table = order?.orderType === 'table';
  const restaurantName = order?.restaurant?.name || currentRestaurant.name;
  const isReady = order?.status === 'Ready';
  const isCompleted = order?.status === 'Collected';

  // Poll live queue position every 5s for active orders
  useEffect(() => {
    if (!order?.id || isCompleted) return;
    const fetchQueue = async () => {
      const q = await getLiveQueue(order.id);
      if (q.found) setQueueInfo(q);
    };
    void fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [order?.id, isCompleted, getLiveQueue]);

  const handleArrival = async () => {
    if (!order?.id) return;
    triggerHaptic('medium');
    try {
      await notifyArrival(order.id, 'Customer is outside / at counter');
      setArrivedNotified(true);
    } catch (e: any) {
      alert(e.message || 'Could not notify staff.');
    }
  };

  const handleRatingSelect = async (stars: number) => {
    triggerHaptic(stars >= 4 ? 'success' : 'light');
    setSelectedRating(stars);
    if (stars >= 4 && order?.id) {
      // Auto-submit 4-5 star rating
      setSubmittingFeedback(true);
      const res = await submitReviewFeedback(order.id, stars, '');
      setReviewResult(res);
      setSubmittingFeedback(false);
    }
  };

  const handleSubmitLowRating = async () => {
    if (!order?.id || selectedRating === 0) return;
    triggerHaptic('medium');
    setSubmittingFeedback(true);
    const res = await submitReviewFeedback(order.id, selectedRating, feedbackText);
    setReviewResult(res);
    setSubmittingFeedback(false);
  };

  const handleTableService = async (type: ServiceRequestType) => {
    triggerHaptic('medium');
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

      {/* Strong In-App Banner for Table Orders (Waiting vs Confirmed) */}
      {table && order?.status === 'Incoming' && (
        <View style={s.waitingConfirmAlert}>
          <View style={s.waitingConfirmIcon}>
            <Ionicons name="time" size={24} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.waitingConfirmTitle}>Order sent to restaurant</Text>
            <Text style={s.waitingConfirmSub}>
              Waiting for restaurant confirmation · {restaurantName} · {order?.table?.name || 'Table'}
            </Text>
          </View>
        </View>
      )}

      {table && (order?.status === 'Accepted' || order?.status === 'Preparing') && (
        <View style={s.tableConfirmedAlert}>
          <View style={s.tableConfirmedIcon}>
            <Ionicons name="checkmark-circle" size={24} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.tableConfirmedTitle}>Order Confirmed</Text>
            <Text style={s.tableConfirmedSub}>
              Your order for {order?.table?.name || 'Table'} has been accepted!
            </Text>
          </View>
        </View>
      )}

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
                ? table
                  ? 'Order Confirmed by Café'
                  : 'Order accepted by café'
                : table
                  ? 'Order sent to restaurant'
                  : 'Order received'}
      </Text>
      <Text style={s.subtitle}>
        {table
          ? `Dining at ${order?.table?.name || 'Table'}`
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

      {/* Live Queue Position & Smart Timing Banner */}
      {!isCompleted && !isReady && queueInfo && queueInfo.found && (
        <View style={s.queueBanner}>
          <View style={s.queueIcon}>
            <Ionicons name="people" size={18} color={colors.espresso} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.queueTitle}>
              Queue Position #{queueInfo.queuePosition}
            </Text>
            <Text style={s.queueSub}>
              {queueInfo.ordersAhead === 0
                ? 'Your order is currently being prepared next!'
                : `${queueInfo.ordersAhead} order${queueInfo.ordersAhead === 1 ? '' : 's'} ahead in queue · ~${queueInfo.estimatedPrepMinutes}m wait`}
            </Text>
          </View>
        </View>
      )}

      {/* Customer Arrival / Curbside Alert */}
      {!table && !isCompleted && (
        <Card style={s.arrivalCard}>
          <View style={s.arrivalHeader}>
            <Ionicons name="car-outline" size={20} color={colors.espresso} />
            <Text style={s.arrivalTitle}>Arrived at the Café?</Text>
          </View>
          <Text style={s.arrivalHelp}>
            Tap below when you reach {restaurantName} so our barista knows you’re here for handoff.
          </Text>
          <Pressable
            disabled={arrivedNotified}
            style={[s.arrivalBtn, arrivedNotified && s.arrivalBtnDone]}
            onPress={handleArrival}
          >
            <Ionicons
              name={arrivedNotified ? 'checkmark-circle' : 'navigate-outline'}
              size={18}
              color={arrivedNotified ? colors.green : colors.white}
            />
            <Text style={[s.arrivalBtnText, arrivedNotified && { color: colors.green }]}>
              {arrivedNotified ? 'Staff Notified of Your Arrival!' : "I've Arrived / I'm Outside"}
            </Text>
          </Pressable>
        </Card>
      )}

      {/* Table Service Call Buttons (Call Staff, Water, Bill) */}
      {table && (
        <Card style={s.tableServiceCard}>
          <Text style={s.tableServiceTitle}>Table Service</Text>
          <Text style={s.tableServiceHelp}>
            Need assistance from our team while seated at {order?.table?.name || 'your table'}?
          </Text>

          <View style={s.serviceButtonsRow}>
            <Tooltip text="Notify Waitstaff">
              <Pressable
                disabled={busyService || isCoolingDown('call_staff')}
                style={[
                  s.serviceBtn,
                  isCoolingDown('call_staff') && s.serviceBtnDisabled,
                ]}
                onPress={() => void handleTableService('call_staff')}
                accessibilityLabel="Call Staff"
              >
                <Ionicons name="notifications-outline" size={16} color={colors.espresso} />
                <Text style={s.serviceBtnText}>
                  {isCoolingDown('call_staff') ? 'Sent' : 'Call Staff'}
                </Text>
              </Pressable>
            </Tooltip>

            <Tooltip text="Request Table Water">
              <Pressable
                disabled={busyService || isCoolingDown('water')}
                style={[
                  s.serviceBtn,
                  isCoolingDown('water') && s.serviceBtnDisabled,
                ]}
                onPress={() => void handleTableService('water')}
                accessibilityLabel="Water Please"
              >
                <Ionicons name="water-outline" size={16} color={colors.espresso} />
                <Text style={s.serviceBtnText}>
                  {isCoolingDown('water') ? 'Sent' : 'Water'}
                </Text>
              </Pressable>
            </Tooltip>

            <Tooltip text="Ask Question or Help">
              <Pressable
                disabled={busyService || isCoolingDown('need_help')}
                style={[
                  s.serviceBtn,
                  isCoolingDown('need_help') && s.serviceBtnDisabled,
                ]}
                onPress={() => void handleTableService('need_help')}
                accessibilityLabel="Need Help"
              >
                <Ionicons name="help-circle-outline" size={16} color={colors.espresso} />
                <Text style={s.serviceBtnText}>
                  {isCoolingDown('need_help') ? 'Sent' : 'Need Help'}
                </Text>
              </Pressable>
            </Tooltip>

            <Tooltip text="Request Check & Bill">
              <Pressable
                disabled={busyService || isCoolingDown('bill')}
                style={[
                  s.serviceBtn,
                  isCoolingDown('bill') && s.serviceBtnDisabled,
                ]}
                onPress={() => void handleTableService('bill')}
                accessibilityLabel="Ready to Pay / Bill"
              >
                <Ionicons name="receipt-outline" size={16} color={colors.espresso} />
                <Text style={s.serviceBtnText}>
                  {isCoolingDown('bill') ? 'Sent' : 'Bill'}
                </Text>
              </Pressable>
            </Tooltip>
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

      {/* Review Shield Customer Recovery */}
      {(isCompleted || isReady) && (
        <Card style={s.reviewShieldCard}>
          <Text style={s.reviewTitle}>How was your experience today?</Text>
          <Text style={s.reviewSub}>
            Your direct feedback helps us serve you better every visit.
          </Text>

          {/* Star Rating Row */}
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Tooltip key={star} text={`${star} Star${star > 1 ? 's' : ''}`}>
                <Pressable
                  onPress={() => void handleRatingSelect(star)}
                  style={s.starBtn}
                  accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Ionicons
                    name={star <= selectedRating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= selectedRating ? '#F5A623' : colors.line}
                  />
                </Pressable>
              </Tooltip>
            ))}
          </View>

          {/* Intercept Low Rating (1-3 stars) with direct recovery discount */}
          {selectedRating > 0 && selectedRating <= 3 && !reviewResult?.recoveryCode && (
            <View style={s.recoveryForm}>
              <Text style={s.recoveryPrompt}>
                We're sorry your experience wasn't perfect. Please let our manager know what we can fix:
              </Text>
              <TextInput
                style={s.feedbackInput}
                placeholder="What could we have done better?"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                value={feedbackText}
                onChangeText={setFeedbackText}
              />
              <Button
                label={submittingFeedback ? 'Submitting…' : 'Submit & Claim 20% Recovery Voucher'}
                disabled={submittingFeedback}
                onPress={() => void handleSubmitLowRating()}
              />
            </View>
          )}

          {/* Display Recovery Code */}
          {reviewResult?.recoveryCode && (
            <View style={s.recoveryVoucherBox}>
              <Ionicons name="gift" size={24} color={colors.green} />
              <Text style={s.voucherHeading}>Our Apologies — Please Accept This Voucher</Text>
              <Text style={s.voucherCode}>{reviewResult.recoveryCode}</Text>
              <Text style={s.voucherSub}>
                20% OFF your next order at {restaurantName}. Applied automatically to your account.
              </Text>
            </View>
          )}

          {/* Display High Rating (4-5 stars) Google Prompt */}
          {selectedRating >= 4 && (
            <View style={s.publicReviewBox}>
              <Ionicons name="heart" size={22} color={colors.caramel} />
              <Text style={s.publicReviewText}>
                We're thrilled you loved your order! Would you mind sharing a quick review on Google?
              </Text>
              <Pressable
                style={s.googleReviewBtn}
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/search?q=${encodeURIComponent(
                      `${restaurantName} cafe`,
                    )}`,
                  )
                }
              >
                <Ionicons name="logo-google" size={16} color={colors.white} />
                <Text style={s.googleReviewBtnText}>Leave Google Review</Text>
              </Pressable>
            </View>
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
  waitingConfirmAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#9A5B13',
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
    ...shadows.sm,
  },
  waitingConfirmIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingConfirmTitle: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 16,
  },
  waitingConfirmSub: {
    color: '#FDE68A',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  tableConfirmedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E4620',
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
    ...shadows.sm,
  },
  tableConfirmedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableConfirmedTitle: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 16,
  },
  tableConfirmedSub: {
    color: '#D4EBD6',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
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
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    ...shadows.sm,
  },
  tableServiceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.espresso,
  },
  tableServiceHelp: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 12,
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
    backgroundColor: colors.creamSoft,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  serviceBtnDisabled: {
    opacity: 0.5,
    backgroundColor: colors.lineLight,
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
    fontWeight: '800',
  },
  serviceMsgError: {
    color: colors.danger,
  },
  summary: { marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line },
  itemTitle: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  detail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  payment: { color: colors.green, fontWeight: '800', marginBottom: 8, fontSize: 13 },
  reward: { color: colors.green, fontWeight: '800', marginTop: 8, fontSize: 12 },
  points: { color: colors.espresso, fontWeight: '800', marginTop: 9, fontSize: 12 },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#EBD8B8',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    ...shadows.sm,
  },
  queueIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.espresso,
  },
  queueSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  arrivalCard: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderColor: '#DCE5EE',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    ...shadows.sm,
  },
  arrivalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  arrivalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.espresso,
  },
  arrivalHelp: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 14,
    lineHeight: 16,
  },
  arrivalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.espresso,
    paddingVertical: 14,
    borderRadius: 14,
    ...shadows.sm,
  },
  arrivalBtnDone: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.green,
  },
  arrivalBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  reviewShieldCard: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#F0E6D8',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    ...shadows.sm,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.espresso,
    textAlign: 'center',
  },
  reviewSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  starBtn: {
    padding: 4,
  },
  recoveryForm: {
    width: '100%',
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  recoveryPrompt: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 18,
  },
  feedbackInput: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.ink,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  recoveryVoucherBox: {
    alignItems: 'center',
    backgroundColor: '#F3F9F4',
    borderColor: '#CBE6D0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    width: '100%',
  },
  voucherHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.green,
    marginTop: 6,
  },
  voucherCode: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.espresso,
    letterSpacing: 2,
    marginVertical: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.green,
  },
  voucherSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  publicReviewBox: {
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    width: '100%',
  },
  publicReviewText: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  googleReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4285F4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  googleReviewBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
