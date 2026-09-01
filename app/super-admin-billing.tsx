import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { usePlatformEconomics } from '@/src/context/PlatformEconomicsContext';
import { colors } from '@/src/theme';

export default function SuperAdminBillingScreen() {
  const {
    platformEconomics,
    tenantFeeStructures,
    updateFeeStructure,
    refresh,
  } = usePlatformEconomics();

  const [selectedRestId, setSelectedRestId] = useState<string | null>(null);
  const [feePct, setFeePct] = useState('2.5');
  const [fixedCents, setFixedCents] = useState('30');
  const [busyAction, setBusyAction] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const handleUpdateFee = async (restaurantId: string, name: string) => {
    const pct = parseFloat(feePct);
    const fixed = parseInt(fixedCents, 10);
    if (isNaN(pct) || isNaN(fixed) || pct < 0 || fixed < 0) {
      alert('Please enter valid numeric fee rates.');
      return;
    }

    setBusyAction(true);
    try {
      await updateFeeStructure(restaurantId, pct, fixed);
      setActionMessage(`✓ Updated fee structure for ${name}: ${pct}% + ${fixed}¢`);
      setSelectedRestId(null);
    } catch (e: any) {
      alert(e.message || 'Could not update fee structure.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Platform Billing & Payouts"
        right={
          <Pressable style={s.adminBtn} onPress={() => router.replace('/super-admin')}>
            <Ionicons name="shield-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>
        {/* Safety Gate Banner */}
        <View style={s.safetyBanner}>
          <Ionicons name="lock-closed" size={18} color={colors.espresso} />
          <View style={{ flex: 1 }}>
            <Text style={s.safetyTitle}>SUPER ADMIN BILLING CONTROL · STRICT TEST MODE</Text>
            <Text style={s.safetySub}>All transactions and payouts are processed in simulated sandbox test mode.</Text>
          </View>
        </View>

        {/* Platform Economics KPI Cards */}
        {platformEconomics && (
          <View style={s.kpiGrid}>
            <Card style={s.kpiCard}>
              <Text style={s.kpiLabel}>Platform GMV</Text>
              <Text style={s.kpiValue}>${platformEconomics.platformGmvDollars.toFixed(2)}</Text>
              <Text style={s.kpiSub}>Total Gross Sales Volume</Text>
            </Card>
            <Card style={[s.kpiCard, s.kpiCardRevenue]}>
              <Text style={[s.kpiLabel, { color: colors.caramel }]}>Platform Revenue</Text>
              <Text style={[s.kpiValue, { color: colors.white }]}>
                ${platformEconomics.platformRevenueDollars.toFixed(2)}
              </Text>
              <Text style={[s.kpiSub, { color: 'rgba(255,255,255,0.8)' }]}>Application fees earned</Text>
            </Card>
            <Card style={s.kpiCard}>
              <Text style={s.kpiLabel}>Net Payouts</Text>
              <Text style={s.kpiValue}>${platformEconomics.netRestaurantPayoutsDollars.toFixed(2)}</Text>
              <Text style={s.kpiSub}>Disbursed to restaurants</Text>
            </Card>
          </View>
        )}

        {!!actionMessage && (
          <View style={s.messageBanner}>
            <Text style={s.messageText}>{actionMessage}</Text>
          </View>
        )}

        {/* Tenant Fee Structure & Connect Onboarding */}
        <Text style={s.sectionTitle}>Connected Restaurants & Fee Config ({tenantFeeStructures.length})</Text>
        <Text style={s.sectionHelp}>
          Configure custom application fee percentages and fixed charges per tenant.
        </Text>

        {tenantFeeStructures.map((tenant) => (
          <Card key={tenant.restaurantId} style={s.tenantCard}>
            <View style={s.tenantHeader}>
              <View>
                <Text style={s.tenantName}>{tenant.restaurantName}</Text>
                <Text style={s.tenantAccount}>
                  Stripe: {tenant.stripeAccountId || 'acct_unlinked'} · Status: {tenant.connectStatus.toUpperCase()}
                </Text>
              </View>
              <View style={s.feeBadge}>
                <Text style={s.feeBadgeText}>
                  {tenant.platformFeePercentage}% + {tenant.platformFeeFixedCents}¢
                </Text>
              </View>
            </View>

            {selectedRestId === tenant.restaurantId ? (
              <View style={s.editFeeBox}>
                <Text style={s.editFeeTitle}>Adjust Platform Application Fee:</Text>
                <View style={s.feeInputsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inputLabel}>Fee % (0-20%)</Text>
                    <TextInput
                      style={s.input}
                      value={feePct}
                      onChangeText={setFeePct}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inputLabel}>Fixed Fee (cents)</Text>
                    <TextInput
                      style={s.input}
                      value={fixedCents}
                      onChangeText={setFixedCents}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View style={s.btnRow}>
                  <Button
                    label={busyAction ? 'Saving…' : 'Save Fee Rate'}
                    disabled={busyAction}
                    onPress={() => void handleUpdateFee(tenant.restaurantId, tenant.restaurantName)}
                  />
                  <Pressable style={s.cancelBtn} onPress={() => setSelectedRestId(null)}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={s.actionRow}>
                <Pressable
                  style={s.editBtn}
                  onPress={() => {
                    setSelectedRestId(tenant.restaurantId);
                    setFeePct(String(tenant.platformFeePercentage));
                    setFixedCents(String(tenant.platformFeeFixedCents));
                  }}
                >
                  <Ionicons name="create-outline" size={14} color={colors.espresso} />
                  <Text style={s.editBtnText}>Edit Fee Structure</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  adminBtn: { padding: 8 },
  container: { paddingBottom: 40 },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  safetyTitle: { fontSize: 11, fontWeight: '800', color: colors.espresso, letterSpacing: 0.5 },
  safetySub: { fontSize: 10, color: colors.muted, marginTop: 1 },
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard: { flex: 1, padding: 10 },
  kpiCardRevenue: { backgroundColor: colors.espresso },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: colors.caramel, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '900', color: colors.espresso, marginVertical: 4 },
  kpiSub: { fontSize: 9, color: colors.muted },
  messageBanner: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#CEEAD6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  messageText: { color: colors.green, fontWeight: '800', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  sectionHelp: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 12, lineHeight: 16 },
  tenantCard: { marginBottom: 12 },
  tenantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  tenantName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  tenantAccount: { fontSize: 10, color: colors.muted, marginTop: 2 },
  feeBadge: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  feeBadgeText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  actionRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, marginTop: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.espresso },
  editFeeBox: { backgroundColor: colors.cream, borderRadius: 8, padding: 10, marginTop: 8 },
  editFeeTitle: { fontSize: 12, fontWeight: '800', color: colors.espresso, marginBottom: 6 },
  feeInputsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 2 },
  input: { backgroundColor: colors.white, borderRadius: 8, padding: 8, fontSize: 13, color: colors.ink },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: colors.muted },
});
