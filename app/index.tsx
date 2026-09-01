import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Card } from '@/src/components/UI';
import { money } from '@/src/data/products';
import { useOrders } from '@/src/context/OrderContext';
import { useProducts } from '@/src/context/ProductContext';
import { colors } from '@/src/theme';
import { useTables } from '@/src/context/TableContext';
import { ProductImage } from '@/src/components/ProductImage';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { useRestaurant } from '@/src/context/RestaurantContext';

export default function MenuScreen() {
  const { currentRestaurant, selectRestaurantBySlug } = useRestaurant();
  const { cart, orderMode, table, setOrderMode, orders } = useOrders();
  const { table: tableCode, restaurant: restaurantSlug, r: shortSlug } =
    useLocalSearchParams<{ table?: string; restaurant?: string; r?: string }>();
  const { tables, loading: loadingTables } = useTables();
  const { products, loading, error } = useProducts();
  const { customerKey, balance, settings, promos } = useLoyalty();
  const [showTables, setShowTables] = useState(false);

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const customerOrders = orders.filter((order) => order.customerKey === customerKey);
  const activeOrder = customerOrders.find((order) => order.status !== 'Collected');
  const activePromos = promos.filter(
    (promo) => promo.enabled && (!promo.expiresAt || new Date(promo.expiresAt) >= new Date()),
  );
  const loyaltyProgress = Math.min(100, (balance.coffeeStamps / (settings.coffeeGoal || 4)) * 100);

  // Handle URL restaurant switching
  useEffect(() => {
    const slug = restaurantSlug || shortSlug;
    if (slug && slug.toLowerCase() !== currentRestaurant.slug.toLowerCase()) {
      void selectRestaurantBySlug(slug);
    }
  }, [restaurantSlug, shortSlug, currentRestaurant.slug, selectRestaurantBySlug]);

  // Handle Table QR code scanning
  useEffect(() => {
    if (!tableCode || loadingTables) return;
    const found = tables.find(
      (item) => item.code.toLowerCase() === tableCode.toLowerCase() && item.active,
    );
    if (found) setOrderMode('table', found);
  }, [tableCode, tables, loadingTables, setOrderMode]);

  return (
    <Screen>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Pressable
            style={styles.restaurantSelector}
            onPress={() => router.push('/restaurants')}
          >
            <View style={styles.locationPin}>
              <Ionicons name="location" size={13} color={colors.caramel} />
            </View>
            <Text style={styles.restaurantSwitchText} numberOfLines={1}>
              {currentRestaurant.name}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.caramel} />
          </Pressable>
          <Text style={styles.brand}>{currentRestaurant.name}</Text>
          {!!currentRestaurant.address && (
            <Text style={styles.addressText} numberOfLines={1}>
              {currentRestaurant.address}
            </Text>
          )}
        </View>
        <View style={styles.topActions}>
          <Pressable
            style={styles.browseCafesBtn}
            onPress={() => router.push('/restaurants')}
            accessibilityLabel="Switch restaurant"
          >
            <Ionicons name="storefront-outline" size={18} color={colors.espresso} />
          </Pressable>
          <Pressable
            style={styles.admin}
            onPress={() => router.push('/admin')}
            accessibilityLabel="Staff Admin"
          >
            <Ionicons name="shield-outline" size={18} color={colors.espresso} />
          </Pressable>
        </View>
      </View>

      <View style={styles.modeRow}>
        {currentRestaurant.clickAndCollectEnabled && (
          <Pressable
            style={[styles.mode, orderMode === 'pickup' && styles.modeActive]}
            onPress={() => {
              setOrderMode('pickup');
              setShowTables(false);
            }}
          >
            <Text
              style={[
                styles.modeText,
                orderMode === 'pickup' && styles.modeTextActive,
              ]}
            >
              Click & Collect
            </Text>
          </Pressable>
        )}
        {currentRestaurant.tableOrderingEnabled && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Order at Table"
            style={[styles.mode, orderMode === 'table' && styles.modeActive]}
            onPress={() => setShowTables((current) => !current)}
          >
            <Text
              style={[
                styles.modeText,
                orderMode === 'table' && styles.modeTextActive,
              ]}
            >
              {table ? table.name : 'Order at Table'}
            </Text>
          </Pressable>
        )}
      </View>

      {showTables && (
        <View style={styles.tablePicker}>
          <Text style={styles.tablePickerTitle}>Select your table</Text>
          <Text style={styles.tablePickerHelp}>
            QR guests are selected automatically. Otherwise choose the table you are sitting at.
          </Text>
          {loadingTables ? (
            <Text style={styles.tablePickerHelp}>Loading tables…</Text>
          ) : (
            tables
              .filter((item) => item.active)
              .map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.tableChoice,
                    table?.id === item.id && styles.tableChoiceActive,
                  ]}
                  onPress={() => {
                    setOrderMode('table', item);
                    setShowTables(false);
                  }}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={19}
                    color={table?.id === item.id ? colors.white : colors.espresso}
                  />
                  <Text
                    style={[
                      styles.tableChoiceText,
                      table?.id === item.id && { color: colors.white },
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              ))
          )}
          {!loadingTables && !tables.some((item) => item.active) && (
            <Text style={styles.error}>
              No tables are currently registered for {currentRestaurant.name}.
            </Text>
          )}
        </View>
      )}

      <View style={styles.hero}>
        <Text style={styles.heroSmall}>
          {orderMode === 'table' ? 'ORDER AT TABLE' : 'CLICK & COLLECT'}
        </Text>
        <Text style={styles.heroTitle}>
          {orderMode === 'table'
            ? `${table?.name || 'Your table'} service,\nright from your seat.`
            : `Your café favourites,\nready when you are.`}
        </Text>
        <Text style={styles.heroText}>
          {orderMode === 'table'
            ? 'Order from the live menu and we’ll bring it to your table.'
            : 'Order ahead and skip the wait.'}
        </Text>
      </View>

      <View style={styles.customerNav}>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/restaurants')}
        >
          <View style={styles.navIcon}>
            <Ionicons name="storefront-outline" size={18} color={colors.espresso} />
          </View>
          <Text style={styles.navLabel}>All Cafés</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/rewards')}
        >
          <View style={styles.navIcon}>
            <Ionicons name="gift-outline" size={18} color={colors.espresso} />
          </View>
          <Text style={styles.navLabel}>Rewards</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() =>
            activeOrder
              ? router.push({ pathname: '/order-status', params: { id: activeOrder.id } })
              : router.push('/orders')
          }
        >
          <View style={styles.navIcon}>
            <Ionicons name="receipt-outline" size={18} color={colors.espresso} />
          </View>
          <Text style={styles.navLabel}>Track</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/orders')}
        >
          <View style={styles.navIcon}>
            <Ionicons name="time-outline" size={18} color={colors.espresso} />
          </View>
          <Text style={styles.navLabel}>Orders</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.loyaltyCard}
        onPress={() => router.push('/rewards')}
      >
        <View style={styles.loyaltyTop}>
          <View>
            <Text style={styles.cardEyebrow}>
              {currentRestaurant.name.toUpperCase()} REWARDS
            </Text>
            <Text style={styles.points}>{balance.points} points</Text>
          </View>
          <View style={styles.giftCircle}>
            <Ionicons name="cafe" size={24} color={colors.white} />
          </View>
        </View>
        <Text style={styles.loyaltyTitle}>
          {balance.freeCoffees > 0
            ? `You have ${balance.freeCoffees} free coffee${balance.freeCoffees === 1 ? '' : 's'} ready!`
            : `${balance.coffeeStamps} of ${settings.coffeeGoal} coffees toward your next free one`}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${loyaltyProgress}%` }]} />
        </View>
        <View style={styles.loyaltyBottom}>
          <Text style={styles.loyaltyHelp}>
            Buy {settings.coffeeGoal}, get 1 free
          </Text>
          <Text style={styles.viewLink}>View rewards →</Text>
        </View>
      </Pressable>

      {activeOrder && (
        <Pressable
          style={styles.orderCard}
          onPress={() =>
            router.push({ pathname: '/order-status', params: { id: activeOrder.id } })
          }
        >
          <View style={styles.orderIcon}>
            <Ionicons name="bag-handle-outline" size={22} color={colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderEyebrow}>
              CURRENT ORDER · {activeOrder.id}
            </Text>
            <Text style={styles.orderTitle}>
              {activeOrder.status === 'Incoming' ? 'Order received' : activeOrder.status}
            </Text>
            <Text style={styles.orderHelp}>
              {activeOrder.orderType === 'table'
                ? activeOrder.table?.name
                : activeOrder.pickupTime}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      )}

      <View style={styles.offerHeader}>
        <Text style={styles.heading}>Offers for you</Text>
        <Pressable onPress={() => router.push('/rewards')}>
          <Text style={styles.viewLink}>See all</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.offerCard}
        onPress={() => router.push('/rewards')}
      >
        <View style={styles.offerIcon}>
          <Ionicons name="pricetag-outline" size={21} color={colors.caramel} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.offerTitle}>
            {activePromos[0]?.code || `${currentRestaurant.name} Rewards`}
          </Text>
          <Text style={styles.offerText}>
            {activePromos[0]?.description ||
              `Earn points on every order and a free coffee after ${settings.coffeeGoal} coffees.`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.muted} />
      </Pressable>

      <View style={styles.sectionRow}>
        <Text style={styles.heading}>Our menu</Text>
        <Text style={styles.count}>
          {loading ? 'Loading…' : `${products.length} items`}
        </Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.grid}>
        {products.map((product) => (
          <Pressable
            key={product.id}
            disabled={product.soldOut}
            style={[styles.productWrap, product.soldOut && { opacity: 0.55 }]}
            onPress={() => router.push(`/product/${product.id}`)}
          >
            <Card style={styles.product}>
              <View style={styles.imageWrap}>
                <ProductImage
                  uri={product.imageUrl}
                  style={styles.productImage}
                  placeholderStyle={styles.productImage}
                />
                {product.soldOut && (
                  <View style={styles.soldBadge}>
                    <Text style={styles.soldText}>SOLD OUT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.category}>{product.category}</Text>
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.price}>{money(product.price)}</Text>
            </Card>
          </Pressable>
        ))}
      </View>

      {count > 0 && (
        <Pressable
          style={styles.cartBar}
          onPress={() => router.push('/cart')}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
          <Text style={styles.cartText}>View cart</Text>
          <Text style={styles.cartTotal}>
            {money(cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  restaurantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8EFE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantSwitchText: {
    color: colors.caramel,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    maxWidth: 200,
  },
  brand: {
    color: colors.espresso,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  addressText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 1,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  browseCafesBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  admin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 4,
    marginTop: 16,
  },
  mode: {
    flex: 1,
    alignItems: 'center',
    padding: 11,
    borderRadius: 12,
  },
  modeActive: {
    backgroundColor: colors.espresso,
  },
  modeText: {
    color: colors.muted,
    fontWeight: '700',
  },
  modeTextActive: {
    color: colors.white,
  },
  tablePicker: {
    backgroundColor: colors.white,
    borderRadius: 17,
    padding: 14,
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tablePickerTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  tablePickerHelp: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  tableChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    borderRadius: 12,
    backgroundColor: colors.cream,
  },
  tableChoiceActive: {
    backgroundColor: colors.espresso,
  },
  tableChoiceText: {
    color: colors.espresso,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: colors.espresso,
    borderRadius: 26,
    padding: 24,
    marginVertical: 16,
  },
  heroSmall: {
    color: '#DDBB9B',
    fontWeight: '800',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  heroTitle: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 25,
    lineHeight: 32,
    marginVertical: 12,
  },
  heroText: {
    color: '#E7DCD5',
    fontSize: 14,
  },
  customerNav: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 13,
  },
  navItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 15,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 10,
    marginTop: 4,
  },
  loyaltyCard: {
    backgroundColor: '#335943',
    borderRadius: 22,
    padding: 18,
    marginBottom: 13,
  },
  loyaltyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardEyebrow: {
    color: '#BFD4C4',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  points: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  giftCircle: {
    width: 47,
    height: 47,
    borderRadius: 16,
    backgroundColor: '#527A60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyTitle: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
    marginTop: 13,
  },
  progressTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#527A60',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#E8C68D',
  },
  loyaltyBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  loyaltyHelp: {
    color: '#D6E4D9',
    fontSize: 10,
  },
  viewLink: {
    color: colors.caramel,
    fontWeight: '800',
    fontSize: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 17,
    padding: 13,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#CDE0D1',
  },
  orderIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderEyebrow: {
    color: colors.green,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.7,
  },
  orderTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 16,
    marginTop: 3,
  },
  orderHelp: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 9,
  },
  offerCard: {
    backgroundColor: '#FFF8EB',
    borderRadius: 17,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#EBD9B6',
    marginBottom: 18,
  },
  offerIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#F6E9D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: {
    color: colors.espresso,
    fontWeight: '900',
  },
  offerText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  count: {
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  productWrap: {
    width: '50%',
    padding: 6,
  },
  product: {
    padding: 13,
    minHeight: 208,
  },
  imageWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 15,
  },
  category: {
    color: colors.caramel,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    marginVertical: 6,
  },
  price: {
    color: colors.coffee,
    fontSize: 16,
    fontWeight: '800',
  },
  cartBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    height: 60,
    backgroundColor: colors.espresso,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.caramel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontWeight: '800',
  },
  cartText: {
    flex: 1,
    color: colors.white,
    fontWeight: '700',
    marginLeft: 12,
  },
  cartTotal: {
    color: colors.white,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    backgroundColor: '#FBE8E5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  soldBadge: {
    position: 'absolute',
    backgroundColor: colors.espresso,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  soldText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
});
