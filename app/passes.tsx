import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useCustomerExperience, PrepaidPassTemplate } from '@/src/context/CustomerExperienceContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { money } from '@/src/data/products';
import { colors } from '@/src/theme';

export default function PassesScreen() {
  const { currentRestaurant } = useRestaurant();
  const { isFeatureEnabled } = useFeaturePermission();
  const {
    passTemplates,
    customerPasses,
    buyPass,
    vipTier,
    currentStreakDays,
    getWalletPassPayload,
    loading,
  } = useCustomerExperience();

  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [walletAdded, setWalletAdded] = useState(false);

  const handleBuyPass = async (template: PrepaidPassTemplate) => {
    setBuyingId(template.id);
    try {
      await buyPass(template);
      if (Platform.OS === 'web') {
        alert(`🎉 ${template.name} activated! ${template.totalUnits + template.bonusUnits} credits added to your digital card.`);
      } else {
        Alert.alert('Pass Activated!', `${template.name} has been added to your account.`);
      }
    } catch (e: any) {
      alert(e.message || 'Could not purchase pass.');
    } finally {
      setBuyingId(null);
    }
  };

  const handleAddToWallet = (type: 'apple' | 'google') => {
    const payload = getWalletPassPayload(type);
    setWalletAdded(true);
    if (Platform.OS === 'web') {
      alert(`📲 Digital Pass generated for ${currentRestaurant.name}! Added to your mobile wallet.`);
    } else {
      Alert.alert('Pass Generated', `Your digital card is ready for ${type === 'apple' ? 'Apple Wallet' : 'Google Wallet'}.`);
    }
  };

  return (
    <Screen>
      <Header title="Prepaid Passes & Wallet" />

      {/* Unified Loyalty / Prepaid Passes Switcher */}
      <View style={s.tabBar}>
        <Pressable style={s.tabPill} onPress={() => router.push('/rewards')}>
          <Ionicons name="star-outline" size={14} color={colors.espresso} />
          <Text style={s.tabPillText}>← Stamp Card & Rewards</Text>
        </Pressable>
        <Pressable style={[s.tabPill, s.tabPillActive]}>
          <Ionicons name="ticket" size={14} color={colors.white} />
          <Text style={[s.tabPillText, s.tabPillTextActive]}>Prepaid Passes</Text>
        </Pressable>
      </View>

      {/* Restaurant Header */}
      <View style={s.banner}>
        <Ionicons name="storefront-outline" size={16} color={colors.caramel} />
        <Text style={s.bannerText}>
          Prepaid Passes for <Text style={s.bold}>{currentRestaurant.name}</Text>
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Active Passes Section */}
        <Text style={s.sectionTitle}>My Active Passes</Text>
        {customerPasses.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="ticket-outline" size={32} color={colors.caramel} />
            <Text style={s.emptyTitle}>No active passes</Text>
            <Text style={s.emptySub}>
              Prepay for your daily coffee or meals and save up to 25% with bonus credits.
            </Text>
          </Card>
        ) : (
          customerPasses.map((pass) => (
            <Card key={pass.id} style={s.activePassCard}>
              <View style={s.passHeader}>
                <View>
                  <Text style={s.passName}>{pass.passName}</Text>
                  <Text style={s.passExpiry}>
                    {pass.expiresAt ? `Valid until ${new Date(pass.expiresAt).toLocaleDateString()}` : 'No expiration'}
                  </Text>
                </View>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pass.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={s.unitsRow}>
                <View style={s.unitsBox}>
                  <Text style={s.unitsNumber}>{pass.unitsRemaining}</Text>
                  <Text style={s.unitsLabel}>Credits Left</Text>
                </View>
                <View style={s.unitsDivider} />
                <View style={s.unitsBox}>
                  <Text style={s.unitsNumber}>{pass.unitsTotal}</Text>
                  <Text style={s.unitsLabel}>Total Purchased</Text>
                </View>
              </View>
            </Card>
          ))
        )}

        {/* Digital Apple / Google Wallet Card */}
        <Text style={s.sectionTitle}>Digital Loyalty & Coffee Pass</Text>
        <Card style={s.walletCard}>
          <View style={s.walletHeader}>
            <View>
              <Text style={s.walletBrand}>{currentRestaurant.name.toUpperCase()}</Text>
              <Text style={s.walletTitle}>VIP Loyalty Pass</Text>
            </View>
            <View style={s.vipBadge}>
              <Text style={s.vipBadgeText}>{vipTier.toUpperCase()}</Text>
            </View>
          </View>

          <View style={s.walletMetrics}>
            <View>
              <Text style={s.walletMetricLabel}>CURRENT STREAK</Text>
              <Text style={s.walletMetricVal}>{currentStreakDays} Days 🔥</Text>
            </View>
            <View>
              <Text style={s.walletMetricLabel}>PASS CREDITS</Text>
              <Text style={s.walletMetricVal}>
                {customerPasses.reduce((sum, p) => sum + p.unitsRemaining, 0)} Left
              </Text>
            </View>
          </View>

          {isFeatureEnabled('digital_wallet_passes') && (
            <View style={s.walletActions}>
              <Pressable
                style={s.appleWalletBtn}
                onPress={() => handleAddToWallet('apple')}
              >
                <Ionicons name="logo-apple" size={18} color={colors.white} />
                <Text style={s.appleWalletText}>Add to Apple Wallet</Text>
              </Pressable>

              <Pressable
                style={s.googleWalletBtn}
                onPress={() => handleAddToWallet('google')}
              >
                <Ionicons name="card-outline" size={18} color={colors.espresso} />
                <Text style={s.googleWalletText}>Google Wallet</Text>
              </Pressable>
            </View>
          )}
        </Card>

        {/* Buy Passes Section */}
        <Text style={s.sectionTitle}>Available Pass Packages</Text>
        {passTemplates.map((template) => {
          const isBuying = buyingId === template.id;
          const totalDrinks = template.totalUnits + template.bonusUnits;
          const pricePerDrink = Math.round(template.priceCents / totalDrinks);

          return (
            <Card key={template.id} style={s.packageCard}>
              <View style={s.packageHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.packageName}>{template.name}</Text>
                  <Text style={s.packageDesc}>{template.description}</Text>
                </View>
                <Text style={s.packagePrice}>{money(template.priceCents)}</Text>
              </View>

              <View style={s.packageHighlights}>
                <View style={s.highlightItem}>
                  <Ionicons name="cafe-outline" size={15} color={colors.caramel} />
                  <Text style={s.highlightText}>{totalDrinks} Total Items</Text>
                </View>
                {template.bonusUnits > 0 && (
                  <View style={s.highlightItem}>
                    <Ionicons name="gift-outline" size={15} color={colors.green} />
                    <Text style={[s.highlightText, { color: colors.green }]}>
                      +{template.bonusUnits} Free Bonus
                    </Text>
                  </View>
                )}
                <View style={s.highlightItem}>
                  <Ionicons name="pricetag-outline" size={15} color={colors.muted} />
                  <Text style={s.highlightText}>Only {money(pricePerDrink)} / each</Text>
                </View>
              </View>

              <Button
                label={isBuying ? 'Activating…' : `Purchase Pass · ${money(template.priceCents)}`}
                disabled={isBuying}
                onPress={() => void handleBuyPass(template)}
              />
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  bannerText: {
    color: colors.ink,
    fontSize: 12,
  },
  bold: {
    fontWeight: '800',
    color: colors.espresso,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginVertical: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  activePassCard: {
    backgroundColor: colors.white,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.caramel,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  passName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  passExpiry: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.caramel,
  },
  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 12,
  },
  unitsBox: {
    flex: 1,
    alignItems: 'center',
  },
  unitsDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.line,
  },
  unitsNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.espresso,
  },
  unitsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 2,
  },
  walletCard: {
    backgroundColor: colors.espresso,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletBrand: {
    color: colors.caramel,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  walletTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  vipBadge: {
    backgroundColor: 'rgba(212, 163, 115, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.caramel,
  },
  vipBadgeText: {
    color: colors.caramel,
    fontWeight: '800',
    fontSize: 11,
  },
  walletMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  walletMetricLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  walletMetricVal: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },
  walletActions: {
    gap: 8,
  },
  appleWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  appleWalletText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  googleWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderRadius: 12,
  },
  googleWalletText: {
    color: colors.espresso,
    fontWeight: '700',
    fontSize: 13,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabPillActive: {
    backgroundColor: colors.espresso,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.espresso,
  },
  tabPillTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
  packageCard: {
    marginBottom: 12,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  packageDesc: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.espresso,
  },
  packageHighlights: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
});
