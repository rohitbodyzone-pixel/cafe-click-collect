import React, { useState, useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen } from '@/src/components/UI';
import { Restaurant, useRestaurant } from '@/src/context/RestaurantContext';
import { useOrders } from '@/src/context/OrderContext';
import { useCustomerExperience } from '@/src/context/CustomerExperienceContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { colors } from '@/src/theme';
import { money } from '@/src/data/products';

type FoodCategory = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  cuisine: string;
};

const CATEGORIES: FoodCategory[] = [
  { id: 'coffee', name: 'Coffee & Drinks', icon: 'cafe-outline', cuisine: 'Coffee' },
  { id: 'bakery', name: 'Bakery & Pastry', icon: 'nutrition-outline', cuisine: 'Bakery' },
  { id: 'italian', name: 'Italian & Pasta', icon: 'restaurant-outline', cuisine: 'Italian' },
  { id: 'healthy', name: 'Healthy & Bowls', icon: 'leaf-outline', cuisine: 'Breakfast' },
  { id: 'dessert', name: 'Desserts & Sweet', icon: 'ice-cream-outline', cuisine: 'Dessert' },
];

export default function CustomerMarketplaceHome() {
  const { restaurants, currentRestaurant, setCurrentRestaurant } = useRestaurant();
  const { cart, orders, addToCart, clearCart } = useOrders();
  const { usual, vipTier, currentStreakDays } = useCustomerExperience();
  const { isFeatureEnabled } = useFeaturePermission();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'cart' | 'orders' | 'profile'>('home');

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  const activeRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchSearch =
        !search.trim() ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        (r.cuisineTypes || []).some((c) => c.toLowerCase().includes(search.toLowerCase()));

      const matchCat =
        !selectedCategory ||
        (r.cuisineTypes || []).some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()));

      return r.isActive && matchSearch && matchCat;
    });
  }, [restaurants, search, selectedCategory]);

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setCurrentRestaurant(restaurant);
    router.push('/menu' as never);
  };

  return (
    <Screen>
      {/* 1. Location & Profile Header */}
      <View style={s.topHeader}>
        <View style={s.locationWrap}>
          <View style={s.pinCircle}>
            <Ionicons name="location" size={14} color={colors.caramel} />
          </View>
          <View>
            <Text style={s.pickupLabel}>PICKUP LOCATION</Text>
            <Text style={s.locationText}>Auckland Central, NZ ▾</Text>
          </View>
        </View>

        <Pressable style={s.adminBtn} onPress={() => router.push('/admin')}>
          <Ionicons name="shield-outline" size={18} color={colors.espresso} />
        </Pressable>
      </View>

      {/* 2. Global Search Bar */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search cafes, coffee, pasta, bakery…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.contentContainer}>
        {/* 3. Food Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll}>
          <Pressable
            style={[s.catPill, !selectedCategory && s.catPillActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons
              name="sparkles-outline"
              size={14}
              color={!selectedCategory ? colors.white : colors.espresso}
            />
            <Text style={[s.catPillText, !selectedCategory && s.catPillTextActive]}>All</Text>
          </Pressable>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[s.catPill, selectedCategory === cat.cuisine && s.catPillActive]}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat.cuisine ? null : cat.cuisine)
              }
            >
              <Ionicons
                name={cat.icon}
                size={14}
                color={selectedCategory === cat.cuisine ? colors.white : colors.espresso}
              />
              <Text style={[s.catPillText, selectedCategory === cat.cuisine && s.catPillTextActive]}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 4. VIP Streak & Rewards Banner */}
        {isFeatureEnabled('loyalty_rewards') && (
          <Pressable style={s.vipBanner} onPress={() => router.push('/rewards')}>
            <View style={{ flex: 1 }}>
              <View style={s.vipTagRow}>
                <Text style={s.vipBadgeText}>{vipTier.toUpperCase()} VIP MEMBER</Text>
                {currentStreakDays > 1 && (
                  <Text style={s.streakBadgeText}>🔥 {currentStreakDays}-DAY STREAK</Text>
                )}
              </View>
              <Text style={s.vipTitle}>Earn free coffees & unlock VIP deals</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.white} />
          </Pressable>
        )}

        {/* 5. My Usual Quick Reorder (1-Tap) */}
        {isFeatureEnabled('my_usual') && usual && usual.items && usual.items.length > 0 && (
          <Card style={s.usualCard}>
            <View style={s.usualHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flash" size={16} color={colors.caramel} />
                <Text style={s.usualEyebrow}>YOUR DAILY USUAL</Text>
              </View>
              <Text style={s.usualPrice}>
                {money(usual.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}
              </Text>
            </View>
            <Text style={s.usualItems}>
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
              <Text style={s.reorderBtnText}>1-Tap Reorder to Cart →</Text>
            </Pressable>
          </Card>
        )}

        {/* 6. Popular Cafes & Restaurants Section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Featured Cafes & Dining</Text>
          <Text style={s.sectionSubtitle}>
            {activeRestaurants.length} venue{activeRestaurants.length === 1 ? '' : 's'} near you
          </Text>
        </View>

        {activeRestaurants.map((rest) => {
          const isPaused = rest.is_orders_paused;
          return (
            <Pressable
              key={rest.id}
              style={s.restCardWrap}
              onPress={() => handleSelectRestaurant(rest)}
            >
              <Card style={s.restaurantCard}>
                <View style={s.restHeaderRow}>
                  <View style={s.logoCircle}>
                    <Ionicons
                      name={rest.slug.includes('trattoria') ? 'restaurant' : 'cafe'}
                      size={20}
                      color={colors.espresso}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={s.titleRatingRow}>
                      <Text style={s.restName}>{rest.name}</Text>
                      <View style={s.ratingBadge}>
                        <Ionicons name="star" size={11} color="#F4B400" />
                        <Text style={s.ratingText}>{(rest.rating || 4.9).toFixed(1)}</Text>
                      </View>
                    </View>
                    <Text style={s.cuisineText}>
                      {(rest.cuisineTypes || ['Specialty Dining']).join(' • ')}
                    </Text>
                  </View>
                </View>

                {/* Status & Timing Row */}
                <View style={s.timingRow}>
                  <View style={s.timingItem}>
                    <Ionicons name="time-outline" size={13} color={colors.muted} />
                    <Text style={s.timingText}>
                      {rest.averagePrepMinutes + (rest.rush_wait_extra_minutes || 0)} mins prep
                    </Text>
                  </View>
                  <View style={s.timingItem}>
                    <Ionicons name="navigate-outline" size={13} color={colors.muted} />
                    <Text style={s.timingText}>{rest.distance_km || 0.4} km away</Text>
                  </View>
                  <View style={[s.statusPill, isPaused && s.statusPillPaused]}>
                    <Text style={[s.statusPillText, isPaused && { color: colors.danger }]}>
                      {isPaused ? 'ORDERS PAUSED' : 'OPEN NOW'}
                    </Text>
                  </View>
                </View>

                {/* Deal Tag */}
                {!!rest.deals_tag && (
                  <View style={s.dealRow}>
                    <Ionicons name="pricetag" size={12} color={colors.caramel} />
                    <Text style={s.dealText}>{rest.deals_tag}</Text>
                  </View>
                )}

                {/* View Menu CTA */}
                <View style={s.actionRow}>
                  <Text style={s.viewMenuLink}>View Menu & Order Ahead →</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 7. Bottom Navigation Bar */}
      <View style={s.bottomNav}>
        <Pressable
          style={s.navTab}
          onPress={() => {
            setActiveTab('home');
          }}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'home' ? colors.espresso : colors.muted}
          />
          <Text style={[s.navTabText, activeTab === 'home' && s.navTabTextActive]}>Home</Text>
        </Pressable>

        <Pressable
          style={s.navTab}
          onPress={() => {
            setActiveTab('search');
            router.push('/restaurants');
          }}
        >
          <Ionicons name="search-outline" size={22} color={colors.muted} />
          <Text style={s.navTabText}>Search</Text>
        </Pressable>

        <Pressable
          style={s.navTab}
          onPress={() => {
            setActiveTab('cart');
            router.push('/cart');
          }}
        >
          <View style={s.cartIconWrap}>
            <Ionicons name="bag-handle-outline" size={22} color={colors.muted} />
            {count > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{count}</Text>
              </View>
            )}
          </View>
          <Text style={s.navTabText}>Cart</Text>
        </Pressable>

        <Pressable
          style={s.navTab}
          onPress={() => {
            setActiveTab('orders');
            router.push('/orders');
          }}
        >
          <Ionicons name="receipt-outline" size={22} color={colors.muted} />
          <Text style={s.navTabText}>Orders</Text>
        </Pressable>

        <Pressable
          style={s.navTab}
          onPress={() => {
            setActiveTab('profile');
            router.push('/rewards');
          }}
        >
          <Ionicons name="person-outline" size={22} color={colors.muted} />
          <Text style={s.navTabText}>Rewards</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 4,
  },
  locationWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupLabel: { fontSize: 9, fontWeight: '800', color: colors.caramel, letterSpacing: 0.8 },
  locationText: { fontSize: 14, fontWeight: '900', color: colors.espresso },
  adminBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.ink },
  contentContainer: { paddingBottom: 90 },
  categoryScroll: { flexDirection: 'row', marginBottom: 14 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.cream,
    marginRight: 8,
  },
  catPillActive: { backgroundColor: colors.espresso },
  catPillText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  catPillTextActive: { color: colors.white },
  vipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#335943',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  vipTagRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  vipBadgeText: { fontSize: 9, fontWeight: '900', color: '#E8C68D', letterSpacing: 0.8 },
  streakBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFD166' },
  vipTitle: { fontSize: 13, fontWeight: '800', color: colors.white },
  usualCard: { padding: 12, marginBottom: 14 },
  usualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  usualEyebrow: { fontSize: 10, fontWeight: '800', color: colors.caramel, letterSpacing: 0.8 },
  usualPrice: { fontSize: 13, fontWeight: '900', color: colors.espresso },
  usualItems: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  reorderBtn: { backgroundColor: colors.espresso, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  reorderBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  sectionSubtitle: { fontSize: 12, color: colors.muted, marginTop: 1 },
  restCardWrap: { marginBottom: 14 },
  restaurantCard: { padding: 14 },
  restHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRatingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restName: { fontSize: 16, fontWeight: '900', color: colors.ink },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  cuisineText: { fontSize: 11, color: colors.muted, marginTop: 2 },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
    marginBottom: 8,
  },
  timingItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timingText: { fontSize: 11, color: colors.muted },
  statusPill: { marginLeft: 'auto', backgroundColor: '#E6F4EA', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  statusPillPaused: { backgroundColor: '#FDE8E8' },
  statusPillText: { fontSize: 9, fontWeight: '800', color: colors.green },
  dealRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF8EB', padding: 6, borderRadius: 6, marginBottom: 8 },
  dealText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  actionRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, alignItems: 'flex-end' },
  viewMenuLink: { color: colors.coffee, fontWeight: '800', fontSize: 12 },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 62,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },
  navTab: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navTabText: { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 2 },
  navTabTextActive: { color: colors.espresso, fontWeight: '800' },
  cartIconWrap: { position: 'relative' },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.caramel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
});
