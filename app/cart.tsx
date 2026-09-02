import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen, triggerHaptic } from '@/src/components/UI';
import { money } from '@/src/data/products';
import { useOrders } from '@/src/context/OrderContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useProducts } from '@/src/context/ProductContext';
import { useCustomerExperience } from '@/src/context/CustomerExperienceContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { RewardsSummary } from '@/src/components/RewardsSummary';
import { ProductImage } from '@/src/components/ProductImage';
import { RestaurantLogoImage } from '@/src/components/RestaurantImage';
import { colors, radii, shadows } from '@/src/theme';

export default function Cart() {
  const { currentRestaurant } = useRestaurant();
  const { products } = useProducts();
  const { getSuggestedUpsell, saveUsual } = useCustomerExperience();
  const {
    cart,
    addToCart,
    setQuantity,
    clearCart,
    orderMode,
    table,
    cartRestaurantName,
  } = useOrders();

  const { isFeatureEnabled } = useFeaturePermission();
  const [savedUsual, setSavedUsual] = useState(false);

  const restaurantName = cartRestaurantName || currentRestaurant.name;
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const suggestedUpsell = isFeatureEnabled('combo_suggestions') ? getSuggestedUpsell(cart, products) : null;

  const handleAddUpsell = () => {
    if (!suggestedUpsell) return;
    triggerHaptic('success');
    addToCart(suggestedUpsell.product, 1, undefined, []);
  };

  const handleSaveUsual = async () => {
    if (cart.length === 0) return;
    triggerHaptic('success');
    await saveUsual(cart, orderMode, undefined, `${cart[0].product.name} Usual`);
    setSavedUsual(true);
  };

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
            <RestaurantLogoImage
              uri={currentRestaurant.logoUrl}
              name={restaurantName}
              size={36}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.bannerEyebrow}>ORDERING FROM</Text>
              <Text style={s.bannerName}>{restaurantName}</Text>
              {orderMode === 'table' && table && (
                <Text style={s.bannerTable}>Seated at {table.name}</Text>
              )}
            </View>
            <Pressable
              style={s.clearBtn}
              onPress={() => {
                triggerHaptic('medium');
                clearCart();
              }}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={s.clearBtnText}>Clear</Text>
            </Pressable>
          </View>

          {cart.map((i) => (
            <Card key={i.cartKey} style={s.item}>
              <ProductImage
                uri={i.product.imageUrl}
                category={i.product.category}
                name={i.product.name}
                style={s.cartItemThumb}
                placeholderStyle={s.cartItemThumb}
                iconSize={20}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
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
                  onPress={() => {
                    triggerHaptic('light');
                    setQuantity(i.cartKey, i.quantity - 1);
                  }}
                  accessibilityLabel="Decrease quantity"
                >
                  <Text style={s.stepBtnText}>−</Text>
                </Pressable>
                <Text style={s.quantityText}>{i.quantity}</Text>
                <Pressable
                  style={s.stepBtn}
                  onPress={() => {
                    triggerHaptic('light');
                    setQuantity(i.cartKey, i.quantity + 1);
                  }}
                  accessibilityLabel="Increase quantity"
                >
                  <Text style={s.stepBtnText}>+</Text>
                </Pressable>
              </View>
            </Card>
          ))}

          {/* Smart Add-on / Combo Upsell Suggestion */}
          {suggestedUpsell && (
            <Card style={s.upsellCard}>
              <View style={s.upsellHeader}>
                <Ionicons name="sparkles" size={16} color={colors.caramel} />
                <Text style={s.upsellTitle}>{suggestedUpsell.rule.title}</Text>
              </View>
              <View style={s.upsellBody}>
                <ProductImage
                  uri={suggestedUpsell.product.imageUrl}
                  category={suggestedUpsell.product.category}
                  name={suggestedUpsell.product.name}
                  style={s.upsellThumb}
                  placeholderStyle={s.upsellThumb}
                  iconSize={22}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.upsellProdName}>{suggestedUpsell.product.name}</Text>
                  <Text style={s.upsellDiscount}>
                    {suggestedUpsell.rule.discountPercent}% Combo Discount ·{' '}
                    {money(
                      suggestedUpsell.product.price *
                        (1 - suggestedUpsell.rule.discountPercent / 100),
                    )}
                  </Text>
                </View>
                <Pressable style={s.addUpsellBtn} onPress={handleAddUpsell}>
                  <Text style={s.addUpsellBtnText}>+ Add</Text>
                </Pressable>
              </View>
            </Card>
          )}

          {/* Save as Usual Button */}
          <Pressable style={s.saveUsualBtn} onPress={handleSaveUsual} disabled={savedUsual}>
            <Ionicons
              name={savedUsual ? 'checkmark-circle' : 'star-outline'}
              size={16}
              color={savedUsual ? colors.green : colors.caramel}
            />
            <Text style={[s.saveUsualText, savedUsual && { color: colors.green }]}>
              {savedUsual ? 'Saved as My Usual!' : 'Save this order as My Usual'}
            </Text>
          </Pressable>

          <View style={s.total}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{money(subtotal)}</Text>
          </View>

          <RewardsSummary />

          <View style={{ flex: 1, minHeight: 20 }} />

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
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  cartItemThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  name: {
    fontWeight: '800',
    fontSize: 15,
    color: colors.espresso,
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
    color: colors.espresso,
    fontWeight: '900',
    fontSize: 15,
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.lineLight,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stepBtnText: {
    color: colors.espresso,
    fontWeight: '900',
    fontSize: 16,
  },
  quantityText: {
    fontWeight: '900',
    fontSize: 14,
    color: colors.espresso,
    minWidth: 18,
    textAlign: 'center',
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 1.5,
    borderColor: colors.line,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.espresso,
  },
  upsellCard: {
    backgroundColor: '#FAF5EE',
    borderColor: '#EBDDC9',
    borderWidth: 1.5,
    borderRadius: 18,
    marginBottom: 14,
    padding: 16,
    ...shadows.sm,
  },
  upsellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  upsellTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.caramel,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  upsellBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upsellThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  upsellProdName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.espresso,
  },
  upsellDiscount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
    marginTop: 2,
  },
  addUpsellBtn: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  addUpsellBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  saveUsualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  saveUsualText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.espresso,
  },
});
