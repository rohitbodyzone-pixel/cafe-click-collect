import React, { useState } from 'react';
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
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { FeatureCategory, PLATFORM_FEATURES } from '@/src/services/features/types';
import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { AdminGate } from '@/src/components/AdminGate';

const CATEGORIES: { label: string; value: FeatureCategory | 'all'; icon: string }[] = [
  { label: 'All', value: 'all', icon: 'grid-outline' },
  { label: 'Ordering', value: 'ordering', icon: 'cart-outline' },
  { label: 'Operations', value: 'operations', icon: 'construct-outline' },
  { label: 'Marketing', value: 'marketing', icon: 'megaphone-outline' },
  { label: 'AI & Analytics', value: 'ai_analytics', icon: 'analytics-outline' },
  { label: 'Staff', value: 'staff', icon: 'people-outline' },
];

export default function OwnerFeaturesScreen() {
  const { currentRestaurant } = useRestaurant();
  const { getFeatureState, toggleOwnerFeature, bulkToggleCategory, loading } = useFeaturePermission();
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const filteredFeatures = PLATFORM_FEATURES.filter((f) => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCount = PLATFORM_FEATURES.length;
  const activeCount = PLATFORM_FEATURES.filter((f) => getFeatureState(f.key).effective).length;
  const superAdminDisabledCount = PLATFORM_FEATURES.filter((f) => !getFeatureState(f.key).superAdmin).length;

  const handleToggle = async (featureKey: string, currentOwnerVal: boolean, superAdminVal: boolean) => {
    if (!superAdminVal) {
      alert('This feature has been disabled by the Platform Super Admin and cannot be activated by the restaurant owner.');
      return;
    }
    setUpdatingKey(featureKey);
    try {
      await toggleOwnerFeature(currentRestaurant.id, featureKey, !currentOwnerVal);
    } catch (e: any) {
      alert(e.message || 'Could not update feature setting');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleBulkToggle = async (category: FeatureCategory, enabled: boolean) => {
    setBulkBusy(true);
    try {
      await bulkToggleCategory(currentRestaurant.id, category, enabled, 'owner');
    } catch (e: any) {
      alert(e.message || 'Could not perform bulk update');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <AdminGate>
      <Screen>
        <Header title="Restaurant Features" back />
        <ScrollView style={s.container} contentContainerStyle={s.content}>
          {/* Header Summary */}
          <Card style={s.summaryCard}>
            <View style={s.summaryHeader}>
              <View>
                <Text style={s.restaurantName}>{currentRestaurant.name}</Text>
                <Text style={s.subText}>Configure optional capabilities for your restaurant</Text>
              </View>
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {activeCount} / {totalCount} Active
                </Text>
              </View>
            </View>

            {superAdminDisabledCount > 0 && (
              <View style={s.platformNotice}>
                <Ionicons name="information-circle" size={16} color={colors.danger} />
                <Text style={s.platformNoticeText}>
                  {superAdminDisabledCount} feature{superAdminDisabledCount > 1 ? 's are' : ' is'} locked by Platform Super Admin.
                </Text>
              </View>
            )}
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
              <Text style={s.bulkTitle}>Category Quick Actions:</Text>
              <View style={s.bulkButtons}>
                <Pressable
                  style={[s.bulkBtn, s.bulkBtnOn]}
                  disabled={bulkBusy}
                  onPress={() => handleBulkToggle(selectedCategory, true)}
                >
                  <Text style={s.bulkBtnTextOn}>Enable Allowed</Text>
                </Pressable>
                <Pressable
                  style={[s.bulkBtn, s.bulkBtnOff]}
                  disabled={bulkBusy}
                  onPress={() => handleBulkToggle(selectedCategory, false)}
                >
                  <Text style={s.bulkBtnTextOff}>Disable All</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Features List */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.espresso} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.listContainer}>
              {filteredFeatures.map((f) => {
                const state = getFeatureState(f.key);
                const isLocked = !state.superAdmin;
                const isBusy = updatingKey === f.key;

                return (
                  <Card key={f.key} style={[s.featureCard, isLocked && s.featureCardLocked]}>
                    <View style={s.featureHeader}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <View style={s.nameRow}>
                          <Text style={[s.featureName, isLocked && s.featureNameLocked]}>{f.name}</Text>
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
                            value={state.owner && !isLocked}
                            disabled={isLocked}
                            onValueChange={() => handleToggle(f.key, state.owner, state.superAdmin)}
                            trackColor={{ false: colors.line, true: colors.caramel }}
                            thumbColor={colors.white}
                          />
                        )}
                      </View>
                    </View>

                    {/* Locked notice or status chip */}
                    <View style={s.featureFooter}>
                      <View style={s.categoryChip}>
                        <Text style={s.categoryChipText}>{f.category.toUpperCase()}</Text>
                      </View>

                      {isLocked ? (
                        <View style={s.lockedChip}>
                          <Ionicons name="lock-closed" size={11} color={colors.danger} />
                          <Text style={s.lockedChipText}>Disabled by Platform Admin</Text>
                        </View>
                      ) : state.effective ? (
                        <View style={s.activeChip}>
                          <Ionicons name="checkmark-circle" size={11} color="#2D7D46" />
                          <Text style={s.activeChipText}>Active & Working</Text>
                        </View>
                      ) : (
                        <View style={s.pausedChip}>
                          <Ionicons name="pause-circle" size={11} color={colors.muted} />
                          <Text style={s.pausedChipText}>Disabled by Owner</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </ScrollView>
      </Screen>
    </AdminGate>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  summaryCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 14 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { fontSize: 18, fontWeight: '800', color: colors.espresso },
  subText: { fontSize: 12, color: colors.muted, marginTop: 2 },
  badge: { backgroundColor: colors.cream, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  platformNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE8E8',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  platformNoticeText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
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
  featureCardLocked: { backgroundColor: '#FDFBFB', borderColor: '#F3D6D6' },
  featureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  featureName: { fontSize: 14, fontWeight: '800', color: colors.espresso },
  featureNameLocked: { color: colors.muted },
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
  lockedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FDE8E8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  lockedChipText: { fontSize: 10, fontWeight: '700', color: colors.danger },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E6F4EA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeChipText: { fontSize: 10, fontWeight: '700', color: '#2D7D46' },
  pausedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pausedChipText: { fontSize: 10, fontWeight: '700', color: colors.muted },
});
