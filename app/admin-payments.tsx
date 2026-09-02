import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Header, Screen } from "@/src/components/UI";
import { usePaymentSettings } from "@/src/context/PaymentSettingsContext";
import { useRestaurant } from "@/src/context/RestaurantContext";
import { colors } from "@/src/theme";

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export default function AdminPayments() {
  const { currentRestaurant } = useRestaurant();
  const settings = usePaymentSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = async (
    values: Parameters<typeof settings.updateSettings>[0],
  ) => {
    setBusy(true);
    setMessage("");
    try {
      await settings.updateSettings(values);
      setMessage("Payment settings saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save settings",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Payment Configuration"
        right={
          <Pressable onPress={() => router.replace("/admin")}>
            <Ionicons name="grid-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Payment configuration for <Text style={styles.bold}>{currentRestaurant.name}</Text>
        </Text>
      </View>

      <Card style={styles.guidanceCard}>
        <View style={styles.guidanceHeader}>
          <Ionicons name="information-circle" size={22} color={colors.caramel} />
          <Text style={styles.guidanceTitle}>Streamlined Payment Management</Text>
        </View>
        <Text style={styles.guidanceBody}>
          Payment settings have been organized into two dedicated areas for clarity:
        </Text>

        <Pressable
          style={styles.navActionCard}
          onPress={() => router.push("/admin-features")}
        >
          <View style={styles.navIconWrap}>
            <Ionicons name="options-outline" size={20} color={colors.espresso} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.navTitle}>Feature Settings</Text>
            <Text style={styles.navSub}>
              Enable or disable Card payments, Pay at Counter, and ordering methods.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>

        <Pressable
          style={styles.navActionCard}
          onPress={() => router.push("/admin-payouts")}
        >
          <View style={styles.navIconWrap}>
            <Ionicons name="wallet-outline" size={20} color={colors.espresso} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.navTitle}>Payouts & Settlement Ledger</Text>
            <Text style={styles.navSub}>
              View Stripe Connect payout status, platform fees, gross vs net ledger, and process refunds.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      </Card>

      <Pressable
        style={styles.toggleAdvancedBtn}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <Text style={styles.toggleAdvancedText}>
          {showAdvanced ? "▲ Hide Direct Overrides" : "▼ Show Direct Payment Toggles"}
        </Text>
      </Pressable>

      {showAdvanced && (
        <Card style={{ marginTop: 10 }}>
          <Text style={styles.title}>Direct Channel Overrides</Text>
          <Text style={styles.help}>
            Legacy toggles for {currentRestaurant.name}.
          </Text>
          <Toggle
            label="Card payment"
            value={settings.cardEnabled}
            disabled={busy}
            onChange={(value) => void update({ cardEnabled: value })}
          />
          <Toggle
            label="Apple Pay where supported"
            value={settings.applePayEnabled}
            disabled={busy}
            onChange={(value) => void update({ applePayEnabled: value })}
          />
          <Toggle
            label="Google Pay where supported"
            value={settings.googlePayEnabled}
            disabled={busy}
            onChange={(value) => void update({ googlePayEnabled: value })}
          />
          <Toggle
            label="Pay at Counter / Pickup"
            value={settings.payAtCounterEnabled}
            disabled={busy}
            onChange={(value) => void update({ payAtCounterEnabled: value })}
          />
        </Card>
      )}

      {!!message && <Text style={styles.message}>{message}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.cream,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  bannerText: {
    color: colors.ink,
    fontSize: 13,
  },
  bold: {
    fontWeight: '800',
    color: colors.espresso,
  },
  guidanceCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.espresso,
  },
  guidanceBody: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  navActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.espresso,
  },
  navSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  toggleAdvancedBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  toggleAdvancedText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  title: { fontSize: 16, fontWeight: "800", color: colors.ink },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: colors.line,
    marginTop: 8,
    paddingTop: 8,
  },
  label: { fontWeight: "700", color: colors.ink, fontSize: 13 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line,
    padding: 3,
  },
  toggleOn: { backgroundColor: colors.green },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  knobOn: { marginLeft: 20 },
  message: {
    color: colors.coffee,
    textAlign: "center",
    marginTop: 14,
    fontWeight: "700",
  },
});
