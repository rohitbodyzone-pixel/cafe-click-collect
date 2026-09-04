import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Header } from '@/src/components/UI';
import { money } from '@/src/data/products';
import { useOrders } from '@/src/context/OrderContext';
import { useProducts } from '@/src/context/ProductContext';
import { colors, radii, shadows } from '@/src/theme';
import { useTables } from '@/src/context/TableContext';
import { ProductImage } from '@/src/components/ProductImage';
import { RestaurantCoverImage, RestaurantLogoImage } from '@/src/components/RestaurantImage';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useCustomerExperience } from '@/src/context/CustomerExperienceContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { TableBellButton } from '@/src/components/TableBellModal';

export default function DedicatedMenuScreen() {
  const { currentRestaurant, selectRestaurantBySlug } = useRestaurant();
  const { cart, orderMode, table, setOrderMode, orders, addToCart, clearCart } = useOrders();
  const { mode, table: tableCode, restaurant: restaurantSlug, r: shortSlug } =
    useLocalSearchParams<{ mode?: string; table?: string; restaurant?: string; r?: string }>();
  const { tables, loading: loadingTables } = useTables();
  const { products, loading, error } = useProducts();
  const { customerKey, balance, settings, promos } = useLoyalty();
  const { usual, vipTier, currentStreakDays, vipDiscountPercent } = useCustomerExperience();
  const { isFeatureEnabled } = useFeaturePermission();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showTables, setShowTables] = useState(false);

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const customerOrders = orders.filter((order) => order.customerKey === customerKey);
  const activeOrder = customerOrders.find((order) => order.status !== 'Collected');

  // Handle URL restaurant switching
  useEffect(() => {
    const slug = restaurantSlug || shortSlug;
    if (slug && slug.toLowerCase() !== currentRestaurant.slug.toLowerCase()) {
      void selectRestaurantBySlug(slug);
    }
  }, [restaurantSlug, shortSlug, currentRestaurant.slug, selectRestaurantBySlug]);

  // Handle mode param: if mode=table, switch orderMode to table
  useEffect(() => {
    if (mode === 'table' && orderMode !== 'table') {
      setOrderMode('table');
    }
  }, [mode, orderMode, setOrderMode]);

  // Handle Table QR code scanning
  useEffect(() => {
    if (!tableCode || loadingTables) return;
    const found = tables.find(
      (item) => item.code.toLowerCase() === tableCode.toLowerCase() && item.active,
    );
    if (found) {
      setOrderMode('table', found);
      setShowTables(false);
    }
  }, [tableCode, tables, loadingTables, setOrderMode]);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'All') return true;
    return p.category === selectedCategory;
  });

  return (
    <Screen>
      <Header
        title={currentRestaurant.name}
        right={
          <Pressable style={s.topBtn} onPress={() => router.push('/restaurants')}>
            <Ionicons name="storefront-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContainer}>
        {/* Restaurant Brand Hero Banner */}
        <View style={s.restaurantHero}>
          <RestaurantCoverImage
            uri={
              currentRestaurant.coverImageUrl ||
              currentRestaurant.hero_image_url ||
              currentRestaurant.logoUrl
            }
            name={currentRestaurant.name}
            style={s.restaurantHeroCover}
            placeholderStyle={s.restaurantHeroCover}
          />
          <View style={s.restaurantHeroOverlay} />
          <View style={s.restaurantHeroContent}>
            <RestaurantLogoImage
              uri={currentRestaurant.logoUrl}
              name={currentRestaurant.name}
              size={48}
              style={s.restaurantHeroLogo}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.restaurantHeroName} numberOfLines={1}>
                {currentRestaurant.name}
              </Text>
              <Text style={s.restaurantHeroDesc} numberOfLines={1}>
                {currentRestaurant.description || 'Fresh artisan specialties & crafted beverages'}
              </Text>
              <View style={s.restaurantHeroMeta}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text style={s.restaurantHeroMetaText} numberOfLines={1}>
                  {currentRestaurant.address || 'Auckland, NZ'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Rush Mode Notice if Active */}
        {currentRestaurant.is_orders_paused && (
          <View style={s.pauseNotice}>
            <Ionicons name="alert-circle" size={18} color={colors.white} />
            <Text style={s.pauseNoticeText}>
              {currentRestaurant.rush_customer_message || 'Orders are temporarily paused due to kitchen rush. Please check back soon!'}
            </Text>
          </View>
        )}

        {/* Dining Mode Banner */}
        {orderMode === 'table' && table ? (
          <View style={s.tableBannerRow}>
            <View style={s.tableIconCircle}>
              <Ionicons name="restaurant" size={18} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.tableBannerTitle}>
                Dining at {table.name || `Table ${table.code}`}
              </Text>
              <Text style={s.tableBannerSub}>
                Table order locked · Served to your seat
              </Text>
            </View>
            <TableBellButton />
          </View>
        ) : (
          <View style={s.pickupModeBanner}>
            <View style={s.pickupIconCircle}>
              <Ionicons name="bag-handle" size={16} color={colors.espresso} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pickupBannerTitle}>CLICK & COLLECT ORDER</Text>
              <Text style={s.pickupBannerSub}>Order ahead & collect at counter</Text>
            </View>
          </View>
        )}

        {/* Table Selector Picker */}
        {showTables && (
          <View style={s.tablePicker}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.tablePickerTitle}>Select your table</Text>
              <Pressable onPress={() => setShowTables(false)}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={s.tablePickerHelp}>
              Choose the table number you are seated at for direct service.
            </Text>
            {loadingTables ? (
              <Text style={s.tablePickerHelp}>Loading tables…</Text>
            ) : tables.filter((item) => item.active).length === 0 ? (
              <Text style={s.tablePickerHelp}>No active tables found. You can still order at the counter.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {tables
                  .filter((item) => item.active)
                  .map((item) => (
                    <Pressable
                      key={item.id}
                      style={[s.tableChoice, table?.id === item.id && s.tableChoiceActive]}
                      onPress={() => {
                        setOrderMode('table', item);
                        setShowTables(false);
                      }}
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={16}
                        color={table?.id === item.id ? colors.white : colors.espresso}
                      />
                      <Text
                        style={[
                          s.tableChoiceText,
                          table?.id === item.id && { color: colors.white },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Active Order Banner */}
        {activeOrder && (
          <Pressable
            style={s.orderCard}
            onPress={() => router.push({ pathname: '/order-status', params: { id: activeOrder.id } })}
          >
            <View style={s.orderIcon}>
              <Ionicons name="time" size={20} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.orderEyebrow}>LIVE ORDER IN PROGRESS · {activeOrder.id}</Text>
              <Text style={s.orderTitle}>Status: {activeOrder.status}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}

        {/* My Usual Reorder Banner (if enabled) */}
        {isFeatureEnabled('my_usual') && usual && usual.items && usual.items.length > 0 && (
          <Card style={s.usualCard}>
            <View style={s.usualHeader}>
              <Ionicons name="star" size={15} color={colors.caramel} />
              <Text style={s.usualTitle}>MY USUAL ORDER</Text>
            </View>
            <Text style={s.usualItemsText}>
              {usual.items.map((i) => `${i.quantity}x ${i.product.name}`).join(' + ')}
            </Text>
            <Pressable
              style={s.reorderBtn}
              onPress={() => {
                clearCart();
                usual.items.forEach((item) => {
                  addToCart(item.product, item.quantity, item.notes, item.customisations);
                });
                router.push('/cart');
              }}
            >
              <Ionicons name="flash" size={14} color={colors.white} />
              <Text style={s.reorderBtnText}>1-Tap Reorder</Text>
            </Pressable>
          </Card>
        )}

        {/* Categories Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll}>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[s.catPill, selectedCategory === cat && s.catPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[s.catPillText, selectedCategory === cat && s.catPillTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Products Grid */}
        <View style={s.grid}>
          {filteredProducts.map((product) => (
            <Pressable
              key={product.id}
              disabled={product.soldOut || currentRestaurant.is_orders_paused}
              style={[
                s.productWrap,
                (product.soldOut || currentRestaurant.is_orders_paused) && { opacity: 0.55 },
              ]}
              onPress={() => router.push(`/product/${product.id}`)}
            >
              <Card style={s.productCard}>
                <View style={s.imageWrap}>
                  <ProductImage
                    uri={product.imageUrl}
                    category={product.category}
                    name={product.name}
                    style={s.productImage}
                    placeholderStyle={s.productImage}
                    iconSize={26}
                  />
                  {product.soldOut && (
                    <View style={s.soldBadge}>
                      <Text style={s.soldText}>SOLD OUT</Text>
                    </View>
                  )}
                </View>
                <Text style={s.categoryText}>{product.category}</Text>
                <Text style={s.productName} numberOfLines={1}>{product.name}</Text>
                {!!product.description && (
                  <Text style={s.productDesc} numberOfLines={2}>
                    {product.description}
                  </Text>
                )}
                <Text style={s.priceText}>{money(product.price)}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Cart Bar Floating CTA */}
      {count > 0 && (
        <Pressable style={s.cartBar} onPress={() => router.push('/cart')}>
          <View style={s.badge}>
            <Text style={s.badgeText}>{count}</Text>
          </View>
          <Text style={s.cartText}>View cart</Text>
          <Text style={s.cartTotal}>
            {money(cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  topBtn: { padding: 8 },
  scrollContainer: { paddingBottom: 90 },
  restaurantHero: {
    height: 150,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    backgroundColor: colors.espresso,
    ...shadows.md,
  },
  restaurantHeroCover: {
    width: '100%',
    height: 150,
  },
  restaurantHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 18, 14, 0.55)',
  },
  restaurantHeroContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  restaurantHeroLogo: {
    borderWidth: 2.5,
    borderColor: colors.white,
    borderRadius: 18,
  },
  restaurantHeroName: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.3,
  },
  restaurantHeroDesc: {
    fontSize: 12,
    color: '#E8DFD5',
    marginTop: 2,
  },
  restaurantHeroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  restaurantHeroMetaText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '800',
  },
  pauseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.danger,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    ...shadows.sm,
  },
  pauseNoticeText: { color: colors.white, fontWeight: '800', fontSize: 13, flex: 1 },
  modeRow: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  mode: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 },
  modeActive: { backgroundColor: colors.espresso, ...shadows.sm },
  modeText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  modeTextActive: { color: colors.white, fontWeight: '800' },
  tableBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#EBD8B8',
    ...shadows.sm,
  },
  tableIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.espresso,
    letterSpacing: -0.2,
  },
  tableBannerSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  pickupModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.creamSoft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pickupIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupBannerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.espresso,
    letterSpacing: 0.8,
  },
  pickupBannerSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  tablePicker: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 14, gap: 10, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  tablePickerTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  tablePickerHelp: { fontSize: 12, color: colors.muted },
  tableChoice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.creamSoft, borderWidth: 1, borderColor: colors.lineLight },
  tableChoiceActive: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  tableChoiceText: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  orderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#CDE0D1', ...shadows.sm },
  orderIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  orderEyebrow: { fontSize: 10, fontWeight: '800', color: colors.green, letterSpacing: 1, textTransform: 'uppercase' },
  orderTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginTop: 2 },
  usualCard: { padding: 14, marginBottom: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  usualHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  usualTitle: { fontSize: 11, fontWeight: '800', color: colors.caramel, letterSpacing: 1.2, textTransform: 'uppercase' },
  usualItemsText: { fontSize: 14, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  reorderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.espresso, paddingVertical: 10, borderRadius: 12, ...shadows.sm },
  reorderBtnText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  categoryScroll: { flexDirection: 'row', marginBottom: 16 },
  catPill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.full, backgroundColor: colors.white, marginRight: 8, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  catPillActive: { backgroundColor: colors.espresso, borderColor: colors.espresso, ...shadows.md },
  catPillText: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  catPillTextActive: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  productWrap: { width: '50%', padding: 6 },
  productCard: { padding: 12, minHeight: 190, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  imageWrap: { position: 'relative', marginBottom: 8, borderRadius: 14, overflow: 'hidden' },
  productImage: { width: '100%', height: 105, borderRadius: 14 },
  soldBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
  soldText: { color: colors.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  categoryText: { fontSize: 9, fontWeight: '800', color: colors.caramel, textTransform: 'uppercase', letterSpacing: 1 },
  productName: { fontSize: 14, fontWeight: '800', color: colors.ink, marginTop: 4, marginBottom: 2 },
  productDesc: { fontSize: 11, color: colors.muted, lineHeight: 16, marginBottom: 6 },
  priceText: { fontSize: 15, fontWeight: '900', color: colors.espresso },
  cartBar: { position: 'absolute', left: 16, right: 16, bottom: 18, height: 60, backgroundColor: colors.espresso, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, ...shadows.floating },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1.5, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  cartText: { color: colors.white, fontSize: 15, fontWeight: '800', flex: 1 },
  cartTotal: { color: colors.white, fontSize: 16, fontWeight: '900' },
});
