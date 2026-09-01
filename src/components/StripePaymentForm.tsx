import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/src/components/UI";
import { colors } from "@/src/theme";

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
function Inner({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      const result = await initPaymentSheet({
        merchantDisplayName: "Cafe Click & Collect",
        paymentIntentClientSecret: clientSecret,
        applePay: { merchantCountryCode: "NZ" },
        googlePay: { merchantCountryCode: "NZ", testEnv: true },
        returnURL: "cafeclickcollect://stripe-redirect",
      });
      if (result.error) setError(result.error.message);
      else setReady(true);
    })();
  }, [clientSecret, initPaymentSheet]);
  const pay = async () => {
    setBusy(true);
    const result = await presentPaymentSheet();
    if (result.error) {
      if (result.error.code === "Canceled") onCancel();
      else setError(result.error.message);
      setBusy(false);
    } else onSuccess();
  };
  return (
    <View style={{ marginTop: 16 }}>
      {!!error && (
        <Text style={{ color: colors.danger, marginBottom: 10 }}>{error}</Text>
      )}
      <Button
        label={busy ? "Processing…" : "Open secure payment"}
        disabled={!ready || busy}
        onPress={() => void pay()}
      />
      <View style={{ height: 8 }} />
      <Button
        secondary
        label="Cancel payment"
        disabled={busy}
        onPress={onCancel}
      />
    </View>
  );
}
export function StripePaymentForm(props: {
  clientSecret: string;
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.cafeclickcollect"
      urlScheme="cafeclickcollect"
    >
      <Inner {...props} />
    </StripeProvider>
  );
}
