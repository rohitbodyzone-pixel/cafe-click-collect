import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Screen, Header, Card, Button } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { useProducts } from '@/src/context/ProductContext';
import { useOrders } from '@/src/context/OrderContext';
import {
  useCustomisations,
  SelectedCustomisation,
  CustomisationGroup,
} from '@/src/context/CustomisationContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { money, Product } from '@/src/data/products';

export default function CounterPortalScreen() {
  return (
    <RoleGate
      allowedRoles={['counter', 'manager', 'owner', 'super_admin']}
      roleTitle="Cashier / Counter Portal"
    >
      <CounterPortalContent />
    </RoleGate>
  );
}

interface ActiveAttendance {
  id: string;
  staff_id: string;
  staff_name: string;
  clock_in_at: string;
  minutes_elapsed: number;
}

interface CounterCartItem {
  cartKey: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  customisations: SelectedCustomisation[];
  notes?: string;
}

function CounterPortalContent() {
  const auth = useAdminAuth();
  const { currentRestaurant } = useRestaurant();
  const { products } = useProducts();
  const { groups } = useCustomisations();
  const { orders } = useOrders();

  // Attendance state
  const [activeSession, setActiveSession] = useState<ActiveAttendance | null>(null);
  const [allActiveStaff, setAllActiveStaff] = useState<ActiveAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [clockingBusy, setClockingBusy] = useState(false);

  // Counter POS Cart state
  const [posCart, setPosCart] = useState<CounterCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'eftpos'>('eftpos');
  const [orderingBusy, setOrderingBusy] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState('');

  // Customization Modal State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [itemNotes, setItemNotes] = useState('');
  const [itemQty, setItemQty] = useState(1);

  const loadAttendance = useCallback(async () => {
    if (!supabase || !currentRestaurant?.id) {
      setAttendanceLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_active_staff_attendance', {
        p_restaurant_id: currentRestaurant.id,
      });

      if (!error && Array.isArray(data)) {
        setAllActiveStaff(data);
        const myName = auth.staff?.displayName || auth.staff?.email || '';
        const mine = data.find(
          (a) =>
            a.staff_id === auth.staff?.id ||
            a.staff_name.toLowerCase() === myName.toLowerCase(),
        );
        setActiveSession(mine || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAttendanceLoading(false);
    }
  }, [currentRestaurant?.id, auth.staff]);

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 30000);
    return () => clearInterval(interval);
  }, [loadAttendance]);

  const handleClockIn = async () => {
    if (!supabase || !auth.staff) return;
    setClockingBusy(true);
    try {
      const staffName = auth.staff.displayName || auth.staff.email.split('@')[0];
      const { data, error } = await supabase.rpc('clock_in_staff', {
        p_restaurant_id: currentRestaurant.id,
        p_staff_id: auth.staff.id || null,
        p_staff_name: staffName,
        p_device_info: 'Counter POS Web Station',
      });

      if (error) throw error;
      await loadAttendance();
      alert(`✓ Clocked in successfully as ${staffName}!`);
    } catch (e: any) {
      alert(e.message || 'Could not clock in');
    } finally {
      setClockingBusy(false);
    }
  };

  const handleClockOut = async () => {
    if (!supabase || !activeSession) return;
    setClockingBusy(true);
    try {
      const { data, error } = await supabase.rpc('clock_out_staff', {
        p_attendance_id: activeSession.id,
        p_notes: 'Shift completed at counter terminal',
      });

      if (error) throw error;
      setActiveSession(null);
      await loadAttendance();
      alert(
        `✓ Clocked out! Total worked: ${data?.duration_minutes || 0} mins. Orders taken: ${data?.orders_taken_count || 0}`,
      );
    } catch (e: any) {
      alert(e.message || 'Could not clock out');
    } finally {
      setClockingBusy(false);
    }
  };

  // Applied customisation groups for the product currently being customized
  const appliedGroups = useMemo(() => {
    if (!customizingProduct) return [];
    return groups.filter((g) => customizingProduct.customisationGroupIds.includes(g.id));
  }, [customizingProduct, groups]);

  // Handle product click in catalog
  const handleSelectProduct = (product: Product) => {
    const productGroups = groups.filter((g) => product.customisationGroupIds.includes(g.id));

    if (productGroups.length > 0) {
      // Open customization modal
      const defaults: Record<string, string[]> = {};
      productGroups.forEach((group) => {
        if (group.kind !== 'extras') {
          const firstAvailable = group.options.find((o) => o.available);
          if (firstAvailable) {
            defaults[group.id] = [firstAvailable.id];
          }
        } else {
          defaults[group.id] = [];
        }
      });
      setSelectedOptions(defaults);
      setItemNotes('');
      setItemQty(1);
      setCustomizingProduct(product);
    } else {
      // Add directly to cart
      addCustomizedItemToCart(product, 1, [], '');
    }
  };

  // Toggle option selection in customization modal
  const handleToggleOption = (groupId: string, optionId: string, isMultiple: boolean) => {
    setSelectedOptions((current) => ({
      ...current,
      [groupId]: isMultiple
        ? (current[groupId] ?? []).includes(optionId)
          ? (current[groupId] ?? []).filter((id) => id !== optionId)
          : [...(current[groupId] ?? []), optionId]
        : [optionId],
    }));
  };

  // Active choices from modal
  const modalChoices = useMemo(() => {
    if (!customizingProduct) return [];
    return appliedGroups
      .flatMap((group) =>
        (selectedOptions[group.id] ?? [])
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
      .filter((choice) => {
        // Sugar type logic: if sugar quantity is "No sugar", ignore sugar type
        const sugarQtyGroup = appliedGroups.find((g) => g.kind === 'sugar_quantity');
        if (!sugarQtyGroup) return true;
        const selectedQtyOptionId = (selectedOptions[sugarQtyGroup.id] ?? [])[0];
        const selectedQtyOption = sugarQtyGroup.options.find((o) => o.id === selectedQtyOptionId);
        if (selectedQtyOption?.name === 'No sugar' && groups.find((g) => g.id === choice.groupId)?.kind === 'sugar_type') {
          return false;
        }
        return true;
      });
  }, [customizingProduct, appliedGroups, selectedOptions, groups]);

  const modalUnitPrice = useMemo(() => {
    if (!customizingProduct) return 0;
    return customizingProduct.price + modalChoices.reduce((sum, c) => sum + c.price, 0);
  }, [customizingProduct, modalChoices]);

  // Add customized item to cart
  const addCustomizedItemToCart = (
    product: Product,
    qty: number,
    customisations: SelectedCustomisation[],
    notes: string,
  ) => {
    const signature = customisations
      .map((item) => item.optionId)
      .sort()
      .join('-');
    const cartKey = `${product.id}:${signature}:${notes}`;
    const unitPrice = product.price + customisations.reduce((sum, item) => sum + item.price, 0);

    setPosCart((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + qty } : item,
        );
      }
      return [
        ...prev,
        {
          cartKey,
          product,
          quantity: qty,
          unitPrice,
          customisations,
          notes: notes.trim() || undefined,
        },
      ];
    });

    setCustomizingProduct(null);
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    addCustomizedItemToCart(customizingProduct, itemQty, modalChoices, itemNotes);
  };

  const handleUpdateCartQty = (cartKey: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((item) => (item.cartKey === cartKey ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const posTotal = posCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const handleProcessCounterOrder = async () => {
    if (posCart.length === 0) return;
    if (!activeSession && auth.staff?.role !== 'owner' && auth.staff?.role !== 'super_admin') {
      alert('Please CLOCK IN first before creating counter orders.');
      return;
    }

    setOrderingBusy(true);
    setOrderSuccess('');
    try {
      const staffName = auth.staff?.displayName || auth.staff?.email || 'Counter Staff';
      const staffId = auth.staff?.id || null;
      const orderName = customerName.trim() || 'Counter Customer';
      const pickupCode = `C${Math.floor(100 + Math.random() * 900)}`;

      if (supabase) {
        const orderId = `ORD-POS-${Math.floor(100000 + Math.random() * 900000)}`;

        const itemRows = posCart.map((item) => {
          const modSummary = item.customisations
            .map((c) => `${c.groupName}: ${c.optionName}${c.price ? ` (+$${c.price.toFixed(2)})` : ''}`)
            .join(' · ');
          const combinedNotes = [item.notes, modSummary].filter(Boolean).join(' | ');

          return {
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price_cents: Math.round(item.unitPrice * 100),
            notes: combinedNotes || null,
            selected_customisations: item.customisations,
          };
        });

        const { data, error: orderErr } = await supabase.rpc('place_counter_order', {
          p_order_id: orderId,
          p_restaurant_id: currentRestaurant.id,
          p_customer_name: orderName,
          p_payment_method: paymentMethod,
          p_total_cents: Math.round(posTotal * 100),
          p_staff_id: staffId,
          p_staff_name: staffName,
          p_items: itemRows,
        });

        if (orderErr) throw orderErr;

        const code = data?.pickup_code || pickupCode;
        setOrderSuccess(`✓ Order ${orderId} placed! Attributed to: ${staffName} (${code})`);
        setPosCart([]);
        setCustomerName('');
        setTimeout(() => setOrderSuccess(''), 5000);
      }
    } catch (e: any) {
      alert(e.message || 'Could not place counter order');
    } finally {
      setOrderingBusy(false);
    }
  };

  const isClockedIn = !!activeSession;

  return (
    <Screen>
      <Header
        title="Counter Terminal"
        right={
          <Pressable onPress={() => void auth.signOut()}>
            <Text style={s.signOutText}>Sign out</Text>
          </Pressable>
        }
      />

      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {/* Attendance Banner Card */}
        <Card style={[s.attendanceCard, isClockedIn ? s.attendanceCardIn : s.attendanceCardOut]}>
          <View style={s.attendanceHeader}>
            <View style={{ flex: 1 }}>
              <View style={s.staffIdentityRow}>
                <Ionicons
                  name={isClockedIn ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={isClockedIn ? '#2D7D46' : colors.danger}
                />
                <Text style={s.staffName}>
                  {auth.staff?.displayName || auth.staff?.email}
                </Text>
                <View style={s.rolePill}>
                  <Text style={s.rolePillText}>{auth.staff?.role.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={s.attendanceStatusText}>
                {isClockedIn
                  ? `Active Shift · Clocked in ${activeSession?.minutes_elapsed || 0}m ago (${new Date(activeSession?.clock_in_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  : 'Not clocked in. Clock in to activate your shift and attribute counter orders.'}
              </Text>
            </View>

            <View style={s.clockBtnWrap}>
              {clockingBusy ? (
                <ActivityIndicator size="small" color={colors.espresso} />
              ) : isClockedIn ? (
                <Pressable style={s.clockOutBtn} onPress={handleClockOut}>
                  <Ionicons name="log-out-outline" size={14} color={colors.white} />
                  <Text style={s.clockOutBtnText}>CLOCK OUT</Text>
                </Pressable>
              ) : (
                <Pressable style={s.clockInBtn} onPress={handleClockIn}>
                  <Ionicons name="log-in-outline" size={14} color={colors.white} />
                  <Text style={s.clockInBtnText}>CLOCK IN</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Active Team on Shift */}
          {allActiveStaff.length > 0 && (
            <View style={s.activeTeamBar}>
              <Text style={s.teamTitle}>Active on Shift ({allActiveStaff.length}):</Text>
              <View style={s.teamList}>
                {allActiveStaff.map((st) => (
                  <View key={st.id} style={s.teamMemberPill}>
                    <Text style={s.teamMemberText}>
                      {st.staff_name} ({st.minutes_elapsed}m)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Counter POS Order Taker */}
        <View style={s.posGrid}>
          {/* Left Column: Product Quick Catalog */}
          <View style={s.catalogCol}>
            <Text style={s.colHeader}>MENU ITEMS</Text>
            <View style={s.productGrid}>
              {products.map((p) => {
                const hasMods = groups.some((g) => p.customisationGroupIds.includes(g.id));
                return (
                  <Pressable
                    key={p.id}
                    style={s.productItemCard}
                    onPress={() => handleSelectProduct(p)}
                  >
                    <Text style={s.productEmoji}>{p.emoji || '☕'}</Text>
                    <Text style={s.productItemName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={s.productItemPrice}>{money(p.price)}</Text>
                    {hasMods && (
                      <View style={s.modBadge}>
                        <Ionicons name="options-outline" size={10} color={colors.caramel} />
                        <Text style={s.modBadgeText}>Customise</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Right Column: POS Cart & Charge */}
          <View style={s.cartCol}>
            <Text style={s.colHeader}>CURRENT TICKET</Text>
            <Card style={s.posCartCard}>
              <TextInput
                style={s.customerInput}
                placeholder="Customer Name / Table # (Optional)"
                placeholderTextColor={colors.muted}
                value={customerName}
                onChangeText={setCustomerName}
              />

              {posCart.length === 0 ? (
                <View style={s.emptyCart}>
                  <Ionicons name="receipt-outline" size={32} color={colors.muted} />
                  <Text style={s.emptyCartText}>Tap items to add to ticket</Text>
                </View>
              ) : (
                <ScrollView style={s.cartItemList} showsVerticalScrollIndicator={false}>
                  {posCart.map((item) => (
                    <View key={item.cartKey} style={s.cartItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cartItemName}>{item.product.name}</Text>
                        <Text style={s.cartItemUnit}>{money(item.unitPrice)} each</Text>

                        {/* Modifiers display in cart */}
                        {item.customisations.length > 0 && (
                          <View style={s.cartModsWrap}>
                            {item.customisations.map((c) => (
                              <Text key={c.optionId} style={s.cartModText}>
                                • {c.groupName}: {c.optionName}
                                {c.price ? ` (+${money(c.price)})` : ''}
                              </Text>
                            ))}
                          </View>
                        )}
                        {!!item.notes && (
                          <Text style={s.cartNotesText}>Note: {item.notes}</Text>
                        )}
                      </View>

                      <View style={s.qtyControl}>
                        <Pressable
                          style={s.qtyBtn}
                          onPress={() => handleUpdateCartQty(item.cartKey, -1)}
                        >
                          <Ionicons name="remove" size={14} color={colors.espresso} />
                        </Pressable>
                        <Text style={s.qtyText}>{item.quantity}</Text>
                        <Pressable
                          style={s.qtyBtn}
                          onPress={() => handleUpdateCartQty(item.cartKey, 1)}
                        >
                          <Ionicons name="add" size={14} color={colors.espresso} />
                        </Pressable>
                      </View>

                      <Text style={s.cartItemTotal}>
                        {money(item.unitPrice * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Total & Payment Method Selector */}
              <View style={s.cartTotalRow}>
                <Text style={s.cartTotalLabel}>Total:</Text>
                <Text style={s.cartTotalAmount}>{money(posTotal)}</Text>
              </View>

              <View style={s.paymentMethodRow}>
                {(['eftpos', 'card', 'cash'] as const).map((method) => (
                  <Pressable
                    key={method}
                    style={[
                      s.payMethodBtn,
                      paymentMethod === method && s.payMethodBtnActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        s.payMethodText,
                        paymentMethod === method && s.payMethodTextActive,
                      ]}
                    >
                      {method.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {!!orderSuccess && <Text style={s.successText}>{orderSuccess}</Text>}

              <Button
                label={orderingBusy ? 'Processing…' : `Charge ${money(posTotal)}`}
                disabled={orderingBusy || posCart.length === 0}
                onPress={handleProcessCounterOrder}
              />
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Item Customisation Modal */}
      <Modal
        visible={!!customizingProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomizingProduct(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalContent}>
            {customizingProduct && (
              <>
                {/* Modal Header */}
                <View style={s.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>{customizingProduct.name}</Text>
                    <Text style={s.modalSub}>
                      Base: {money(customizingProduct.price)} · {customizingProduct.category}
                    </Text>
                  </View>
                  <Pressable
                    style={s.modalCloseBtn}
                    onPress={() => setCustomizingProduct(null)}
                  >
                    <Ionicons name="close" size={20} color={colors.espresso} />
                  </Pressable>
                </View>

                {/* Modifiers List */}
                <ScrollView
                  style={s.modalScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {appliedGroups.map((group) => {
                    const isExtras = group.kind === 'extras';
                    return (
                      <View key={group.id} style={s.modGroupCard}>
                        <View style={s.modGroupHeader}>
                          <Text style={s.modGroupTitle}>{group.name.toUpperCase()}</Text>
                          <Text style={s.modGroupKind}>
                            {isExtras ? 'OPTIONAL (MULTI)' : 'REQUIRED (SELECT 1)'}
                          </Text>
                        </View>

                        <View style={s.modOptionsGrid}>
                          {group.options.map((opt) => {
                            const isSelected = (selectedOptions[group.id] ?? []).includes(
                              opt.id,
                            );
                            return (
                              <Pressable
                                key={opt.id}
                                disabled={!opt.available}
                                style={[
                                  s.modOptionPill,
                                  isSelected && s.modOptionPillActive,
                                  !opt.available && s.modOptionPillDisabled,
                                ]}
                                onPress={() =>
                                  handleToggleOption(group.id, opt.id, isExtras)
                                }
                              >
                                <Text
                                  style={[
                                    s.modOptionText,
                                    isSelected && s.modOptionTextActive,
                                    !opt.available && s.modOptionTextDisabled,
                                  ]}
                                >
                                  {opt.name}
                                  {opt.price ? ` +${money(opt.price)}` : ''}
                                  {!opt.available ? ' · Sold out' : ''}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}

                  {/* Special Instructions Input */}
                  <View style={s.notesBox}>
                    <Text style={s.notesLabel}>SPECIAL INSTRUCTIONS / ALLERGIES:</Text>
                    <TextInput
                      style={s.notesInput}
                      placeholder="e.g. Extra hot, no onion, side of honey…"
                      placeholderTextColor={colors.muted}
                      value={itemNotes}
                      onChangeText={setItemNotes}
                    />
                  </View>

                  {/* Quantity Stepper */}
                  <View style={s.modalQtyRow}>
                    <Text style={s.modalQtyLabel}>QUANTITY:</Text>
                    <View style={s.modalQtyStepper}>
                      <Pressable
                        style={s.modalQtyBtn}
                        onPress={() => setItemQty(Math.max(1, itemQty - 1))}
                      >
                        <Ionicons name="remove" size={16} color={colors.espresso} />
                      </Pressable>
                      <Text style={s.modalQtyValue}>{itemQty}</Text>
                      <Pressable
                        style={s.modalQtyBtn}
                        onPress={() => setItemQty(itemQty + 1)}
                      >
                        <Ionicons name="add" size={16} color={colors.espresso} />
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>

                {/* Modal Footer / Add Button */}
                <View style={s.modalFooter}>
                  <Button
                    label={`Add to Order • ${money(modalUnitPrice * itemQty)}`}
                    onPress={handleConfirmCustomization}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 60 },
  signOutText: { color: colors.caramel, fontWeight: '800', fontSize: 13 },
  attendanceCard: { borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1 },
  attendanceCardIn: { backgroundColor: '#F2F9F4', borderColor: '#C3E6CD' },
  attendanceCardOut: { backgroundColor: '#FDF7E7', borderColor: '#F5DEB3' },
  attendanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  staffName: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  rolePill: { backgroundColor: colors.cream, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rolePillText: { fontSize: 9, fontWeight: '800', color: colors.caramel },
  attendanceStatusText: { fontSize: 12, color: colors.muted, marginTop: 4 },
  clockBtnWrap: { marginLeft: 10 },
  clockInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2D7D46',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clockInBtnText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  clockOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clockOutBtnText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  activeTeamBar: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  teamTitle: { fontSize: 11, fontWeight: '800', color: colors.espresso, marginBottom: 4 },
  teamList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  teamMemberPill: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  teamMemberText: { fontSize: 10, fontWeight: '700', color: colors.ink },
  posGrid: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  catalogCol: { flex: 1, minWidth: 300 },
  cartCol: { width: 350 },
  colHeader: { fontSize: 12, fontWeight: '800', color: colors.caramel, letterSpacing: 1, marginBottom: 8 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productItemCard: {
    width: '31%',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  productEmoji: { fontSize: 24, marginBottom: 4 },
  productItemName: { fontSize: 12, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  productItemPrice: { fontSize: 12, fontWeight: '800', color: colors.espresso, marginTop: 2 },
  modBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  modBadgeText: { fontSize: 9, fontWeight: '800', color: colors.caramel },
  posCartCard: { backgroundColor: colors.white, padding: 14, borderRadius: 16 },
  customerInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    marginBottom: 10,
    color: colors.ink,
  },
  emptyCart: { paddingVertical: 30, alignItems: 'center' },
  emptyCartText: { color: colors.muted, fontSize: 12, marginTop: 6 },
  cartItemList: { maxHeight: 240, marginBottom: 10 },
  cartItemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cartItemName: { fontSize: 13, fontWeight: '800', color: colors.ink },
  cartItemUnit: { fontSize: 11, color: colors.muted },
  cartModsWrap: { marginTop: 3 },
  cartModText: { fontSize: 10, color: colors.caramel, fontWeight: '700', lineHeight: 14 },
  cartNotesText: { fontSize: 10, color: colors.muted, fontStyle: 'italic', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 8, marginTop: 4 },
  qtyBtn: {
    width: 22,
    height: 22,
    backgroundColor: colors.cream,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  cartItemTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
    minWidth: 44,
    textAlign: 'right',
    marginTop: 4,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cartTotalLabel: { fontSize: 14, fontWeight: '800', color: colors.espresso },
  cartTotalAmount: { fontSize: 18, fontWeight: '900', color: colors.caramel },
  paymentMethodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  payMethodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: colors.cream, borderRadius: 8 },
  payMethodBtnActive: { backgroundColor: colors.espresso },
  payMethodText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  payMethodTextActive: { color: colors.white },
  successText: { color: '#2D7D46', fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 8 },

  // Customization Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: colors.espresso },
  modalSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: colors.cream,
    borderRadius: 10,
  },
  modalScroll: { flex: 1 },
  modGroupCard: { marginBottom: 14 },
  modGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modGroupTitle: { fontSize: 11, fontWeight: '900', color: colors.espresso, letterSpacing: 0.5 },
  modGroupKind: { fontSize: 9, fontWeight: '800', color: colors.caramel },
  modOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modOptionPillActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  modOptionPillDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
    opacity: 0.5,
  },
  modOptionText: { fontSize: 11, fontWeight: '700', color: colors.espresso },
  modOptionTextActive: { color: colors.white },
  modOptionTextDisabled: { color: colors.muted },
  notesBox: { marginTop: 6, marginBottom: 12 },
  notesLabel: { fontSize: 10, fontWeight: '800', color: colors.espresso, letterSpacing: 0.5, marginBottom: 4 },
  notesInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.cream,
  },
  modalQtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  modalQtyLabel: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  modalQtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalQtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  modalQtyValue: { fontSize: 14, fontWeight: '900', color: colors.espresso, minWidth: 20, textAlign: 'center' },
  modalFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
});
