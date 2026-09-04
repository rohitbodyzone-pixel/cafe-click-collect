import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen, triggerHaptic } from '@/src/components/UI';
import { Restaurant, useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { useOrders } from '@/src/context/OrderContext';
import { money } from '@/src/data/products';
import { colors, radii, shadows } from '@/src/theme';
import { RoleGate } from '@/src/components/RoleGate';

export default function SuperAdminScreen() {
  return (
    <RoleGate allowedRoles={['super_admin']} roleTitle="Super Admin">
      <SuperAdminContent />
    </RoleGate>
  );
}

function SuperAdminContent() {
  const auth = useAdminAuth();
  const { orders } = useOrders();
  const {
    restaurants,
    currentRestaurant,
    setCurrentRestaurant,
    createRestaurant,
    toggleRestaurantActive,
    updateRestaurantProfile,
    loading,
  } = useRestaurant();

  // Search & Filter
  const [search, setSearch] = useState('');

  // 14-Step Onboarding Form State
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingTime, setOpeningTime] = useState('07:00');
  const [closingTime, setClosingTime] = useState('16:00');
  const [currency, setCurrency] = useState('nzd');
  const [timezone, setTimezone] = useState('Pacific/Auckland');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [prepTime, setPrepTime] = useState('15');
  const [slotInterval, setSlotInterval] = useState('5');
  const [maxSlotOrders, setMaxSlotOrders] = useState('5');
  const [cardEnabled, setCardEnabled] = useState(true);
  const [payAtCounterEnabled, setPayAtCounterEnabled] = useState(true);
  const [applePayEnabled, setApplePayEnabled] = useState(true);
  const [googlePayEnabled, setGooglePayEnabled] = useState(true);
  const [initialHeroProduct, setInitialHeroProduct] = useState('');
  const [initialHeroPrice, setInitialHeroPrice] = useState('');
  const [initialTables, setInitialTables] = useState('T1, T2, T3');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Global Platform Metrics
  const platformStats = useMemo(() => {
    const totalRestaurants = restaurants.length;
    const activeCount = restaurants.filter((r) => r.isActive).length;
    const totalOrders = orders.length;
    const grossVolume = orders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.amountPaid : o.total), 0);

    return { totalRestaurants, activeCount, totalOrders, grossVolume };
  }, [restaurants, orders]);

  const filteredRestaurants = useMemo(() => {
    if (!search.trim()) return restaurants;
    const query = search.toLowerCase();
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.slug.toLowerCase().includes(query) ||
        r.address.toLowerCase().includes(query),
    );
  }, [restaurants, search]);

  const handleFinishOnboarding = async () => {
    if (!name.trim() || !slug.trim()) {
      setError('Please provide a restaurant name and slug.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await createRestaurant({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim() || ownerEmail.trim(),
        openingTime,
        closingTime,
      });

      // Save additional profile details
      await updateRestaurantProfile(created.id, {
        logoUrl: logoUrl.trim() || undefined,
        averagePrepMinutes: Number(prepTime) || 15,
        slotIntervalMinutes: Number(slotInterval) || 5,
        maxOrdersPerSlot: Number(maxSlotOrders) || 5,
        cardEnabled,
        payAtCounterEnabled,
        applePayEnabled,
        googlePayEnabled,
        clickAndCollectEnabled: true,
        tableOrderingEnabled: true,
      });

      // Reset form
      setName('');
      setSlug('');
      setLogoUrl('');
      setDescription('');
      setAddress('');
      setPhone('');
      setEmail('');
      setOwnerEmail('');
      setShowWizard(false);
      setStep(1);

      Alert.alert(
        'Onboarding Complete! 🎉',
        `Restaurant "${created.name}" (slug: /${created.slug}) has been successfully created and activated!`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not create restaurant.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchToRestaurant = (res: Restaurant) => {
    setCurrentRestaurant(res);
    router.replace('/admin');
  };

  return (
    <Screen>
      <Header
        title="Platform Super Admin"
        right={
          <Pressable onPress={() => router.replace('/admin')}>
            <Text style={s.backLink}>Admin Home</Text>
          </Pressable>
        }
      />

      {/* Super Admin Platform Banner */}
      <View style={s.banner}>
        <Text style={s.bannerEyebrow}>MULTI-TENANT PLATFORM OVERVIEW</Text>
        <Text style={s.bannerTitle}>All Restaurants ({restaurants.length})</Text>
        <Text style={s.bannerSubtitle}>
          Super Admin: {auth.staff?.displayName || auth.staff?.email}
        </Text>

        {/* Global KPI row */}
        <View style={s.platformKpis}>
          <View style={s.kpiItem}>
            <Text style={s.kpiVal}>{platformStats.totalRestaurants}</Text>
            <Text style={s.kpiLbl}>Restaurants</Text>
          </View>
          <View style={s.kpiItem}>
            <Text style={[s.kpiVal, { color: '#A9C7AF' }]}>
              {platformStats.activeCount}
            </Text>
            <Text style={s.kpiLbl}>Active</Text>
          </View>
          <View style={s.kpiItem}>
            <Text style={s.kpiVal}>{platformStats.totalOrders}</Text>
            <Text style={s.kpiLbl}>Platform Orders</Text>
          </View>
          <View style={s.kpiItem}>
            <Text style={s.kpiVal}>{money(platformStats.grossVolume)}</Text>
            <Text style={s.kpiLbl}>Gross Volume</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons: Health, Features, Billing & Onboarding */}
      <View style={[s.actionRow, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
        <Button
          label="Fleet Health & Alerts"
          icon="pulse-outline"
          onPress={() => router.push('/super-admin-health' as never)}
        />
        <Button
          label="Feature Manager"
          icon="options-outline"
          secondary
          onPress={() => router.push('/super-admin-features' as never)}
        />
        <Button
          label="Billing & Payouts"
          icon="wallet-outline"
          secondary
          onPress={() => router.push('/super-admin-billing' as never)}
        />
        <Button
          label={showWizard ? 'Cancel' : '+ Onboard Cafe'}
          secondary={!showWizard}
          icon={showWizard ? 'close-outline' : 'add-circle-outline'}
          onPress={() => {
            setShowWizard((c) => !c);
            setStep(1);
            setError('');
          }}
        />
      </View>

      {/* 14-Step Interactive Onboarding Wizard */}
      {showWizard && (
        <Card style={s.wizardCard}>
          <View style={s.wizardHeader}>
            <View style={s.wizardPill}>
              <Text style={s.wizardPillText}>STEP {step} OF 3</Text>
            </View>
            <Text style={s.wizardTitle}>
              {step === 1
                ? '1. Identity & Location'
                : step === 2
                  ? '2. Hours & Click & Collect'
                  : '3. Payments & Activation'}
            </Text>
          </View>

          {step === 1 && (
            <View>
              <Text style={s.label}>1. Restaurant Name *</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (!slug) {
                    setSlug(
                      val
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                    );
                  }
                }}
                placeholder="e.g. Seaside Bistro & Grill"
              />

              <Text style={s.label}>2. URL Slug (Unique Identifier) *</Text>
              <TextInput
                style={s.input}
                value={slug}
                onChangeText={setSlug}
                placeholder="e.g. seaside-bistro"
                autoCapitalize="none"
              />

              <Text style={s.label}>3. Logo or Banner Image URL</Text>
              <TextInput
                style={s.input}
                value={logoUrl}
                onChangeText={setLogoUrl}
                placeholder="https://..."
                autoCapitalize="none"
              />

              <Text style={s.label}>4. Description & Cuisine</Text>
              <TextInput
                style={s.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Fresh coastal dining and specialty roasts"
              />

              <Text style={s.label}>5. Physical Address</Text>
              <TextInput
                style={s.input}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 10 Marine Parade, Mount Maunganui"
              />

              <View style={s.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Phone</Text>
                  <TextInput
                    style={s.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+64 7 123 4567"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Contact Email</Text>
                  <TextInput
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="contact@bistro.co.nz"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Button
                label="Next: Operating Hours & Prep →"
                disabled={!name.trim() || !slug.trim()}
                onPress={() => setStep(2)}
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <View style={s.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>6. Opening Time</Text>
                  <TextInput
                    style={s.input}
                    value={openingTime}
                    onChangeText={setOpeningTime}
                    placeholder="07:00"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Closing Time</Text>
                  <TextInput
                    style={s.input}
                    value={closingTime}
                    onChangeText={setClosingTime}
                    placeholder="16:00"
                  />
                </View>
              </View>

              <View style={s.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>7. Currency</Text>
                  <TextInput
                    style={s.input}
                    value={currency.toUpperCase()}
                    onChangeText={(val) => setCurrency(val.toLowerCase())}
                    placeholder="NZD"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Timezone</Text>
                  <TextInput
                    style={s.input}
                    value={timezone}
                    onChangeText={setTimezone}
                    placeholder="Pacific/Auckland"
                  />
                </View>
              </View>

              <Text style={s.label}>8. Assigned Owner / Manager Email</Text>
              <TextInput
                style={s.input}
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                placeholder="owner@restaurant.co.nz"
                autoCapitalize="none"
              />

              <Text style={s.label}>9. Initial Hero Menu Item (Optional)</Text>
              <View style={s.timeRow}>
                <View style={{ flex: 2 }}>
                  <TextInput
                    style={s.input}
                    value={initialHeroProduct}
                    onChangeText={setInitialHeroProduct}
                    placeholder="e.g. Signature Flat White"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={s.input}
                    value={initialHeroPrice}
                    onChangeText={setInitialHeroPrice}
                    placeholder="$5.50"
                  />
                </View>
              </View>

              <Text style={s.label}>10. Initial Table Codes</Text>
              <TextInput
                style={s.input}
                value={initialTables}
                onChangeText={setInitialTables}
                placeholder="T1, T2, T3, Patio 1"
              />

              <View style={s.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>11. Prep Time (min)</Text>
                  <TextInput
                    style={s.input}
                    value={prepTime}
                    onChangeText={setPrepTime}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Slot Interval (min)</Text>
                  <TextInput
                    style={s.input}
                    value={slotInterval}
                    onChangeText={setSlotInterval}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Slot Cap (orders)</Text>
                  <TextInput
                    style={s.input}
                    value={maxSlotOrders}
                    onChangeText={setMaxSlotOrders}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={s.wizardBtnRow}>
                <Pressable style={s.prevBtn} onPress={() => setStep(1)}>
                  <Text style={s.prevBtnText}>← Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Next: Payment & Launch →"
                    onPress={() => setStep(3)}
                  />
                </View>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={s.label}>12. Payment Channels Accepted</Text>
              <View style={s.toggleRow}>
                <Text style={s.toggleLbl}>Card Payments</Text>
                <Switch value={cardEnabled} onValueChange={setCardEnabled} />
              </View>
              <View style={s.toggleRow}>
                <Text style={s.toggleLbl}>Pay at Counter / Pickup</Text>
                <Switch
                  value={payAtCounterEnabled}
                  onValueChange={setPayAtCounterEnabled}
                />
              </View>
              <View style={s.toggleRow}>
                <Text style={s.toggleLbl}>Apple Pay</Text>
                <Switch
                  value={applePayEnabled}
                  onValueChange={setApplePayEnabled}
                />
              </View>
              <View style={s.toggleRow}>
                <Text style={s.toggleLbl}>Google Pay</Text>
                <Switch
                  value={googlePayEnabled}
                  onValueChange={setGooglePayEnabled}
                />
              </View>

              <View style={s.readySummary}>
                <Text style={s.readySummaryTitle}>13. Ready to Launch Restaurant</Text>
                <Text style={s.readySummaryText}>
                  • Name: {name} (Slug: /{slug}){'\n'}
                  • Hours: {openingTime} – {closingTime}{'\n'}
                  • Location: {address || 'Pending'}{'\n'}
                  • Assigned Owner: {ownerEmail || email || 'Super Admin'}
                </Text>
              </View>

              {!!error && <Text style={s.error}>{error}</Text>}

              <View style={s.wizardBtnRow}>
                <Pressable style={s.prevBtn} onPress={() => setStep(2)}>
                  <Text style={s.prevBtnText}>← Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Button
                    label={busy ? 'Creating & Activating…' : '14. Launch Restaurant 🎉'}
                    disabled={busy}
                    onPress={() => void handleFinishOnboarding()}
                  />
                </View>
              </View>
            </View>
          )}
        </Card>
      )}

      {/* Search Filter for Restaurants */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search restaurants by name, slug or city…"
          placeholderTextColor={colors.muted}
        />
        {!!search && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* List of Platform Restaurants */}
      <ScrollView style={{ flex: 1, marginTop: 4 }}>
        {filteredRestaurants.map((restaurant) => {
          const isSelected = restaurant.id === currentRestaurant.id;

          return (
            <Card key={restaurant.id} style={[s.card, isSelected && s.selectedCard]}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.name}>{restaurant.name}</Text>
                    {isSelected && (
                      <View style={s.activeBadge}>
                        <Text style={s.activeBadgeText}>ACTIVE ADMIN VIEW</Text>
                      </View>
                    )}
                    <View
                      style={[
                        s.planBadge,
                        restaurant.plan === 'premium' && s.planBadgePremium,
                      ]}
                    >
                      <Text style={s.planBadgeText}>
                        {(restaurant.plan || 'starter').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.slug}>Slug: /{restaurant.slug}</Text>
                  {!!restaurant.address && (
                    <Text style={s.address}>{restaurant.address}</Text>
                  )}
                  <Text style={s.hoursText}>
                    Hours: {restaurant.openingTime} – {restaurant.closingTime} · Prep: {restaurant.averagePrepMinutes}m
                  </Text>
                </View>

                <View style={s.switchWrap}>
                  <Text style={s.switchLabel}>
                    {restaurant.isActive ? 'Active' : 'Disabled'}
                  </Text>
                  <Switch
                    value={restaurant.isActive}
                    onValueChange={(val) =>
                      void toggleRestaurantActive(restaurant.id, val)
                    }
                    trackColor={{ false: '#D8CBC1', true: '#A9C7AF' }}
                    thumbColor={restaurant.isActive ? colors.green : colors.muted}
                  />
                </View>
              </View>

              <View style={s.cardActions}>
                <Pressable
                  style={s.manageBtn}
                  onPress={() => handleSwitchToRestaurant(restaurant)}
                >
                  <Ionicons name="settings-outline" size={14} color={colors.espresso} />
                  <Text style={s.manageBtnText}>Manage Admin →</Text>
                </Pressable>
                <Pressable
                  style={s.analyticsBtn}
                  onPress={() => {
                    setCurrentRestaurant(restaurant);
                    router.push({
                      pathname: '/admin-health',
                      params: { restaurantId: restaurant.id },
                    });
                  }}
                >
                  <Ionicons name="pulse-outline" size={14} color={colors.espresso} />
                  <Text style={s.analyticsBtnText}>Health</Text>
                </Pressable>
                <Pressable
                  style={s.analyticsBtn}
                  onPress={() => {
                    setCurrentRestaurant(restaurant);
                    router.push('/admin-analytics');
                  }}
                >
                  <Ionicons name="stats-chart-outline" size={14} color={colors.espresso} />
                  <Text style={s.analyticsBtnText}>Analytics</Text>
                </Pressable>
                <Pressable
                  style={s.viewPublicBtn}
                  onPress={() => {
                    setCurrentRestaurant(restaurant);
                    router.replace({
                      pathname: '/',
                      params: { restaurant: restaurant.slug },
                    });
                  }}
                >
                  <Ionicons name="eye-outline" size={14} color={colors.coffee} />
                  <Text style={s.viewPublicText}>Menu</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  backLink: {
    color: colors.coffee,
    fontWeight: '800',
    fontSize: 13,
  },
  banner: {
    backgroundColor: colors.espresso,
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
  },
  bannerEyebrow: {
    color: '#DDBB9B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  bannerSubtitle: {
    color: '#E7DCD5',
    fontSize: 12,
    marginTop: 2,
  },
  platformKpis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  kpiItem: {
    alignItems: 'center',
  },
  kpiVal: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 16,
  },
  kpiLbl: {
    color: '#DDBB9B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  actionRow: {
    marginBottom: 12,
  },
  wizardCard: {
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.caramel,
    backgroundColor: '#FFFDFB',
    padding: 16,
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  wizardPill: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  wizardPillText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
  wizardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.espresso,
  },
  label: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 13,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  wizardBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    alignItems: 'center',
  },
  prevBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.cream,
  },
  prevBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  toggleLbl: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  readySummary: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  readySummaryTitle: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.espresso,
  },
  readySummaryText: {
    fontSize: 12,
    color: colors.ink,
    marginTop: 4,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    marginVertical: 8,
    fontSize: 13,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
  },
  card: {
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  selectedCard: {
    borderColor: colors.espresso,
    backgroundColor: colors.creamSoft,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.espresso,
  },
  activeBadge: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  activeBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  planBadge: {
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  planBadgePremium: {
    backgroundColor: '#FDEED9',
  },
  planBadgeText: {
    color: colors.espresso,
    fontSize: 9,
    fontWeight: '800',
  },
  slug: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  address: {
    color: colors.ink,
    fontSize: 13,
    marginTop: 3,
  },
  hoursText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  switchWrap: {
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  manageBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.cream,
    paddingVertical: 10,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  manageBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 12,
  },
  analyticsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.white,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  analyticsBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 12,
  },
  viewPublicBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.white,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  viewPublicText: {
    color: colors.coffee,
    fontWeight: '800',
    fontSize: 12,
  },
});
