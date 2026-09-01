import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/src/components/UI";
import { colors } from "@/src/theme";

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey.startsWith("pk_test_")
  ? loadStripe(publishableKey)
  : null;

function Inner({
  orderId,
  onSuccess,
  onCancel,
}: {
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/order-status?id=${orderId}`,
      },
    });
    if (result.error) {
      setError(result.error.message ?? "Payment failed.");
      setBusy(false);
      return;
    }
    if (
      result.paymentIntent?.status === "succeeded" ||
      result.paymentIntent?.status === "processing"
    )
      onSuccess();
    else {
      setError("Payment was not completed.");
      setBusy(false);
    }
  };
  return (
    <View style={styles.wrap}>
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.gap} />
      <Button
        label={busy ? "Processing…" : "Pay securely"}
        disabled={busy || !stripe || !elements}
        onPress={() => void pay()}
      />
      <View style={styles.smallGap} />
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
  const options = useMemo(
    () => ({
      clientSecret: props.clientSecret,
      appearance: {
        theme: "stripe" as const,
        variables: { colorPrimary: "#4A2C20", borderRadius: "12px" },
      },
    }),
    [props.clientSecret],
  );
  if (!stripePromise)
    return (
      <Text style={styles.error}>
        Stripe Test publishable key is not configured.
      </Text>
    );
  return (
    <Elements stripe={stripePromise} options={options}>
      <Inner {...props} />
    </Elements>
  );
}
const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  gap: { height: 16 },
  smallGap: { height: 8 },
  error: { color: colors.danger, marginTop: 12 },
});
