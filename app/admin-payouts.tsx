import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { usePlatformEconomics } from '@/src/context/PlatformEconomicsContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors } from '@/src/theme';

export default function AdminPayoutsScreen() {
  const { currentRestaurant } = useRestaurant();
  const {
    ledgerEntries,
    totalGrossDollars,
    totalPlatformFeeDollars,
    totalNetPayoutDollars,
    connectStatus,
    stripeAccountId,
    feePercentage,
    feeFixedCents,
    refundOrder,
  } = usePlatformEconomics();

  const [refundOrderId, setRefundOrderId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('Customer Request');
  const [busyAction, setBusyAction] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const handleRefund = async () => {
    if (!refundOrderId.trim() || !refundAmount.trim()) {
      alert('Please provide Order ID and Refund Amount.');
      return;
    }
    const cents = Math.round(parseFloat(refundAmount) * 100);
    if (isNaN(cents) || cents <= 0) {
      alert('Invalid refund amount.');
      return;
    }

    setBusyAction(true);
    try {
      await refundOrder(refundOrderId.trim(), cents, refundReason);
      setActionMessage(`✓ Successfully processed $${(cents / 100).toFixed(2)} refund for order ${refundOrderId}!`);
      setRefundOrderId('');
      setRefundAmount('');
    } catch (e: any) {
      alert(e.message || 'Could not process refund.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Payouts & Settlement Ledger"
        right={
          <Pressable style={s.adminBtn} onPress={() => router.replace('/admin')}>
            <Ionicons name="grid-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>
        {/* Safety Gate Banner */}
        <View style={s.safetyBanner}>
          <Ionicons name="shield-checkmark" size={18} color={colors.green} />
          <View style={{ flex: 1 }}>
            <Text style={s.safetyTitle}>STRICT TEST MODE ACTIVE · ZERO REAL CHARGES</Text>
            <Text style={s.safetySub}>Connected Account: {stripeAccountId || 'acct_test_mode'} · Live Payments Locked</Text>
          </View>
        </View>

        {/* Financial Summary Cards */}
        <View style={s.summaryGrid}>
          <Card style={s.summaryCard}>
            <Text style={s.summaryLabel}>Gross Sales (Card)</Text>
            <Text style={s.summaryValue}>${totalGrossDollars.toFixed(2)}</Text>
            <Text style={s.summarySub}>Total payments collected</Text>
          </Card>
          <Card style={s.summaryCard}>
            <Text style={s.summaryLabel}>Platform App Fee</Text>
            <Text style={s.summaryValue}>${totalPlatformFeeDollars.toFixed(2)}</Text>
            <Text style={s.summarySub}>({feePercentage}% + {feeFixedCents}¢ rate)</Text>
          </Card>
          <Card style={[s.summaryCard, s.summaryCardHighlight]}>
            <Text style={[s.summaryLabel, { color: colors.white }]}>Net Payout Balance</Text>
            <Text style={[s.summaryValue, { color: colors.white }]}>${totalNetPayoutDollars.toFixed(2)}</Text>
            <Text style={[s.summarySub, { color: 'rgba(255,255,255,0.8)' }]}>Direct deposit to bank</Text>
          </Card>
        </View>

        {!!actionMessage && (
          <View style={s.messageBanner}>
            <Text style={s.messageText}>{actionMessage}</Text>
          </View>
        )}

        {/* Process Refund Section */}
        <Card style={s.refundCard}>
          <Text style={s.sectionTitle}>Process Order Refund</Text>
          <Text style={s.sectionHelp}>
            Issue full or partial refunds directly back to customer card. Idempotent server-side execution.
          </Text>

          <View style={s.refundRow}>
            <TextInput
              style={[s.input, { flex: 2 }]}
              placeholder="Order ID (e.g. ORD-10293)"
              placeholderTextColor={colors.muted}
              value={refundOrderId}
              onChangeText={setRefundOrderId}
            />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Amount ($)"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={refundAmount}
              onChangeText={setRefundAmount}
            />
          </View>

          <TextInput
            style={s.input}
            placeholder="Reason (e.g. Customer changed mind, accidental double order)"
            placeholderTextColor={colors.muted}
            value={refundReason}
            onChangeText={setRefundReason}
          />

          <Button
            label={busyAction ? 'Processing…' : 'Issue Server Refund'}
            disabled={busyAction}
            onPress={handleRefund}
          />
        </Card>

        {/* Financial Settlement Ledger */}
        <Text style={[s.sectionTitle, { marginTop: 14 }]}>Auditable Financial Ledger ({ledgerEntries.length})</Text>
        <Text style={s.sectionHelp}>Double-entry transaction records with transparent fee breakdown.</Text>

        {ledgerEntries.map((entry) => (
          <Card key={entry.id} style={s.ledgerCard}>
            <View style={s.ledgerHeader}>
              <View>
                <Text style={s.ledgerType}>{entry.transactionType.toUpperCase()} · {entry.orderId || 'Direct'}</Text>
                <Text style={s.ledgerDate}>{new Date(entry.createdAt).toLocaleString()}</Text>
              </View>
              <View style={[s.payoutBadge, entry.payoutStatus === 'paid' && s.payoutBadgePaid]}>
                <Text style={s.payoutBadgeText}>{entry.payoutStatus.toUpperCase()}</Text>
              </View>
            </View>

            <View style={s.ledgerBreakdown}>
              <View style={s.breakdownCol}>
                <Text style={s.breakdownLabel}>Gross</Text>
                <Text style={s.breakdownVal}>${entry.grossAmountDollars.toFixed(2)}</Text>
              </View>
              <View style={s.breakdownCol}>
                <Text style={s.breakdownLabel}>Platform Fee</Text>
                <Text style={s.breakdownVal}>-${entry.platformFeeDollars.toFixed(2)}</Text>
              </View>
              <View style={s.breakdownCol}>
                <Text style={s.breakdownLabel}>Stripe Fee</Text>
                <Text style={s.breakdownVal}>-${entry.stripeFeeDollars.toFixed(2)}</Text>
              </View>
              <View style={s.breakdownCol}>
                <Text style={s.breakdownLabel}>Net Payout</Text>
                <Text style={[s.breakdownVal, { color: colors.green, fontWeight: '900' }]}>
                  ${entry.netRestaurantAmountDollars.toFixed(2)}
                </Text>
              </View>
            </View>
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
    backgroundColor: '#E6F4EA',
    borderColor: '#CEEAD6',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  safetyTitle: { fontSize: 11, fontWeight: '800', color: colors.green, letterSpacing: 0.5 },
  safetySub: { fontSize: 10, color: colors.muted, marginTop: 1 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 10 },
  summaryCardHighlight: { backgroundColor: colors.espresso },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: colors.caramel, textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: colors.espresso, marginVertical: 4 },
  summarySub: { fontSize: 9, color: colors.muted },
  messageBanner: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#CEEAD6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  messageText: { color: colors.green, fontWeight: '800', fontSize: 13 },
  refundCard: { marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  sectionHelp: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 10, lineHeight: 16 },
  refundRow: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: colors.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 10,
  },
  ledgerCard: { marginBottom: 10 },
  ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  ledgerType: { fontSize: 14, fontWeight: '800', color: colors.ink },
  ledgerDate: { fontSize: 10, color: colors.muted, marginTop: 2 },
  payoutBadge: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  payoutBadgePaid: { backgroundColor: '#E6F4EA' },
  payoutBadgeText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  ledgerBreakdown: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  breakdownCol: { flex: 1, alignItems: 'center' },
  breakdownLabel: { fontSize: 9, color: colors.muted, fontWeight: '700', marginBottom: 2 },
  breakdownVal: { fontSize: 12, fontWeight: '800', color: colors.ink },
});
