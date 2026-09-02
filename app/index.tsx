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
import { colors } from '@/src/theme';
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
      {/* 1. Premium Customer Header & Mode Switcher */}
      <View style={s.topHeader}>
        <View style={s.locationWrap}>
          <View style={s.pinCircle}>
            <Ionicons name="location" size={14} color={colors.caramel} />
          </View>
          <View>
            <Text style={s.pickupLabel}>
              {orderMode === 'table' ? 'TABLE DINE-IN SERVICE' : 'CLICK & COLLECT LOCATION'}
            </Text>
            <Text style={s.locationText}>Auckland Central, NZ ▾</Text>
          </View>
        </View>

        {/* Small Header Switcher to toggle mode anytime */}
        <View style={s.modeSwitcherRow}>
          <Pressable
            style={[s.modePill, orderMode === 'pickup' && s.modePillActive]}
            onPress={() => setOrderMode('pickup')}
          >
            <Text style={[s.modePillText, orderMode === 'pickup' && s.modePillTextActive]}>
              🥡 Pickup
            </Text>
          </Pressable>
          <Pressable
            style={[s.modePill, orderMode === 'table' && s.modePillActive]}
            onPress={handleChooseDineIn}
          >
            <Text style={[s.modePillText, orderMode === 'table' && s.modePillTextActive]}>
              🍽️ Dine In
            </Text>
          </Pressable>
        </View>
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
        {/* Starting Experience: "How would you like to order?" */}
        {!search && (
          <View style={s.startSection}>
            <Text style={s.startSectionEyebrow}>START ORDER</Text>
            <Text style={s.startSectionTitle}>How would you like to order?</Text>

            <View style={s.startCardsRow}>
              <Pressable
                style={[s.startCard, orderMode === 'pickup' && s.startCardActive]}
                onPress={() => setOrderMode('pickup')}
              >
                <View style={[s.startIconWrap, orderMode === 'pickup' && s.startIconWrapActive]}>
                  <Text style={s.startEmoji}>🥡</Text>
                </View>
                <Text style={[s.startCardTitle, orderMode === 'pickup' && s.startCardTitleActive]}>
                  PICKUP
                </Text>
                <Text style={s.startCardSub}>Order ahead & collect</Text>
                {orderMode === 'pickup' && (
                  <View style={s.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.espresso} />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={[s.startCard, orderMode === 'table' && s.startCardActive]}
                onPress={handleChooseDineIn}
              >
                <View style={[s.startIconWrap, orderMode === 'table' && s.startIconWrapActive]}>
                  <Text style={s.startEmoji}>🍽️</Text>
                </View>
                <Text style={[s.startCardTitle, orderMode === 'table' && s.startCardTitleActive]}>
                  DINE IN
                </Text>
                <Text style={s.startCardSub}>
                  {table ? `Seated at ${table.name}` : 'Order at your table'}
                </Text>
                {orderMode === 'table' && (
                  <View style={s.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.espresso} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        )}

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
  modeSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 2,
    gap: 2,
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
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  startSectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
    letterSpacing: 1,
  },
  startSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 2,
    marginBottom: 12,
  },
  startCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startCard: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  startCardActive: {
    backgroundColor: colors.white,
    borderColor: colors.espresso,
  },
  startIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  startIconWrapActive: {
    backgroundColor: colors.cream,
  },
  startEmoji: {
    fontSize: 22,
  },
  startCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.espresso,
  },
  startCardTitleActive: {
    color: colors.espresso,
    fontWeight: '900',
  },
  startCardSub: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 15,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  rewardReminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.green,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  reminderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  reminderBannerSub: {
    fontSize: 11,
    color: '#D7E5DA',
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 195,
    marginBottom: 16,
    backgroundColor: colors.espresso,
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%', opacity: 0.72 },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 18, 14, 0.45)',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'flex-end',
  },
  featuredDealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  featuredDealText: { fontSize: 9, fontWeight: '800', color: colors.espresso },
  heroBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroLogo: { borderWidth: 2, borderColor: colors.white },
  heroTitle: { fontSize: 18, fontWeight: '900', color: colors.white },
  heroSubtitle: { fontSize: 11, color: '#D7E5DA' },
  heroMetaRow: { flexDirection: 'row', gap: 6 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaPillText: { fontSize: 11, fontWeight: '700', color: colors.white },
  usualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  usualThumbWrap: { width: 52, height: 52, borderRadius: 12, overflow: 'hidden', marginRight: 10 },
  usualThumb: { width: 52, height: 52 },
  usualHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usualTag: { fontSize: 9, fontWeight: '800', color: colors.caramel, letterSpacing: 0.8 },
  usualPrice: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  usualName: { fontSize: 13, fontWeight: '800', color: colors.ink, marginTop: 1 },
  usualDesc: { fontSize: 11, color: colors.muted, marginTop: 1 },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.espresso,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginLeft: 8,
  },
  reorderBtnText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  sectionCount: { fontSize: 12, color: colors.muted },
  clearCategoryText: { fontSize: 12, fontWeight: '700', color: colors.caramel },
  categoriesScroll: { flexDirection: 'row', marginBottom: 18 },
  catCard: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 8,
    minWidth: 80,
  },
  catCardActive: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  catName: { fontSize: 11, fontWeight: '700', color: colors.espresso, textAlign: 'center' },
  catNameActive: { color: colors.white },
  restaurantList: { gap: 12, marginBottom: 18 },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  restaurantThumbWrap: {
    width: 104,
    height: 104,
    position: 'relative',
  },
  restaurantThumb: { width: 104, height: 104 },
  restaurantLogoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  restaurantBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  restNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { fontSize: 15, fontWeight: '800', color: colors.espresso },
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
  restaurantCuisine: { fontSize: 12, color: colors.muted, marginTop: 2 },
  restaurantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  etaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  etaText: { fontSize: 11, fontWeight: '700', color: '#2D7D46' },
  collectPill: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  collectPillText: { fontSize: 10, fontWeight: '800', color: colors.caramel },
  loyaltyTeaserCard: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 20 },
  loyaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stampIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  loyaltyTeaserTitle: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  loyaltyTeaserSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  viewRewardsBtn: { backgroundColor: colors.cream, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewRewardsText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.espresso, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
