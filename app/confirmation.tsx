import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Screen } from "@/src/components/UI";
import { useOrders } from "@/src/context/OrderContext";
import { colors } from "@/src/theme";
import { money, paymentMethodLabel } from "@/src/data/products";
export default function Confirmation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders } = useOrders();
  const order = orders.find((o) => o.id === id);
  const table = order?.orderType === "table";
  return (
    <Screen>
      <View style={s.wrap}>
        <Text style={s.check}>✓</Text>
        <Text style={s.eyebrow}>ORDER CONFIRMED</Text>
        <Text style={s.title}>
          {table
            ? `${order?.table?.name} confirmed!`
            : `Thanks, ${order?.customerName || "coffee lover"}!`}
        </Text>
        <Card style={s.card}>
          <Text style={s.order}>Order {id}</Text>
          <Text style={s.label}>{table ? "Table" : "Pickup time"}</Text>
          <Text style={s.value}>
            {table ? order?.table?.name : order?.pickupTime}
          </Text>
          {order?.items.map((item) => (
            <View key={item.cartKey} style={s.item}>
              <Text style={s.value}>
                {item.quantity} × {item.product.name}
              </Text>
              {item.customisations.map((option) => (
                <Text key={option.optionId} style={s.detail}>
                  {option.groupName}: {option.optionName}
                </Text>
              ))}
            </View>
          ))}
          {!!order?.promoCode && (
            <Text style={s.detail}>
              Promo {order.promoCode}: −${Math.max(0, order.discount - order.freeCoffeeDiscount).toFixed(2)}
            </Text>
          )}
          {!!order?.freeCoffeeDiscount && (
            <Text style={s.detail}>
              Free coffee redeemed: −${order.freeCoffeeDiscount.toFixed(2)}
            </Text>
          )}
          <Text style={s.value}>Points earned: {order?.pointsEarned ?? 0}</Text>
          {order && <View style={s.payment}><Text style={s.label}>Payment</Text><Text style={s.value}>{order.paymentStatus.toUpperCase()} · {paymentMethodLabel(order.paymentMethod, order.orderType)}</Text><Text style={s.value}>{order.paymentStatus === "paid" ? `Amount paid: ${money(order.amountPaid)}` : `Amount due: ${money(order.total)}`}</Text></View>}
        </Card>
      </View>
      <Button
        label="Track order"
        onPress={() =>
          router.replace({ pathname: "/order-status", params: { id } })
        }
      />
      <View style={{ height: 10 }} />
      <Button
        secondary
        label="Back to menu"
        onPress={() =>
          router.replace(
            table && order?.table ? `/?table=${order.table.code}` : "/",
          )
        }
      />
    </Screen>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", paddingTop: 35 },
  check: { fontSize: 54, color: colors.green },
  eyebrow: {
    color: colors.green,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 12,
  },
  title: { fontSize: 27, fontWeight: "800", color: colors.ink, marginTop: 8 },
  card: { width: "100%", marginTop: 25 },
  order: {
    fontWeight: "800",
    color: colors.espresso,
    fontSize: 17,
    textAlign: "center",
    marginBottom: 10,
  },
  label: { color: colors.muted, fontSize: 12, marginTop: 8 },
  value: { color: colors.ink, fontWeight: "700", marginTop: 3 },
  item: {
    borderTopWidth: 1,
    borderColor: colors.line,
    marginTop: 12,
    paddingTop: 10,
  },
  detail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  payment: { borderTopWidth: 1, borderColor: colors.line, marginTop: 12, paddingTop: 8 },
});
