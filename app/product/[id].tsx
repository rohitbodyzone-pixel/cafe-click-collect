import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { Button, Header, Screen, triggerHaptic } from "@/src/components/UI";
import { money } from "@/src/data/products";
import { useOrders } from "@/src/context/OrderContext";
import { useProducts } from "@/src/context/ProductContext";
import {
  SelectedCustomisation,
  useCustomisations,
} from "@/src/context/CustomisationContext";
import { colors, radii, shadows } from "@/src/theme";
import { ProductImage } from "@/src/components/ProductImage";
export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products } = useProducts();
  const { groups } = useCustomisations();
  const product = products.find((item) => item.id === id);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const { addToCart } = useOrders();
  const applied = groups.filter((group) =>
    product?.customisationGroupIds.includes(group.id),
  );
  useEffect(() => {
    if (!product || !groups.length) return;
    setSelected((current) => {
      const next = { ...current };
      groups
        .filter((group) => product.customisationGroupIds.includes(group.id))
        .forEach((group) => {
          const availableIds = new Set(
            group.options.filter((option) => option.available).map((option) => option.id),
          );
          next[group.id] = (next[group.id] ?? []).filter((optionId) =>
            availableIds.has(optionId),
          );
          if (group.kind !== "extras" && !next[group.id]?.length) {
            const first = group.options.find((option) => option.available);
            if (first) next[group.id] = [first.id];
          }
        });
      return next;
    });
  }, [product, groups]);
  const choices = useMemo(
    () =>
      applied
        .flatMap(
          (group) =>
            (selected[group.id] ?? [])
              .map((id) => {
                const option = group.options.find((item) => item.id === id);
                return option?.available
                  ? {
                      groupId: group.id,
                      groupName: group.name,
                      optionId: option.id,
                      optionName: option.name,
                      price: option.price,
                    }
                  : undefined;
              })
              .filter(Boolean) as SelectedCustomisation[],
        )
        .filter(
          (choice) =>
            !(
              groups.find((g) => g.id === choice.groupId)?.kind ===
                "sugar_type" &&
              applied
                .find((g) => g.kind === "sugar_quantity")
                ?.options.find(
                  (o) =>
                    o.id ===
                    (selected[
                      applied.find((g) => g.kind === "sugar_quantity")!.id
                    ] ?? [])[0],
                )?.name === "No sugar"
            ),
        ),
    [selected, applied, groups],
  );
  const unitPrice =
    (product?.price ?? 0) + choices.reduce((sum, item) => sum + item.price, 0);
  if (!product)
    return (
      <Screen>
        <Header title="Product" />
        <Text>Product not found.</Text>
      </Screen>
    );
  const toggle = (groupId: string, optionId: string, multiple: boolean) => {
    triggerHaptic('light');
    setSelected((current) => ({
      ...current,
      [groupId]: multiple
        ? (current[groupId] ?? []).includes(optionId)
          ? (current[groupId] ?? []).filter((id) => id !== optionId)
          : [...(current[groupId] ?? []), optionId]
        : [optionId],
    }));
  };
  return (
    <Screen>
      <Header title="Product details" />
      <ProductImage
        uri={product.imageUrl}
        category={product.category}
        name={product.name}
        style={styles.visual}
        placeholderStyle={styles.visual}
        iconSize={48}
      />
      <Text style={styles.category}>{product.category}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.price}>{money(product.price)}</Text>
      </View>
      <Text style={styles.description}>{product.description}</Text>
      {applied.map((group) => {
        const isOptional = group.kind === "extras";
        return (
          <View key={group.id} style={styles.groupContainer}>
            <View style={styles.groupHeaderRow}>
              <Text style={styles.label}>{group.name}</Text>
              <View style={[styles.reqBadge, isOptional ? styles.optBadge : styles.reqBadgeActive]}>
                <Text style={[styles.reqBadgeText, isOptional ? styles.optBadgeText : styles.reqBadgeTextActive]}>
                  {isOptional ? "Optional" : "Required"}
                </Text>
              </View>
            </View>
            <View style={styles.options}>
            {group.options.map((option) => {
              const active = (selected[group.id] ?? []).includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  disabled={!option.available}
                  onPress={() =>
                    toggle(group.id, option.id, group.kind === "extras")
                  }
                  style={[
                    styles.option,
                    active && styles.optionActive,
                    !option.available && styles.unavailable,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {option.name}
                    {option.price ? ` +${money(option.price)}` : ""}
                    {!option.available ? " · Sold out" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    })}
      <Text style={styles.label}>Quantity</Text>
      <View style={styles.stepper}>
        <Pressable
          style={styles.step}
          onPress={() => {
            triggerHaptic('light');
            setQuantity(Math.max(1, quantity - 1));
          }}
          accessibilityLabel="Decrease quantity"
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.quantity}>{quantity}</Text>
        <Pressable
          style={styles.step}
          onPress={() => {
            triggerHaptic('light');
            setQuantity(quantity + 1);
          }}
          accessibilityLabel="Increase quantity"
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>Special instructions</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. extra hot"
        placeholderTextColor={colors.muted}
        style={styles.input}
        multiline
      />
      <View style={{ flex: 1, minHeight: 28 }} />
      <Button
        disabled={product.soldOut}
        label={
          product.soldOut
            ? "Currently sold out"
            : `Add to cart · ${money(unitPrice * quantity)}`
        }
        icon="bag-add-outline"
        onPress={() => {
          triggerHaptic('success');
          addToCart(product, quantity, notes.trim(), choices);
          router.push("/cart");
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  visual: {
    height: 200,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  category: {
    color: colors.caramel,
    fontWeight: "800",
    letterSpacing: 1.4,
    fontSize: 11,
    textTransform: "uppercase",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },
  title: { flex: 1, color: colors.espresso, fontSize: 26, fontWeight: "900", letterSpacing: -0.4 },
  price: { color: colors.espresso, fontSize: 24, fontWeight: "900" },
  description: { color: colors.muted, lineHeight: 22, fontSize: 14, marginBottom: 14 },
  groupContainer: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    color: colors.espresso,
    fontSize: 15,
    fontWeight: "800",
  },
  reqBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.cream,
  },
  reqBadgeActive: {
    backgroundColor: colors.amberSoft,
  },
  optBadge: {
    backgroundColor: colors.creamSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  reqBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.espresso,
  },
  reqBadgeTextActive: {
    color: colors.amberDark,
    fontWeight: "900",
  },
  optBadgeText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    ...shadows.sm,
  },
  optionActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
    ...shadows.md,
  },
  optionText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  optionTextActive: { color: colors.white, fontWeight: "800" },
  unavailable: { opacity: 0.4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 20 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  stepText: { fontSize: 22, color: colors.espresso, fontWeight: "800" },
  quantity: { fontSize: 19, fontWeight: "900", color: colors.espresso },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    minHeight: 84,
    padding: 14,
    color: colors.ink,
    fontSize: 14,
    textAlignVertical: "top",
    ...shadows.sm,
  },
});
