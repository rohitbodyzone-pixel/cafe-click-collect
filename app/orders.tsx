import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Header, Screen } from '@/src/components/UI';
import { useOrders } from '@/src/context/OrderContext';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { money, paymentMethodLabel } from '@/src/data/products';
import { ProductImage } from '@/src/components/ProductImage';
import { RestaurantLogoImage } from '@/src/components/RestaurantImage';
import { colors } from '@/src/theme';

export default function OrdersScreen() {
  const { orders } = useOrders();
  const { customerKey } = useLoyalty();
  const mine = orders.filter((order) => order.customerKey === customerKey);

  return (
    <Screen>
      <Header title="My Orders" />
      {mine.length ? (
        <>
          {mine.map((order) => (
            <Pressable
              key={order.id}
              onPress={() =>
                router.push({ pathname: '/order-status', params: { id: order.id } })
              }
            >
              <Card style={s.card}>
                <View style={s.top}>
                  <RestaurantLogoImage
                    uri={order.restaurant?.logoUrl}
                    name={order.restaurant?.name || 'Cafe'}
                    size={36}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    {!!order.restaurant?.name && (
                      <Text style={s.restaurantName}>
                        {order.restaurant.name.toUpperCase()}
                      </Text>
                    )}
                    <Text style={s.id}>{order.id}</Text>
                    <Text style={s.date}>
                      {new Date(order.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.status,
                      order.status === 'Collected' && s.collected,
                    ]}
                  >
                    <Text
                      style={[
                        s.statusText,
                        order.status === 'Collected' && { color: colors.muted },
                      ]}
                    >
                      {order.status}
                    </Text>
                  </View>
                </View>

                {/* Thumbnail Preview Row */}
                {order.items.length > 0 && (
                  <View style={s.itemThumbRow}>
                    {order.items.slice(0, 3).map((it, idx) => (
                      <View key={`${it.cartKey}-${idx}`} style={s.orderItemThumbPill}>
                        <ProductImage
                          uri={it.product?.imageUrl}
                          category={it.product?.category}
                          name={it.product?.name}
                          style={s.orderItemThumb}
                          placeholderStyle={s.orderItemThumb}
                          iconSize={14}
                        />
                        <Text style={s.orderItemThumbText} numberOfLines={1}>
                          {it.quantity}× {it.product?.name || 'Item'}
                        </Text>
                      </View>
                    ))}
                    {order.items.length > 3 && (
                      <View style={s.moreItemsPill}>
                        <Text style={s.moreItemsText}>+{order.items.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={s.mode}>
                  {order.orderType === 'table'
                    ? `Table order · ${order.table?.name || 'Table'}`
                    : `Click & Collect · ${order.pickupTime}`}
                </Text>

                <Text style={s.items}>
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                  item
                  {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1
                    ? ''
                    : 's'}{' '}
                  · {money(order.total)}
                </Text>

                <Text style={s.payment}>
                  {order.paymentStatus.toUpperCase()} ·{' '}
                  {paymentMethodLabel(order.paymentMethod, order.orderType)}
                </Text>

                <View style={s.track}>
                  <Text style={s.trackText}>View order & live tracking</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.coffee} />
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      ) : (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={54} color={colors.caramel} />
          <Text style={s.emptyTitle}>No orders yet</Text>
          <Text style={s.emptyText}>
            Your Click & Collect and table orders will appear here.
          </Text>
          <Pressable onPress={() => router.replace('/')}>
            <Text style={s.browse}>Browse the menu</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 12 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  restaurantName: {
    color: colors.caramel,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  id: { fontWeight: '900', color: colors.espresso, fontSize: 17 },
  date: { color: colors.muted, fontSize: 11, marginTop: 2 },
  status: {
    backgroundColor: colors.greenSoft,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  collected: { backgroundColor: colors.line },
  statusText: { color: colors.green, fontWeight: '800', fontSize: 10 },
  itemThumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  orderItemThumbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 8,
    paddingRight: 8,
    overflow: 'hidden',
  },
  orderItemThumb: {
    width: 26,
    height: 26,
  },
  orderItemThumbText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
    marginLeft: 6,
  },
  moreItemsPill: {
    backgroundColor: colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moreItemsText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
  },
  mode: { color: colors.ink, fontWeight: '800', marginTop: 10, fontSize: 14 },
  items: { color: colors.muted, marginTop: 4, fontSize: 13 },
  payment: { color: colors.green, fontWeight: '800', fontSize: 11, marginTop: 7 },
  track: {
    borderTopWidth: 1,
    borderColor: colors.line,
    marginTop: 12,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackText: { color: colors.coffee, fontWeight: '800', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyTitle: { fontSize: 21, fontWeight: '900', color: colors.ink, marginTop: 14 },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  browse: { color: colors.coffee, fontWeight: '900', marginTop: 18, fontSize: 15 },
});
