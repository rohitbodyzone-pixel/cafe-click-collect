import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Header, Screen, Card } from "@/src/components/UI";
import { useOrders, OrderStatus } from "@/src/context/OrderContext";
import { colors } from "@/src/theme";
import { money, paymentMethodLabel } from "@/src/data/products";
const steps: OrderStatus[] = ["Incoming", "Preparing", "Ready", "Collected"];
export default function OrderStatusScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { orders, latestOrder } = useOrders();
  const order = orders.find((o) => o.id === id) || latestOrder;
  const active = order ? steps.indexOf(order.status) : 0;
  const table = order?.orderType === "table";
  return (
    <Screen>
      <Header title="Order status" />
      <Text style={s.order}>Order {order?.id || "—"}</Text>
      <Text style={s.title}>
        {order?.status === "Ready"
          ? table
            ? "Your order is ready!"
            : "Ready for pickup!"
          : order?.status === "Collected"
            ? "Enjoy your order!"
            : "We’re on it."}
      </Text>
      <Text style={s.subtitle}>
        {table
          ? `Table: ${order?.table?.name || "—"}`
          : `Pickup: ${order?.pickupTime || "Not scheduled"}`}
      </Text>
      <Card>
        {steps.map((step, index) => (
          <View key={step} style={s.step}>
            <Text style={[s.dot, index <= active && s.done]}>
              {index < active ? "✓" : index + 1}
            </Text>
            <Text style={s.stepTitle}>
              {step === "Incoming" ? "Order received" : step}
            </Text>
          </View>
        ))}
      </Card>
      {order && (
        <Card style={s.summary}>
          <Text style={s.payment}>{order.paymentStatus.toUpperCase()} · {paymentMethodLabel(order.paymentMethod, order.orderType)} · {order.paymentStatus === "paid" ? money(order.amountPaid) : `${money(order.total)} due`}</Text>
          {order.items.map((item) => (
            <View key={item.cartKey} style={s.item}>
              <Text style={s.stepTitle}>
                {item.quantity} × {item.product.name}
              </Text>
              {item.customisations.map((option) => (
                <Text key={option.optionId} style={s.detail}>
                  {option.groupName}: {option.optionName}
                </Text>
              ))}
            </View>
          ))}
          {!!order.promoCode && <Text style={s.reward}>Promo {order.promoCode}: −{money(Math.max(0, order.discount - order.freeCoffeeDiscount))}</Text>}
          {!!order.freeCoffeeDiscount && <Text style={s.reward}>Free coffee redeemed: −{money(order.freeCoffeeDiscount)}</Text>}
          <Text style={s.points}>Points earned: {order.pointsEarned}</Text>
        </Card>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  order: { color: colors.caramel, fontWeight: "800", textAlign: "center" },
  title: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 27,
    textAlign: "center",
    marginTop: 9,
  },
  subtitle: { color: colors.muted, textAlign: "center", marginVertical: 15 },
  step: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 55 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.line,
    color: colors.white,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
  },
  done: { backgroundColor: colors.green },
  stepTitle: { fontWeight: "800", color: colors.ink },
  summary: { marginTop: 15 },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.line },
  detail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  payment: { color: colors.green, fontWeight: "800", marginBottom: 8 },
  reward: { color: colors.green, fontWeight: "700", marginTop: 8 },
  points: { color: colors.espresso, fontWeight: "800", marginTop: 9 },
});
