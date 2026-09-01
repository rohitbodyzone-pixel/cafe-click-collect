import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Header, Screen } from "@/src/components/UI";
import { OrderStatus, useOrders } from "@/src/context/OrderContext";
import { money, paymentMethodLabel } from "@/src/data/products";
import { colors } from "@/src/theme";
import { AdminOrderAlerts } from "@/src/components/AdminOrderAlerts";
import { useAdminAuth } from "@/src/context/AdminAuthContext";
import { useRestaurant } from "@/src/context/RestaurantContext";
import { useServiceRequests } from "@/src/context/ServiceRequestContext";

const tabs: OrderStatus[] = ["Incoming", "Accepted", "Preparing", "Ready", "Collected"];
const next: Partial<Record<OrderStatus, OrderStatus>> = {
  Incoming: "Accepted",
  Accepted: "Preparing",
  Preparing: "Ready",
  Ready: "Collected",
};
const labels: Partial<Record<OrderStatus, string>> = {
  Incoming: "Accept order",
  Accepted: "Start preparing",
  Preparing: "Mark ready",
  Ready: "Mark collected",
};

const AdminLink = ({
  icon,
  title,
  text,
  route,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  route:
    | "/admin-ai"
    | "/admin-operations"
    | "/admin-analytics"
    | "/admin-kitchen"
    | "/admin-menu"
    | "/admin-pickup-settings"
    | "/admin-tables"
    | "/admin-customisations"
    | "/admin-loyalty"
    | "/admin-payments"
    | "/admin-staff"
    | "/super-admin";
}) => (
  <Pressable style={styles.menuLink} onPress={() => router.push(route as never)}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={21} color={colors.espresso} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuText}>{text}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
  </Pressable>
);

export default function Admin() {
  const [tab, setTab] = useState<OrderStatus>("Incoming");
  const { currentRestaurant, restaurants, setCurrentRestaurant } = useRestaurant();
  const { orders, updateOrderStatus, markOrderPaid, backendError } = useOrders();
  const { requests: serviceRequests, updateStatus: updateServiceStatus } = useServiceRequests();
  const auth = useAdminAuth();

  const visible = orders.filter((o) => o.status === tab);
  const pendingRequests = serviceRequests.filter(
    (r) => r.status === "pending" || r.status === "acknowledged",
  );

  return (
    <Screen>
      <Header
        title="Staff Admin"
        right={
          <Pressable onPress={() => void auth.signOut()}>
            <Text style={styles.exit}>Sign out</Text>
          </Pressable>
        }
      />
      <AdminOrderAlerts />

      <View style={styles.restaurantBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.staffRoleText}>
            {auth.staff?.role?.toUpperCase()} · {auth.staff?.displayName || auth.staff?.email}
          </Text>
          <Text style={styles.activeRestName}>{currentRestaurant.name}</Text>
        </View>
        {auth.isSuperAdmin && (
          <Pressable
            style={styles.switchRestBtn}
            onPress={() => router.push('/restaurants')}
          >
            <Ionicons name="swap-horizontal" size={14} color={colors.espresso} />
            <Text style={styles.switchRestText}>Switch Café</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerSmall}>ORDER DASHBOARD</Text>
        <Text style={styles.bannerTitle}>Keep the queue moving.</Text>
        <Text style={styles.bannerText}>
          {orders.filter((o) => o.status !== "Collected").length} active orders for {currentRestaurant.name}
        </Text>
      </View>

      {/* Live Table Service Requests Banner */}
      {pendingRequests.length > 0 && (
        <Card style={styles.serviceBanner}>
          <View style={styles.serviceBannerHeader}>
            <Ionicons name="notifications-outline" size={18} color={colors.espresso} />
            <Text style={styles.serviceBannerTitle}>
              Table Service Requests ({pendingRequests.length})
            </Text>
          </View>
          {pendingRequests.map((req) => (
            <View key={req.id} style={styles.serviceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceTable}>
                  {req.tableName} · {req.requestType.replace('_', ' ').toUpperCase()}
                </Text>
                {!!req.notes && (
                  <Text style={styles.serviceNotes}>"{req.notes}"</Text>
                )}
                <Text style={styles.serviceTime}>
                  {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.serviceActions}>
                {req.status === 'pending' && (
                  <Pressable
                    style={styles.ackBtn}
                    onPress={() => void updateServiceStatus(req.id, 'acknowledged')}
                  >
                    <Text style={styles.ackBtnText}>Acknowledge</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.doneBtn}
                  onPress={() => void updateServiceStatus(req.id, 'completed')}
                >
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      )}

      {auth.isSuperAdmin && (
        <AdminLink
          icon="globe-outline"
          title="Super Admin Management"
          text="Manage all platform restaurants, onboard new cafes"
          route="/super-admin"
        />
      )}

      <AdminLink
        icon="sparkles-outline"
        title="AI & Analytics Copilot"
        text="Demand Forecast, Health Score (0-100), Menu BCG Matrix, Win-Back & Memory"
        route="/admin-ai"
      />
      <AdminLink
        icon="construct-outline"
        title="Operations & Automation Hub"
        text="Smart Inventory, AI Staff Roster, Checklists, Wait Balancer & Hardware"
        route="/admin-operations"
      />
      <AdminLink
        icon="stats-chart-outline"
        title="Sales & Analytics"
        text="Daily revenue, top-selling items, hourly distribution"
        route="/admin-analytics"
      />
      <AdminLink
        icon="speedometer-outline"
        title="Kitchen Display System (KDS)"
        text="Live queue with preparation timers and order bump"
        route="/admin-kitchen"
      />
      <AdminLink
        icon="people-outline"
        title="Staff & Roles"
        text={`Manage roles for ${currentRestaurant.name}`}
        route="/admin-staff"
      />
      <AdminLink
        icon="restaurant-outline"
        title="Menu Management"
        text="Add, edit and manage availability"
        route="/admin-menu"
      />
      <AdminLink
        icon="options-outline"
        title="Customisation Settings"
        text="Sizes, milk, sugar and extras"
        route="/admin-customisations"
      />
      <AdminLink
        icon="gift-outline"
        title="Loyalty & Promotions"
        text="Points, free coffees and promo codes"
        route="/admin-loyalty"
      />
      <AdminLink
        icon="card-outline"
        title="Payment Settings"
        text="Online payments and pay at counter"
        route="/admin-payments"
      />
      <AdminLink
        icon="time-outline"
        title="Pickup Settings"
        text="Hours, preparation time and slot capacity"
        route="/admin-pickup-settings"
      />
      <AdminLink
        icon="qr-code-outline"
        title="Table Management"
        text="Tables, QR links and printable cards"
        route="/admin-tables"
      />

      {!!backendError && <Text style={styles.error}>{backendError}</Text>}

      <View style={styles.tabs}>
        {tabs.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabCount, tab === t && styles.activeText]}>
              {orders.filter((o) => o.status === t).length}
            </Text>
            <Text style={[styles.tabText, tab === t && styles.activeText]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.heading}>{tab} orders</Text>

      {!visible.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>All clear</Text>
          <Text style={styles.muted}>
            No {tab.toLowerCase()} orders right now for {currentRestaurant.name}.
          </Text>
        </View>
      ) : (
        visible.map((order) => (
          <Card key={order.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <View>
                {order.orderType === "table" && (
                  <Text style={styles.tableBadge}>
                    TABLE ORDER · {order.table?.name.toUpperCase()}
                  </Text>
                )}
                <Text style={styles.orderId}>{order.id}</Text>
                <Text style={styles.muted}>
                  {new Date(order.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ·{" "}
                  {order.orderType === "table"
                    ? order.table?.name
                    : order.pickupTime}
                </Text>
                <Text
                  style={[
                    styles.paymentBadge,
                    order.paymentStatus === "paid"
                      ? styles.paid
                      : order.paymentStatus === "refunded"
                        ? styles.refunded
                        : styles.unpaid,
                  ]}
                >
                  {order.paymentStatus.toUpperCase()} ·{" "}
                  {paymentMethodLabel(order.paymentMethod, order.orderType)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.price}>{money(order.total)}</Text>
                {order.paymentStatus === "unpaid" && (
                  <Pressable
                    style={styles.markPaidBtn}
                    onPress={() => void markOrderPaid(order.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={13} color={colors.green} />
                    <Text style={styles.markPaidText}>Mark Paid</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.rule} />

            {order.items.map((i) => (
              <Text key={`${i.product.id}-${i.notes}`} style={styles.item}>
                {i.quantity} × {i.product.name}
                {i.notes ? ` · ${i.notes}` : ""}
              </Text>
            ))}

            {!!order.orderNotes && (
              <Text style={styles.notes}>Note: {order.orderNotes}</Text>
            )}

            <Text style={styles.customer}>
              {order.orderType === "table"
                ? order.table?.name
                : `${order.customerName} · ${order.phone}`}
            </Text>

            {next[tab] && (
              <Button
                label={labels[tab]!}
                onPress={() => void updateOrderStatus(order.id, next[tab]!)}
              />
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  exit: { color: colors.coffee, fontWeight: "800" },
  restaurantBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  staffRoleText: {
    color: colors.caramel,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeRestName: {
    color: colors.espresso,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  switchRestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.cream,
  },
  switchRestText: {
    color: colors.espresso,
    fontSize: 11,
    fontWeight: '700',
  },
  banner: {
    backgroundColor: colors.espresso,
    padding: 20,
    borderRadius: 22,
    marginBottom: 12,
  },
  bannerSmall: {
    color: "#DDBB9B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 8,
  },
  bannerText: { color: "#E7DCD5", marginTop: 5 },
  serviceBanner: {
    backgroundColor: '#FFF8EB',
    borderColor: '#EBD9B6',
    borderWidth: 1,
    marginBottom: 12,
  },
  serviceBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  serviceBannerTitle: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 14,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#EBD9B6',
  },
  serviceTable: {
    fontWeight: '800',
    color: colors.ink,
    fontSize: 13,
  },
  serviceNotes: {
    color: colors.muted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  serviceTime: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 6,
  },
  ackBtn: {
    backgroundColor: colors.cream,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ackBtnText: {
    color: colors.espresso,
    fontSize: 11,
    fontWeight: '700',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  doneBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  menuLink: {
    backgroundColor: colors.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  menuTitle: { color: colors.ink, fontWeight: "800" },
  menuText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  error: { color: colors.danger, marginVertical: 10 },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 4,
    marginVertical: 15,
  },
  tab: { flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 9 },
  tabActive: { backgroundColor: colors.espresso },
  tabCount: { color: colors.espresso, fontWeight: "800" },
  tabText: { color: colors.muted, fontSize: 9 },
  activeText: { color: colors.white },
  heading: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  empty: { alignItems: "center", paddingVertical: 45 },
  emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 11, marginTop: 4 },
  orderCard: { marginBottom: 14 },
  orderTop: { flexDirection: "row", justifyContent: "space-between" },
  tableBadge: {
    color: colors.caramel,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 5,
  },
  orderId: { color: colors.espresso, fontWeight: "800", fontSize: 17 },
  price: { color: colors.coffee, fontWeight: "800", fontSize: 17 },
  markPaidBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E6F4EA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  markPaidText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: "800",
  },
  rule: { borderTopWidth: 1, borderColor: colors.line, marginVertical: 12 },
  item: { color: colors.ink, marginBottom: 6 },
  notes: {
    color: colors.coffee,
    backgroundColor: colors.cream,
    padding: 9,
    borderRadius: 10,
    marginTop: 5,
  },
  customer: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 9,
    marginBottom: 14,
  },
  paymentBadge: {
    alignSelf: "flex-start",
    fontWeight: "800",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 7,
  },
  paid: { color: colors.green, backgroundColor: "#E6F4EA" },
  unpaid: { color: colors.caramel, backgroundColor: colors.cream },
  refunded: { color: colors.muted, backgroundColor: colors.line },
});
