import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Header, Screen } from "@/src/components/UI";
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
      <Header title="Payment Settings" />

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Payment configuration for <Text style={styles.bold}>{currentRestaurant.name}</Text>
        </Text>
      </View>

      <Card>
        <Text style={styles.title}>Accepted payment methods</Text>
        <Text style={styles.help}>
          Control which payment channels customers can use when ordering from {currentRestaurant.name}.
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
      <Card style={styles.warning}>
        <Text style={styles.label}>Refund safety</Text>
        <Text style={styles.help}>
          Refund records are prepared, but refund actions stay disabled while
          Sandbox mode is active.
        </Text>
      </Card>
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
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: colors.line,
    marginTop: 10,
    paddingTop: 10,
  },
  label: { fontWeight: "700", color: colors.ink },
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
  warning: { marginTop: 14 },
  message: {
    color: colors.coffee,
    textAlign: "center",
    marginTop: 14,
    fontWeight: "700",
  },
});
