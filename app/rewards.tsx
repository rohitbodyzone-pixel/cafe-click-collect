import React, { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useFeaturePermission } from '@/src/context/FeaturePermissionContext';
import { money } from '@/src/data/products';
import { colors } from '@/src/theme';
import { createOrUpdateWalletPass, downloadApplePass, openGoogleWallet } from '@/src/services/wallet/walletManager';

export default function RewardsScreen() {
  const { currentRestaurant } = useRestaurant();
  const { balance, settings, promos } = useLoyalty();
  const { isFeatureEnabled } = useFeaturePermission();
  const [walletBusy, setWalletBusy] = useState(false);

  const active = promos.filter(
    (p) => p.enabled && (!p.expiresAt || new Date(p.expiresAt) >= new Date()),
  );
  const progress = Math.min(100, (balance.coffeeStamps / settings.coffeeGoal) * 100);

  const handleAppleWallet = async () => {
    setWalletBusy(true);
    try {
      const pass = await createOrUpdateWalletPass({
        restaurantId: currentRestaurant.id,
        restaurantName: currentRestaurant.name,
        customerKey: 'anon_guest',
        customerName: 'Loyal Guest',
        passType: 'loyalty_card',
        balanceUnits: balance.freeCoffees,
        points: balance.points,
        tier: 'Gold VIP',
      });
      downloadApplePass(pass, currentRestaurant.name);
    } catch (e: any) {
      alert(e.message || 'Could not generate Apple Wallet pass');
    } finally {
      setWalletBusy(false);
    }
  };

  const handleGoogleWallet = async () => {
    setWalletBusy(true);
    try {
      const pass = await createOrUpdateWalletPass({
        restaurantId: currentRestaurant.id,
        restaurantName: currentRestaurant.name,
        customerKey: 'anon_guest',
        customerName: 'Loyal Guest',
        passType: 'loyalty_card',
        balanceUnits: balance.freeCoffees,
        points: balance.points,
        tier: 'Gold VIP',
      });
      openGoogleWallet(pass, currentRestaurant.name);
    } catch (e: any) {
      alert(e.message || 'Could not generate Google Wallet pass');
    } finally {
      setWalletBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Rewards & Loyalty" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Loyalty Hero Balance */}
        <View style={s.hero}>
          <Text style={s.eyebrow}>YOUR LOYALTY BALANCE</Text>
          <Text style={s.points}>{balance.points} points</Text>
          <Text style={s.help}>
            {settings.pointsPerDollar} point{settings.pointsPerDollar === 1 ? '' : 's'} for every $1 spent at {currentRestaurant.name}
          </Text>
        </View>

        {/* Digital Stamp Card */}
        <Card style={s.rewardCard}>
          <View style={s.rewardTop}>
            <View style={s.icon}>
              <Ionicons name="cafe" size={23} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Buy {settings.coffeeGoal}, get 1 free</Text>
              <Text style={s.muted}>
                {balance.coffeeStamps} of {settings.coffeeGoal} coffee stamps
              </Text>
            </View>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.progress}>
            {balance.freeCoffees > 0
              ? `🎉 ${balance.freeCoffees} free coffee reward${balance.freeCoffees === 1 ? ' is' : 's are'} available now.`
              : `Only ${Math.max(0, settings.coffeeGoal - balance.coffeeStamps)} more coffee${settings.coffeeGoal - balance.coffeeStamps === 1 ? '' : 's'} until your next free one.`}
          </Text>
          {balance.freeCoffees > 0 && (
            <Text style={s.applyHelp}>
              Add a coffee to your cart, then tap “Use reward” in cart or checkout.
            </Text>
          )}
        </Card>

        {/* Apple & Google Wallet Integration */}
        {isFeatureEnabled('digital_wallet_passes') && (
          <Card style={s.walletCard}>
            <Text style={s.walletCardTitle}>DIGITAL WALLET PASSES</Text>
            <Text style={s.walletCardSub}>
              Save your stamp card to your phone for instant lock-screen access and 1-tap counter scanning.
            </Text>
            <View style={s.walletBtnRow}>
              <Pressable style={s.appleWalletBtn} onPress={handleAppleWallet} disabled={walletBusy}>
                <Ionicons name="logo-apple" size={16} color={colors.white} />
                <Text style={s.appleWalletText}>Add to Apple Wallet</Text>
              </Pressable>
              <Pressable style={s.googleWalletBtn} onPress={handleGoogleWallet} disabled={walletBusy}>
                <Ionicons name="logo-google" size={16} color={colors.white} />
                <Text style={s.googleWalletText}>Save to Google Pay</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Current Promotional Offers */}
        <View style={s.headingRow}>
          <Text style={s.heading}>Current Offers</Text>
          <Ionicons name="pricetags-outline" size={20} color={colors.caramel} />
        </View>

        {active.length ? (
          active.map((promo) => (
            <Card key={promo.id} style={s.offer}>
              <View style={s.offerBadge}>
                <Text style={s.code}>{promo.code}</Text>
              </View>
              <Text style={s.offerTitle}>{promo.description || 'Cafe promotion'}</Text>
              <Text style={s.offerText}>
                {promo.discountType === 'percent'
                  ? `${promo.discountValue}% off`
                  : `${money(promo.discountValue)} off`}
                {promo.minimumSpend ? ` · Minimum spend ${money(promo.minimumSpend)}` : ''}
              </Text>
              {promo.expiresAt && (
                <Text style={s.expiry}>
                  Expires {new Date(promo.expiresAt).toLocaleDateString()}
                </Text>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <Text style={s.muted}>
              No promo codes are active right now. Your loyalty rewards are still earning.
            </Text>
          </Card>
        )}

        <View style={{ height: 16 }} />
        <Button label="Browse the menu" icon="cafe-outline" onPress={() => router.replace('/')} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60 },
  hero: { backgroundColor: '#335943', borderRadius: 23, padding: 20, marginBottom: 14 },
  eyebrow: { color: '#BDD2C1', fontWeight: '800', letterSpacing: 1.2, fontSize: 10 },
  points: { color: colors.white, fontSize: 34, fontWeight: '900', marginTop: 6 },
  help: { color: '#D7E5DA', marginTop: 4, fontSize: 12 },
  rewardCard: { marginBottom: 14 },
  rewardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '900', color: colors.ink, fontSize: 17 },
  muted: { color: colors.muted, marginTop: 4, lineHeight: 19 },
  track: { height: 10, backgroundColor: '#DDE8DF', borderRadius: 6, overflow: 'hidden', marginTop: 15 },
  fill: { height: '100%', backgroundColor: colors.green, borderRadius: 6 },
  progress: { color: colors.green, fontWeight: '800', marginTop: 10 },
  applyHelp: { color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 16 },
  walletCard: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 16 },
  walletCardTitle: { fontSize: 11, fontWeight: '900', color: colors.caramel, letterSpacing: 0.8 },
  walletCardSub: { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 12, lineHeight: 16 },
  walletBtnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  appleWalletBtn: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#000000',
    paddingVertical: 10,
    borderRadius: 10,
  },
  appleWalletText: { color: colors.white, fontWeight: '800', fontSize: 11 },
  googleWalletBtn: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1F1F1F',
    paddingVertical: 10,
    borderRadius: 10,
  },
  googleWalletText: { color: colors.white, fontWeight: '800', fontSize: 11 },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heading: { fontSize: 18, fontWeight: '900', color: colors.ink },
  offer: { marginBottom: 10 },
  offerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.espresso,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  code: { color: colors.white, fontWeight: '900', letterSpacing: 1 },
  offerTitle: { fontWeight: '800', color: colors.ink, fontSize: 16, marginTop: 10 },
  offerText: { color: colors.green, fontWeight: '800', marginTop: 5 },
  expiry: { color: colors.muted, fontSize: 11, marginTop: 5 },
});
