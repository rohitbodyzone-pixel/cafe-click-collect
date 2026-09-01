import React, { useState, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { FeatureManager } from '@/src/services/features/featureManager';
import { PLATFORM_FEATURES, FeatureCategory } from '@/src/services/features/types';
import { colors } from '@/src/theme';

export default function SuperAdminFeaturesScreen() {
  const { restaurants, currentRestaurant, setCurrentRestaurant } = useRestaurant();
  const { toggleFeature, bulkToggleCategory } = useFeaturePermission();

  const [selectedRestId, setSelectedRestId] = useState(currentRestaurant.id);
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  const targetRestaurant = restaurants.find((r) => r.id === selectedRestId) || currentRestaurant;

  const loadRestPerms = async (restId: string) => {
    setLoading(true);
    try {
      const data = await FeatureManager.getPermissions(restId);
      setPerms(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRestPerms(selectedRestId);
  }, [selectedRestId]);

  const handleToggle = async (key: string, currentValue: boolean) => {
    const nextVal = !currentValue;
    setPerms((prev) => ({ ...prev, [key]: nextVal }));
    try {
      await toggleFeature(selectedRestId, key, nextVal);
      setActionMessage(`✓ Updated "${key}" to ${nextVal ? 'ENABLED' : 'DISABLED'} for ${targetRestaurant.name}`);
    } catch (e: any) {
      alert(e.message || 'Could not toggle feature');
      setPerms((prev) => ({ ...prev, [key]: currentValue }));
    }
  };

  const handleBulkToggle = async (category: FeatureCategory, enable: boolean) => {
    setLoading(true);
    try {
      await bulkToggleCategory(selectedRestId, category, enable);
      await loadRestPerms(selectedRestId);
      setActionMessage(`✓ Set all ${category.toUpperCase()} features to ${enable ? 'ENABLED' : 'DISABLED'} for ${targetRestaurant.name}`);
    } catch (e: any) {
      alert(e.message || 'Could not bulk toggle');
    } finally {
      setLoading(false);
    }
  };

  const filteredFeatures = useMemo(() => {
    return PLATFORM_FEATURES.filter((f) => {
      const matchCat = selectedCategory === 'all' || f.category === selectedCategory;
      const matchSearch =
        !search.trim() ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.key.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, search]);

  const enabledCount = PLATFORM_FEATURES.filter((f) => perms[f.key] !== false).length;

  return (
    <Screen>
      <Header
        title="Super Admin Feature Manager"
        right={
          <Pressable style={s.adminBtn} onPress={() => router.replace('/super-admin')}>
            <Ionicons name="shield-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>
        {/* Banner */}
        <View style={s.banner}>
          <Text style={s.bannerSmall}>MASTER FEATURE PERMISSION MATRIX</Text>
          <Text style={s.bannerTitle}>Turn platform modules ON/OFF per tenant.</Text>
          <Text style={s.bannerSub}>
            Changes take effect immediately for customer & owner interfaces of that restaurant.
          </Text>
        </View>

        {/* Tenant Selector */}
        <Text style={s.sectionLabel}>TARGET RESTAURANT:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tenantScroll}>
          {restaurants.map((rest) => (
            <Pressable
              key={rest.id}
              style={[s.tenantPill, selectedRestId === rest.id && s.tenantPillActive]}
              onPress={() => setSelectedRestId(rest.id)}
            >
              <Text style={[s.tenantPillText, selectedRestId === rest.id && s.tenantPillTextActive]}>
                {rest.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Search Bar */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search features by name or key…"
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

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
          {(['all', 'ordering', 'operations', 'marketing', 'ai_analytics', 'staff'] as const).map((cat) => (
            <Pressable
              key={cat}
              style={[s.catTab, selectedCategory === cat && s.catTabActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[s.catTabText, selectedCategory === cat && s.catTabTextActive]}>
                {cat.replace('_', ' ').toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Bulk Actions Header */}
        <View style={s.bulkRow}>
          <Text style={s.featureCount}>
            {enabledCount}/{PLATFORM_FEATURES.length} Features Active for {targetRestaurant.name}
          </Text>
          {selectedCategory !== 'all' && (
            <View style={s.bulkBtns}>
              <Pressable
                style={s.bulkBtn}
                onPress={() => void handleBulkToggle(selectedCategory as FeatureCategory, true)}
              >
                <Text style={s.bulkBtnText}>Enable All</Text>
              </Pressable>
              <Pressable
                style={[s.bulkBtn, s.bulkBtnDisable]}
                onPress={() => void handleBulkToggle(selectedCategory as FeatureCategory, false)}
              >
                <Text style={[s.bulkBtnText, { color: colors.danger }]}>Disable All</Text>
              </Pressable>
            </View>
          )}
        </View>

        {!!actionMessage && (
          <View style={s.messageBanner}>
            <Text style={s.messageText}>{actionMessage}</Text>
          </View>
        )}

        {/* Features List */}
        {filteredFeatures.map((feat) => {
          const isEnabled = perms[feat.key] !== false;
          return (
            <Card key={feat.key} style={[s.featCard, !isEnabled && s.featCardDisabled]}>
              <View style={s.featHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={s.featKeyRow}>
                    <Text style={s.featName}>{feat.name}</Text>
                    <View style={[s.catBadge, !isEnabled && s.catBadgeDisabled]}>
                      <Text style={s.catBadgeText}>{feat.category.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={s.featKeyText}>key: {feat.key}</Text>
                  <Text style={s.featDesc}>{feat.description}</Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => void handleToggle(feat.key, isEnabled)}
                  trackColor={{ false: colors.line, true: colors.espresso }}
                  thumbColor={colors.white}
                />
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  adminBtn: { padding: 8 },
  container: { paddingBottom: 40 },
  banner: {
    backgroundColor: colors.espresso,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  bannerSmall: { color: colors.caramel, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  bannerTitle: { color: colors.white, fontSize: 17, fontWeight: '900', marginTop: 4 },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4, lineHeight: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.caramel, letterSpacing: 0.8, marginBottom: 6 },
  tenantScroll: { flexDirection: 'row', marginBottom: 12 },
  tenantPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.cream,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tenantPillActive: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  tenantPillText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  tenantPillTextActive: { color: colors.white },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.ink },
  catScroll: { flexDirection: 'row', marginBottom: 12 },
  catTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.cream,
    marginRight: 6,
  },
  catTabActive: { backgroundColor: colors.espresso },
  catTabText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  catTabTextActive: { color: colors.white },
  bulkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  featureCount: { fontSize: 12, fontWeight: '700', color: colors.muted },
  bulkBtns: { flexDirection: 'row', gap: 6 },
  bulkBtn: { backgroundColor: colors.cream, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  bulkBtnDisable: { backgroundColor: '#FDE8E8' },
  bulkBtnText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  messageBanner: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#CEEAD6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  messageText: { color: colors.green, fontWeight: '800', fontSize: 12 },
  featCard: { marginBottom: 10 },
  featCardDisabled: { opacity: 0.65, backgroundColor: '#FAF9F6' },
  featHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featKeyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featName: { fontSize: 14, fontWeight: '800', color: colors.ink },
  catBadge: { backgroundColor: colors.cream, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catBadgeDisabled: { backgroundColor: colors.line },
  catBadgeText: { fontSize: 8, fontWeight: '800', color: colors.espresso },
  featKeyText: { fontSize: 10, color: colors.caramel, fontFamily: 'monospace', marginVertical: 2 },
  featDesc: { fontSize: 12, color: colors.muted, lineHeight: 16 },
});
