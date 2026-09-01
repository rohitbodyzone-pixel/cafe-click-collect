import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Screen, Header, Card, Button } from '@/src/components/UI';
import { useRestaurant, Restaurant } from '@/src/context/RestaurantContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { FeatureCategory, FeatureDefinition, FeatureState, PLATFORM_FEATURES } from '@/src/services/features/types';
import {
  fetchRestaurantFeatureStates,
  toggleFeaturePermission,
  bulkToggleFeatureCategory,
} from '@/src/services/features/featureManager';
import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/src/components/RoleGate';

const CATEGORIES: { label: string; value: FeatureCategory | 'all'; icon: string }[] = [
  { label: 'All', value: 'all', icon: 'grid-outline' },
  { label: 'Ordering', value: 'ordering', icon: 'cart-outline' },
  { label: 'Operations', value: 'operations', icon: 'construct-outline' },
  { label: 'Marketing', value: 'marketing', icon: 'megaphone-outline' },
  { label: 'AI & Analytics', value: 'ai_analytics', icon: 'analytics-outline' },
  { label: 'Staff', value: 'staff', icon: 'people-outline' },
];

export default function SuperAdminFeaturesScreen() {
  return (
    <RoleGate allowedRoles={['super_admin']} roleTitle="Super Admin Features">
      <SuperAdminFeaturesContent />
    </RoleGate>
  );
}

function SuperAdminFeaturesContent() {
  const { restaurants } = useRestaurant();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [featureStates, setFeatureStates] = useState<Record<string, FeatureState>>({});
  const [loading, setLoading] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (restaurants && restaurants.length > 0 && !selectedRestaurant) {
      setSelectedRestaurant(restaurants[0]);
    }
  }, [restaurants, selectedRestaurant]);

  useEffect(() => {
    if (selectedRestaurant) {
      loadFeaturesForRestaurant(selectedRestaurant.id);
    }
  }, [selectedRestaurant]);

  const loadFeaturesForRestaurant = async (restId: string) => {
    setLoading(true);
    try {
      const states = await fetchRestaurantFeatureStates(restId);
      setFeatureStates(states);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (featureKey: string, currentSuperVal: boolean) => {
    if (!selectedRestaurant) return;
    setUpdatingKey(featureKey);
    try {
      await toggleFeaturePermission(selectedRestaurant.id, featureKey, !currentSuperVal, 'super_admin');
      setFeatureStates((prev) => {
        const current = prev[featureKey] || { superAdmin: true, owner: true, effective: true };
        const newSuper = !currentSuperVal;
        return {
          ...prev,
          [featureKey]: {
            superAdmin: newSuper,
            owner: current.owner,
            effective: newSuper && current.owner,
          },
        };
      });
    } catch (e: any) {
      alert(e.message || 'Could not update feature permission');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleBulkToggle = async (category: FeatureCategory, enabled: boolean) => {
    if (!selectedRestaurant) return;
    setBulkBusy(true);
    try {
      await bulkToggleFeatureCategory(selectedRestaurant.id, category, enabled, 'super_admin');
      await loadFeaturesForRestaurant(selectedRestaurant.id);
    } catch (e: any) {
      alert(e.message || 'Could not update category');
    } finally {
      setBulkBusy(false);
    }
  };

  const filteredFeatures = PLATFORM_FEATURES.filter((f) => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCount = PLATFORM_FEATURES.length;
  const superEnabledCount = PLATFORM_FEATURES.filter((f) => featureStates[f.key]?.superAdmin ?? true).length;
  const effectiveCount = PLATFORM_FEATURES.filter((f) => featureStates[f.key]?.effective ?? true).length;

  return (
    <Screen>
      <Header title="Super Admin Features" back />
        <ScrollView style={s.container} contentContainerStyle={s.content}>
          {/* Restaurant Selector Bar */}
          <Card style={s.tenantCard}>
            <Text style={s.sectionTitle}>Select Restaurant Tenant:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tenantScroll}>
              {restaurants.map((r) => (
                <Pressable
                  key={r.id}
                  style={[s.tenantPill, selectedRestaurant?.id === r.id && s.tenantPillActive]}
                  onPress={() => setSelectedRestaurant(r)}
                >
                  <Ionicons
                    name="business"
                    size={14}
                    color={selectedRestaurant?.id === r.id ? colors.white : colors.espresso}
                  />
                  <Text
                    style={[
                      s.tenantPillText,
                      selectedRestaurant?.id === r.id && s.tenantPillTextActive,
                    ]}
                  >
                    {r.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={s.summaryStatsRow}>
              <View style={s.statBox}>
                <Text style={s.statNum}>{totalCount}</Text>
                <Text style={s.statLabel}>Total Catalog</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: colors.espresso }]}>{superEnabledCount}</Text>
                <Text style={s.statLabel}>Platform Allowed</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: '#2D7D46' }]}>{effectiveCount}</Text>
                <Text style={s.statLabel}>Effective Active</Text>
              </View>
            </View>
          </Card>

          {/* Search Bar */}
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.muted} style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              placeholder="Search 58 features..."
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

          {/* Category Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                style={[s.catTab, selectedCategory === cat.value && s.catTabActive]}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={15}
                  color={selectedCategory === cat.value ? colors.white : colors.espresso}
                />
                <Text style={[s.catTabText, selectedCategory === cat.value && s.catTabTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Bulk Category Controls */}
          {selectedCategory !== 'all' && (
            <View style={s.bulkRow}>
              <Text style={s.bulkTitle}>Category Master Actions:</Text>
              <View style={s.bulkButtons}>
                <Pressable
                  style={[s.bulkBtn, s.bulkBtnOn]}
                  disabled={bulkBusy}
                  onPress={() => handleBulkToggle(selectedCategory, true)}
                >
                  <Text style={s.bulkBtnTextOn}>Allow Category</Text>
                </Pressable>
                <Pressable
                  style={[s.bulkBtn, s.bulkBtnOff]}
                  disabled={bulkBusy}
                  onPress={() => handleBulkToggle(selectedCategory, false)}
                >
                  <Text style={s.bulkBtnTextOff}>Lock Category</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Feature List */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.espresso} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.listContainer}>
              {filteredFeatures.map((f) => {
                const state = featureStates[f.key] || { superAdmin: true, owner: true, effective: true };
                const isBusy = updatingKey === f.key;

                return (
                  <Card key={f.key} style={s.featureCard}>
                    <View style={s.featureHeader}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <View style={s.nameRow}>
                          <Text style={s.featureName}>{f.name}</Text>
                          {f.isExternalPending && (
                            <View style={s.extBadge}>
                              <Text style={s.extBadgeText}>Adapter / Mock</Text>
                            </View>
                          )}
                        </View>
                        <Text style={s.featureDesc}>{f.description}</Text>
                      </View>

                      <View style={s.toggleContainer}>
                        {isBusy ? (
                          <ActivityIndicator size="small" color={colors.espresso} />
                        ) : (
                          <Switch
                            value={state.superAdmin}
                            onValueChange={() => handleToggle(f.key, state.superAdmin)}
                            trackColor={{ false: colors.line, true: colors.caramel }}
                            thumbColor={colors.white}
                          />
                        )}
                      </View>
                    </View>

                    {/* Footer with category & Dual Level Status */}
                    <View style={s.featureFooter}>
                      <View style={s.categoryChip}>
                        <Text style={s.categoryChipText}>{f.category.toUpperCase()}</Text>
                      </View>

                      <View style={s.dualStatusRow}>
                        <View style={s.ownerChip}>
                          <Text style={s.ownerChipText}>
                            Owner: {state.owner ? 'ENABLED' : 'DISABLED'}
                          </Text>
                        </View>

                        <View
                          style={[
                            s.effectiveBadge,
                            state.effective ? s.effectiveBadgeOn : s.effectiveBadgeOff,
                          ]}
                        >
                          <Ionicons
                            name={state.effective ? 'checkmark-circle' : 'close-circle'}
                            size={11}
                            color={state.effective ? '#2D7D46' : colors.danger}
                          />
                          <Text
                            style={[
                              s.effectiveBadgeText,
                              state.effective ? s.effectiveBadgeTextOn : s.effectiveBadgeTextOff,
                            ]}
                          >
                            {state.effective ? 'EFFECTIVE ACTIVE' : 'EFFECTIVE OFF'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </ScrollView>
      </Screen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  tenantCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.espresso, marginBottom: 10, letterSpacing: 0.5 },
  tenantScroll: { flexDirection: 'row', marginBottom: 14 },
  tenantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cream,
    marginRight: 8,
  },
  tenantPillActive: { backgroundColor: colors.espresso },
  tenantPillText: { fontSize: 13, fontWeight: '700', color: colors.espresso },
  tenantPillTextActive: { color: colors.white },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '900', color: colors.caramel },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink },
  categoryScroll: { marginBottom: 12 },
  catTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 8,
  },
  catTabActive: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  catTabText: { fontSize: 12, fontWeight: '700', color: colors.espresso },
  catTabTextActive: { color: colors.white },
  bulkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bulkTitle: { fontSize: 12, fontWeight: '700', color: colors.espresso },
  bulkButtons: { flexDirection: 'row', gap: 8 },
  bulkBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bulkBtnOn: { backgroundColor: colors.cream },
  bulkBtnOff: { backgroundColor: '#F3F4F6' },
  bulkBtnTextOn: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  bulkBtnTextOff: { fontSize: 11, fontWeight: '700', color: colors.muted },
  listContainer: { gap: 10 },
  featureCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14 },
  featureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  featureName: { fontSize: 14, fontWeight: '800', color: colors.espresso },
  extBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  extBadgeText: { fontSize: 9, fontWeight: '700', color: '#1D4ED8' },
  featureDesc: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 16 },
  toggleContainer: { marginLeft: 8 },
  featureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  categoryChip: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryChipText: { fontSize: 9, fontWeight: '800', color: colors.caramel },
  dualStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  ownerChipText: { fontSize: 9, fontWeight: '700', color: colors.muted },
  effectiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  effectiveBadgeOn: { backgroundColor: '#E6F4EA' },
  effectiveBadgeOff: { backgroundColor: '#FDE8E8' },
  effectiveBadgeText: { fontSize: 9, fontWeight: '800' },
  effectiveBadgeTextOn: { color: '#2D7D46' },
  effectiveBadgeTextOff: { color: colors.danger },
});
