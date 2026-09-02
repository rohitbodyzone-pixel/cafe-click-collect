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
import { ProductImage } from '@/src/components/ProductImage';
import { RestaurantCoverImage, RestaurantLogoImage } from '@/src/components/RestaurantImage';
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
  const { restaurants, setCurrentRestaurant } = useRestaurant();
  const { cart, orders, addToCart, clearCart } = useOrders();
  const { usual, vipTier, currentStreakDays } = useCustomerExperience();
  const { isFeatureEnabled } = useFeaturePermission();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'cart' | 'orders' | 'profile'>('home');

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
    router.push('/menu' as never);
  };

  const handleReorderUsual = () => {
    if (!usual || usual.items.length === 0) return;
    clearCart();
    usual.items.forEach((item) => addToCart(item.product, item.quantity));
    router.push('/cart');
  };

  return (
    <Screen>
      {/* 1. Premium Customer Header & Location Selector */}
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

        <Pressable style={s.cartPill} onPress={() => router.push('/cart')}>
          <Ionicons name="bag-handle" size={17} color={colors.white} />
          {cartCount > 0 && (
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeText}>{cartCount}</Text>
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
                      <Text style={s.collectPillText}>Click & Collect</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* 7. Loyalty Rewards & Passes Teaser */}
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
              <Pressable style={s.viewRewardsBtn} onPress={() => router.push('/rewards')}>
                <Text style={s.viewRewardsText}>View Passes →</Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* 8. Modern 5-Tab Customer Bottom Navigation */}
      <View style={s.bottomNavBar}>
        <Pressable
          style={s.navItem}
          onPress={() => {
            setActiveTab('home');
            setSearch('');
            setSelectedCategory(null);
          }}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'home' ? colors.espresso : colors.muted}
          />
          <Text style={[s.navLabel, activeTab === 'home' && s.navLabelActive]}>Home</Text>
        </Pressable>

        <Pressable
          style={s.navItem}
          onPress={() => {
            setActiveTab('search');
            router.push('/restaurants');
          }}
        >
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={22}
            color={activeTab === 'search' ? colors.espresso : colors.muted}
          />
          <Text style={[s.navLabel, activeTab === 'search' && s.navLabelActive]}>Explore</Text>
        </Pressable>

        <Pressable
          style={s.navItem}
          onPress={() => {
            setActiveTab('cart');
            router.push('/cart');
          }}
        >
          <View>
            <Ionicons
              name={activeTab === 'cart' ? 'bag-handle' : 'bag-handle-outline'}
              size={22}
              color={activeTab === 'cart' ? colors.espresso : colors.muted}
            />
            {cartCount > 0 && (
              <View style={s.navCartDot}>
                <Text style={s.navCartDotText}>{cartCount}</Text>
              </View>
            )}
          </View>
          <Text style={[s.navLabel, activeTab === 'cart' && s.navLabelActive]}>Cart</Text>
        </Pressable>

        <Pressable
          style={s.navItem}
          onPress={() => {
            setActiveTab('orders');
            router.push('/orders');
          }}
        >
          <Ionicons
            name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeTab === 'orders' ? colors.espresso : colors.muted}
          />
          <Text style={[s.navLabel, activeTab === 'orders' && s.navLabelActive]}>Orders</Text>
        </Pressable>

        <Pressable
          style={s.navItem}
          onPress={() => {
            setActiveTab('profile');
            router.push('/rewards');
          }}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'profile' ? colors.espresso : colors.muted}
          />
          <Text style={[s.navLabel, activeTab === 'profile' && s.navLabelActive]}>Loyalty</Text>
        </Pressable>
      </View>
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
  locationWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupLabel: { fontSize: 9, fontWeight: '800', color: colors.caramel, letterSpacing: 0.8 },
  locationText: { fontSize: 14, fontWeight: '800', color: colors.espresso },
  cartPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.caramel,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
  },
  cartBadgeText: { color: colors.white, fontSize: 10, fontWeight: '900' },
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
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  featuredDealText: { fontSize: 9, fontWeight: '900', color: colors.espresso, letterSpacing: 0.5 },
  heroBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  heroLogo: { borderWidth: 2, borderColor: colors.white },
  heroTitle: { fontSize: 21, fontWeight: '900', color: colors.white },
  heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 1, marginBottom: 6 },
  heroMetaRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  metaPillText: { fontSize: 11, fontWeight: '700', color: colors.white },
  usualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF9F3',
    borderWidth: 1,
    borderColor: '#FFE3D0',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  usualThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  usualThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  usualHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usualTag: { fontSize: 9, fontWeight: '900', color: colors.caramel, letterSpacing: 0.6 },
  usualPrice: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  usualName: { fontSize: 14, fontWeight: '800', color: colors.ink, marginTop: 1 },
  usualDesc: { fontSize: 11, color: colors.muted },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
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
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    justifyContent: 'space-around',
    elevation: 8,
  },
  navItem: { alignItems: 'center', gap: 2 },
  navLabel: { fontSize: 10, fontWeight: '700', color: colors.muted },
  navLabelActive: { color: colors.espresso, fontWeight: '800' },
  navCartDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: colors.caramel,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCartDotText: { color: colors.white, fontSize: 8, fontWeight: '900' },
});
