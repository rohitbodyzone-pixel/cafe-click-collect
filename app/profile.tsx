import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { CustomerBottomNav } from '@/src/components/CustomerBottomNav';
import { useOrders } from '@/src/context/OrderContext';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { useCustomerExperience } from '@/src/context/CustomerExperienceContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { ProductImage } from '@/src/components/ProductImage';
import { RestaurantLogoImage } from '@/src/components/RestaurantImage';
import { money } from '@/src/data/products';
import { colors } from '@/src/theme';

export default function MyProfileScreen() {
  const { currentRestaurant } = useRestaurant();
  const {
    cart,
    orders,
    orderMode,
    table,
    setOrderMode,
    addToCart,
    clearCart,
  } = useOrders();
  const { customerKey, balance, settings, promos } = useLoyalty();
  const {
    usual,
    vipTier,
    currentStreakDays,
    vipDiscountPercent,
    customerPasses,
    getWalletPassPayload,
  } = useCustomerExperience();
  const { isFeatureEnabled } = useFeaturePermission();

  const [walletBusy, setWalletBusy] = useState(false);

  // Filter orders for current customer
  const myOrders = orders.filter((o) => o.customerKey === customerKey);
  const recentOrders = myOrders.slice(0, 3);
  const activePassCredits = customerPasses.reduce(
    (sum, p) => sum + p.unitsRemaining,
    0,
  );
  const progress = Math.min(
    100,
    (balance.coffeeStamps / settings.coffeeGoal) * 100,
  );

  const handleReorderUsual = () => {
    if (!usual || usual.items.length === 0) return;
    clearCart();
    usual.items.forEach((item) =>
      addToCart(item.product, item.quantity, item.notes, item.customisations),
    );
    router.push('/cart');
  };

  const handleAppleWallet = () => {
    setWalletBusy(true);
    getWalletPassPayload('apple');
    if (Platform.OS === 'web') {
      alert(`📲 Stamp Card added to Apple Wallet for ${currentRestaurant.name}!`);
    } else {
      Alert.alert('Apple Wallet', 'Stamp Card added to your Apple Wallet.');
    }
    setWalletBusy(false);
  };

  const handleGoogleWallet = () => {
    setWalletBusy(true);
    getWalletPassPayload('google');
    if (Platform.OS === 'web') {
      alert(`📲 Stamp Card added to Google Wallet for ${currentRestaurant.name}!`);
    } else {
      Alert.alert('Google Wallet', 'Stamp Card added to your Google Wallet.');
    }
    setWalletBusy(false);
  };

  const toggleDiningMode = () => {
    if (orderMode === 'pickup') {
      setOrderMode('table');
    } else {
      setOrderMode('pickup');
    }
  };

  return (
    <Screen>
      <Header title="My Profile" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {/* 1. Customer Identity & VIP Card */}
        <Card style={s.profileCard}>
          <View style={s.profileTop}>
            <View style={s.avatarCircle}>
              <Ionicons name="person" size={28} color={colors.espresso} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.nameRow}>
                <Text style={s.customerName}>Guest Customer</Text>
                {vipTier && vipTier !== 'standard' && (
                  <View style={s.vipBadge}>
                    <Text style={s.vipBadgeText}>{vipTier.toUpperCase()} VIP</Text>
                  </View>
                )}
              </View>
              <Text style={s.customerId}>
                ID: #{customerKey.slice(-6).toUpperCase()} · {currentRestaurant.name}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={s.metricsRow}>
            <View style={s.metricBox}>
              <Text style={s.metricVal}>{balance.points}</Text>
              <Text style={s.metricLabel}>Points</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricBox}>
              <Text style={s.metricVal}>
                {balance.coffeeStamps}/{settings.coffeeGoal}
              </Text>
              <Text style={s.metricLabel}>Stamps</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricBox}>
              <Text style={s.metricVal}>{currentStreakDays}d 🔥</Text>
              <Text style={s.metricLabel}>Streak</Text>
            </View>
          </View>

          {/* Current Dining Mode Preference */}
          <View style={s.modePreferenceRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.modePrefLabel}>CURRENT DINING MODE</Text>
              <Text style={s.modePrefValue}>
                {orderMode === 'table'
                  ? `Dine In ${table ? `· ${table.name}` : ''}`
                  : 'Click & Collect (Pickup)'}
              </Text>
            </View>
            <Pressable style={s.switchModeBtn} onPress={toggleDiningMode}>
              <Ionicons name="swap-horizontal" size={14} color={colors.espresso} />
              <Text style={s.switchModeText}>
                Switch to {orderMode === 'pickup' ? 'Dine In' : 'Pickup'}
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* 2. Quick Action Shortcut Grid */}
        <View style={s.quickActionGrid}>
          {isFeatureEnabled('loyalty_rewards') && (
            <Pressable
              style={s.quickActionCard}
              onPress={() => router.push('/rewards')}
            >
              <View style={[s.quickActionIcon, { backgroundColor: colors.greenSoft }]}>
                <Ionicons name="star" size={20} color={colors.green} />
              </View>
              <Text style={s.quickActionLabel}>Stamp Card</Text>
              <Text style={s.quickActionSub}>
                {balance.coffeeStamps} stamps
              </Text>
            </Pressable>
          )}

          {isFeatureEnabled('prepaid_passes') && (
            <Pressable
              style={s.quickActionCard}
              onPress={() => router.push('/passes')}
            >
              <View style={[s.quickActionIcon, { backgroundColor: '#FDF0E7' }]}>
                <Ionicons name="ticket" size={20} color={colors.caramel} />
              </View>
              <Text style={s.quickActionLabel}>Prepaid Passes</Text>
              <Text style={s.quickActionSub}>
                {activePassCredits} credits
              </Text>
            </Pressable>
          )}

          {isFeatureEnabled('my_usual') && usual && (
            <Pressable
              style={s.quickActionCard}
              onPress={handleReorderUsual}
            >
              <View style={[s.quickActionIcon, { backgroundColor: '#FFF0D9' }]}>
                <Ionicons name="flash" size={20} color={colors.espresso} />
              </View>
              <Text style={s.quickActionLabel}>My Usual</Text>
              <Text style={s.quickActionSub}>1-Tap Reorder</Text>
            </Pressable>
          )}

          <Pressable
            style={s.quickActionCard}
            onPress={() => router.push('/orders')}
          >
            <View style={[s.quickActionIcon, { backgroundColor: '#EBF3F8' }]}>
              <Ionicons name="receipt" size={20} color="#2B6E94" />
            </View>
            <Text style={s.quickActionLabel}>Past Orders</Text>
            <Text style={s.quickActionSub}>
              {myOrders.length} orders
            </Text>
          </Pressable>
        </View>

        {/* 3. ⭐ Loyalty & Rewards Section */}
        {isFeatureEnabled('loyalty_rewards') && (
          <Card style={s.sectionCard}>
            <View style={s.sectionHeaderRow}>
              <View style={s.sectionTitleWrap}>
                <Ionicons name="star" size={18} color={colors.green} />
                <Text style={s.sectionTitle}>Digital Stamp Card & Points</Text>
              </View>
              <Pressable onPress={() => router.push('/rewards')}>
                <Text style={s.viewAllLink}>View All →</Text>
              </Pressable>
            </View>

            <View style={s.stampTrackWrap}>
              <View style={s.stampTrackHeader}>
                <Text style={s.stampTrackTitle}>
                  Buy {settings.coffeeGoal} coffees, get 1 free
                </Text>
                <Text style={s.stampTrackCount}>
                  {balance.coffeeStamps}/{settings.coffeeGoal}
                </Text>
              </View>
              <View style={s.track}>
                <View style={[s.trackFill, { width: `${progress}%` }]} />
              </View>
              <Text style={s.trackHint}>
                {balance.freeCoffees > 0
                  ? `🎉 ${balance.freeCoffees} free coffee reward ready to redeem!`
                  : `Only ${Math.max(0, settings.coffeeGoal - balance.coffeeStamps)} more until your next free coffee.`}
              </Text>
            </View>

            {/* Free Coffee Reward Banner */}
            {balance.freeCoffees > 0 && (
              <View style={s.freeVoucherBanner}>
                <Ionicons name="cafe" size={20} color={colors.white} />
                <View style={{ flex: 1 }}>
                  <Text style={s.voucherTitle}>
                    {balance.freeCoffees} Free Coffee Voucher Available
                  </Text>
                  <Text style={s.voucherSub}>
                    Apply at checkout or cart to redeem your free drink.
                  </Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* 4. 🎟 Prepaid Passes & Digital Wallet Section */}
        {isFeatureEnabled('prepaid_passes') && (
          <Card style={s.sectionCard}>
            <View style={s.sectionHeaderRow}>
              <View style={s.sectionTitleWrap}>
                <Ionicons name="ticket" size={18} color={colors.caramel} />
                <Text style={s.sectionTitle}>Prepaid Coffee Passes</Text>
              </View>
              <Pressable onPress={() => router.push('/passes')}>
                <Text style={s.viewAllLink}>Manage Passes →</Text>
              </Pressable>
            </View>

            {customerPasses.length === 0 ? (
              <View style={s.emptyPassBox}>
                <Text style={s.emptyPassText}>
                  Prepay for your daily coffee and save up to 25% with bonus credits.
                </Text>
                <Pressable
                  style={s.buyPassBtn}
                  onPress={() => router.push('/passes')}
                >
                  <Text style={s.buyPassBtnText}>Explore Pass Packages →</Text>
                </Pressable>
              </View>
            ) : (
              customerPasses.map((pass) => (
                <View key={pass.id} style={s.passItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.passItemName}>{pass.passName}</Text>
                    <Text style={s.passItemSub}>
                      {pass.unitsRemaining} of {pass.unitsTotal} drinks remaining
                    </Text>
                  </View>
                  <View style={s.passBadge}>
                    <Text style={s.passBadgeText}>{pass.status.toUpperCase()}</Text>
                  </View>
                </View>
              ))
            )}

            {/* Mobile Wallet Integration */}
            {isFeatureEnabled('digital_wallet_passes') && (
              <View style={s.walletSection}>
                <Text style={s.walletHeader}>MOBILE WALLET PASSES</Text>
                <View style={s.walletBtnRow}>
                  <Pressable
                    style={s.appleWalletBtn}
                    onPress={handleAppleWallet}
                    disabled={walletBusy}
                  >
                    <Ionicons name="logo-apple" size={16} color={colors.white} />
                    <Text style={s.appleWalletText}>Apple Wallet</Text>
                  </Pressable>
                  <Pressable
                    style={s.googleWalletBtn}
                    onPress={handleGoogleWallet}
                    disabled={walletBusy}
                  >
                    <Ionicons name="card-outline" size={16} color={colors.white} />
                    <Text style={s.googleWalletText}>Google Wallet</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* 5. ⚡ My Usual Order (If configured) */}
        {isFeatureEnabled('my_usual') && usual && (
          <Card style={s.sectionCard}>
            <View style={s.sectionHeaderRow}>
              <View style={s.sectionTitleWrap}>
                <Ionicons name="flash" size={18} color={colors.espresso} />
                <Text style={s.sectionTitle}>My Usual Order</Text>
              </View>
            </View>

            <View style={s.usualBody}>
              <ProductImage
                uri={usual.items[0]?.product.imageUrl}
                category={usual.items[0]?.product.category}
                name={usual.items[0]?.product.name}
                style={s.usualThumb}
                placeholderStyle={s.usualThumb}
                iconSize={24}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.usualName}>
                  {usual.name || usual.items[0]?.product.name}
                </Text>
                <Text style={s.usualItems} numberOfLines={2}>
                  {usual.items
                    .map((i) => `${i.quantity}x ${i.product.name}`)
                    .join(' + ')}
                </Text>
                <Text style={s.usualPrice}>
                  {money(
                    usual.items.reduce(
                      (sum, i) => sum + i.product.price * i.quantity,
                      0,
                    ),
                  )}
                </Text>
              </View>
            </View>

            <Button
              label="⚡ 1-Tap Reorder My Usual"
              onPress={handleReorderUsual}
            />
          </Card>
        )}

        {/* 6. 🎁 Active Offers & Promotions */}
        {promos && promos.length > 0 && (
          <Card style={s.sectionCard}>
            <View style={s.sectionHeaderRow}>
              <View style={s.sectionTitleWrap}>
                <Ionicons name="gift" size={18} color={colors.caramel} />
                <Text style={s.sectionTitle}>Available Offers & Promo Codes</Text>
              </View>
            </View>

            {promos
              .filter((p) => p.enabled)
              .map((p) => (
                <View key={p.id} style={s.promoRow}>
                  <View style={s.promoCodeBadge}>
                    <Text style={s.promoCodeText}>{p.code}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.promoDesc}>{p.description}</Text>
                    <Text style={s.promoMeta}>
                      {p.discountType === 'percent'
                        ? `${p.discountValue}% OFF`
                        : `${money(p.discountValue)} OFF`}{' '}
                      · Min spend {money(p.minimumSpend)}
                    </Text>
                  </View>
                </View>
              ))}
          </Card>
        )}

        {/* 7. 📦 Recent Orders History */}
        <Card style={s.sectionCard}>
          <View style={s.sectionHeaderRow}>
            <View style={s.sectionTitleWrap}>
              <Ionicons name="receipt-outline" size={18} color={colors.espresso} />
              <Text style={s.sectionTitle}>Recent Orders</Text>
            </View>
            {myOrders.length > 0 && (
              <Pressable onPress={() => router.push('/orders')}>
                <Text style={s.viewAllLink}>All Orders ({myOrders.length}) →</Text>
              </Pressable>
            )}
          </View>

          {recentOrders.length === 0 ? (
            <View style={s.emptyOrders}>
              <Text style={s.emptyOrdersText}>
                No orders placed yet. Explore our fresh menu to order ahead!
              </Text>
              <Pressable
                style={s.browseBtn}
                onPress={() => router.push('/menu')}
              >
                <Text style={s.browseBtnText}>Browse Menu →</Text>
              </Pressable>
            </View>
          ) : (
            recentOrders.map((order) => (
              <Pressable
                key={order.id}
                style={s.orderItemRow}
                onPress={() =>
                  router.push({
                    pathname: '/order-status',
                    params: { id: order.id },
                  })
                }
              >
                <RestaurantLogoImage
                  uri={order.restaurant?.logoUrl}
                  name={order.restaurant?.name || 'Cafe'}
                  size={32}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.orderRestName}>
                    {order.restaurant?.name || currentRestaurant.name}
                  </Text>
                  <Text style={s.orderMeta}>
                    #{order.id} · {new Date(order.createdAt).toLocaleDateString()} ·{' '}
                    {money(order.total)}
                  </Text>
                </View>
                <View
                  style={[
                    s.statusPill,
                    order.status === 'Ready' && s.statusReady,
                    order.status === 'Collected' && s.statusCollected,
                  ]}
                >
                  <Text
                    style={[
                      s.statusPillText,
                      order.status === 'Ready' && { color: colors.white },
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>

        {/* 8. ⚙️ Guest Preferences & App Info */}
        <Card style={s.infoCard}>
          <Text style={s.infoTitle}>GUEST PREFERENCES & SESSION</Text>
          <Text style={s.infoText}>
            Ordering as guest under device key <Text style={s.bold}>{customerKey.slice(0, 16)}…</Text>
          </Text>
          <Text style={s.infoSub}>
            Your points, stamp card, and prepaid passes automatically sync to this device.
          </Text>
        </Card>
      </ScrollView>

      {/* Standardized 5-Tab Customer Bottom Navigation */}
      <CustomerBottomNav activeTab="profile" />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  vipBadge: {
    backgroundColor: colors.caramel,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  vipBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
  customerId: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.espresso,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.line,
  },
  modePreferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  modePrefLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
    letterSpacing: 0.8,
  },
  modePrefValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 2,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.cream,
  },
  switchModeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.espresso,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  quickActionSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.caramel,
  },
  stampTrackWrap: {
    backgroundColor: colors.cream,
    borderRadius: 14,
    padding: 12,
  },
  stampTrackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stampTrackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  stampTrackCount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
  },
  track: {
    height: 8,
    backgroundColor: '#DDE8DF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 4,
  },
  trackHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 8,
  },
  freeVoucherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.green,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  voucherTitle: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  voucherSub: {
    color: '#D7E5DA',
    fontSize: 11,
    marginTop: 2,
  },
  emptyPassBox: {
    backgroundColor: colors.cream,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  emptyPassText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  buyPassBtn: {
    marginTop: 10,
    backgroundColor: colors.espresso,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buyPassBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  passItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  passItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  passItemSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  passBadge: {
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  passBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
  },
  walletSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  walletHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  walletBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  appleWalletBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#000000',
    paddingVertical: 9,
    borderRadius: 10,
  },
  appleWalletText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  googleWalletBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1F1F1F',
    paddingVertical: 9,
    borderRadius: 10,
  },
  googleWalletText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  usualBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  usualThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  usualName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  usualItems: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  usualPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.espresso,
    marginTop: 3,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  promoCodeBadge: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promoCodeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  promoDesc: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  promoMeta: {
    fontSize: 11,
    color: colors.green,
    marginTop: 2,
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyOrdersText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  browseBtn: {
    marginTop: 8,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  browseBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 11,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  orderRestName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  orderMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusReady: {
    backgroundColor: colors.green,
  },
  statusCollected: {
    backgroundColor: colors.cream,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.espresso,
  },
  infoCard: {
    backgroundColor: colors.cream,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: colors.ink,
  },
  infoSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 15,
  },
  bold: {
    fontWeight: '800',
  },
});
