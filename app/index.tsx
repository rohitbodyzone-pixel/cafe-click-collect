import React, { useState, useMemo, useEffect } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen } from '@/src/components/UI';
import { Restaurant, useRestaurant } from '@/src/context/RestaurantContext';
import { useOrders } from '@/src/context/OrderContext';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { useTables } from '@/src/context/TableContext';
import { useCustomerExperience } from '@/src/context/CustomerExperienceContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { ProductImage } from '@/src/components/ProductImage';
import { RestaurantCoverImage, RestaurantLogoImage } from '@/src/components/RestaurantImage';
import { CustomerBottomNav } from '@/src/components/CustomerBottomNav';
import { colors, radii, shadows } from '@/src/theme';
import { money } from '@/src/data/products';

type FoodCategory = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  tag: string;
};

const CATEGORIES: FoodCategory[] = [
  { id: 'coffee', name: 'Coffee & Drinks', icon: 'cafe', tag: 'Coffee' },
  { id: 'bakery', name: 'Bakery & Pastries', icon: 'nutrition', tag: 'Bakery' },
  { id: 'pizza', name: 'Italian & Pizza', icon: 'pizza', tag: 'Italian' },
  { id: 'burgers', name: 'Burgers & Grills', icon: 'fast-food', tag: 'Burgers' },
  { id: 'healthy', name: 'Healthy Bowls', icon: 'leaf', tag: 'Healthy' },
  { id: 'asian', name: 'Asian Kitchen', icon: 'restaurant', tag: 'Asian' },
  { id: 'dessert', name: 'Desserts & Sweets', icon: 'ice-cream', tag: 'Dessert' },
  { id: 'breakfast', name: 'Breakfast & Brunch', icon: 'sunny', tag: 'Breakfast' },
];

export default function CustomerMarketplaceHome() {
  const { table: tableCode, restaurant: restaurantSlug, r: shortSlug } =
    useLocalSearchParams<{ table?: string; restaurant?: string; r?: string }>();
  const { tables, loading: loadingTables } = useTables();
  const { restaurants, setCurrentRestaurant, selectRestaurantBySlug } = useRestaurant();
  const { cart, orders, orderMode, table, setOrderMode, addToCart, clearCart } = useOrders();
  const { balance, settings } = useLoyalty();
  const { usual, vipTier, currentStreakDays } = useCustomerExperience();
  const { isFeatureEnabled } = useFeaturePermission();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Table QR smart bypass: if table code present, set table mode automatically
  useEffect(() => {
    if (!tableCode || loadingTables) return;
    const found = tables.find(
      (item) => item.code.toLowerCase() === tableCode.toLowerCase() && item.active,
    );
    if (found) {
      setOrderMode('table', found);
    }
  }, [tableCode, tables, loadingTables, setOrderMode]);

  // Restaurant URL slug switch if needed
  useEffect(() => {
    const slug = restaurantSlug || shortSlug;
    if (slug) {
      void selectRestaurantBySlug(slug);
    }
  }, [restaurantSlug, shortSlug, selectRestaurantBySlug]);

  const activeRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchSearch =
        !search.trim() ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        (r.cuisineTypes || []).some((c) => c.toLowerCase().includes(search.toLowerCase()));

      const matchCat =
        !selectedCategory ||
        (r.cuisineTypes || []).some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        r.description.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        r.name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (selectedCategory === 'Healthy' && (r.cuisineTypes || []).some((c) => c.toLowerCase().includes('healthy') || c.toLowerCase().includes('breakfast') || c.toLowerCase().includes('salad'))) ||
        (selectedCategory === 'Coffee' && (r.cuisineTypes || []).some((c) => c.toLowerCase().includes('cafe') || c.toLowerCase().includes('coffee')));

      return r.isActive && matchSearch && matchCat;
    });
  }, [restaurants, search, selectedCategory]);

  const featuredRestaurant = restaurants.find((r) => r.slug === 'common-ground') || restaurants[0];

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setCurrentRestaurant(restaurant);
    router.push({
      pathname: '/menu',
      params: { restaurant: restaurant.slug, mode: orderMode },
    });
  };

  const handleChooseDineIn = () => {
    setOrderMode('table');
    const target = featuredRestaurant || restaurants[0];
    if (target) {
      setCurrentRestaurant(target);
      router.push({
        pathname: '/menu',
        params: { restaurant: target.slug, mode: 'table' },
      });
    }
  };

  const handleReorderUsual = () => {
    if (!usual || usual.items.length === 0) return;
    clearCart();
    usual.items.forEach((item) => addToCart(item.product, item.quantity));
    router.push('/cart');
  };

  return (
    <Screen>
      {/* 1. Premium Customer Header */}
      <View style={s.topHeader}>
        <View style={s.locationWrap}>
          <View style={s.pinCircle}>
            <Ionicons name="location" size={14} color={colors.caramel} />
          </View>
          <View>
            <Text style={s.pickupLabel}>CLICK & COLLECT LOCATION</Text>
            <Text style={s.locationText}>Auckland Central, NZ ▾</Text>
          </View>
        </View>

        <Pressable
          style={s.topCartBtn}
          onPress={() => router.push('/cart')}
        >
          <Ionicons name="bag-handle" size={18} color={colors.espresso} />
          {cartCount > 0 && (
            <View style={s.topCartBadge}>
              <Text style={s.topCartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* 2. Global Customer Search Bar */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search cafes, specialty coffee, lunch, bakery…"
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Contextual Rewards Reminder on Home */}
        {!search && isFeatureEnabled('loyalty_rewards') && balance.freeCoffees > 0 && (
          <Pressable style={s.rewardReminderBanner} onPress={() => router.push('/profile')}>
            <View style={s.reminderIconCircle}>
              <Ionicons name="gift" size={18} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.reminderBannerTitle}>
                🎉 You have {balance.freeCoffees} free coffee reward ready!
              </Text>
              <Text style={s.reminderBannerSub}>Tap to view your profile and rewards →</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.white} />
          </Pressable>
        )}

        {!search && isFeatureEnabled('loyalty_rewards') && balance.freeCoffees === 0 && balance.coffeeStamps > 0 && (
          <Pressable style={s.rewardReminderBanner} onPress={() => router.push('/profile')}>
            <View style={[s.reminderIconCircle, { backgroundColor: colors.caramel }]}>
              <Ionicons name="star" size={16} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.reminderBannerTitle}>
                ⭐ {Math.max(0, settings.coffeeGoal - balance.coffeeStamps)} more stamp{settings.coffeeGoal - balance.coffeeStamps === 1 ? '' : 's'} for a free coffee!
              </Text>
              <Text style={s.reminderBannerSub}>Earn points and stamps with every drink →</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.white} />
          </Pressable>
        )}

        {/* 3. Premium Featured Discovery Hero */}
        {featuredRestaurant && !search && (
          <Pressable
            style={s.heroCard}
            onPress={() => handleSelectRestaurant(featuredRestaurant)}
          >
            <RestaurantCoverImage
              uri={
                featuredRestaurant.coverImageUrl ||
                featuredRestaurant.hero_image_url ||
                featuredRestaurant.logoUrl
              }
              name={featuredRestaurant.name}
              style={s.heroImage}
              placeholderStyle={s.heroImage}
            />
            <View style={s.heroGradient} />
            <View style={s.heroOverlay}>
              <View style={s.featuredDealBadge}>
                <Ionicons name="sparkles" size={11} color={colors.espresso} />
                <Text style={s.featuredDealText}>FEATURED SPECIALTY CAFE</Text>
              </View>
              <View style={s.heroBrandRow}>
                <RestaurantLogoImage
                  uri={featuredRestaurant.logoUrl}
                  name={featuredRestaurant.name}
                  size={36}
                  style={s.heroLogo}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.heroTitle} numberOfLines={1}>
                    {featuredRestaurant.name}
                  </Text>
                  <Text style={s.heroSubtitle} numberOfLines={1}>
                    {featuredRestaurant.description}
                  </Text>
                </View>
              </View>

              <View style={s.heroMetaRow}>
                <View style={s.metaPill}>
                  <Ionicons name="star" size={11} color="#FFB800" />
                  <Text style={s.metaPillText}>
                    {featuredRestaurant.rating ? featuredRestaurant.rating.toFixed(1) : '4.9'} (180+)
                  </Text>
                </View>
                <View style={s.metaPill}>
                  <Ionicons name="time-outline" size={11} color={colors.white} />
                  <Text style={s.metaPillText}>
                    Ready in {featuredRestaurant.averagePrepMinutes || 10}–{(featuredRestaurant.averagePrepMinutes || 10) + 5}m
                  </Text>
                </View>
                <View style={[s.metaPill, { backgroundColor: colors.caramel }]}>
                  <Text style={[s.metaPillText, { fontWeight: '900' }]}>Order Ahead →</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}

        {/* 4. One-Tap My Usual Order (If Enabled) */}
        {isFeatureEnabled('my_usual') && usual && !search && (
          <Pressable style={s.usualCard} onPress={handleReorderUsual}>
            <View style={s.usualThumbWrap}>
              <ProductImage
                uri={usual.items[0]?.product.imageUrl}
                category={usual.items[0]?.product.category}
                name={usual.items[0]?.product.name}
                style={s.usualThumb}
                placeholderStyle={s.usualThumb}
                iconSize={20}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.usualHeaderRow}>
                <Text style={s.usualTag}>MY USUAL REORDER</Text>
                <Text style={s.usualPrice}>
                  {money(usual.items.reduce((s, i) => s + i.product.price * i.quantity, 0))}
                </Text>
              </View>
              <Text style={s.usualName} numberOfLines={1}>
                {usual.name || usual.items[0]?.product.name}
              </Text>
              <Text style={s.usualDesc} numberOfLines={1}>
                {usual.items.map((i) => `${i.quantity}x ${i.product.name}`).join(' + ')}
              </Text>
            </View>
            <View style={s.reorderBtn}>
              <Ionicons name="flash" size={13} color={colors.white} />
              <Text style={s.reorderBtnText}>Reorder</Text>
            </View>
          </Pressable>
        )}

        {/* 5. Cuisine Categories Carousel */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Explore Categories</Text>
          {selectedCategory && (
            <Pressable onPress={() => setSelectedCategory(null)}>
              <Text style={s.clearCategoryText}>Show All</Text>
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoriesScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.tag;
            return (
              <Pressable
                key={cat.id}
                style={[s.catCard, isSelected && s.catCardActive]}
                onPress={() => setSelectedCategory(isSelected ? null : cat.tag)}
              >
                <View style={[s.catIconWrap, isSelected && s.catIconWrapActive]}>
                  <Ionicons
                    name={cat.icon}
                    size={20}
                    color={isSelected ? colors.white : colors.caramel}
                  />
                </View>
                <Text style={[s.catName, isSelected && s.catNameActive]}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 6. Popular & Nearby Restaurants */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Popular Today & Nearby</Text>
          <Text style={s.sectionCount}>{activeRestaurants.length} places</Text>
        </View>

        {activeRestaurants.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="restaurant-outline" size={44} color={colors.muted} />
            <Text style={s.emptyTitle}>No matching restaurants found</Text>
            <Text style={s.emptySub}>Try searching for different terms or reset your filters.</Text>
          </View>
        ) : (
          <View style={s.restaurantList}>
            {activeRestaurants.map((restaurant) => (
              <Pressable
                key={restaurant.id}
                style={s.restaurantCard}
                onPress={() => handleSelectRestaurant(restaurant)}
              >
                <View style={s.restaurantThumbWrap}>
                  <RestaurantCoverImage
                    uri={
                      restaurant.coverImageUrl ||
                      restaurant.hero_image_url ||
                      restaurant.logoUrl
                    }
                    name={restaurant.name}
                    style={s.restaurantThumb}
                    placeholderStyle={s.restaurantThumb}
                  />
                  <View style={s.restaurantLogoBadge}>
                    <RestaurantLogoImage
                      uri={restaurant.logoUrl}
                      name={restaurant.name}
                      size={28}
                    />
                  </View>
                </View>

                <View style={s.restaurantBody}>
                  <View style={s.restNameRow}>
                    <Text style={s.restaurantName} numberOfLines={1}>
                      {restaurant.name}
                    </Text>
                    <View style={s.ratingBadge}>
                      <Ionicons name="star" size={11} color="#FFB800" />
                      <Text style={s.ratingText}>
                        {restaurant.rating ? restaurant.rating.toFixed(1) : '4.9'}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.restaurantCuisine} numberOfLines={1}>
                    {restaurant.cuisineTypes?.join(' · ') || 'Artisan Coffee & Food'} · {restaurant.distance_km ? `${restaurant.distance_km} km` : '0.3 km'}
                  </Text>

                  <View style={s.restaurantFooter}>
                    <View style={s.etaBadge}>
                      <Ionicons name="flash" size={11} color="#2D7D46" />
                      <Text style={s.etaText}>
                        Ready in {restaurant.averagePrepMinutes || 10}–{(restaurant.averagePrepMinutes || 10) + 5} min
                      </Text>
                    </View>

                    <View style={s.collectPill}>
                      <Text style={s.collectPillText}>
                        {orderMode === 'table' ? '🍽️ Table Service' : 'Click & Collect'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

                 {/* 7. Loyalty Rewards & Passes Teaser (Links to Profile) */}
        {isFeatureEnabled('loyalty_rewards') && (
          <Card style={s.loyaltyTeaserCard}>
            <View style={s.loyaltyRow}>
              <View style={s.stampIconCircle}>
                <Ionicons name="gift" size={20} color={colors.caramel} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.loyaltyTeaserTitle}>Digital Stamp Card</Text>
                <Text style={s.loyaltyTeaserSub}>
                  {vipTier ? `${vipTier} Member · ` : ''}Earn rewards on every handcrafted coffee
                </Text>
              </View>
              <Pressable style={s.viewRewardsBtn} onPress={() => router.push('/profile')}>
                <Text style={s.viewRewardsText}>View Profile →</Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Standardized 5-Tab Customer Bottom Navigation */}
      <CustomerBottomNav activeTab="home" />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 90 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  locationWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupLabel: { fontSize: 9, fontWeight: '800', color: colors.caramel, letterSpacing: 0.8 },
  locationText: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  topCartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topCartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.espresso,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  topCartBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  modePillActive: {
    backgroundColor: colors.espresso,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.espresso,
  },
  modePillTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.ink },
  startSection: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  startSectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  startSectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 2,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  startCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  startCard: {
    flex: 1,
    backgroundColor: colors.creamSoft,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.lineLight,
    position: 'relative',
    ...shadows.sm,
  },
  startCardActive: {
    backgroundColor: colors.white,
    borderColor: colors.espresso,
    ...shadows.md,
  },
  startIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.lineLight,
    ...shadows.sm,
  },
  startIconWrapActive: {
    backgroundColor: colors.cream,
    borderColor: colors.caramel,
  },
  startEmoji: {
    fontSize: 24,
  },
  startCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.espresso,
    letterSpacing: 0.3,
  },
  startCardTitleActive: {
    color: colors.espresso,
    fontWeight: '900',
  },
  startCardSub: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 15,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  rewardReminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    ...shadows.sm,
  },
  reminderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  reminderBannerSub: {
    fontSize: 11,
    color: '#D7E5DA',
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 205,
    marginBottom: 18,
    backgroundColor: colors.espresso,
    position: 'relative',
    ...shadows.md,
  },
  heroImage: { width: '100%', height: '100%', opacity: 0.72 },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 18, 14, 0.45)',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 18,
    justifyContent: 'flex-end',
  },
  featuredDealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  featuredDealText: { fontSize: 10, fontWeight: '800', color: colors.espresso, letterSpacing: 0.5 },
  heroBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  heroLogo: { borderWidth: 2.5, borderColor: colors.white, borderRadius: 18 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: colors.white, letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 12, color: '#E8DFD5', marginTop: 1 },
  heroMetaRow: { flexDirection: 'row', gap: 8 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  metaPillText: { fontSize: 11, fontWeight: '800', color: colors.white },
  usualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  usualThumbWrap: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden', marginRight: 12 },
  usualThumb: { width: 56, height: 56 },
  usualHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usualTag: { fontSize: 9, fontWeight: '800', color: colors.caramel, letterSpacing: 1, textTransform: 'uppercase' },
  usualPrice: { fontSize: 13, fontWeight: '900', color: colors.espresso },
  usualName: { fontSize: 14, fontWeight: '800', color: colors.ink, marginTop: 1 },
  usualDesc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radii.md,
    marginLeft: 8,
    ...shadows.sm,
  },
  reorderBtnText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.espresso, letterSpacing: -0.2 },
  sectionCount: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  clearCategoryText: { fontSize: 12, fontWeight: '800', color: colors.caramel },
  categoriesScroll: { flexDirection: 'row', marginBottom: 20 },
  catCard: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 10,
    minWidth: 84,
    ...shadows.sm,
  },
  catCardActive: { backgroundColor: colors.espresso, borderColor: colors.espresso, ...shadows.md },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  catName: { fontSize: 11, fontWeight: '700', color: colors.espresso, textAlign: 'center' },
  catNameActive: { color: colors.white, fontWeight: '800' },
  restaurantList: { gap: 14, marginBottom: 20 },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  restaurantThumbWrap: {
    width: 112,
    height: 112,
    position: 'relative',
  },
  restaurantThumb: { width: 112, height: 112 },
  restaurantLogoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  restaurantBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  restNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { fontSize: 15, fontWeight: '900', color: colors.espresso },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cream,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  restaurantCuisine: { fontSize: 12, color: colors.muted, marginTop: 2 },
  restaurantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  etaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  etaText: { fontSize: 11, fontWeight: '800', color: colors.green },
  collectPill: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
  collectPillText: { fontSize: 10, fontWeight: '800', color: colors.caramel },
  loyaltyTeaserCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  loyaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stampIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  loyaltyTeaserTitle: { fontSize: 14, fontWeight: '800', color: colors.espresso },
  loyaltyTeaserSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  viewRewardsBtn: { backgroundColor: colors.cream, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.md },
  viewRewardsText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  emptyState: { alignItems: 'center', paddingVertical: 44 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: colors.espresso, marginTop: 12 },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4, maxWidth: 280 },
});
