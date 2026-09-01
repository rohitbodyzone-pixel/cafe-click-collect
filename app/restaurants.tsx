import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Header, Screen } from '@/src/components/UI';
import { Restaurant, useRestaurant } from '@/src/context/RestaurantContext';
import { useOrders } from '@/src/context/OrderContext';
import { colors } from '@/src/theme';

function formatTime(timeStr: string) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isOpenNow(restaurant: Restaurant) {
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return nowStr >= restaurant.openingTime && nowStr <= restaurant.closingTime;
}

export default function RestaurantsScreen() {
  const { restaurants, currentRestaurant, setCurrentRestaurant, loading } = useRestaurant();
  const { cart, cartRestaurantId, cartRestaurantName, clearCart } = useOrders();
  const [search, setSearch] = useState('');
  const [switchPrompt, setSwitchPrompt] = useState<Restaurant | null>(null);

  const activeRestaurants = restaurants.filter(
    (r) =>
      r.isActive &&
      (r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.address.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())),
  );

  const handleSelect = (restaurant: Restaurant) => {
    if (restaurant.id === currentRestaurant.id) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }

    if (cart.length > 0 && cartRestaurantId && cartRestaurantId !== restaurant.id) {
      const message = `Your cart has ${cart.length} item${cart.length === 1 ? '' : 's'} from ${cartRestaurantName || 'another café'}. Switching to ${restaurant.name} will clear your cart.`;
      if (Platform.OS === 'web') {
        setSwitchPrompt(restaurant);
      } else {
        Alert.alert('Switch Restaurant?', message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Switch',
            style: 'destructive',
            onPress: () => {
              clearCart();
              setCurrentRestaurant(restaurant);
              if (router.canGoBack()) router.back();
              else router.replace('/');
            },
          },
        ]);
      }
      return;
    }

    setCurrentRestaurant(restaurant);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const confirmWebSwitch = () => {
    if (!switchPrompt) return;
    clearCart();
    setCurrentRestaurant(switchPrompt);
    setSwitchPrompt(null);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen>
      <Header title="Restaurants & Cafés" />

      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search restaurants, cafes, suburbs…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <Text style={s.countText}>
        {loading
          ? 'Loading restaurants…'
          : `${activeRestaurants.length} café${activeRestaurants.length === 1 ? '' : 's'} available`}
      </Text>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {activeRestaurants.map((restaurant) => {
          const isSelected = restaurant.id === currentRestaurant.id;
          const open = isOpenNow(restaurant);

          return (
            <Pressable
              key={restaurant.id}
              onPress={() => handleSelect(restaurant)}
            >
              <Card style={[s.card, isSelected && s.selectedCard]}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={s.badgeRow}>
                      <View style={[s.statusBadge, open ? s.openBadge : s.closedBadge]}>
                        <View style={[s.statusDot, open ? s.openDot : s.closedDot]} />
                        <Text style={[s.statusText, open ? s.openText : s.closedText]}>
                          {open ? 'OPEN NOW' : 'CLOSED'}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={s.activeBadge}>
                          <Ionicons name="checkmark" size={12} color={colors.white} />
                          <Text style={s.activeBadgeText}>SELECTED</Text>
                        </View>
                      )}
                    </View>

                    <Text style={s.name}>{restaurant.name}</Text>
                    {!!restaurant.description && (
                      <Text style={s.desc} numberOfLines={2}>
                        {restaurant.description}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={s.metaRow}>
                  {!!restaurant.address && (
                    <View style={s.metaItem}>
                      <Ionicons name="location-outline" size={14} color={colors.muted} />
                      <Text style={s.metaText} numberOfLines={1}>
                        {restaurant.address}
                      </Text>
                    </View>
                  )}
                  <View style={s.metaItem}>
                    <Ionicons name="time-outline" size={14} color={colors.muted} />
                    <Text style={s.metaText}>
                      {formatTime(restaurant.openingTime)} – {formatTime(restaurant.closingTime)}
                    </Text>
                  </View>
                </View>

                <View style={s.featureRow}>
                  {restaurant.clickAndCollectEnabled && (
                    <View style={s.featurePill}>
                      <Ionicons name="bag-handle-outline" size={12} color={colors.espresso} />
                      <Text style={s.featureText}>Click & Collect</Text>
                    </View>
                  )}
                  {restaurant.tableOrderingEnabled && (
                    <View style={s.featurePill}>
                      <Ionicons name="restaurant-outline" size={12} color={colors.espresso} />
                      <Text style={s.featureText}>Table QR</Text>
                    </View>
                  )}
                  {restaurant.payAtCounterEnabled && (
                    <View style={s.featurePill}>
                      <Ionicons name="cash-outline" size={12} color={colors.espresso} />
                      <Text style={s.featureText}>Pay at Counter</Text>
                    </View>
                  )}
                </View>

                <View style={s.actionRow}>
                  <Text style={s.viewMenuText}>
                    {isSelected ? 'View Menu →' : 'Select Café →'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}

        {!loading && activeRestaurants.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="storefront-outline" size={48} color={colors.muted} />
            <Text style={s.emptyTitle}>No matching restaurants</Text>
            <Text style={s.emptySubtitle}>Try searching for a different name or location.</Text>
          </View>
        )}
      </ScrollView>

      {/* Web Modal for Cart Switch Confirmation */}
      {switchPrompt && (
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Switch Restaurant?</Text>
            <Text style={s.modalBody}>
              Your cart has {cart.length} item{cart.length === 1 ? '' : 's'} from{' '}
              {cartRestaurantName || 'your current café'}. Switching to{' '}
              {switchPrompt.name} will clear your cart.
            </Text>
            <View style={s.modalActions}>
              <Pressable style={s.modalCancel} onPress={() => setSwitchPrompt(null)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.modalConfirm} onPress={confirmWebSwitch}>
                <Text style={s.modalConfirmText}>Clear & Switch</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: colors.ink,
  },
  countText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selectedCard: {
    borderColor: colors.caramel,
    backgroundColor: '#FFFDF9',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  openBadge: {
    backgroundColor: '#E6F4EA',
  },
  closedBadge: {
    backgroundColor: colors.line,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openDot: {
    backgroundColor: colors.green,
  },
  closedDot: {
    backgroundColor: colors.muted,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  openText: {
    color: colors.green,
  },
  closedText: {
    color: colors.muted,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.espresso,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  name: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.ink,
  },
  desc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  metaRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.cream,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  featureText: {
    color: colors.espresso,
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  viewMenuText: {
    color: colors.coffee,
    fontWeight: '800',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 12,
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  modalBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.cream,
  },
  modalCancelText: {
    color: colors.ink,
    fontWeight: '700',
  },
  modalConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.danger,
  },
  modalConfirmText: {
    color: colors.white,
    fontWeight: '800',
  },
});
