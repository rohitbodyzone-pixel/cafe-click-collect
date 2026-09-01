import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { money } from '@/src/data/products';
import { useOrders } from '@/src/context/OrderContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { RewardsSummary } from '@/src/components/RewardsSummary';
import { colors } from '@/src/theme';

export default function Cart() {
  const { currentRestaurant } = useRestaurant();
  const {
    cart,
    setQuantity,
    clearCart,
    orderMode,
    table,
    cartRestaurantName,
  } = useOrders();

  const restaurantName = cartRestaurantName || currentRestaurant.name;
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <Screen>
      <Header title="Your Cart" />

      {!cart.length ? (
        <View style={s.empty}>
          <Ionicons name="cart-outline" size={60} color={colors.muted} />
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySubtitle}>Explore our delicious handcrafted items.</Text>
          <View style={{ height: 16 }} />
          <Button label="Browse Menu" onPress={() => router.replace('/')} />
        </View>
      ) : (
        <>
          <View style={s.restaurantBanner}>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerEyebrow}>ORDERING FROM</Text>
              <Text style={s.bannerName}>{restaurantName}</Text>
              {orderMode === 'table' && table && (
                <Text style={s.bannerTable}>Seated at {table.name}</Text>
              )}
            </View>
            <Pressable style={s.clearBtn} onPress={clearCart}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={s.clearBtnText}>Clear</Text>
            </Pressable>
          </View>

          {cart.map((i) => (
            <Card key={i.cartKey} style={s.item}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{i.product.name}</Text>
                {i.customisations.map((o) => (
                  <Text key={o.optionId} style={s.detail}>
                    {o.groupName}: {o.optionName}
                    {o.price ? ` (+${money(o.price)})` : ''}
                  </Text>
                ))}
                {!!i.notes && <Text style={s.notesText}>Note: {i.notes}</Text>}
                <Text style={s.price}>{money(i.unitPrice * i.quantity)}</Text>
              </View>
              <View style={s.stepper}>
                <Pressable
                  style={s.stepBtn}
                  onPress={() => setQuantity(i.cartKey, i.quantity - 1)}
                  accessibilityLabel="Decrease quantity"
                >
                  <Text style={s.stepBtnText}>−</Text>
                </Pressable>
                <Text style={s.quantityText}>{i.quantity}</Text>
                <Pressable
                  style={s.stepBtn}
                  onPress={() => setQuantity(i.cartKey, i.quantity + 1)}
                  accessibilityLabel="Increase quantity"
                >
                  <Text style={s.stepBtnText}>+</Text>
                </Pressable>
              </View>
            </Card>
          ))}

          <View style={s.total}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{money(subtotal)}</Text>
          </View>

          <RewardsSummary />

          <View style={{ flex: 1, minHeight: 25 }} />

          <Button
            label={
              orderMode === 'table'
                ? `Continue to Table Checkout (${table?.name || 'Table'})`
                : 'Choose Pickup Time'
            }
            onPress={() =>
              router.push(orderMode === 'table' ? '/checkout' : '/pickup-time')
            }
          />
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 14,
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  restaurantBanner: {
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
  bannerEyebrow: {
    color: colors.caramel,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bannerName: {
    color: colors.espresso,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  bannerTable: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FBE8E5',
  },
  clearBtnText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    fontWeight: '800',
    fontSize: 15,
    color: colors.ink,
  },
  detail: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  notesText: {
    color: colors.caramel,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 3,
  },
  price: {
    color: colors.coffee,
    fontWeight: '800',
    fontSize: 14,
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 10,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 16,
  },
  quantityText: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
    minWidth: 16,
    textAlign: 'center',
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
  },
});
