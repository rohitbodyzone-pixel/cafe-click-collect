import { useState } from 'react';
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
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { Restaurant, useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { colors } from '@/src/theme';

export default function SuperAdminScreen() {
  const auth = useAdminAuth();
  const {
    restaurants,
    currentRestaurant,
    setCurrentRestaurant,
    createRestaurant,
    toggleRestaurantActive,
    loading,
  } = useRestaurant();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openingTime, setOpeningTime] = useState('07:00');
  const [closingTime, setClosingTime] = useState('16:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      setError('Please provide a restaurant name and unique slug.');
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
        openingTime,
        closingTime,
      });
      setName('');
      setSlug('');
      setDescription('');
      setAddress('');
      setPhone('');
      setShowAddForm(false);
      Alert.alert('Success', `Restaurant "${created.name}" created successfully!`);
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
        title="Super Admin"
        right={
          <Pressable onPress={() => router.replace('/admin')}>
            <Text style={s.backLink}>Admin Home</Text>
          </Pressable>
        }
      />

      <View style={s.banner}>
        <Text style={s.bannerEyebrow}>PLATFORM MANAGEMENT</Text>
        <Text style={s.bannerTitle}>All Restaurants ({restaurants.length})</Text>
        <Text style={s.bannerSubtitle}>
          Super Admin: {auth.staff?.displayName || auth.staff?.email}
        </Text>
      </View>

      <View style={s.actionRow}>
        <Button
          label={showAddForm ? 'Cancel Onboarding' : '+ Onboard New Restaurant'}
          secondary={showAddForm}
          onPress={() => {
            setShowAddForm((c) => !c);
            setError('');
          }}
        />
      </View>

      {showAddForm && (
        <Card style={s.formCard}>
          <Text style={s.formTitle}>Onboard New Restaurant / Café</Text>
          <Text style={s.formHelp}>
            Set up the initial profile. Menu, tables, and staff roles can be configured after onboarding.
          </Text>

          <Text style={s.label}>Restaurant Name *</Text>
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
            placeholder="e.g. Trattoria Bella"
          />

          <Text style={s.label}>URL Slug (Unique identifier) *</Text>
          <TextInput
            style={s.input}
            value={slug}
            onChangeText={setSlug}
            placeholder="e.g. trattoria-bella"
            autoCapitalize="none"
          />

          <Text style={s.label}>Description</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Authentic Italian cafe and bakery"
          />

          <Text style={s.label}>Address</Text>
          <TextInput
            style={s.input}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 45 Victoria Street, Auckland"
          />

          <Text style={s.label}>Phone</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +64 9 987 6543"
          />

          <View style={s.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Opening Time</Text>
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

          {!!error && <Text style={s.error}>{error}</Text>}

          <Button
            label={busy ? 'Creating…' : 'Create Restaurant'}
            disabled={busy || !name.trim() || !slug.trim()}
            onPress={() => void handleCreate()}
          />
        </Card>
      )}

      <ScrollView style={{ flex: 1, marginTop: 12 }}>
        {restaurants.map((restaurant) => {
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
                  </View>
                  <Text style={s.slug}>Slug: {restaurant.slug}</Text>
                  {!!restaurant.address && (
                    <Text style={s.address}>{restaurant.address}</Text>
                  )}
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
                  <Text style={s.manageBtnText}>Manage this Café →</Text>
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
                  <Text style={s.viewPublicText}>Customer Menu</Text>
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
    padding: 20,
    borderRadius: 22,
    marginBottom: 12,
  },
  bannerEyebrow: {
    color: '#DDBB9B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  bannerSubtitle: {
    color: '#E7DCD5',
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    marginBottom: 12,
  },
  formCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.caramel,
    backgroundColor: '#FFFDFB',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.espresso,
  },
  formHelp: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  label: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  error: {
    color: colors.danger,
    marginVertical: 8,
    fontSize: 13,
  },
  card: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selectedCard: {
    borderColor: colors.caramel,
    backgroundColor: '#FFFDF9',
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
    color: colors.ink,
  },
  activeBadge: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  activeBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '800',
  },
  slug: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  address: {
    color: colors.ink,
    fontSize: 12,
    marginTop: 4,
  },
  switchWrap: {
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  manageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.cream,
    paddingVertical: 8,
    borderRadius: 10,
  },
  manageBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 12,
  },
  viewPublicBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  viewPublicText: {
    color: colors.coffee,
    fontWeight: '800',
    fontSize: 12,
  },
});
