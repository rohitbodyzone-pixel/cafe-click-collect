import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Header, Screen, triggerHaptic } from "@/src/components/UI";
import { PaymentMethod, useOrders } from "@/src/context/OrderContext";
import { usePaymentSettings } from "@/src/context/PaymentSettingsContext";
import { StripePaymentForm } from "@/src/components/StripePaymentForm";
import { RewardsSummary } from "@/src/components/RewardsSummary";
import { useLoyalty } from "@/src/context/LoyaltyContext";
import { money } from "@/src/data/products";
import { colors, radii, shadows } from "@/src/theme";

type Session = {
  orderId: string;
  checkoutToken: string;
  clientSecret: string;
  amount: number;
};
export default function Checkout() {
  const {
    cart,
    cartRestaurantName,
    pickupTime,
    orderMode,
    table,
    orderNotes,
    promoCode,
    redeemFreeCoffee,
    setOrderNotes,
    placeOrder,
    startOnlinePayment,
    cancelOnlinePayment,
    finishOnlinePayment,
  } = useOrders();
  const payments = usePaymentSettings();
  const { promos, balance, settings } = useLoyalty();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(
    payments.payAtCounterEnabled ? "pay_at_counter" : "card",
  );
  const [session, setSession] = useState<Session>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const promo = promos.find(item => item.enabled && item.code === (promoCode || '').trim().toUpperCase() && subtotal >= item.minimumSpend && (!item.expiresAt || new Date(item.expiresAt) >= new Date()));
  const promoDiscount = promo ? (promo.discountType === 'percent' ? subtotal * promo.discountValue / 100 : promo.discountValue) : 0;
  const coffees = cart.filter(item => item.product.category === 'Coffee');
  const canRedeem = settings.enabled && balance.freeCoffees > 0 && coffees.length > 0;
  const freeDiscount = redeemFreeCoffee && canRedeem ? Math.min(...coffees.map(item => item.unitPrice), settings.freeCoffeeMaxCents / 100) : 0;
  const finalTotal = Math.max(0, subtotal - Math.min(subtotal, promoDiscount + freeDiscount));
  const isTable = orderMode === "table";
  useEffect(() => {
    if (!payments.payAtCounterEnabled && method === "pay_at_counter")
      setMethod("card");
  }, [payments.payAtCounterEnabled, method]);
  const valid = isTable ? !!table : !!name.trim() && !!phone.trim();
  const continueCheckout = async () => {
    setBusy(true);
    setError("");
    try {
      if (method === "pay_at_counter") {
        const order = await placeOrder(name.trim(), phone.trim());
        router.replace({ pathname: "/confirmation", params: { id: order.id } });
        return;
      }
      setSession(await startOnlinePayment(name.trim(), phone.trim(), method));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start checkout",
      );
    } finally {
      setBusy(false);
    }
  };
  const paymentSucceeded = async () => {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const order = await finishOnlinePayment(session.orderId);
      router.replace({ pathname: "/confirmation", params: { id: order.id } });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Payment is still processing",
      );
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="Checkout" />
      {isTable ? (
        <>
          <Text style={styles.heading}>Order at {table?.name}</Text>
          <TextInput
            style={[styles.input, styles.notes]}
            multiline
            placeholder="Optional order notes"
            value={orderNotes}
            onChangeText={setOrderNotes}
          />
        </>
      ) : (
        <>
          <Text style={styles.heading}>Contact details</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Mobile number"
            value={phone}
            onChangeText={setPhone}
          />
        </>
      )}
      <Card>
        <Text style={styles.restaurantName}>{orderMode === 'table' ? `${table?.name} · ${cartRestaurantName || ''}` : `${pickupTime} · ${cartRestaurantName || ''}`}</Text>
        <Text style={styles.strong}>{isTable ? table?.name : pickupTime}</Text>
        {cart.map((item) => (
          <View key={item.cartKey} style={styles.item}>
            <View style={styles.row}>
              <Text>
                {item.quantity} × {item.product.name}
              </Text>
              <Text>{money(item.unitPrice * item.quantity)}</Text>
            </View>
            {item.customisations.map((option) => (
              <Text key={option.optionId} style={styles.detail}>
                {option.groupName}: {option.optionName}
              </Text>
            ))}
          </View>
        ))}
        <View style={styles.row}>
          <Text>Subtotal</Text>
          <Text>{money(subtotal)}</Text>
        </View>
      </Card>
      <RewardsSummary editable={!session} />
      <Text style={styles.heading}>Payment method</Text>
      {(payments.cardEnabled ||
        payments.applePayEnabled ||
        payments.googlePayEnabled) && (
        <Pressable
          disabled={!!session}
          onPress={() => {
            triggerHaptic('light');
            setMethod("card");
          }}
          style={[
            styles.method,
            method !== "pay_at_counter" && styles.methodActive,
          ]}
        >
          <Text style={styles.methodTitle}>Card / wallet</Text>
          <Text style={styles.detail}>
            Card, Apple Pay or Google Pay where supported
          </Text>
        </Pressable>
      )}
      {payments.payAtCounterEnabled && (
        <Pressable
          disabled={!!session}
          onPress={() => {
            triggerHaptic('light');
            setMethod("pay_at_counter");
          }}
          style={[
            styles.method,
            method === "pay_at_counter" && styles.methodActive,
          ]}
        >
          <Text style={styles.methodTitle}>
            {isTable ? "Pay at Counter" : "Pay at Pickup"}
          </Text>
          <Text style={styles.detail}>No online charge</Text>
        </Pressable>
      )}
      {!!session && (
        <Card style={styles.paymentCard}>
          <Text style={styles.methodTitle}>
            Secure payment · {money(session.amount)}
          </Text>
          <StripePaymentForm
            clientSecret={session.clientSecret}
            orderId={session.orderId}
            onSuccess={() => void paymentSucceeded()}
            onCancel={() =>
              void (async () => {
                try {
                  await cancelOnlinePayment(session.checkoutToken);
                  setSession(undefined);
                  setError("Payment cancelled. You have not been charged.");
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not cancel payment",
                  );
                }
              })()
            }
          />
        </Card>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={{ flex: 1, minHeight: 24 }} />
      {!session && (
        <Button
          label={
            busy
              ? "Starting checkout…"
              : method === "pay_at_counter"
                ? `Place order · ${money(finalTotal)}`
                : `Continue to secure payment · ${money(finalTotal)}`
          }
          disabled={busy || !cart.length || !valid}
          onPress={() => void continueCheckout()}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
    marginVertical: 12,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    marginBottom: 10,
    fontSize: 14,
    color: colors.ink,
  },
  notes: { height: 84, paddingTop: 12, textAlignVertical: 'top' },
  restaurantName: {
    color: colors.caramel,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  strong: { fontWeight: "900", fontSize: 16, color: colors.espresso },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  error: { color: colors.danger, marginTop: 10, fontWeight: '700' },
  method: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    ...shadows.sm,
  },
  methodActive: { borderColor: colors.espresso, backgroundColor: colors.creamSoft },
  methodTitle: { color: colors.espresso, fontWeight: "800", fontSize: 15 },
  paymentCard: { marginTop: 10 },
});
