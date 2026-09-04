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
import { Screen, Header, Card, Button, triggerHaptic } from '@/src/components/UI';
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
import { colors, radii, shadows } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { money, Product } from '@/src/data/products';
import { ProductImage } from '@/src/components/ProductImage';
import { TableServiceAlerts } from '@/src/components/TableServiceAlerts';

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
  const { orders, updateOrderStatus } = useOrders();
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);

  const unapprovedTableOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.orderType === 'table' &&
        (o.status === 'Incoming' || (o.status as string) === 'pending') &&
        (o.restaurantId === currentRestaurant.id || !o.restaurantId),
    );
  }, [orders, currentRestaurant.id]);

  const handleApproveTableOrder = async (orderId: string) => {
    triggerHaptic('success');
    setApprovingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, 'Accepted');
    } catch (e: any) {
      alert(e.message || 'Could not approve table order');
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleRejectTableOrder = async (orderId: string) => {
    triggerHaptic('medium');
    setApprovingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, 'Cancelled');
    } catch (e: any) {
      alert(e.message || 'Could not reject table order');
    } finally {
      setApprovingOrderId(null);
    }
  };

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
  const toggleModalOption = (groupId: string, optionId: string, isMultiple: boolean) => {
    triggerHaptic('light');
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
    triggerHaptic('light');
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
    triggerHaptic('light');
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

    triggerHaptic('success');
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
        {/* Live Table Requests & Bell Alerts */}
        <TableServiceAlerts />

        {/* 🔔 UNAPPROVED TABLE ORDERS SECTION */}
        {unapprovedTableOrders.length > 0 && (
          <View style={s.unapprovedSection}>
            <View style={s.unapprovedHeaderRow}>
              <View style={s.unapprovedBadge}>
                <Ionicons name="notifications" size={14} color={colors.white} />
                <Text style={s.unapprovedBadgeText}>
                  {unapprovedTableOrders.length} NEW TABLE ORDER{unapprovedTableOrders.length > 1 ? 'S' : ''} AWAITING APPROVAL
                </Text>
              </View>
            </View>

            {unapprovedTableOrders.map((to) => {
              const tableLabel = to.table?.name || `Table ${to.table?.code || '—'}`;
              return (
                <Card key={to.id} style={s.tableOrderCard}>
                  <View style={s.tableOrderCardHeader}>
                    <View style={s.tableOrderTitleWrap}>
                      <View style={s.tableNumberPill}>
                        <Text style={s.tableNumberPillText}>
                          {tableLabel.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.tableCustomerName}>
                          Customer: <Text style={{ fontWeight: '900', color: colors.espresso }}>{to.customerName}</Text>
                        </Text>
                        <Text style={s.tableOrderMeta}>
                          {currentRestaurant.name} · Order #{to.id} · {new Date(to.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.tableOrderPrice}>{money(to.total)}</Text>
                  </View>

                  {/* Items list */}
                  <View style={s.tableOrderItemsList}>
                    {to.items.map((item, idx) => (
                      <Text key={idx} style={s.tableOrderItemLine}>
                        • {item.quantity}× {item.product.name}
                        {item.customisations && item.customisations.length > 0
                          ? ` (${item.customisations.map((c) => c.optionName).join(', ')})`
                          : ''}
                      </Text>
                    ))}
                    {!!to.orderNotes && (
                      <Text style={s.tableOrderNote}>Special instructions: {to.orderNotes}</Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={s.tableOrderActionRow}>
                    <Pressable
                      style={s.rejectBtn}
                      disabled={approvingOrderId === to.id}
                      onPress={() => handleRejectTableOrder(to.id)}
                    >
                      <Text style={s.rejectBtnText}>Reject / Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={s.approveBtn}
                      disabled={approvingOrderId === to.id}
                      onPress={() => handleApproveTableOrder(to.id)}
                    >
                      {approvingOrderId === to.id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color={colors.white} />
                          <Text style={s.approveBtnText}>APPROVE ORDER</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
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
                    <ProductImage
                      uri={p.imageUrl}
                      category={p.category}
                      name={p.name}
                      style={s.posProductThumb}
                      placeholderStyle={s.posProductThumb}
                      iconSize={22}
                    />
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
                  <ProductImage
                    uri={customizingProduct.imageUrl}
                    category={customizingProduct.category}
                    name={customizingProduct.name}
                    style={s.modalProductThumb}
                    placeholderStyle={s.modalProductThumb}
                    iconSize={24}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
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
                                  toggleModalOption(group.id, opt.id, isExtras)
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
  attendanceCard: { borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1.5, ...shadows.sm },
  attendanceCardIn: { backgroundColor: '#F0F9F2', borderColor: '#BFE5CA' },
  attendanceCardOut: { backgroundColor: '#FEF9EE', borderColor: '#F5E4C3' },
  attendanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  staffName: { fontSize: 17, fontWeight: '900', color: colors.espresso },
  rolePill: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
  rolePillText: { fontSize: 10, fontWeight: '800', color: colors.caramel, letterSpacing: 0.5 },
  attendanceStatusText: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '600' },
  clockBtnWrap: { marginLeft: 10 },
  clockInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  clockInBtnText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  clockOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  clockOutBtnText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  activeTeamBar: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  teamTitle: { fontSize: 11, fontWeight: '800', color: colors.espresso, marginBottom: 6, letterSpacing: 0.5 },
  teamList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  teamMemberPill: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  teamMemberText: { fontSize: 11, fontWeight: '700', color: colors.ink },
  posGrid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  catalogCol: { flex: 1, minWidth: 300 },
  cartCol: { width: 360 },
  colHeader: { fontSize: 12, fontWeight: '800', color: colors.caramel, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productItemCard: {
    width: '31%',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    ...shadows.sm,
  },
  posProductThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginBottom: 6,
  },
  modalProductThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  productItemName: { fontSize: 12, fontWeight: '800', color: colors.espresso, textAlign: 'center' },
  productItemPrice: { fontSize: 13, fontWeight: '900', color: colors.espresso, marginTop: 2 },
  modBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cream,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginTop: 4,
  },
  modBadgeText: { fontSize: 9, fontWeight: '800', color: colors.caramel },
  posCartCard: { backgroundColor: colors.white, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  customerInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 12,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  emptyCart: { paddingVertical: 34, alignItems: 'center' },
  emptyCartText: { color: colors.muted, fontSize: 13, marginTop: 8 },
  cartItemList: { maxHeight: 250, marginBottom: 12 },
  cartItemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cartItemName: { fontSize: 14, fontWeight: '800', color: colors.espresso },
  cartItemUnit: { fontSize: 11, color: colors.muted },
  cartModsWrap: { marginTop: 3 },
  cartModText: { fontSize: 10, color: colors.caramel, fontWeight: '800', lineHeight: 14 },
  cartNotesText: { fontSize: 10, color: colors.muted, fontStyle: 'italic', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 8, marginTop: 4 },
  qtyBtn: {
    width: 24,
    height: 24,
    backgroundColor: colors.cream,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 13, fontWeight: '900', color: colors.espresso },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.espresso,
    minWidth: 48,
    textAlign: 'right',
    marginTop: 4,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1.5,
    borderTopColor: colors.line,
  },
  cartTotalLabel: { fontSize: 15, fontWeight: '800', color: colors.espresso },
  cartTotalAmount: { fontSize: 20, fontWeight: '900', color: colors.espresso },
  paymentMethodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  payMethodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.creamSoft, borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  payMethodBtnActive: { backgroundColor: colors.espresso, borderColor: colors.espresso, ...shadows.sm },
  payMethodText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  payMethodTextActive: { color: colors.white },
  successText: { color: colors.green, fontSize: 12, fontWeight: '800', textAlign: 'center', marginBottom: 8 },

  // Customization Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 14,
    marginBottom: 14,
  },
  modalTitle: { fontSize: 19, fontWeight: '900', color: colors.espresso, letterSpacing: -0.3 },
  modalSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  modalCloseBtn: {
    padding: 8,
    backgroundColor: colors.cream,
    borderRadius: radii.md,
  },
  modalScroll: { flex: 1 },
  modGroupCard: { marginBottom: 16 },
  modGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modGroupTitle: { fontSize: 12, fontWeight: '900', color: colors.espresso, letterSpacing: 0.5 },
  modGroupKind: { fontSize: 10, fontWeight: '800', color: colors.caramel },
  modOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modOptionPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.creamSoft,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  modOptionPillActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
    ...shadows.sm,
  },
  modOptionPillDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
    opacity: 0.5,
  },
  modOptionText: { fontSize: 12, fontWeight: '700', color: colors.espresso },
  modOptionTextActive: { color: colors.white, fontWeight: '800' },
  modOptionTextDisabled: { color: colors.muted },
  notesBox: { marginTop: 8, marginBottom: 14 },
  notesLabel: { fontSize: 11, fontWeight: '800', color: colors.espresso, letterSpacing: 0.5, marginBottom: 6 },
  notesInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  modalQtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  modalQtyLabel: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  modalQtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalQtyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  modalQtyValue: { fontSize: 15, fontWeight: '900', color: colors.espresso, minWidth: 24, textAlign: 'center' },
  modalFooter: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },

  // Unapproved Table Orders Styles
  unapprovedSection: {
    marginBottom: 16,
  },
  unapprovedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  unapprovedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D9534F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  unapprovedBadgeText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tableOrderCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F0C987',
    ...shadows.md,
  },
  tableOrderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 12,
    marginBottom: 10,
  },
  tableOrderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableNumberPill: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tableNumberPillText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tableCustomerName: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: '700',
  },
  tableOrderMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  tableOrderPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
    marginLeft: 8,
  },
  tableOrderItemsList: {
    backgroundColor: colors.creamSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  tableOrderItemLine: {
    fontSize: 12,
    color: colors.espresso,
    fontWeight: '700',
    lineHeight: 18,
  },
  tableOrderNote: {
    fontSize: 11,
    color: colors.caramel,
    fontWeight: '800',
    fontStyle: 'italic',
    marginTop: 4,
  },
  tableOrderActionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  rejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  rejectBtnText: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 12,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2D7D46',
    ...shadows.sm,
  },
  approveBtnText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
